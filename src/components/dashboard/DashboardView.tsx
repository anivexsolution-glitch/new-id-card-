import React, { useMemo } from 'react';
import {
  ActiveNavTab,
  AuthenticatedUser,
  ExportHistoryRecord,
  SavedCustomTemplate,
  SchoolSettings,
  Student,
} from '../../types';
import { DEMO_STUDENTS, TEMPLATE_REGISTRY } from '../../constants/initialData';
import { CR80Card } from '../cards/CR80Card';
import { CardSurface, StatusText } from '../ui/EnterpriseUI';
import {
  Users,
  CheckCircle2,
  Clock,
  ImageOff,
  Plus,
  UploadCloud,
  Printer,
  Sliders,
  ArrowRight,
  RotateCcw,
  Layers,
  FolderHeart,
  History,
  UserPlus,
} from 'lucide-react';

interface DashboardViewProps {
  students: Student[];
  schoolSettings: SchoolSettings;
  currentUser?: AuthenticatedUser | null;
  savedCustomTemplates?: SavedCustomTemplate[];
  exportHistory?: ExportHistoryRecord[];
  isDemoMode?: boolean;
  onNavigate: (tab: ActiveNavTab) => void;
  onSelectStudentForEditor: (studentId: string) => void;
  onOpenAddModal?: () => void;
  onResetToDemo?: () => void;
  onClearData?: () => void;
  onToggleCardGenerated?: (studentId: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  students,
  schoolSettings,
  currentUser,
  savedCustomTemplates = [],
  exportHistory = [],
  isDemoMode = false,
  onNavigate,
  onSelectStudentForEditor,
  onOpenAddModal,
  onResetToDemo,
  onClearData,
}) => {
  const totalStudents = students.length;
  const generatedCount = students.filter((s) => s.isCardGenerated).length;
  const pendingCount = totalStudents - generatedCount;
  const missingPhotosCount = students.filter((s) => !s.photoUrl).length;

  const sampleStudent = students[0] || DEMO_STUDENTS[0];
  const currentTemplateMeta = TEMPLATE_REGISTRY.find(
    (t) => t.id === schoolSettings.defaultTemplateId
  );

  const formattedDate = useMemo(
    () =>
      new Date().toLocaleDateString('en-IN', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }),
    []
  );

  // Class-wise real breakdown
  const classSummary = useMemo(() => {
    const map = new Map<
      string,
      { total: number; generated: number; missingPhotos: number }
    >();
    students.forEach((s) => {
      const cls = (s.classGrade || 'Unassigned').trim();
      const entry = map.get(cls) || { total: 0, generated: 0, missingPhotos: 0 };
      entry.total += 1;
      if (s.isCardGenerated) entry.generated += 1;
      if (!s.photoUrl) entry.missingPhotos += 1;
      map.set(cls, entry);
    });
    return Array.from(map.entries())
      .map(([name, stats]) => ({
        name,
        ...stats,
        pending: stats.total - stats.generated,
      }))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  }, [students]);

  // Real activity feed derived from students, custom templates, and exports
  const recentActivities = useMemo(() => {
    const events: {
      id: string;
      title: string;
      detail: string;
      time: string;
      ts: number;
      tab: ActiveNavTab;
    }[] = [];

    exportHistory.slice(0, 4).forEach((exp) => {
      events.push({
        id: `act_exp_${exp.id}`,
        title: `${exp.format} exported`,
        detail: `${exp.cardCount} card${exp.cardCount === 1 ? '' : 's'} · ${exp.templateName}`,
        time: new Date(exp.timestamp).toLocaleDateString(),
        ts: new Date(exp.timestamp).getTime(),
        tab: 'history',
      });
    });

    savedCustomTemplates.slice(0, 3).forEach((tpl) => {
      events.push({
        id: `act_tpl_${tpl.id}`,
        title: `Saved design "${tpl.name}"`,
        detail: `${tpl.orientation === 'portrait' ? 'Portrait' : 'Landscape'} custom project`,
        time: new Date(tpl.updatedAt || tpl.createdAt).toLocaleDateString(),
        ts: new Date(tpl.updatedAt || tpl.createdAt).getTime(),
        tab: 'editor',
      });
    });

    students.slice(0, 4).forEach((std) => {
      events.push({
        id: `act_std_${std.id}`,
        title: std.isCardGenerated ? `Card marked ready · ${std.name}` : `Enrolled · ${std.name}`,
        detail: `${std.classGrade || 'Class unassigned'} · Roll ${std.rollNo || '—'}`,
        time: std.generatedDate || new Date(std.createdAt).toLocaleDateString(),
        ts: new Date(std.generatedDate || std.createdAt).getTime() || 0,
        tab: 'students',
      });
    });

    return events.sort((a, b) => b.ts - a.ts).slice(0, 6);
  }, [students, savedCustomTemplates, exportHistory]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto space-y-6">
      {/* Top Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-[#E3E7EB]">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-[#75808C] mb-1">
            <span className="font-semibold text-[#536477]">{schoolSettings.schoolName}</span>
            <span aria-hidden="true">·</span>
            <span>{formattedDate}</span>
            <span aria-hidden="true">·</span>
            <span>Session {schoolSettings.academicSession}</span>
            {isDemoMode && (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-[#C18A38] font-semibold">Demo Dataset Active</span>
              </>
            )}
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#202B38] tracking-tight">
            Welcome back, {currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Administrator'}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {isDemoMode && onClearData ? (
            <button
              type="button"
              onClick={onClearData}
              className="h-9 px-3.5 text-xs font-medium text-[#536477] bg-white border border-[#E3E7EB] rounded-lg hover:bg-[#F0F2F4] transition-colors"
            >
              Clear Demo Data
            </button>
          ) : (
            onResetToDemo && (
              <button
                type="button"
                onClick={onResetToDemo}
                className="h-9 px-3.5 text-xs font-medium text-[#536477] bg-white border border-[#E3E7EB] rounded-lg hover:bg-[#F0F2F4] transition-colors flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Load Demo Data</span>
              </button>
            )
          )}

          <button
            type="button"
            onClick={() => onNavigate('editor')}
            className="h-9 px-4 text-xs font-semibold text-white bg-[#24364B] hover:bg-[#304A64] rounded-lg transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Create New ID Card</span>
          </button>
        </div>
      </div>

      {/* Real-Data Statistics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <CardSurface padding="md">
          <div className="flex items-center justify-between text-[#75808C]">
            <span className="text-xs font-medium">Total Students</span>
            <Users className="w-4 h-4 text-[#536477]" />
          </div>
          <div className="text-2xl font-bold text-[#202B38] tabular-nums mt-2">
            {totalStudents}
          </div>
          <p className="text-xs text-[#75808C] mt-1">
            {classSummary.length} {classSummary.length === 1 ? 'class' : 'classes'} recorded
          </p>
        </CardSurface>

        <CardSurface padding="md">
          <div className="flex items-center justify-between text-[#75808C]">
            <span className="text-xs font-medium">Generated ID Cards</span>
            <CheckCircle2 className="w-4 h-4 text-[#25845A]" />
          </div>
          <div className="text-2xl font-bold text-[#202B38] tabular-nums mt-2">
            {generatedCount}
          </div>
          <p className="text-xs text-[#25845A] font-medium mt-1 tabular-nums">
            {totalStudents > 0
              ? `${Math.round((generatedCount / totalStudents) * 100)}% of roster ready`
              : 'No student records'}
          </p>
        </CardSurface>

        <CardSurface padding="md">
          <div className="flex items-center justify-between text-[#75808C]">
            <span className="text-xs font-medium">Pending ID Cards</span>
            <Clock className="w-4 h-4 text-[#C18A38]" />
          </div>
          <div className="text-2xl font-bold text-[#202B38] tabular-nums mt-2">
            {pendingCount}
          </div>
          <p className="text-xs text-[#75808C] mt-1">
            {pendingCount === 0 ? 'No pending approvals' : 'Awaiting batch generation'}
          </p>
        </CardSurface>

        <CardSurface padding="md">
          <div className="flex items-center justify-between text-[#75808C]">
            <span className="text-xs font-medium">Missing Student Photos</span>
            <ImageOff className="w-4 h-4 text-[#C44949]" />
          </div>
          <div className="text-2xl font-bold text-[#202B38] tabular-nums mt-2">
            {missingPhotosCount}
          </div>
          <p className="text-xs text-[#75808C] mt-1">
            {missingPhotosCount === 0 ? 'All portraits uploaded' : 'Upload via Students or ZIP'}
          </p>
        </CardSurface>
      </div>

      {/* Main Content Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (7 cols): Class-wise Student Overview + Quick Actions */}
        <div className="lg:col-span-7 space-y-6">
          {/* Quick Actions */}
          <CardSurface padding="md">
            <h2 className="text-sm font-bold text-[#202B38] mb-3">Quick Actions</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <button
                type="button"
                onClick={() => (onOpenAddModal ? onOpenAddModal() : onNavigate('students'))}
                className="p-3 rounded-lg border border-[#E3E7EB] bg-[#F5F6F7]/60 hover:bg-[#F0F2F4] text-left transition-colors"
              >
                <UserPlus className="w-4 h-4 text-[#24364B] mb-2" />
                <span className="text-xs font-semibold text-[#202B38] block">Add Student</span>
                <span className="text-[11px] text-[#75808C] block mt-0.5">Single record</span>
              </button>

              <button
                type="button"
                onClick={() => onNavigate('import')}
                className="p-3 rounded-lg border border-[#E3E7EB] bg-[#F5F6F7]/60 hover:bg-[#F0F2F4] text-left transition-colors"
              >
                <UploadCloud className="w-4 h-4 text-[#24364B] mb-2" />
                <span className="text-xs font-semibold text-[#202B38] block">Bulk Import</span>
                <span className="text-[11px] text-[#75808C] block mt-0.5">Excel or CSV</span>
              </button>

              <button
                type="button"
                onClick={() => onNavigate('editor')}
                className="p-3 rounded-lg border border-[#E3E7EB] bg-[#F5F6F7]/60 hover:bg-[#F0F2F4] text-left transition-colors"
              >
                <Sliders className="w-4 h-4 text-[#24364B] mb-2" />
                <span className="text-xs font-semibold text-[#202B38] block">Card Studio</span>
                <span className="text-[11px] text-[#75808C] block mt-0.5">Customize design</span>
              </button>

              <button
                type="button"
                onClick={() => onNavigate('export')}
                className="p-3 rounded-lg border border-[#E3E7EB] bg-[#F5F6F7]/60 hover:bg-[#F0F2F4] text-left transition-colors"
              >
                <Printer className="w-4 h-4 text-[#24364B] mb-2" />
                <span className="text-xs font-semibold text-[#202B38] block">Print Sheets</span>
                <span className="text-[11px] text-[#75808C] block mt-0.5">A4 &amp; PVC trays</span>
              </button>
            </div>
          </CardSurface>

          {/* Class-wise Student Overview */}
          <CardSurface padding="none" className="overflow-hidden">
            <div className="px-5 py-4 border-b border-[#E3E7EB] flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-[#202B38]">Class-wise Student Overview</h2>
                <p className="text-xs text-[#75808C] mt-0.5">
                  Completion status grouped by enrolled class
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('students')}
                className="text-xs font-semibold text-[#24364B] hover:text-[#304A64] flex items-center gap-1"
              >
                <span>Open Directory</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {classSummary.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#75808C]">
                No student records found. Add a student or import an Excel roster to view class breakdowns.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#F5F6F7] border-b border-[#E3E7EB] text-[#75808C] font-semibold">
                      <th className="py-2.5 px-5">Class / Grade</th>
                      <th className="py-2.5 px-3 text-right">Students</th>
                      <th className="py-2.5 px-3 text-right">Generated</th>
                      <th className="py-2.5 px-3 text-right">Pending</th>
                      <th className="py-2.5 px-3 text-right">No Photo</th>
                      <th className="py-2.5 px-5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E3E7EB]">
                    {classSummary.map((cls) => (
                      <tr key={cls.name} className="hover:bg-[#F5F6F7]/70 transition-colors">
                        <td className="py-3 px-5 font-semibold text-[#202B38]">{cls.name}</td>
                        <td className="py-3 px-3 text-right font-mono tabular-nums text-[#202B38]">
                          {cls.total}
                        </td>
                        <td className="py-3 px-3 text-right font-mono tabular-nums text-[#25845A] font-semibold">
                          {cls.generated}
                        </td>
                        <td className="py-3 px-3 text-right font-mono tabular-nums text-[#C18A38]">
                          {cls.pending}
                        </td>
                        <td className="py-3 px-3 text-right font-mono tabular-nums text-[#75808C]">
                          {cls.missingPhotos}
                        </td>
                        <td className="py-3 px-5 text-right">
                          <button
                            type="button"
                            onClick={() => onNavigate('export')}
                            className="text-xs font-semibold text-[#24364B] hover:underline"
                          >
                            Print
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardSurface>

          {/* Recent Activities */}
          <CardSurface padding="none" className="overflow-hidden">
            <div className="px-5 py-4 border-b border-[#E3E7EB] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-[#536477]" />
                <h2 className="text-sm font-bold text-[#202B38]">Recent Activities</h2>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('history')}
                className="text-xs font-semibold text-[#24364B] hover:text-[#304A64] flex items-center gap-1"
              >
                <span>Export History</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
            {recentActivities.length === 0 ? (
              <div className="p-6 text-xs text-[#75808C]">No activity recorded yet.</div>
            ) : (
              <div className="divide-y divide-[#E3E7EB]">
                {recentActivities.map((act) => (
                  <button
                    key={act.id}
                    type="button"
                    onClick={() => onNavigate(act.tab)}
                    className="w-full px-5 py-3 text-left hover:bg-[#F5F6F7]/70 flex items-center justify-between gap-4 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-[#202B38] truncate">{act.title}</p>
                      <p className="text-[11px] text-[#75808C] truncate mt-0.5">{act.detail}</p>
                    </div>
                    <span className="text-[11px] font-mono tabular-nums text-[#75808C] shrink-0">
                      {act.time}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </CardSurface>
        </div>

        {/* Right Column (5 cols): Active Template & Saved Projects */}
        <div className="lg:col-span-5 space-y-6">
          {/* Active Default / Recently Used Template */}
          <CardSurface padding="md" className="space-y-4">
            <div className="flex items-center justify-between border-b border-[#E3E7EB] pb-3">
              <div>
                <h2 className="text-sm font-bold text-[#202B38]">Active Default Template</h2>
                <p className="text-xs text-[#75808C] mt-0.5">
                  {currentTemplateMeta?.name || schoolSettings.defaultTemplateId} ·{' '}
                  {schoolSettings.defaultOrientation === 'portrait' ? 'Portrait' : 'Landscape'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('templates')}
                className="text-xs font-semibold text-[#24364B] hover:underline flex items-center gap-1"
              >
                <span>Browse 30</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="bg-[#F0F2F4] p-5 rounded-lg border border-[#E3E7EB] flex items-center justify-center">
              <div
                className={`w-full shadow-md rounded-[8px] overflow-hidden ${
                  schoolSettings.defaultOrientation === 'portrait'
                    ? 'max-w-[230px]'
                    : 'max-w-[340px]'
                }`}
              >
                <CR80Card
                  student={sampleStudent}
                  schoolSettings={schoolSettings}
                  customization={{
                    templateId: schoolSettings.defaultTemplateId,
                    orientation: schoolSettings.defaultOrientation,
                    side: 'front',
                  }}
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <StatusText tone="success" label="CR80 · 85.60 × 53.98 mm" />
              <button
                type="button"
                onClick={() => {
                  if (sampleStudent) onSelectStudentForEditor(sampleStudent.id);
                  onNavigate('editor');
                }}
                className="text-xs font-semibold text-[#24364B] hover:text-[#304A64] flex items-center gap-1.5"
              >
                <Sliders className="w-3.5 h-3.5 text-[#A77C50]" />
                <span>Open in ID Card Studio</span>
              </button>
            </div>
          </CardSurface>

          {/* Recent ID Card Projects (Saved Custom Templates) */}
          <CardSurface padding="md" className="space-y-3">
            <div className="flex items-center justify-between border-b border-[#E3E7EB] pb-3">
              <div className="flex items-center gap-2">
                <FolderHeart className="w-4 h-4 text-[#A77C50]" />
                <h2 className="text-sm font-bold text-[#202B38]">Recent ID Card Projects</h2>
              </div>
              <span className="text-xs font-mono tabular-nums text-[#75808C]">
                {savedCustomTemplates.length} saved
              </span>
            </div>

            {savedCustomTemplates.length === 0 ? (
              <div className="py-5 text-center space-y-2">
                <Layers className="w-6 h-6 text-[#75808C] mx-auto" />
                <p className="text-xs text-[#75808C]">
                  No custom card projects saved yet. Customize any template in the studio to save reusable presets.
                </p>
                <button
                  type="button"
                  onClick={() => onNavigate('editor')}
                  className="text-xs font-semibold text-[#24364B] hover:underline"
                >
                  Open ID Card Studio
                </button>
              </div>
            ) : (
              <div className="divide-y divide-[#E3E7EB]">
                {savedCustomTemplates.slice(0, 4).map((project) => (
                  <div
                    key={project.id}
                    className="py-2.5 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-[#202B38] truncate">
                        {project.name}
                      </p>
                      <p className="text-[11px] text-[#75808C] mt-0.5 capitalize">
                        {project.orientation} · Updated{' '}
                        {new Date(project.updatedAt || project.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onNavigate('editor')}
                      className="px-2.5 py-1 text-xs font-semibold text-[#24364B] border border-[#E3E7EB] rounded-lg hover:bg-[#F5F6F7] shrink-0"
                    >
                      Open
                    </button>
                  </div>
                ))}
              </div>
            )}
          </CardSurface>
        </div>
      </div>
    </div>
  );
};
