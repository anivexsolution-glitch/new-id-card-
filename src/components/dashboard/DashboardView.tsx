import React from 'react';
import { ActiveNavTab, SchoolSettings, Student } from '../../types';
import { DEMO_STUDENTS } from '../../constants/initialData';
import { CR80Card } from '../cards/CR80Card';
import {
  Users,
  CreditCard,
  Bus,
  FileCheck2,
  UploadCloud,
  ArrowRight,
  RotateCcw,
  Sparkles,
  Printer,
  Sliders,
  CheckCircle2,
  Clock,
} from 'lucide-react';

interface DashboardViewProps {
  students: Student[];
  schoolSettings: SchoolSettings;
  isDemoMode?: boolean;
  onNavigate: (tab: ActiveNavTab) => void;
  onSelectStudentForEditor: (studentId: string) => void;
  onResetToDemo?: () => void;
  onClearData?: () => void;
  onToggleCardGenerated?: (studentId: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  students,
  schoolSettings,
  isDemoMode = false,
  onNavigate,
  onSelectStudentForEditor,
  onResetToDemo,
  onClearData,
  onToggleCardGenerated,
}) => {
  const totalStudents = students.length;
  const cardsGenerated = students.filter((s) => s.isCardGenerated).length;
  const pendingGeneration = totalStudents - cardsGenerated;
  const conveyanceCount = students.filter((s) => s.conveyance === 'Yes').length;
  const missingPhotos = students.filter((s) => !s.photoUrl).length;

  const sampleStudent = students[0] || DEMO_STUDENTS[0];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header with Title and Mode Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              School ID Card Operations
            </h2>
            {isDemoMode ? (
              <span className="text-xs font-medium bg-amber-50 text-amber-800 border border-amber-300 px-2.5 py-0.5 rounded-full">
                Demo Roster Active (5 Sample Records)
              </span>
            ) : (
              <span className="text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-300 px-2.5 py-0.5 rounded-full">
                Live School Records
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            CR80 physical standard (85.60 × 53.98 mm) · Session {schoolSettings.academicSession} · {schoolSettings.schoolName}
          </p>
        </div>

        {/* Operational Actions */}
        <div className="flex items-center gap-2.5">
          {isDemoMode ? (
            <button
              onClick={onClearData}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Clear Demo Data
            </button>
          ) : (
            <button
              onClick={onResetToDemo}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              <span>Load Demo Data</span>
            </button>
          )}

          <button
            onClick={() => onNavigate('import')}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Import Excel Roster</span>
          </button>
        </div>
      </div>

      {/* Operational KPI Numbers (Real Data Only, Tabular Figures) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Total Students</span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 tabular-nums">
            {totalStudents}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {isDemoMode ? 'Sample school dataset' : 'Imported school database'}
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Cards Generated</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 tabular-nums">
            {cardsGenerated}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {pendingGeneration > 0 ? `${pendingGeneration} pending approval` : 'All records processed'}
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Conveyance Enrolled</span>
            <Bus className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 tabular-nums">
            {conveyanceCount}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Bus pass authorization flag
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Missing Photos</span>
            <Clock className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 tabular-nums">
            {missingPhotos}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {missingPhotos === 0 ? 'All student portraits verified' : 'Using silhouette placeholder'}
          </p>
        </div>
      </div>

      {/* Main Split: Quick Production & Live Template Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Active Template Spotlight */}
        <div className="lg:col-span-5 bg-white p-5 rounded-xl border border-slate-200 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Current Default Template</h3>
              <p className="text-xs text-slate-500 capitalize">
                {schoolSettings.defaultTemplateId.replace(/_/g, ' ')} ({schoolSettings.defaultOrientation})
              </p>
            </div>
            <button
              onClick={() => onNavigate('templates')}
              className="text-xs font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              <span>Change Template</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Genuine Real Render of the ID Card */}
          <div className="bg-slate-100/70 p-4 rounded-lg flex items-center justify-center">
            <div className="w-full max-w-[340px]">
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

          <div className="flex items-center justify-between text-xs text-slate-600 pt-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
              <span>Dimensions: 85.60 × 53.98 mm</span>
            </div>
            <button
              onClick={() => onNavigate('editor')}
              className="font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Customize Layout</span>
            </button>
          </div>
        </div>

        {/* Right: Operational Next Steps & Student Roster Action */}
        <div className="lg:col-span-7 space-y-4">
          {/* Quick Excel Banner if empty or few */}
          {totalStudents === 0 ? (
            <div className="bg-white p-8 rounded-xl border border-dashed border-slate-300 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                <UploadCloud className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-slate-900">No Student Records Loaded</h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Upload your school's Excel or CSV roster with student names, parents' details, contact numbers, and addresses. Or load sample demo records.
              </p>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => onNavigate('import')}
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                >
                  Start Excel Import Wizard
                </button>
                <button
                  onClick={onResetToDemo}
                  className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Load 5 Demo Students
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white p-5 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Recent Student Roster</h3>
                  <p className="text-xs text-slate-500">
                    Showing latest entries · Click student to customize individual card
                  </p>
                </div>
                <button
                  onClick={() => onNavigate('students')}
                  className="text-xs font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1"
                >
                  <span>View All ({totalStudents})</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 font-medium">
                      <th className="py-2 px-2">Student</th>
                      <th className="py-2 px-2">Class / Roll</th>
                      <th className="py-2 px-2">Contact</th>
                      <th className="py-2 px-2">Conveyance</th>
                      <th className="py-2 px-2 text-right">Card Status</th>
                      <th className="py-2 px-2 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {students.slice(0, 5).map((student) => (
                      <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 px-2">
                          <div className="flex items-center gap-2.5">
                            {student.photoUrl ? (
                              <img
                                src={student.photoUrl}
                                alt={student.name}
                                className="w-7 h-7 rounded object-cover border border-slate-200"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div className="w-7 h-7 rounded bg-slate-100 flex items-center justify-center text-slate-400 border border-slate-200">
                                <Users className="w-3.5 h-3.5" />
                              </div>
                            )}
                            <div>
                              <p className="font-semibold text-slate-900 truncate max-w-[130px]">{student.name}</p>
                              <p className="text-[10px] text-slate-400 font-mono">{student.dob}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 px-2 text-slate-600">
                          <span>{student.classGrade || 'Class X'}</span>
                          <span className="text-slate-400 block text-[10px] font-mono">Roll: {student.rollNo || '—'}</span>
                        </td>
                        <td className="py-2.5 px-2 font-mono text-slate-600 text-[11px]">
                          {student.contactNumber}
                        </td>
                        <td className="py-2.5 px-2">
                          <span
                            className={`text-[10px] font-semibold ${
                              student.conveyance === 'Yes' ? 'text-emerald-700' : 'text-slate-500'
                            }`}
                          >
                            {student.conveyance === 'Yes' ? 'Bus Route' : 'Private'}
                          </span>
                        </td>
                        <td className="py-2.5 px-2 text-right">
                          <button
                            onClick={() => onToggleCardGenerated && onToggleCardGenerated(student.id)}
                            className={`text-[10px] font-medium px-2 py-0.5 rounded transition-colors ${
                              student.isCardGenerated
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                                : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200'
                            }`}
                          >
                            {student.isCardGenerated ? 'Generated' : 'Pending'}
                          </button>
                        </td>
                        <td className="py-2.5 px-2 text-right">
                          <button
                            onClick={() => {
                              onSelectStudentForEditor(student.id);
                              onNavigate('editor');
                            }}
                            className="text-xs font-semibold text-blue-600 hover:text-blue-800"
                          >
                            Edit Card
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Batch Actions footer */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500 font-mono">
                  {cardsGenerated} of {totalStudents} cards approved
                </span>
                <button
                  onClick={() => onNavigate('export')}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Generate Multi-Card Print Sheets</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
