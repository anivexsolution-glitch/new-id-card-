/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { auth } from './firebase';
import {
  ActiveNavTab,
  AuthenticatedUser,
  ExportHistoryRecord,
  SavedCustomTemplate,
  SchoolSettings,
  Student,
  TemplateId,
} from './types';
import { DEFAULT_SCHOOL_SETTINGS, DEMO_STUDENTS } from './constants/initialData';
import { clearLegacyLocalCaches } from './utils/idbStorage';
import { hasValidStudentPhoto } from './utils/photoUtils';
import {
  appendExportHistoryCloud,
  bulkMarkGeneratedCloud,
  clearExportHistoryCloud,
  deleteCustomTemplateCloud,
  deleteStudentCloud,
  deleteStudentsBatchCloud,
  ensureUserWorkspace,
  promoteStudentsRolloverCloud,
  saveCustomTemplateCloud,
  saveUserSettingsCloud,
  StudentRolloverPatch,
  subscribeUserWorkspace,
  syncStudentsBulkCloud,
  toggleStudentCardStatusCloud,
  updateDemoModeCloud,
  upsertStudentCloud,
} from './utils/firestoreSync';
import { Sidebar } from './components/layout/Sidebar';
import { TopBar } from './components/layout/TopBar';
import { DashboardView } from './components/dashboard/DashboardView';
import { StudentsView } from './components/students/StudentsView';
import { StudentModal } from './components/students/StudentModal';
import {
  PromotionRolloverModal,
  RolloverApplyPayload,
  suggestPromotedClass,
} from './components/students/PromotionRolloverModal';
import { ExcelImportWizard } from './components/import/ExcelImportWizard';
import { TemplateGalleryView } from './components/templates/TemplateGalleryView';
import { CardEditorView } from './components/editor/CardEditorView';
import { PrintExportView } from './components/export/PrintExportView';
import { ExportHistoryView } from './components/export/ExportHistoryView';
import { SettingsView } from './components/settings/SettingsView';
import { LoginView } from './components/auth/LoginView';
import { HelpSupportModal } from './components/ui/EnterpriseUI';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveNavTab>('dashboard');
  const [students, setStudents] = useState<Student[]>([]);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);
  const [schoolSettings, setSchoolSettings] = useState<SchoolSettings>(DEFAULT_SCHOOL_SETTINGS);

  // Firebase Auth & Per-User Cloud Workspace State
  const [authUser, setAuthUser] = useState<AuthenticatedUser | null>(null);
  const [pendingVerificationUser, setPendingVerificationUser] = useState<AuthenticatedUser | null>(
    null
  );
  const [authReady, setAuthReady] = useState<boolean>(false);
  const [syncingWorkspace, setSyncingWorkspace] = useState<boolean>(false);
  const [authReloadNonce, setAuthReloadNonce] = useState<number>(0);

  // Navigation & Shell States
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [isHelpOpen, setIsHelpOpen] = useState<boolean>(false);

  // Editor states
  const [selectedStudentForEditor, setSelectedStudentForEditor] = useState<string>('');
  const [selectedTemplateForEditor, setSelectedTemplateForEditor] = useState<TemplateId>(
    'portrait_red_magenta_curved'
  );
  const [customTemplates, setCustomTemplates] = useState<SavedCustomTemplate[]>([]);
  const [exportHistory, setExportHistory] = useState<ExportHistoryRecord[]>([]);

  // Modal states
  const [isStudentModalOpen, setIsStudentModalOpen] = useState<boolean>(false);
  const [studentToEdit, setStudentToEdit] = useState<Student | null>(null);
  const [isPromotionModalOpen, setIsPromotionModalOpen] = useState<boolean>(false);
  const [studentsFilterRequest, setStudentsFilterRequest] = useState<{
    value: 'all' | 'generated' | 'pending' | 'missing_photo';
    nonce: number;
  } | null>(null);

  const navigateToStudentsWithFilter = (
    filter: 'all' | 'generated' | 'pending' | 'missing_photo'
  ) => {
    setStudentsFilterRequest({ value: filter, nonce: Date.now() });
    setActiveTab('students');
  };

  const [toastState, setToastState] = useState<{
    message: string;
    tone: 'success' | 'error';
  } | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  const triggerToast = (message: string, tone: 'success' | 'error' = 'success') => {
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
    setToastState({ message, tone });
    toastTimerRef.current = window.setTimeout(() => {
      setToastState(null);
      toastTimerRef.current = null;
    }, 4500);
  };

  const activateAuthenticatedWorkspace = async (
    firebaseUser: User,
    isActive: () => boolean,
    setUnsub: (fn: () => void) => void
  ) => {
    const nextUser: AuthenticatedUser = {
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      displayName: firebaseUser.displayName,
      photoURL: firebaseUser.photoURL,
      phoneNumber: firebaseUser.phoneNumber,
      emailVerified: firebaseUser.emailVerified,
    };
    setPendingVerificationUser(null);
    setAuthUser(nextUser);
    setAuthReady(true);
    setSyncingWorkspace(true);

    try {
      await ensureUserWorkspace(firebaseUser);
      if (!isActive() || auth.currentUser?.uid !== firebaseUser.uid) return;

      const unsub = subscribeUserWorkspace(firebaseUser.uid, {
        onSettings: (settings, demoFlag) => {
          if (!isActive()) return;
          setSchoolSettings(settings);
          setIsDemoMode(demoFlag);
          setSelectedTemplateForEditor((prev) =>
            prev === 'portrait_red_magenta_curved' && settings.defaultTemplateId
              ? settings.defaultTemplateId
              : prev
          );
        },
        onStudents: (cloudStudents) => {
          if (!isActive()) return;
          setStudents(cloudStudents);
        },
        onTemplates: (cloudTemplates) => {
          if (!isActive()) return;
          setCustomTemplates(cloudTemplates);
        },
        onExportHistory: (cloudHistory) => {
          if (!isActive()) return;
          setExportHistory(cloudHistory);
        },
      });
      setUnsub(unsub);
    } catch (err) {
      console.error('Failed to initialize isolated cloud workspace:', err);
      if (isActive()) {
        triggerToast('Failed to sync your cloud workspace. Please refresh and try again.', 'error');
      }
    } finally {
      if (isActive()) {
        setSyncingWorkspace(false);
      }
    }
  };

  // Subscribe to Firebase Auth and isolate workspace strictly per authenticated UID
  useEffect(() => {
    let active = true;
    let unsubWorkspace: (() => void) | null = null;

    const resetWorkspaceState = () => {
      setStudents([]);
      setCustomTemplates([]);
      setExportHistory([]);
      setSchoolSettings(DEFAULT_SCHOOL_SETTINGS);
      setIsDemoMode(false);
      setSelectedStudentForEditor('');
      setSelectedTemplateForEditor('portrait_red_magenta_curved');
      setStudentToEdit(null);
      setIsStudentModalOpen(false);
    };

    const unsubAuth = onAuthStateChanged(auth, async (firebaseUser: User | null) => {
      // Tear down previous user's listeners & in-memory state immediately
      if (unsubWorkspace) {
        unsubWorkspace();
        unsubWorkspace = null;
      }
      resetWorkspaceState();
      void clearLegacyLocalCaches();

      if (!firebaseUser) {
        if (!active) return;
        setAuthUser(null);
        setPendingVerificationUser(null);
        setAuthReady(true);
        setSyncingWorkspace(false);
        return;
      }

      if (!active) return;

      const isPhoneVerified = Boolean(
        firebaseUser.phoneNumber &&
          firebaseUser.providerData?.some((p) => p.providerId === 'phone')
      );

      if (!firebaseUser.emailVerified && !isPhoneVerified) {
        setAuthUser(null);
        setPendingVerificationUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
          phoneNumber: firebaseUser.phoneNumber,
          emailVerified: false,
        });
        setAuthReady(true);
        setSyncingWorkspace(false);
        return;
      }

      await activateAuthenticatedWorkspace(
        firebaseUser,
        () => active,
        (fn) => {
          unsubWorkspace = fn;
        }
      );
    });

    return () => {
      active = false;
      unsubAuth();
      if (unsubWorkspace) {
        unsubWorkspace();
      }
    };
  }, [authReloadNonce]);

  const handleCheckVerification = async (): Promise<boolean> => {
    const user = auth.currentUser;
    if (!user) return false;
    await user.reload();
    await user.getIdToken(true);
    if (user.emailVerified) {
      setAuthReloadNonce((n) => n + 1);
      return true;
    }
    return false;
  };

  const handleLogout = async () => {
    try {
      await clearLegacyLocalCaches();
      await signOut(auth);
      setActiveTab('dashboard');
      triggerToast('Signed out securely.');
    } catch (err) {
      console.error('Sign out error:', err);
      triggerToast('Could not sign out cleanly. Please refresh.', 'error');
    }
  };

  const handleCloudError = (actionLabel: string, err: unknown) => {
    console.error(`Cloud sync error (${actionLabel}):`, err);
    triggerToast(`Cloud sync failed while ${actionLabel}. Please check your connection.`, 'error');
  };

  const handleLogExport = (entry: Omit<ExportHistoryRecord, 'id' | 'timestamp'>) => {
    const uid = authUser?.uid;
    if (!uid) return;
    void appendExportHistoryCloud(uid, entry).catch((err) =>
      handleCloudError('recording export history', err)
    );
  };

  const handleClearExportHistory = () => {
    const uid = authUser?.uid;
    if (!uid) return;
    setExportHistory([]);
    void clearExportHistoryCloud(uid)
      .then(() => triggerToast('Export history cleared across your devices.'))
      .catch((err) => handleCloudError('clearing export history', err));
  };

  const handleSaveCustomTemplate = (template: SavedCustomTemplate) => {
    const uid = authUser?.uid;
    if (!uid) return;
    setCustomTemplates((prev) => {
      const existingIndex = prev.findIndex((t) => t.id === template.id);
      if (existingIndex >= 0) {
        const next = [...prev];
        next[existingIndex] = template;
        return next;
      }
      return [template, ...prev];
    });
    void saveCustomTemplateCloud(uid, template)
      .then(() => triggerToast(`Saved template "${template.name}" to cloud.`))
      .catch((err) => handleCloudError('saving custom template', err));
  };

  const handleDeleteCustomTemplate = (templateId: string) => {
    const uid = authUser?.uid;
    if (!uid) return;
    setCustomTemplates((prev) => prev.filter((t) => t.id !== templateId));
    void deleteCustomTemplateCloud(uid, templateId)
      .then(() => triggerToast('Custom template deleted.'))
      .catch((err) => handleCloudError('deleting custom template', err));
  };

  const handleSaveStudent = (savedStudent: Student) => {
    const uid = authUser?.uid;
    if (!uid) return;
    const exists = students.some((s) => s.id === savedStudent.id);
    setStudents((prev) =>
      exists
        ? prev.map((s) => (s.id === savedStudent.id ? savedStudent : s))
        : [savedStudent, ...prev]
    );
    setIsDemoMode(false);
    void Promise.all([
      upsertStudentCloud(uid, savedStudent),
      isDemoMode ? updateDemoModeCloud(uid, false) : Promise.resolve(),
    ])
      .then(() =>
        triggerToast(
          exists ? `Updated record for ${savedStudent.name}.` : `Added student: ${savedStudent.name}.`
        )
      )
      .catch((err) => handleCloudError('saving student record', err));
  };

  const handleDeleteStudent = (studentId: string) => {
    const uid = authUser?.uid;
    if (!uid) return;
    const nextCount = students.filter((s) => s.id !== studentId).length;
    const nextDemo = isDemoMode && nextCount > 0;
    setStudents((prev) => prev.filter((s) => s.id !== studentId));
    setIsDemoMode(nextDemo);
    void Promise.all([
      deleteStudentCloud(uid, studentId),
      nextDemo !== isDemoMode ? updateDemoModeCloud(uid, nextDemo) : Promise.resolve(),
    ])
      .then(() => triggerToast('Student record removed.'))
      .catch((err) => handleCloudError('removing student record', err));
  };

  const handleBulkDelete = (studentIds: string[]) => {
    const uid = authUser?.uid;
    if (!uid) return;
    setStudents((prev) => prev.filter((s) => !studentIds.includes(s.id)));
    setIsDemoMode(false);
    void Promise.all([
      deleteStudentsBatchCloud(uid, studentIds),
      isDemoMode ? updateDemoModeCloud(uid, false) : Promise.resolve(),
    ])
      .then(() => triggerToast(`Deleted ${studentIds.length} student records.`))
      .catch((err) => handleCloudError('deleting selected students', err));
  };

  const handleToggleCardGenerated = (studentId: string) => {
    const uid = authUser?.uid;
    if (!uid) return;
    const target = students.find((s) => s.id === studentId);
    if (!target) return;
    const nextStatus = !target.isCardGenerated;
    const nextDate = nextStatus ? new Date().toISOString().split('T')[0] : undefined;

    setStudents((prev) =>
      prev.map((s) =>
        s.id === studentId
          ? {
              ...s,
              isCardGenerated: nextStatus,
              generatedDate: nextDate,
            }
          : s
      )
    );
    void toggleStudentCardStatusCloud(uid, studentId, nextStatus, nextDate).catch((err) =>
      handleCloudError('updating card status', err)
    );
  };

  const handleBulkGenerate = (studentIds: string[]) => {
    const uid = authUser?.uid;
    if (!uid || studentIds.length === 0) return;
    const today = new Date().toISOString().split('T')[0];
    setStudents((prev) =>
      prev.map((s) =>
        studentIds.includes(s.id)
          ? {
              ...s,
              isCardGenerated: true,
              generatedDate: today,
            }
          : s
      )
    );
    void bulkMarkGeneratedCloud(uid, studentIds, today)
      .then(() => triggerToast(`Marked ${studentIds.length} ID cards as generated.`))
      .catch((err) => handleCloudError('updating batch generation status', err));
  };

  const handleImportComplete = (importedStudents: Student[], mode: 'append' | 'replace') => {
    const uid = authUser?.uid;
    if (!uid) return;
    const existingIds = mode === 'replace' ? students.map((s) => s.id) : [];
    setStudents((prev) =>
      mode === 'replace' ? importedStudents : [...importedStudents, ...prev]
    );
    setIsDemoMode(false);
    void Promise.all([
      syncStudentsBulkCloud(uid, importedStudents, mode, existingIds),
      updateDemoModeCloud(uid, false),
    ])
      .then(() => triggerToast(`Synced ${importedStudents.length} imported student records to cloud.`))
      .catch((err) => handleCloudError('importing students', err));
  };

  const handleSaveSettings = (newSettings: SchoolSettings) => {
    const uid = authUser?.uid;
    if (!uid) return;
    setSchoolSettings(newSettings);
    void saveUserSettingsCloud(uid, newSettings, isDemoMode)
      .then(() => triggerToast('School settings synced across devices.'))
      .catch((err) => handleCloudError('saving school settings', err));
  };

  const handleRestoreData = (restoredSettings: SchoolSettings, restoredStudents: Student[]) => {
    const uid = authUser?.uid;
    if (!uid) return;
    const existingIds = students.map((s) => s.id);
    setStudents(restoredStudents);
    setSchoolSettings(restoredSettings);
    setIsDemoMode(false);
    void Promise.all([
      syncStudentsBulkCloud(uid, restoredStudents, 'replace', existingIds),
      saveUserSettingsCloud(uid, restoredSettings, false),
    ])
      .then(() => triggerToast('Backup restored and synced to your cloud workspace.'))
      .catch((err) => handleCloudError('restoring backup', err));
  };

  const handleResetToDemo = () => {
    const uid = authUser?.uid;
    if (!uid) return;
    const existingIds = students.map((s) => s.id);
    setStudents(DEMO_STUDENTS);
    setSchoolSettings(DEFAULT_SCHOOL_SETTINGS);
    setIsDemoMode(true);
    void Promise.all([
      syncStudentsBulkCloud(uid, DEMO_STUDENTS, 'replace', existingIds),
      saveUserSettingsCloud(uid, DEFAULT_SCHOOL_SETTINGS, true),
    ])
      .then(() => triggerToast('Reset to demonstration roster.'))
      .catch((err) => handleCloudError('resetting demo roster', err));
  };

  const handleClearDemoData = () => {
    const uid = authUser?.uid;
    if (!uid) return;
    if (confirm('Clear all sample student records and start with an empty roster?')) {
      const existingIds = students.map((s) => s.id);
      setStudents([]);
      setIsDemoMode(false);
      void Promise.all([
        deleteStudentsBatchCloud(uid, existingIds),
        updateDemoModeCloud(uid, false),
      ])
        .then(() => triggerToast('Cleared student roster.'))
        .catch((err) => handleCloudError('clearing student roster', err));
    }
  };

  const handleUpdateStudentPhoto = (studentId: string, photoUrl: string) => {
    const uid = authUser?.uid;
    if (!uid) return;
    const target = students.find((s) => s.id === studentId);
    if (!target) return;
    const updatedStudent = { ...target, photoUrl };
    setStudents((prev) => prev.map((s) => (s.id === studentId ? updatedStudent : s)));
    setIsDemoMode(false);
    void Promise.all([
      upsertStudentCloud(uid, updatedStudent),
      isDemoMode ? updateDemoModeCloud(uid, false) : Promise.resolve(),
    ])
      .then(() => triggerToast('Student portrait synced.'))
      .catch((err) => handleCloudError('updating student photo', err));
  };

  const handleUpdateStudentPhotoCrop = (
    studentId: string,
    crop: { zoom: number; x: number; y: number }
  ) => {
    const uid = authUser?.uid;
    if (!uid) return;
    const target = students.find((s) => s.id === studentId);
    if (!target) return;
    const updatedStudent = { ...target, photoCrop: crop };
    setStudents((prev) => prev.map((s) => (s.id === studentId ? updatedStudent : s)));
    void upsertStudentCloud(uid, updatedStudent).catch((err) =>
      handleCloudError('updating portrait crop', err)
    );
  };

  const handleUpdateStudentsBulk = (updatedStudents: Student[]) => {
    const uid = authUser?.uid;
    if (!uid) return;
    setStudents(updatedStudents);
    setIsDemoMode(false);
    void Promise.all([
      syncStudentsBulkCloud(uid, updatedStudents, 'append'),
      updateDemoModeCloud(uid, false),
    ])
      .then(() =>
        triggerToast(
          `Synced portraits for ${updatedStudents.filter((s) => hasValidStudentPhoto(s.photoUrl)).length} students.`
        )
      )
      .catch((err) => handleCloudError('syncing bulk portraits', err));
  };

  const handlePromotionRollover = async (payload: RolloverApplyPayload) => {
    const uid = authUser?.uid;
    if (!uid) return;

    const updates: StudentRolloverPatch[] = [];
    const removeIds: string[] = [];
    const nextStudents: Student[] = [];

    for (const student of students) {
      const sourceKey = (student.classGrade || '').trim();
      const mapping = payload.classMappings[sourceKey];
      const suggestion = suggestPromotedClass(sourceKey);

      if (!mapping || !mapping.include) {
        nextStudents.push(student);
        continue;
      }

      if (suggestion.isGraduating && payload.graduatingPolicy === 'remove') {
        removeIds.push(student.id);
        continue;
      }

      const targetClass = mapping.targetClass.trim();
      const nextClassGrade =
        suggestion.isGraduating && payload.graduatingPolicy === 'keep'
          ? student.classGrade
          : targetClass || student.classGrade;

      const nextGenerated = payload.resetCardStatus ? false : Boolean(student.isCardGenerated);
      const nextGeneratedDate = payload.resetCardStatus ? '' : student.generatedDate || '';

      updates.push({
        id: student.id,
        classGrade: nextClassGrade,
        session: payload.nextSession,
        isCardGenerated: nextGenerated,
        generatedDate: nextGeneratedDate,
      });

      nextStudents.push({
        ...student,
        classGrade: nextClassGrade,
        session: payload.nextSession,
        isCardGenerated: nextGenerated,
        generatedDate: nextGeneratedDate || undefined,
      });
    }

    const nextSettings: SchoolSettings | null = payload.updateSettingsSession
      ? {
          ...schoolSettings,
          academicSession: payload.nextSession,
        }
      : null;

    setStudents(nextStudents);
    if (nextSettings) {
      setSchoolSettings(nextSettings);
    }

    try {
      await promoteStudentsRolloverCloud(uid, updates, removeIds, nextSettings, isDemoMode);
      triggerToast(
        `Promoted ${updates.length} student${updates.length === 1 ? '' : 's'} to session ${payload.nextSession}${
          removeIds.length > 0 ? ` (${removeIds.length} graduated removed)` : ''
        }.`
      );
    } catch (err) {
      handleCloudError('applying class promotion rollover', err);
      throw err;
    }
  };

  if (!authReady || syncingWorkspace) {
    return (
      <div className="min-h-screen bg-[#F5F6F7] flex flex-col items-center justify-center p-6 text-[#202B38]">
        <div className="bg-white border border-[#E3E7EB] rounded-[12px] shadow-sm px-8 py-6 flex flex-col items-center gap-3 max-w-sm text-center">
          <Loader2 className="w-7 h-7 text-[#24364B] animate-spin" />
          <p className="text-sm font-bold text-[#202B38]">
            {authReady ? 'Syncing your private workspace...' : 'Checking authentication...'}
          </p>
          <p className="text-xs text-[#75808C]">
            Loading school settings, student roster, and templates from Firebase Cloud.
          </p>
        </div>
      </div>
    );
  }

  if (!authUser) {
    return (
      <LoginView
        schoolSettings={schoolSettings}
        pendingVerificationUser={pendingVerificationUser}
        onCheckVerification={handleCheckVerification}
      />
    );
  }

  return (
    <div className="print-app-shell flex h-screen bg-[#F5F6F7] overflow-hidden antialiased text-[#202B38]">
      <Sidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        schoolSettings={schoolSettings}
        currentUser={authUser}
        studentCount={students.length}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed((v) => !v)}
        isMobileOpen={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
        onOpenHelp={() => setIsHelpOpen(true)}
        onLogout={handleLogout}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          onNavigateToStudents={navigateToStudentsWithFilter}
          onOpenAddModal={() => {
            setStudentToEdit(null);
            setIsStudentModalOpen(true);
          }}
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
          onSelectStudentForEditor={(studentId) => {
            setSelectedStudentForEditor(studentId);
            setActiveTab('editor');
          }}
          students={students}
          schoolSettings={schoolSettings}
          currentUser={authUser}
          isDemoMode={isDemoMode}
          onLogout={handleLogout}
        />

        {toastState && (
          <div className="no-print fixed bottom-5 right-5 z-50 bg-[#202B38] text-white text-xs px-4 py-2.5 rounded-lg shadow-lg flex items-center gap-2 border border-[#E3E7EB]/20">
            {toastState.tone === 'error' ? (
              <AlertCircle className="w-4 h-4 text-[#C44949] shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-[#25845A] shrink-0" />
            )}
            <span>{toastState.message}</span>
          </div>
        )}

        <main className="print-main flex-1 overflow-y-auto">
          {activeTab === 'dashboard' && (
            <DashboardView
              students={students}
              schoolSettings={schoolSettings}
              currentUser={authUser}
              savedCustomTemplates={customTemplates}
              exportHistory={exportHistory}
              isDemoMode={isDemoMode}
              onNavigate={setActiveTab}
              onNavigateToStudents={navigateToStudentsWithFilter}
              onSelectStudentForEditor={(studentId) => {
                setSelectedStudentForEditor(studentId);
                setActiveTab('editor');
              }}
              onOpenAddModal={() => {
                setStudentToEdit(null);
                setIsStudentModalOpen(true);
              }}
              onResetToDemo={handleResetToDemo}
              onClearData={handleClearDemoData}
              onToggleCardGenerated={handleToggleCardGenerated}
            />
          )}

          {activeTab === 'students' && (
            <StudentsView
              students={students}
              schoolSettings={schoolSettings}
              onEditStudent={(student) => {
                setStudentToEdit(student);
                setIsStudentModalOpen(true);
              }}
              onDeleteStudent={handleDeleteStudent}
              onToggleCardGenerated={handleToggleCardGenerated}
              onOpenAddModal={() => {
                setStudentToEdit(null);
                setIsStudentModalOpen(true);
              }}
              onSelectStudentForEditor={(studentId) => {
                setSelectedStudentForEditor(studentId);
                setActiveTab('editor');
              }}
              onNavigate={setActiveTab}
              onBulkGenerate={handleBulkGenerate}
              onBulkDelete={handleBulkDelete}
              onUpdateStudentPhoto={handleUpdateStudentPhoto}
              onUpdateStudentsBulk={handleUpdateStudentsBulk}
              onLogExport={handleLogExport}
              onOpenPromotionModal={() => setIsPromotionModalOpen(true)}
              initialStatusFilter={studentsFilterRequest}
            />
          )}

          {activeTab === 'import' && (
            <ExcelImportWizard
              schoolSettings={schoolSettings}
              onImportComplete={handleImportComplete}
              onNavigate={setActiveTab}
              onLogExport={handleLogExport}
            />
          )}

          {activeTab === 'templates' && (
            <TemplateGalleryView
              schoolSettings={schoolSettings}
              students={students}
              onSetDefaultTemplate={(templateId) => {
                const updated: SchoolSettings = {
                  ...schoolSettings,
                  defaultTemplateId: templateId,
                  defaultOrientation: templateId.startsWith('portrait_')
                    ? 'portrait'
                    : 'landscape',
                };
                handleSaveSettings(updated);
              }}
              onNavigate={setActiveTab}
              onSelectTemplateForEditor={(templateId) => {
                setSelectedTemplateForEditor(templateId);
                setActiveTab('editor');
              }}
            />
          )}

          {activeTab === 'editor' && (
            <CardEditorView
              students={students}
              schoolSettings={schoolSettings}
              selectedStudentId={selectedStudentForEditor}
              initialTemplateId={selectedTemplateForEditor}
              onUpdateSchoolSettings={handleSaveSettings}
              onUpdateStudentPhotoCrop={handleUpdateStudentPhotoCrop}
              onSaveStudent={handleSaveStudent}
              savedCustomTemplates={customTemplates}
              onSaveCustomTemplate={handleSaveCustomTemplate}
              onDeleteCustomTemplate={handleDeleteCustomTemplate}
              onBackToProjects={() => setActiveTab('dashboard')}
              onNavigate={setActiveTab}
              onLogExport={handleLogExport}
            />
          )}

          {activeTab === 'export' && (
            <PrintExportView
              students={students}
              schoolSettings={schoolSettings}
              savedCustomTemplates={customTemplates}
              onMarkCardsAsGenerated={handleBulkGenerate}
              onLogExport={handleLogExport}
            />
          )}

          {activeTab === 'history' && (
            <ExportHistoryView
              history={exportHistory}
              onClearHistory={handleClearExportHistory}
              onNavigate={setActiveTab}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsView
              settings={schoolSettings}
              students={students}
              currentUser={authUser}
              onSaveSettings={handleSaveSettings}
              onRestoreData={handleRestoreData}
              onResetToDemo={handleResetToDemo}
              onLogout={handleLogout}
              onOpenPromotionModal={() => setIsPromotionModalOpen(true)}
            />
          )}
        </main>
      </div>

      <StudentModal
        isOpen={isStudentModalOpen}
        onClose={() => {
          setIsStudentModalOpen(false);
          setStudentToEdit(null);
        }}
        onSave={handleSaveStudent}
        studentToEdit={studentToEdit}
        schoolSettings={schoolSettings}
      />

      <PromotionRolloverModal
        isOpen={isPromotionModalOpen}
        onClose={() => setIsPromotionModalOpen(false)}
        students={students}
        schoolSettings={schoolSettings}
        onApplyRollover={handlePromotionRollover}
      />

      <HelpSupportModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
    </div>
  );
}
