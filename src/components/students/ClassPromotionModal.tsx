import React, { useEffect, useMemo, useState } from 'react';
import { SchoolSettings, Student } from '../../types';
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  GraduationCap,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  Users,
  X,
} from 'lucide-react';

interface ClassPromotionModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  schoolSettings: SchoolSettings;
  onApplyRollover: (
    updatedStudents: Student[],
    nextSettings: SchoolSettings | null,
    summaryMessage: string
  ) => void;
}

interface ClassMappingRow {
  sourceClass: string;
  count: number;
  selected: boolean;
  action: 'promote' | 'graduate_expire';
  targetClass: string;
}

const ROMAN_GRADES = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

function formatOrdinal(num: number): string {
  if (num === 1) return '1st';
  if (num === 2) return '2nd';
  if (num === 3) return '3rd';
  return `${num}th`;
}

export function suggestNextAcademicSession(currentSession: string): string {
  const clean = (currentSession || '').trim();
  const shortMatch = clean.match(/^(\d{4})\s*([-\/])\s*(\d{2})$/);
  if (shortMatch) {
    const startYear = Number(shortMatch[1]) + 1;
    const endTwo = String((Number(shortMatch[3]) + 1) % 100).padStart(2, '0');
    return `${startYear}${shortMatch[2]}${endTwo}`;
  }
  const fullMatch = clean.match(/^(\d{4})\s*([-\/])\s*(\d{4})$/);
  if (fullMatch) {
    const startYear = Number(fullMatch[1]) + 1;
    const endYear = Number(fullMatch[3]) + 1;
    return `${startYear}${fullMatch[2]}${endYear}`;
  }
  const singleYear = clean.match(/^(\d{4})$/);
  if (singleYear) {
    const y = Number(singleYear[1]) + 1;
    return `${y}-${String((y + 1) % 100).padStart(2, '0')}`;
  }
  const nowYear = new Date().getFullYear();
  return `${nowYear}-${String((nowYear + 1) % 100).padStart(2, '0')}`;
}

export function suggestValidUntilForSession(sessionStr: string): string {
  const clean = (sessionStr || '').trim();
  const fullMatch = clean.match(/(\d{4})\s*[-\/]\s*(\d{4})$/);
  if (fullMatch) {
    return `31/03/${fullMatch[2]}`;
  }
  const shortMatch = clean.match(/^(\d{4})\s*[-\/]\s*(\d{2})$/);
  if (shortMatch) {
    const century = shortMatch[1].slice(0, 2);
    return `31/03/${century}${shortMatch[2]}`;
  }
  const year = new Date().getFullYear() + 1;
  return `31/03/${year}`;
}

export function suggestNextClass(rawClassGrade?: string): {
  targetClass: string;
  isGraduating: boolean;
} {
  const raw = (rawClassGrade || '').trim();
  if (!raw) return { targetClass: 'Class 1st', isGraduating: false };

  // Split section suffix (e.g. "Class 10th - A" or "Class 12th - Science")
  const dashIdx = raw.indexOf('-');
  const base = (dashIdx >= 0 ? raw.slice(0, dashIdx) : raw).trim();
  const suffix = dashIdx >= 0 ? ` ${raw.slice(dashIdx).trim()}` : '';
  const lower = base.toLowerCase();

  if (lower.includes('playgroup') || lower.includes('pre-nursery') || lower === 'pg') {
    return { targetClass: `Nursery${suffix}`, isGraduating: false };
  }
  if (lower === 'nursery' || lower === 'nur') {
    return { targetClass: `LKG${suffix}`, isGraduating: false };
  }
  if (lower === 'lkg' || lower === 'kg-1' || lower === 'kg 1' || lower === 'lower kg') {
    return { targetClass: `UKG${suffix}`, isGraduating: false };
  }
  if (lower === 'ukg' || lower === 'kg-2' || lower === 'kg 2' || lower === 'upper kg' || lower === 'prep') {
    return { targetClass: `Class 1st${suffix}`, isGraduating: false };
  }

  // Numeric grade: e.g. "Class 10th", "Grade 8", "Std 5", "10th", "Class 12"
  const numMatch = base.match(/^(Class|Grade|Std\.?)?\s*(\d{1,2})(?:st|nd|rd|th)?$/i);
  if (numMatch) {
    const prefix = numMatch[1] ? `${numMatch[1]} ` : 'Class ';
    const gradeNum = Number(numMatch[2]);
    if (gradeNum >= 12) {
      return { targetClass: `Alumni${suffix}`, isGraduating: true };
    }
    const usesOrdinal = /\d+(st|nd|rd|th)/i.test(base) || /^class/i.test(base);
    const nextLabel = usesOrdinal ? formatOrdinal(gradeNum + 1) : String(gradeNum + 1);
    return { targetClass: `${prefix}${nextLabel}${suffix}`, isGraduating: false };
  }

  // Roman numeral grade: e.g. "Class X", "IX", "Grade XII"
  const romanMatch = base.match(/^(Class|Grade|Std\.?)?\s*(XII|XI|IX|VIII|VII|VI|IV|V|III|II|I|X)$/i);
  if (romanMatch) {
    const prefix = romanMatch[1] ? `${romanMatch[1]} ` : 'Class ';
    const idx = ROMAN_GRADES.indexOf(romanMatch[2].toUpperCase());
    if (idx === ROMAN_GRADES.length - 1) {
      return { targetClass: `Alumni${suffix}`, isGraduating: true };
    }
    if (idx >= 0) {
      return { targetClass: `${prefix}${ROMAN_GRADES[idx + 1]}${suffix}`, isGraduating: false };
    }
  }

  return { targetClass: raw, isGraduating: false };
}

export const ClassPromotionModal: React.FC<ClassPromotionModalProps> = ({
  isOpen,
  onClose,
  students,
  schoolSettings,
  onApplyRollover,
}) => {
  const [newSession, setNewSession] = useState<string>(() =>
    suggestNextAcademicSession(schoolSettings.academicSession)
  );
  const [newValidUntil, setNewValidUntil] = useState<string>(() =>
    suggestValidUntilForSession(suggestNextAcademicSession(schoolSettings.academicSession))
  );
  const [updateSettingsSession, setUpdateSettingsSession] = useState<boolean>(true);
  const [resetCardGenerated, setResetCardGenerated] = useState<boolean>(true);
  const [activatePromotedCards, setActivatePromotedCards] = useState<boolean>(true);
  const [rows, setRows] = useState<ClassMappingRow[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    const nextSess = suggestNextAcademicSession(schoolSettings.academicSession);
    setNewSession(nextSess);
    setNewValidUntil(suggestValidUntilForSession(nextSess));

    const counts = new Map<string, number>();
    students.forEach((s) => {
      const key = (s.classGrade || 'Unassigned').trim() || 'Unassigned';
      counts.set(key, (counts.get(key) || 0) + 1);
    });

    const initialRows: ClassMappingRow[] = Array.from(counts.entries())
      .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
      .map(([sourceClass, count]) => {
        const suggestion = suggestNextClass(sourceClass);
        return {
          sourceClass,
          count,
          selected: true,
          action: suggestion.isGraduating ? 'graduate_expire' : 'promote',
          targetClass: suggestion.targetClass,
        };
      });

    setRows(initialRows);
  }, [isOpen, students, schoolSettings.academicSession]);

  const summary = useMemo(() => {
    let promoted = 0;
    let graduated = 0;
    let skipped = 0;
    rows.forEach((r) => {
      if (!r.selected) {
        skipped += r.count;
      } else if (r.action === 'graduate_expire') {
        graduated += r.count;
      } else {
        promoted += r.count;
      }
    });
    return { promoted, graduated, skipped };
  }, [rows]);

  if (!isOpen) return null;

  const handleConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanSession = newSession.trim() || schoolSettings.academicSession;
    const cleanValidUntil = newValidUntil.trim();
    const mappingByClass = new Map<string, ClassMappingRow>();
    rows.forEach((r) => mappingByClass.set(r.sourceClass, r));

    const nowIso = new Date().toISOString();
    const updatedStudents: Student[] = students.map((student) => {
      const key = (student.classGrade || 'Unassigned').trim() || 'Unassigned';
      const row = mappingByClass.get(key);
      if (!row || !row.selected) {
        return student;
      }

      if (row.action === 'graduate_expire') {
        return {
          ...student,
          classGrade: row.targetClass.trim() || `Alumni (${schoolSettings.academicSession})`,
          session: cleanSession,
          cardStatus: 'expired',
          statusReason: `Graduated / completed ${schoolSettings.academicSession}`,
          statusUpdatedAt: nowIso,
          isCardGenerated: resetCardGenerated ? false : student.isCardGenerated,
          generatedDate: resetCardGenerated ? undefined : student.generatedDate,
        };
      }

      return {
        ...student,
        classGrade: row.targetClass.trim() || student.classGrade,
        session: cleanSession,
        validUntil: cleanValidUntil || student.validUntil,
        cardStatus: activatePromotedCards ? 'active' : student.cardStatus || 'active',
        statusReason: activatePromotedCards ? '' : student.statusReason,
        statusUpdatedAt: nowIso,
        isCardGenerated: resetCardGenerated ? false : student.isCardGenerated,
        generatedDate: resetCardGenerated ? undefined : student.generatedDate,
      };
    });

    const nextSettings: SchoolSettings | null = updateSettingsSession
      ? {
          ...schoolSettings,
          academicSession: cleanSession,
          defaultCardValidUntil: cleanValidUntil || schoolSettings.defaultCardValidUntil,
        }
      : null;

    const parts: string[] = [];
    if (summary.promoted > 0) parts.push(`${summary.promoted} promoted to ${cleanSession}`);
    if (summary.graduated > 0) parts.push(`${summary.graduated} marked Alumni/Expired`);

    onApplyRollover(
      updatedStudents,
      nextSettings,
      parts.length > 0 ? `Session rollover complete: ${parts.join(', ')}.` : 'Session rollover saved.'
    );
    onClose();
  };

  return (
    <div
      className="no-print fixed inset-0 z-50 bg-[#202B38]/50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="bg-white rounded-[12px] border border-[#E3E7EB] shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E3E7EB] flex items-center justify-between bg-[#F5F6F7] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#24364B] text-white flex items-center justify-center shrink-0">
              <GraduationCap className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#202B38]">
                Class Promotion &amp; New Session Rollover
              </h3>
              <p className="text-[11px] text-[#75808C]">
                Bulk promote classes, roll over academic session &amp; card validity, and graduate passing batches.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close promotion modal"
            className="p-1.5 rounded-lg text-[#75808C] hover:text-[#202B38] hover:bg-[#E3E7EB]/60"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleConfirm} className="flex-1 overflow-y-auto p-6 space-y-5 text-xs">
          {/* Session & Validity Config */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-[10px] bg-[#F5F6F7] border border-[#E3E7EB]">
            <div>
              <label className="block font-semibold text-[#202B38] mb-1">
                New Academic Session <span className="text-[#C44949]">*</span>
              </label>
              <div className="relative">
                <Calendar className="w-3.5 h-3.5 text-[#75808C] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={newSession}
                  onChange={(e) => {
                    setNewSession(e.target.value);
                  }}
                  placeholder="e.g. 2026-27"
                  className="w-full pl-8 pr-3 py-2 rounded-lg border border-[#E3E7EB] bg-white font-mono font-semibold text-[#202B38] focus:outline-none focus:border-[#24364B]"
                />
              </div>
              <p className="text-[10px] text-[#75808C] mt-1">
                Current Settings Session: <span className="font-mono font-semibold">{schoolSettings.academicSession}</span>
              </p>
            </div>

            <div>
              <label className="block font-semibold text-[#202B38] mb-1">
                New Card Valid Until Date
              </label>
              <input
                type="text"
                value={newValidUntil}
                onChange={(e) => setNewValidUntil(e.target.value)}
                placeholder="e.g. 31/03/2027"
                className="w-full px-3 py-2 rounded-lg border border-[#E3E7EB] bg-white font-mono font-semibold text-[#202B38] focus:outline-none focus:border-[#24364B]"
              />
              <p className="text-[10px] text-[#75808C] mt-1">
                Printed on ID cards &amp; checked live on QR verification.
              </p>
            </div>
          </div>

          {/* Class Mapping Table */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-[#202B38] uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#A77C50]" />
                <span>Class Progression Map ({rows.length} groups)</span>
              </h4>
              <div className="flex items-center gap-2 text-[11px]">
                <button
                  type="button"
                  onClick={() => setRows((prev) => prev.map((r) => ({ ...r, selected: true })))}
                  className="text-[#24364B] hover:underline font-semibold"
                >
                  Select All
                </button>
                <span className="text-[#E3E7EB]">|</span>
                <button
                  type="button"
                  onClick={() => setRows((prev) => prev.map((r) => ({ ...r, selected: false })))}
                  className="text-[#75808C] hover:underline"
                >
                  Unselect All
                </button>
              </div>
            </div>

            {rows.length === 0 ? (
              <div className="p-6 text-center rounded-lg border border-dashed border-[#E3E7EB] text-[#75808C]">
                No student records available to promote yet.
              </div>
            ) : (
              <div className="border border-[#E3E7EB] rounded-[10px] overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#F5F6F7] border-b border-[#E3E7EB] text-[10px] font-semibold uppercase tracking-wider text-[#75808C]">
                      <th className="py-2.5 px-3 w-9 text-center">Use</th>
                      <th className="py-2.5 px-3">Current Class</th>
                      <th className="py-2.5 px-3 w-16 text-center">Students</th>
                      <th className="py-2.5 px-3">Rollover Action</th>
                      <th className="py-2.5 px-3">New Class / Target</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E3E7EB]">
                    {rows.map((row, idx) => (
                      <tr key={row.sourceClass} className={row.selected ? 'bg-white' : 'bg-[#F5F6F7]/60 opacity-65'}>
                        <td className="py-2.5 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={row.selected}
                            onChange={(e) =>
                              setRows((prev) =>
                                prev.map((r, i) => (i === idx ? { ...r, selected: e.target.checked } : r))
                              )
                            }
                            className="rounded accent-[#24364B] cursor-pointer"
                          />
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-[#202B38]">
                          <div className="flex items-center gap-1.5">
                            <span>{row.sourceClass}</span>
                            <ArrowRight className="w-3 h-3 text-[#75808C] shrink-0" />
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#F0F2F4] text-[#202B38] font-mono font-semibold text-[11px]">
                            <Users className="w-3 h-3 text-[#536477]" />
                            {row.count}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <select
                            disabled={!row.selected}
                            value={row.action}
                            onChange={(e) => {
                              const nextAction = e.target.value as 'promote' | 'graduate_expire';
                              setRows((prev) =>
                                prev.map((r, i) =>
                                  i === idx
                                    ? {
                                        ...r,
                                        action: nextAction,
                                        targetClass:
                                          nextAction === 'graduate_expire' && !r.targetClass.toLowerCase().includes('alumni')
                                            ? `Alumni (${schoolSettings.academicSession})`
                                            : nextAction === 'promote' && r.targetClass.toLowerCase().includes('alumni')
                                            ? suggestNextClass(r.sourceClass).targetClass
                                            : r.targetClass,
                                      }
                                    : r
                                )
                              );
                            }}
                            className="w-full px-2 py-1.5 rounded-lg border border-[#E3E7EB] bg-white text-xs text-[#202B38]"
                          >
                            <option value="promote">Promote to Next Class</option>
                            <option value="graduate_expire">Pass Out (Mark Card Expired)</option>
                          </select>
                        </td>
                        <td className="py-2.5 px-3">
                          <input
                            type="text"
                            disabled={!row.selected}
                            value={row.targetClass}
                            onChange={(e) =>
                              setRows((prev) =>
                                prev.map((r, i) => (i === idx ? { ...r, targetClass: e.target.value } : r))
                              )
                            }
                            placeholder="Target class..."
                            className="w-full px-2.5 py-1.5 rounded-lg border border-[#E3E7EB] bg-white text-xs font-semibold text-[#202B38] focus:outline-none focus:border-[#24364B]"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Rollover Options */}
          <div className="space-y-2 p-4 rounded-[10px] border border-[#E3E7EB] bg-white">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={updateSettingsSession}
                onChange={(e) => setUpdateSettingsSession(e.target.checked)}
                className="mt-0.5 rounded accent-[#24364B]"
              />
              <div>
                <span className="font-semibold text-[#202B38] block">
                  Update School Settings Academic Session &amp; Default Valid Until
                </span>
                <span className="text-[11px] text-[#75808C]">
                  Updates global Settings so all newly added students and printed ID cards use {newSession || 'new session'}.
                </span>
              </div>
            </label>

            <label className="flex items-start gap-2.5 cursor-pointer pt-1.5">
              <input
                type="checkbox"
                checked={resetCardGenerated}
                onChange={(e) => setResetCardGenerated(e.target.checked)}
                className="mt-0.5 rounded accent-[#24364B]"
              />
              <div>
                <span className="font-semibold text-[#202B38] block">
                  Reset &quot;Card Generated&quot; status to Pending for reprinting
                </span>
                <span className="text-[11px] text-[#75808C]">
                  Marks promoted students as Pending so you can track new-session card printing cleanly.
                </span>
              </div>
            </label>

            <label className="flex items-start gap-2.5 cursor-pointer pt-1.5">
              <input
                type="checkbox"
                checked={activatePromotedCards}
                onChange={(e) => setActivatePromotedCards(e.target.checked)}
                className="mt-0.5 rounded accent-[#24364B]"
              />
              <div>
                <span className="font-semibold text-[#202B38] block">
                  Activate promoted students&apos; cards with new validity date
                </span>
                <span className="text-[11px] text-[#75808C]">
                  Syncs live QR verification status to Active and sets Valid Until to {newValidUntil || 'configured date'}.
                </span>
              </div>
            </label>
          </div>

          {/* Impact Preview */}
          <div className="p-3.5 rounded-lg bg-[#24364B]/5 border border-[#24364B]/15 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-[#202B38]">
              <CheckCircle2 className="w-4 h-4 text-[#25845A] shrink-0" />
              <span>
                Ready to promote <strong className="font-mono">{summary.promoted}</strong> students
                {summary.graduated > 0 && (
                  <>
                    {' '}· mark <strong className="font-mono text-[#B7791F]">{summary.graduated}</strong> Alumni/Expired
                  </>
                )}
                {summary.skipped > 0 && <> · skip {summary.skipped}</>}
              </span>
            </div>
            {summary.graduated > 0 && (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#B7791F]">
                <ShieldAlert className="w-3.5 h-3.5" />
                Graduating cards become Expired on live QR scans
              </span>
            )}
          </div>

          {/* Footer Buttons */}
          <div className="pt-2 border-t border-[#E3E7EB] flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-[#202B38] bg-white border border-[#E3E7EB] hover:bg-[#F0F2F4] rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={students.length === 0 || (summary.promoted === 0 && summary.graduated === 0)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#24364B] hover:bg-[#304A64] disabled:opacity-45 rounded-lg"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Apply Session Rollover</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
