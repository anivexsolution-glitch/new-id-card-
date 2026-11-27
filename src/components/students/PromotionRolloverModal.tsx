import React, { useEffect, useMemo, useState } from 'react';
import { SchoolSettings, Student } from '../../types';
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  GraduationCap,
  Loader2,
  RefreshCw,
  Users,
  X,
} from 'lucide-react';

export type GraduatingPolicy = 'mark_alumni' | 'keep' | 'remove';

export interface RolloverApplyPayload {
  nextSession: string;
  updateSettingsSession: boolean;
  resetCardStatus: boolean;
  classMappings: Record<string, { targetClass: string; include: boolean }>;
  graduatingPolicy: GraduatingPolicy;
}

interface PromotionRolloverModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  schoolSettings: SchoolSettings;
  onApplyRollover: (payload: RolloverApplyPayload) => Promise<void> | void;
}

export function suggestNextAcademicSession(currentSession: string): string {
  const trimmed = (currentSession || '').trim();
  // Pattern: 2025-26 -> 2026-27
  const shortPair = trimmed.match(/^(\d{4})\s*([-–/])\s*(\d{2})$/);
  if (shortPair) {
    const startYear = parseInt(shortPair[1], 10);
    const sep = shortPair[2];
    const nextStart = startYear + 1;
    const nextEndShort = String((nextStart + 1) % 100).padStart(2, '0');
    return `${nextStart}${sep}${nextEndShort}`;
  }

  // Pattern: 2025-2026 -> 2026-2027
  const fullPair = trimmed.match(/^(\d{4})\s*([-–/])\s*(\d{4})$/);
  if (fullPair) {
    const startYear = parseInt(fullPair[1], 10);
    const sep = fullPair[2];
    return `${startYear + 1}${sep}${startYear + 2}`;
  }

  // Pattern: single year 2025 -> 2026
  const singleYear = trimmed.match(/^(\d{4})$/);
  if (singleYear) {
    return String(parseInt(singleYear[1], 10) + 1);
  }

  const nowYear = new Date().getFullYear();
  return `${nowYear}-${String((nowYear + 1) % 100).padStart(2, '0')}`;
}

function getOrdinalSuffix(n: number): string {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return 'th';
  switch (n % 10) {
    case 1:
      return 'st';
    case 2:
      return 'nd';
    case 3:
      return 'rd';
    default:
      return 'th';
  }
}

const ROMAN_GRADES = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

export function suggestPromotedClass(classGrade?: string): {
  nextClass: string;
  isGraduating: boolean;
} {
  const raw = (classGrade || '').trim();
  if (!raw) {
    return { nextClass: '', isGraduating: false };
  }

  // Separate trailing section suffix such as " - A", " - Science", " (B)"
  let base = raw;
  let suffix = '';
  const dashMatch = raw.match(/^(.*?)(\s*[-–]\s*[A-Za-z0-9\s]+)$/);
  if (dashMatch && dashMatch[1].trim().length > 0) {
    base = dashMatch[1].trim();
    suffix = dashMatch[2];
  } else {
    const parenMatch = raw.match(/^(.*?)(\s*\([^)]+\))$/);
    if (parenMatch && parenMatch[1].trim().length > 0) {
      base = parenMatch[1].trim();
      suffix = parenMatch[2];
    }
  }

  const lower = base.toLowerCase().replace(/\./g, '').trim();

  // Pre-primary sequence
  if (lower === 'pg' || lower === 'playgroup' || lower === 'play group') {
    return { nextClass: `Nursery${suffix}`, isGraduating: false };
  }
  if (lower === 'nur' || lower === 'nursery' || lower === 'pre-nursery') {
    return { nextClass: `LKG${suffix}`, isGraduating: false };
  }
  if (lower === 'lkg' || lower === 'lower kg' || lower === 'kg1' || lower === 'kg 1' || lower === 'kg-1') {
    return { nextClass: `UKG${suffix}`, isGraduating: false };
  }
  if (
    lower === 'ukg' ||
    lower === 'upper kg' ||
    lower === 'kg2' ||
    lower === 'kg 2' ||
    lower === 'kg-2' ||
    lower === 'kg' ||
    lower === 'prep'
  ) {
    return { nextClass: `Class 1st${suffix}`, isGraduating: false };
  }

  // Numeric class/grade/std: e.g. "Class 8th", "Grade 5", "Std 10", "12th"
  const numericMatch = base.match(/^((?:Class|Grade|Std\.?|Standard)\s*)?(\d{1,2})(st|nd|rd|th)?$/i);
  if (numericMatch) {
    const prefix = numericMatch[1] || '';
    const num = parseInt(numericMatch[2], 10);
    const hadOrdinal = Boolean(numericMatch[3]);
    if (num >= 12) {
      return { nextClass: 'Graduated / Alumni', isGraduating: true };
    }
    const nextNum = num + 1;
    const nextOrd = hadOrdinal ? getOrdinalSuffix(nextNum) : '';
    return { nextClass: `${prefix}${nextNum}${nextOrd}${suffix}`, isGraduating: false };
  }

  // Roman numeral class: e.g. "Class X", "XII"
  const romanMatch = base.match(/^((?:Class|Grade|Std\.?|Standard)\s*)?(XII|XI|X|IX|VIII|VII|VI|IV|V|III|II|I)$/i);
  if (romanMatch) {
    const prefix = romanMatch[1] || '';
    const romanUpper = romanMatch[2].toUpperCase();
    const idx = ROMAN_GRADES.indexOf(romanUpper);
    if (idx === ROMAN_GRADES.length - 1) {
      return { nextClass: 'Graduated / Alumni', isGraduating: true };
    }
    if (idx >= 0) {
      return { nextClass: `${prefix}${ROMAN_GRADES[idx + 1]}${suffix}`, isGraduating: false };
    }
  }

  return { nextClass: raw, isGraduating: false };
}

export const PromotionRolloverModal: React.FC<PromotionRolloverModalProps> = ({
  isOpen,
  onClose,
  students,
  schoolSettings,
  onApplyRollover,
}) => {
  const [nextSession, setNextSession] = useState<string>('');
  const [updateSettingsSession, setUpdateSettingsSession] = useState<boolean>(true);
  const [resetCardStatus, setResetCardStatus] = useState<boolean>(true);
  const [graduatingPolicy, setGraduatingPolicy] = useState<GraduatingPolicy>('mark_alumni');
  const [classMappings, setClassMappings] = useState<
    Record<string, { targetClass: string; include: boolean }>
  >({});
  const [isApplying, setIsApplying] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  const classGroups = useMemo(() => {
    const counts = new Map<string, number>();
    students.forEach((s) => {
      const key = (s.classGrade || '').trim();
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([sourceClass, count]) => ({
        sourceClass,
        count,
        suggestion: suggestPromotedClass(sourceClass),
      }))
      .sort((a, b) =>
        (a.sourceClass || 'zzz').localeCompare(b.sourceClass || 'zzz', undefined, {
          numeric: true,
        })
      );
  }, [students]);

  useEffect(() => {
    if (!isOpen) return;
    setErrorMsg('');
    setIsApplying(false);
    setNextSession(suggestNextAcademicSession(schoolSettings.academicSession));
    setUpdateSettingsSession(true);
    setResetCardStatus(true);
    setGraduatingPolicy('mark_alumni');

    const initialMap: Record<string, { targetClass: string; include: boolean }> = {};
    classGroups.forEach(({ sourceClass, suggestion }) => {
      initialMap[sourceClass] = {
        targetClass: suggestion.nextClass,
        include: true,
      };
    });
    setClassMappings(initialMap);
  }, [isOpen, schoolSettings.academicSession, classGroups]);

  const handleGraduatingPolicyChange = (policy: GraduatingPolicy) => {
    setGraduatingPolicy(policy);
    setClassMappings((prev) => {
      const next = { ...prev };
      classGroups.forEach(({ sourceClass, suggestion }) => {
        if (suggestion.isGraduating && next[sourceClass]) {
          next[sourceClass] = {
            ...next[sourceClass],
            targetClass:
              policy === 'mark_alumni'
                ? 'Graduated / Alumni'
                : policy === 'keep'
                ? sourceClass
                : 'Remove from Active Roster',
          };
        }
      });
      return next;
    });
  };

  const summary = useMemo(() => {
    let promoted = 0;
    let graduatedRemoved = 0;
    let skipped = 0;

    students.forEach((s) => {
      const key = (s.classGrade || '').trim();
      const mapEntry = classMappings[key];
      const suggestion = suggestPromotedClass(key);
      if (!mapEntry || !mapEntry.include) {
        skipped += 1;
        return;
      }
      if (suggestion.isGraduating && graduatingPolicy === 'remove') {
        graduatedRemoved += 1;
      } else {
        promoted += 1;
      }
    });

    return { promoted, graduatedRemoved, skipped };
  }, [students, classMappings, graduatingPolicy]);

  if (!isOpen) return null;

  const hasGraduatingClasses = classGroups.some((g) => g.suggestion.isGraduating);

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanedSession = nextSession.trim();
    if (!cleanedSession) {
      setErrorMsg('Please enter the new Academic Session (e.g. 2026-27).');
      return;
    }

    setErrorMsg('');
    setIsApplying(true);
    try {
      await onApplyRollover({
        nextSession: cleanedSession,
        updateSettingsSession,
        resetCardStatus,
        classMappings,
        graduatingPolicy,
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to apply class promotion and session rollover.');
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div
      className="no-print fixed inset-0 z-50 bg-[#202B38]/45 flex items-center justify-center p-4"
      onClick={() => !isApplying && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="promotion-rollover-title"
        className="bg-white rounded-[12px] border border-[#E3E7EB] shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E3E7EB] bg-[#F5F6F7] flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-[#24364B] text-white flex items-center justify-center shrink-0">
              <GraduationCap className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2
                id="promotion-rollover-title"
                className="text-sm font-bold text-[#202B38] truncate"
              >
                Class Promotion &amp; New Session Rollover
              </h2>
              <p className="text-[11px] text-[#75808C] truncate">
                Promote students to their next grade, roll over academic session, and sync ID cards.
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={isApplying}
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#75808C] hover:text-[#202B38] hover:bg-[#E3E7EB]/60 disabled:opacity-50"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleConfirm} className="flex-1 overflow-y-auto p-6 space-y-5 text-xs">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-[#C44949]/10 border border-[#C44949]/30 text-[#C44949] font-medium">
              {errorMsg}
            </div>
          )}

          {/* Step 1: Academic Session Config */}
          <div className="p-4 rounded-[10px] bg-[#F5F6F7] border border-[#E3E7EB] space-y-3.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
              <div>
                <span className="block text-[11px] font-semibold text-[#75808C] uppercase tracking-wider mb-1">
                  Current Session (Settings)
                </span>
                <div className="px-3 py-2 rounded-lg border border-[#E3E7EB] bg-white font-mono font-semibold text-[#536477] flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-[#75808C]" />
                  <span>{schoolSettings.academicSession || 'Not Set'}</span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#202B38] uppercase tracking-wider mb-1">
                  New Academic Session <span className="text-[#C44949]">*</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    required
                    maxLength={40}
                    value={nextSession}
                    onChange={(e) => setNextSession(e.target.value)}
                    placeholder="e.g. 2026-27"
                    className="flex-1 px-3 py-2 rounded-lg border border-[#E3E7EB] bg-white font-mono font-semibold text-[#202B38] focus:outline-none focus:border-[#24364B]"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setNextSession(suggestNextAcademicSession(schoolSettings.academicSession))
                    }
                    title="Auto-suggest next session"
                    className="p-2 rounded-lg border border-[#E3E7EB] bg-white hover:bg-[#F0F2F4] text-[#536477]"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              <label className="flex items-start gap-2.5 p-2.5 rounded-lg bg-white border border-[#E3E7EB] cursor-pointer">
                <input
                  type="checkbox"
                  checked={updateSettingsSession}
                  onChange={(e) => setUpdateSettingsSession(e.target.checked)}
                  className="mt-0.5 rounded accent-[#24364B] cursor-pointer"
                />
                <span>
                  <span className="block font-semibold text-[#202B38]">
                    Set as Active School Session
                  </span>
                  <span className="block text-[11px] text-[#75808C]">
                    Updates Settings so this session prints on all ID cards &amp; QR codes.
                  </span>
                </span>
              </label>

              <label className="flex items-start gap-2.5 p-2.5 rounded-lg bg-white border border-[#E3E7EB] cursor-pointer">
                <input
                  type="checkbox"
                  checked={resetCardStatus}
                  onChange={(e) => setResetCardStatus(e.target.checked)}
                  className="mt-0.5 rounded accent-[#24364B] cursor-pointer"
                />
                <span>
                  <span className="block font-semibold text-[#202B38]">
                    Reset ID Cards to Pending
                  </span>
                  <span className="block text-[11px] text-[#75808C]">
                    Marks promoted students as Pending for fresh new-session card printing.
                  </span>
                </span>
              </label>
            </div>
          </div>

          {/* Step 2: Graduating Class Policy */}
          {hasGraduatingClasses && (
            <div className="p-4 rounded-[10px] border border-[#C18A38]/35 bg-[#C18A38]/5 space-y-2.5">
              <p className="font-bold text-[#202B38]">
                Final / Graduating Class Handling (Class 12th / XII)
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {[
                  {
                    value: 'mark_alumni' as const,
                    label: 'Mark as Graduated / Alumni',
                  },
                  {
                    value: 'keep' as const,
                    label: 'Keep in Current Class',
                  },
                  {
                    value: 'remove' as const,
                    label: 'Remove from Active Roster',
                  },
                ].map((opt) => (
                  <label
                    key={opt.value}
                    className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                      graduatingPolicy === opt.value
                        ? 'border-[#24364B] bg-white font-semibold text-[#202B38]'
                        : 'border-[#E3E7EB] bg-white/70 text-[#536477]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="graduatingPolicy"
                      checked={graduatingPolicy === opt.value}
                      onChange={() => handleGraduatingPolicyChange(opt.value)}
                      className="accent-[#24364B]"
                    />
                    <span>{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Class Mapping Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-[#202B38]">
                Class Promotion Mapping ({classGroups.length}{' '}
                {classGroups.length === 1 ? 'class' : 'classes'})
              </h3>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() =>
                    setClassMappings((prev) => {
                      const next = { ...prev };
                      Object.keys(next).forEach((k) => {
                        next[k] = { ...next[k], include: true };
                      });
                      return next;
                    })
                  }
                  className="text-[11px] font-semibold text-[#24364B] hover:underline"
                >
                  Select All
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setClassMappings((prev) => {
                      const next = { ...prev };
                      Object.keys(next).forEach((k) => {
                        next[k] = { ...next[k], include: false };
                      });
                      return next;
                    })
                  }
                  className="text-[11px] font-semibold text-[#75808C] hover:underline"
                >
                  Unselect All
                </button>
              </div>
            </div>

            {students.length === 0 ? (
              <div className="p-6 rounded-[10px] border border-[#E3E7EB] bg-[#F5F6F7] text-center text-[#75808C]">
                No students are currently enrolled. Updating the session will still update your School Settings if checked above.
              </div>
            ) : (
              <div className="border border-[#E3E7EB] rounded-[10px] overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#F5F6F7] border-b border-[#E3E7EB] text-[11px] font-semibold uppercase tracking-wider text-[#75808C]">
                      <th className="py-2.5 px-3 w-10 text-center">Promote</th>
                      <th className="py-2.5 px-3">Current Class</th>
                      <th className="py-2.5 px-3 w-20 text-center">Students</th>
                      <th className="py-2.5 px-3 w-8 text-center" />
                      <th className="py-2.5 px-3">Promoted To (Editable)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E3E7EB]">
                    {classGroups.map(({ sourceClass, count, suggestion }) => {
                      const entry = classMappings[sourceClass] || {
                        targetClass: suggestion.nextClass,
                        include: true,
                      };
                      const isRemoved = suggestion.isGraduating && graduatingPolicy === 'remove';
                      return (
                        <tr
                          key={sourceClass || '__unassigned__'}
                          className={entry.include ? 'bg-white' : 'bg-[#F5F6F7]/70 opacity-65'}
                        >
                          <td className="py-2.5 px-3 text-center">
                            <input
                              type="checkbox"
                              checked={entry.include}
                              onChange={(e) =>
                                setClassMappings((prev) => ({
                                  ...prev,
                                  [sourceClass]: {
                                    ...entry,
                                    include: e.target.checked,
                                  },
                                }))
                              }
                              className="rounded accent-[#24364B] cursor-pointer"
                            />
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-[#202B38]">
                            {sourceClass || 'Unassigned'}
                            {suggestion.isGraduating && (
                              <span className="ml-2 text-[10px] font-semibold text-[#C18A38]">
                                (Final Year)
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono tabular-nums text-[#536477]">
                            {count}
                          </td>
                          <td className="py-2.5 px-3 text-center text-[#75808C]">
                            <ArrowRight className="w-3.5 h-3.5 inline" />
                          </td>
                          <td className="py-2 px-3">
                            {isRemoved && entry.include ? (
                              <span className="inline-block px-2.5 py-1.5 rounded-lg bg-[#C44949]/10 text-[#C44949] font-semibold text-[11px]">
                                Remove from Active Roster
                              </span>
                            ) : (
                              <input
                                type="text"
                                maxLength={60}
                                disabled={!entry.include}
                                value={entry.targetClass}
                                onChange={(e) =>
                                  setClassMappings((prev) => ({
                                    ...prev,
                                    [sourceClass]: {
                                      ...entry,
                                      targetClass: e.target.value,
                                    },
                                  }))
                                }
                                placeholder="Target class..."
                                className="w-full px-2.5 py-1.5 rounded-lg border border-[#E3E7EB] bg-white text-[#202B38] font-medium focus:outline-none focus:border-[#24364B] disabled:bg-[#F5F6F7]"
                              />
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Summary Banner */}
          <div className="p-3.5 rounded-[10px] bg-[#F5F6F7] border border-[#E3E7EB] flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-4">
              <span className="inline-flex items-center gap-1.5 font-semibold text-[#25845A]">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{summary.promoted} to promote</span>
              </span>
              {summary.graduatedRemoved > 0 && (
                <span className="inline-flex items-center gap-1.5 font-semibold text-[#C44949]">
                  <span>{summary.graduatedRemoved} graduated removed</span>
                </span>
              )}
              {summary.skipped > 0 && (
                <span className="inline-flex items-center gap-1.5 font-medium text-[#75808C]">
                  <Users className="w-3.5 h-3.5" />
                  <span>{summary.skipped} skipped</span>
                </span>
              )}
            </div>
            <span className="text-[11px] font-mono text-[#536477]">
              Session target: {nextSession || '—'}
            </span>
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-[#E3E7EB] bg-white flex items-center justify-end gap-2.5">
          <button
            type="button"
            disabled={isApplying}
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-[#202B38] bg-white border border-[#E3E7EB] hover:bg-[#F0F2F4] rounded-lg disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isApplying}
            onClick={handleConfirm}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#24364B] hover:bg-[#304A64] rounded-lg disabled:opacity-60"
          >
            {isApplying ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Applying Rollover...</span>
              </>
            ) : (
              <>
                <GraduationCap className="w-3.5 h-3.5" />
                <span>Apply Class Promotion &amp; Rollover</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
