/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ActiveNavTab, SavedCustomTemplate, SchoolSettings, Student, TemplateId } from './types';
import { DEFAULT_SCHOOL_SETTINGS, DEMO_STUDENTS } from './constants/initialData';
import {
  idbGetCustomTemplates,
  idbGetSettings,
  idbGetStudents,
  idbSaveCustomTemplates,
  idbSaveSettings,
  idbSaveStudents,
} from './utils/idbStorage';
import { Sidebar } from './components/layout/Sidebar';
import { TopBar } from './components/layout/TopBar';
import { DashboardView } from './components/dashboard/DashboardView';
import { StudentsView } from './components/students/StudentsView';
import { StudentModal } from './components/students/StudentModal';
import { ExcelImportWizard } from './components/import/ExcelImportWizard';
import { TemplateGalleryView } from './components/templates/TemplateGalleryView';
import { CardEditorView } from './components/editor/CardEditorView';
import { PrintExportView } from './components/export/PrintExportView';
import { SettingsView } from './components/settings/SettingsView';
import { LoginView } from './components/auth/LoginView';
import { CheckCircle2 } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveNavTab>('dashboard');
  const [students, setStudents] = useState<Student[]>(DEMO_STUDENTS);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(true);
  const [schoolSettings, setSchoolSettings] = useState<SchoolSettings>(DEFAULT_SCHOOL_SETTINGS);

  // Editor states
  const [selectedStudentForEditor, setSelectedStudentForEditor] = useState<string>('');
  const [selectedTemplateForEditor, setSelectedTemplateForEditor] = useState<TemplateId>('portrait_red_magenta_curved');
  const [customTemplates, setCustomTemplates] = useState<SavedCustomTemplate[]>([]);

  // Modal states
  const [isStudentModalOpen, setIsStudentModalOpen] = useState<boolean>(false);
  const [studentToEdit, setStudentToEdit] = useState<Student | null>(null);

  const [toastMessage, setToastMessage] = useState<string>('');

  // Authentication State (Required on startup)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      return (
        sessionStorage.getItem('scholarcard_auth') === 'true' ||
        localStorage.getItem('scholarcard_auth') === 'true'
      );
    } catch {
      return false;
    }
  });

  const handleLoginSuccess = (rememberMe: boolean) => {
    setIsAuthenticated(true);
    try {
      if (rememberMe) {
        localStorage.setItem('scholarcard_auth', 'true');
      } else {
        sessionStorage.setItem('scholarcard_auth', 'true');
      }
    } catch (e) {
      console.error(e);
    }
    triggerToast('Authenticated as School Administrator.');
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    try {
      sessionStorage.removeItem('scholarcard_auth');
      localStorage.removeItem('scholarcard_auth');
    } catch (e) {
      console.error(e);
    }
    triggerToast('Logged out of administrative portal.');
  };

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4500);
  };

  // Initialize from IndexedDB and check for QR verification params
  useEffect(() => {
    async function loadInitialData() {
      try {
        const [loadedSettings, loadedData, loadedTemplates] = await Promise.all([
          idbGetSettings(),
          idbGetStudents(),
          idbGetCustomTemplates(),
        ]);
        if (loadedSettings) {
          let nextSettings = {
            ...DEFAULT_SCHOOL_SETTINGS,
            ...loadedSettings,
            visibleFields: {
              ...DEFAULT_SCHOOL_SETTINGS.visibleFields,
              ...(loadedSettings.visibleFields || {}),
            },
          };
          try {
            let changed = false;
            if (!localStorage.getItem('scholarcard_qr_v2_migrated')) {
              nextSettings = {
                ...nextSettings,
                visibleFields: {
                  ...nextSettings.visibleFields,
                  barcode: true,
                },
              };
              localStorage.setItem('scholarcard_qr_v2_migrated', 'true');
              changed = true;
            }
            if (!localStorage.getItem('scholarcard_printscale_v3_migrated')) {
              if (nextSettings.defaultCustomization) {
                const dc = nextSettings.defaultCustomization;
                nextSettings = {
                  ...nextSettings,
                  defaultCustomization: {
                    ...dc,
                    schoolNameFontSize: (dc.schoolNameFontSize ?? 0) < 29 ? 31 : dc.schoolNameFontSize,
                    studentNameFontSize: (dc.studentNameFontSize ?? 0) < 31 ? 33 : dc.studentNameFontSize,
                    fieldLabelFontSize: (dc.fieldLabelFontSize ?? 0) < 15 ? 16 : dc.fieldLabelFontSize,
                    fieldValueFontSize: (dc.fieldValueFontSize ?? 0) < 19 ? 20 : dc.fieldValueFontSize,
                    addressFontSize: (dc.addressFontSize ?? 0) < 14 ? 15 : dc.addressFontSize,
                    logoSize: (dc.logoSize ?? 0) < 82 ? 90 : dc.logoSize,
                  },
                };
                changed = true;
              }
              localStorage.setItem('scholarcard_printscale_v3_migrated', 'true');
            }
            if (changed) {
              idbSaveSettings(nextSettings);
            }
          } catch {
            // ignore storage restriction
          }
          setSchoolSettings(nextSettings);
        }
        if (loadedData && loadedData.students) {
          setStudents(loadedData.students);
          setIsDemoMode(loadedData.isDemo);
        }
        if (loadedTemplates && loadedTemplates.length > 0) {
          setCustomTemplates(loadedTemplates);
        }
      } catch (err) {
        console.error('Error initializing data from IndexedDB', err);
      }
    }
    loadInitialData();
  }, []);

  const handleSaveCustomTemplate = (template: SavedCustomTemplate) => {
    setCustomTemplates((prev) => {
      const existingIndex = prev.findIndex((t) => t.id === template.id);
      let updated: SavedCustomTemplate[];
      if (existingIndex >= 0) {
        updated = [...prev];
        updated[existingIndex] = template;
      } else {
        updated = [template, ...prev];
      }
      idbSaveCustomTemplates(updated);
      return updated;
    });
    triggerToast(`Saved template "${template.name}" successfully!`);
  };

  const handleDeleteCustomTemplate = (templateId: string) => {
    setCustomTemplates((prev) => {
      const updated = prev.filter((t) => t.id !== templateId);
      idbSaveCustomTemplates(updated);
      return updated;
    });
    triggerToast('Custom template deleted.');
  };

  // Student CRUD Operations
  const handleSaveStudent = (savedStudent: Student) => {
    setStudents((prev) => {
      const exists = prev.some((s) => s.id === savedStudent.id);
      let updated: Student[];
      if (exists) {
        updated = prev.map((s) => (s.id === savedStudent.id ? savedStudent : s));
        triggerToast(`Updated record for ${savedStudent.name}`);
      } else {
        updated = [savedStudent, ...prev];
        triggerToast(`Enrolled new student: ${savedStudent.name}`);
      }
      idbSaveStudents(updated, false);
      setIsDemoMode(false);
      return updated;
    });
  };

  const handleDeleteStudent = (studentId: string) => {
    setStudents((prev) => {
      const updated = prev.filter((s) => s.id !== studentId);
      idbSaveStudents(updated, isDemoMode && updated.length > 0);
      triggerToast('Student record removed.');
      return updated;
    });
  };

  const handleToggleCardGenerated = (studentId: string) => {
    setStudents((prev) => {
      const updated = prev.map((s) =>
        s.id === studentId
          ? {
              ...s,
              isCardGenerated: !s.isCardGenerated,
              generatedDate: !s.isCardGenerated ? new Date().toISOString().split('T')[0] : undefined,
            }
          : s
      );
      idbSaveStudents(updated, isDemoMode);
      return updated;
    });
  };

  const handleBulkGenerate = (studentIds: string[]) => {
    setStudents((prev) => {
      const updated = prev.map((s) =>
        studentIds.includes(s.id)
          ? {
              ...s,
              isCardGenerated: true,
              generatedDate: new Date().toISOString().split('T')[0],
            }
          : s
      );
      idbSaveStudents(updated, isDemoMode);
      return updated;
    });
    triggerToast(`Batch generated ${studentIds.length} cards.`);
  };

  const handleImportComplete = (importedStudents: Student[], mode: 'append' | 'replace') => {
    setStudents((prev) => {
      const updated = mode === 'replace' ? importedStudents : [...importedStudents, ...prev];
      idbSaveStudents(updated, false);
      setIsDemoMode(false);
      return updated;
    });
    triggerToast(`Successfully imported ${importedStudents.length} student records.`);
    setActiveTab('students');
  };

  const handleSaveSettings = (newSettings: SchoolSettings) => {
    setSchoolSettings(newSettings);
    idbSaveSettings(newSettings);
    triggerToast('School branding and configuration saved.');
  };

  const handleRestoreData = (restoredSettings: SchoolSettings, restoredStudents: Student[]) => {
    setStudents(restoredStudents);
    setSchoolSettings(restoredSettings);
    idbSaveStudents(restoredStudents, false);
    idbSaveSettings(restoredSettings);
    setIsDemoMode(false);
    triggerToast('Database backup successfully restored.');
  };

  const handleResetToDemo = () => {
    setStudents(DEMO_STUDENTS);
    setSchoolSettings(DEFAULT_SCHOOL_SETTINGS);
    idbSaveStudents(DEMO_STUDENTS, true);
    idbSaveSettings(DEFAULT_SCHOOL_SETTINGS);
    setIsDemoMode(true);
    triggerToast('Reset to default Indian school demonstration dataset.');
  };

  const handleUpdateStudentPhotoCrop = (
    studentId: string,
    crop: { zoom: number; x: number; y: number }
  ) => {
    setStudents((prev) => {
      const updated = prev.map((s) =>
        s.id === studentId ? { ...s, photoCrop: crop } : s
      );
      idbSaveStudents(updated, isDemoMode);
      return updated;
    });
  };

  const handleUpdateStudentsBulk = (updatedStudents: Student[]) => {
    setStudents(updatedStudents);
    idbSaveStudents(updatedStudents, false);
    setIsDemoMode(false);
    triggerToast(`Bulk attached photographs for ${updatedStudents.filter((s) => s.photoUrl).length} student records.`);
  };

  // If not authenticated, require admin login
  if (!isAuthenticated) {
    return (
      <LoginView
        schoolSettings={schoolSettings}
        onLoginSuccess={handleLoginSuccess}
      />
    );
  }

  return (
    <div className="print-app-shell flex h-screen bg-[#F8FAFC] overflow-hidden antialiased font-sans text-slate-800">
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        schoolSettings={schoolSettings}
        studentCount={students.length}
        isDemoMode={isDemoMode}
      />

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header Bar */}
        <TopBar
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          onOpenAddModal={() => {
            setStudentToEdit(null);
            setIsStudentModalOpen(true);
          }}
          totalStudents={students.length}
          onLogout={handleLogout}
        />

        {/* Global Toast Notification */}
        {toastMessage && (
          <div className="no-print fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-xs px-4 py-2.5 rounded-lg shadow-lg flex items-center gap-2 border border-slate-700 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Scrollable View Container */}
        <main className="print-main flex-1 overflow-y-auto">
          {activeTab === 'dashboard' && (
            <DashboardView
              students={students}
              schoolSettings={schoolSettings}
              onNavigate={setActiveTab}
              onSelectStudentForEditor={(studentId) => {
                setSelectedStudentForEditor(studentId);
                setActiveTab('editor');
              }}
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
              onUpdateStudentsBulk={handleUpdateStudentsBulk}
            />
          )}

          {activeTab === 'import' && (
            <ExcelImportWizard
              schoolSettings={schoolSettings}
              onImportComplete={handleImportComplete}
              onNavigate={setActiveTab}
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
                  defaultOrientation: templateId.startsWith('portrait_') ? 'portrait' : 'landscape',
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
            />
          )}

          {activeTab === 'export' && (
            <PrintExportView
              students={students}
              schoolSettings={schoolSettings}
              savedCustomTemplates={customTemplates}
              onMarkCardsAsGenerated={handleBulkGenerate}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsView
              settings={schoolSettings}
              students={students}
              onSaveSettings={handleSaveSettings}
              onRestoreData={handleRestoreData}
              onResetToDemo={handleResetToDemo}
            />
          )}
        </main>
      </div>

      {/* Enroll / Edit Student Modal */}
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
    </div>
  );
}
