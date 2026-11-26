import React, { useState, useRef, useMemo, useEffect } from 'react';
import { PrinterPreset, SavedCustomTemplate, SchoolSettings, Student, TemplateId } from '../../types';
import { TEMPLATE_REGISTRY, getPairedTemplateId } from '../../constants/initialData';
import { CR80Card } from '../cards/CR80Card';
import { exportMultiCardA4Pdf } from '../../utils/export';
import {
  Printer,
  Download,
  CheckSquare,
  Square,
  Scissors,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  Layers,
  GraduationCap,
  Sparkles,
  Bookmark,
} from 'lucide-react';

interface PrintExportViewProps {
  students: Student[];
  schoolSettings: SchoolSettings;
  savedCustomTemplates?: SavedCustomTemplate[];
  onMarkCardsAsGenerated: (studentIds: string[]) => void;
}

export const PrintExportView: React.FC<PrintExportViewProps> = ({
  students,
  schoolSettings,
  savedCustomTemplates = [],
  onMarkCardsAsGenerated,
}) => {
  const defaultOrientation: 'portrait' | 'landscape' = schoolSettings.defaultTemplateId
    ? schoolSettings.defaultTemplateId.startsWith('portrait_')
      ? 'portrait'
      : 'landscape'
    : schoolSettings.defaultOrientation || 'portrait';

  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>(
    students.map((s) => s.id)
  );
  const [activeClassFilter, setActiveClassFilter] = useState<string>('all');
  const [selectedPrintSource, setSelectedPrintSource] = useState<string>('school_default');
  const [printerPreset, setPrinterPreset] = useState<PrinterPreset>(
    defaultOrientation === 'portrait' ? 'a4_6_portrait' : 'a4_8_landscape'
  );
  const [printSide, setPrintSide] = useState<'front' | 'back' | 'both'>('front');
  const [showCropMarks, setShowCropMarks] = useState<boolean>(true);
  const [cardGapMm, setCardGapMm] = useState<number>(4);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportSuccessMsg, setExportSuccessMsg] = useState<string>('');

  const printSheetsContainerRef = useRef<HTMLDivElement>(null);

  // Resolve active saved custom template if chosen
  const activeCustomTemplate = useMemo(
    () =>
      selectedPrintSource.startsWith('custom:')
        ? savedCustomTemplates.find((t) => t.id === selectedPrintSource.slice(7))
        : undefined,
    [selectedPrintSource, savedCustomTemplates]
  );

  // Resolve active template ID & orientation for display and printer preset syncing
  const activeTemplateId: TemplateId =
    activeCustomTemplate?.baseTemplateId ||
    activeCustomTemplate?.customization?.templateId ||
    schoolSettings.defaultTemplateId ||
    'portrait_red_magenta_curved';

  const activeDesignOrientation: 'portrait' | 'landscape' = activeCustomTemplate
    ? activeCustomTemplate.orientation
    : activeTemplateId.startsWith('portrait_')
    ? 'portrait'
    : 'landscape';

  const activeTemplateMeta = useMemo(
    () => TEMPLATE_REGISTRY.find((t) => t.id === activeTemplateId),
    [activeTemplateId]
  );

  // Keep printer sheet orientation automatically aligned with the school's default template/saved custom template
  useEffect(() => {
    if (activeDesignOrientation === 'portrait') {
      setPrinterPreset((prev) =>
        prev === 'a4_8_landscape' || prev === 'a4_10_compact' ? 'a4_6_portrait' : prev
      );
    } else {
      setPrinterPreset((prev) =>
        prev === 'a4_6_portrait' || prev === 'pvc_tray_5' ? 'a4_8_landscape' : prev
      );
    }
  }, [activeDesignOrientation, schoolSettings.defaultTemplateId, selectedPrintSource]);

  // Extract classes
  const classList = useMemo(() => {
    const set = new Set<string>();
    students.forEach((s) => {
      set.add((s.classGrade || 'Unassigned').trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [students]);

  // Handle class selection
  const handleSelectClass = (cls: string) => {
    setActiveClassFilter(cls);
    if (cls === 'all') {
      setSelectedStudentIds(students.map((s) => s.id));
    } else {
      const classStudents = students.filter(
        (s) => (s.classGrade || 'Unassigned').trim() === cls
      );
      setSelectedStudentIds(classStudents.map((s) => s.id));
    }
  };

  // Determine preset configuration
  const presetConfig = useMemo(() => {
    switch (printerPreset) {
      case 'a4_8_landscape':
        return {
          name: 'A4 Sheet (8 Cards Landscape)',
          orientation: 'landscape' as const,
          cardsPerPage: 8,
          gridClass: 'grid-cols-2',
          sheetWidthClass: 'max-w-[840px]',
          description: 'Standard A4 PVC / synthetic paper sheet layout (4 rows × 2 columns).',
        };
      case 'a4_6_portrait':
        return {
          name: 'A4 Sheet (6 Cards Portrait)',
          orientation: 'portrait' as const,
          cardsPerPage: 6,
          gridClass: 'grid-cols-3',
          sheetWidthClass: 'max-w-[840px]',
          description: 'Standard A4 sheet layout for vertical cards (2 rows × 3 columns).',
        };
      case 'a4_10_compact':
        return {
          name: 'A4 High-Density (10 Cards)',
          orientation: 'landscape' as const,
          cardsPerPage: 10,
          gridClass: 'grid-cols-2',
          sheetWidthClass: 'max-w-[840px]',
          description: 'Economy dense layout (5 rows × 2 columns) with 2mm border margin.',
        };
      case 'pvc_tray_5':
        return {
          name: 'Epson / Canon 5-Card PVC Tray',
          orientation: 'portrait' as const,
          cardsPerPage: 5,
          gridClass: 'grid-cols-5',
          sheetWidthClass: 'max-w-[920px]',
          description: 'Direct PVC tray for Epson L805/L8050, Canon G-series (5 cards per pass).',
        };
      case 'pvc_tray_2':
        return {
          name: 'Epson 2-Card PVC Tray',
          orientation: activeDesignOrientation,
          cardsPerPage: 2,
          gridClass: 'grid-cols-2',
          sheetWidthClass: 'max-w-[560px]',
          description: 'Dual card tray for Epson R260, T50, T60, L800 printers.',
        };
      case 'single_cr80':
        return {
          name: 'Single CR80 Direct Card',
          orientation: activeDesignOrientation,
          cardsPerPage: 1,
          gridClass: 'grid-cols-1',
          sheetWidthClass: 'max-w-[380px]',
          description: 'Direct thermal card printers (Zebra, Evolis, Magicard, Fargo).',
        };
      default:
        return {
          name: 'A4 Sheet',
          orientation: activeDesignOrientation,
          cardsPerPage: 8,
          gridClass: 'grid-cols-2',
          sheetWidthClass: 'max-w-[840px]',
          description: '',
        };
    }
  }, [printerPreset, activeDesignOrientation]);

  const selectedStudents = students.filter((s) => selectedStudentIds.includes(s.id));

  // Chunk students into pages
  const CARDS_PER_PAGE = presetConfig.cardsPerPage;
  const chunkedPages: Student[][] = [];
  for (let i = 0; i < selectedStudents.length; i += CARDS_PER_PAGE) {
    chunkedPages.push(selectedStudents.slice(i, i + CARDS_PER_PAGE));
  }

  const effectiveGapMm = printerPreset === 'a4_10_compact' ? Math.min(cardGapMm, 2) : cardGapMm;

  const physicalSheetWidthMm = useMemo(() => {
    const portraitCardW = 53.98;
    const landscapeCardW = 85.6;
    switch (printerPreset) {
      case 'a4_8_landscape':
      case 'a4_10_compact':
        return 2 * landscapeCardW + effectiveGapMm;
      case 'a4_6_portrait':
        return 3 * portraitCardW + 2 * effectiveGapMm;
      case 'pvc_tray_5':
        return 5 * portraitCardW + 4 * effectiveGapMm;
      case 'pvc_tray_2':
        return 2 * (activeDesignOrientation === 'portrait' ? portraitCardW : landscapeCardW) + effectiveGapMm;
      case 'single_cr80':
        return activeDesignOrientation === 'portrait' ? portraitCardW : landscapeCardW;
      default:
        return 2 * landscapeCardW + effectiveGapMm;
    }
  }, [printerPreset, effectiveGapMm, activeDesignOrientation]);

  const handleToggleSelectAll = () => {
    if (selectedStudentIds.length === students.length) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(students.map((s) => s.id));
    }
  };

  const handlePrintBrowser = () => {
    window.focus();
    window.print();
    onMarkCardsAsGenerated(selectedStudentIds);
  };

  const handleExportA4Pdf = async () => {
    if (!printSheetsContainerRef.current) return;
    setIsExporting(true);
    setExportSuccessMsg('');
    try {
      await exportMultiCardA4Pdf(
        printSheetsContainerRef.current,
        `ScholarCard_${printerPreset}_${Date.now()}.pdf`
      );
      onMarkCardsAsGenerated(selectedStudentIds);
      setExportSuccessMsg('High-resolution production print PDF generated successfully!');
      setTimeout(() => setExportSuccessMsg(''), 5000);
    } catch (e) {
      console.error(e);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="print-view-root p-8 max-w-7xl mx-auto space-y-6">
      {/* Title Bar (Hidden on print) */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            PVC Tray & Batch Printer Studio
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Production CR80 layout with Epson/Canon PVC Tray presets, A4 multi-card sheets, and class-wise printing.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportA4Pdf}
            disabled={selectedStudents.length === 0 || isExporting}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors shadow-xs"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>{isExporting ? 'Generating PDF...' : 'Download Production PDF'}</span>
          </button>

          <button
            onClick={handlePrintBrowser}
            disabled={selectedStudents.length === 0}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition-colors shadow-sm"
          >
            <Printer className="w-4 h-4" />
            <span>Direct Print ({selectedStudents.length} Cards)</span>
          </button>
        </div>
      </div>

      {exportSuccessMsg && (
        <div className="no-print p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center gap-2 text-xs text-emerald-800 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{exportSuccessMsg}</span>
        </div>
      )}

      {/* Configuration Controls (Hidden on print) */}
      <div className="no-print bg-white p-4 rounded-xl border border-slate-200 space-y-4">
        {/* Row 0: Active Print Design Source */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-900">
                  Active Print Design:
                </span>
                <span className="text-xs font-bold text-blue-700">
                  {activeCustomTemplate
                    ? `${activeCustomTemplate.name} (Custom)`
                    : activeTemplateMeta?.name || schoolSettings.defaultTemplateId}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-100 text-slate-700 border border-slate-200">
                  {activeDesignOrientation}
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Uses your selected School Default design (or switch to a Saved Custom Template for this print batch).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Bookmark className="w-3.5 h-3.5 text-amber-500" />
            <select
              value={selectedPrintSource}
              onChange={(e) => setSelectedPrintSource(e.target.value)}
              className="text-xs px-3 py-1.5 rounded-lg border border-slate-300 bg-white font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="school_default">
                School Default: {TEMPLATE_REGISTRY.find((t) => t.id === schoolSettings.defaultTemplateId)?.name || 'Default Design'}
              </option>
              {savedCustomTemplates.length > 0 && (
                <optgroup label="Saved Custom Templates">
                  {savedCustomTemplates.map((tpl) => (
                    <option key={tpl.id} value={`custom:${tpl.id}`}>
                      Custom: {tpl.name} ({tpl.orientation})
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>
        </div>

        {/* Row 1: Printer Preset Buttons */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-blue-600" />
              <span>Printer & PVC Tray Presets</span>
            </span>
            <span className="text-[11px] text-slate-500 font-mono">
              {presetConfig.description}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {[
              { id: 'a4_8_landscape', label: 'A4 Sheet (8-in-1)', desc: 'Landscape 4×2' },
              { id: 'a4_6_portrait', label: 'A4 Sheet (6-in-1)', desc: 'Portrait 3×2' },
              { id: 'a4_10_compact', label: 'A4 Economy (10-in-1)', desc: 'Compact 5×2' },
              { id: 'pvc_tray_5', label: 'Epson 5-Card Tray', desc: 'L805 / Canon' },
              { id: 'pvc_tray_2', label: '2-Card Dual Tray', desc: 'Epson R260 / T50' },
              { id: 'single_cr80', label: 'Single CR80 Card', desc: 'Thermal Direct' },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setPrinterPreset(p.id as PrinterPreset)}
                className={`p-2 rounded-lg border text-left transition-all ${
                  printerPreset === p.id
                    ? 'border-blue-600 bg-blue-50/70 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <span
                  className={`text-xs block font-bold truncate ${
                    printerPreset === p.id ? 'text-blue-900' : 'text-slate-800'
                  }`}
                >
                  {p.label}
                </span>
                <span className="text-[10px] text-slate-400 block truncate">{p.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Row 2: Class Filter & Selection */}
        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-slate-700">
              <GraduationCap className="w-4 h-4 text-slate-500" />
              <span className="font-semibold">Filter by Class:</span>
            </div>
            <select
              value={activeClassFilter}
              onChange={(e) => handleSelectClass(e.target.value)}
              className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="all">All Classes ({students.length} students)</option>
              {classList.map((cls) => (
                <option key={cls} value={cls}>
                  Class {cls} ({students.filter((s) => (s.classGrade || 'Unassigned').trim() === cls).length} students)
                </option>
              ))}
            </select>

            <button
              onClick={handleToggleSelectAll}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 ml-2"
            >
              {selectedStudentIds.length === students.length ? (
                <CheckSquare className="w-4 h-4 text-blue-600" />
              ) : (
                <Square className="w-4 h-4 text-slate-400" />
              )}
              <span>
                Selected ({selectedStudentIds.length} / {students.length})
              </span>
            </button>
          </div>

          {/* Side switcher */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Card Side:</span>
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs">
              <button
                onClick={() => setPrintSide('front')}
                className={`px-3 py-1 rounded font-medium transition-colors ${
                  printSide === 'front' ? 'bg-white text-slate-900 font-bold shadow-xs' : 'text-slate-600'
                }`}
              >
                Front Side
              </button>
              <button
                onClick={() => setPrintSide('back')}
                className={`px-3 py-1 rounded font-medium transition-colors ${
                  printSide === 'back' ? 'bg-white text-slate-900 font-bold shadow-xs' : 'text-slate-600'
                }`}
              >
                Back Side
              </button>
              <button
                onClick={() => setPrintSide('both')}
                className={`px-3 py-1 rounded font-medium transition-colors ${
                  printSide === 'both' ? 'bg-white text-slate-900 font-bold shadow-xs' : 'text-slate-600'
                }`}
              >
                Double-Sided
              </button>
            </div>
          </div>
        </div>

        {/* Row 3: Guides & Spacing */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-slate-100 text-xs">
          <label className="flex items-center gap-2 text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={showCropMarks}
              onChange={(e) => setShowCropMarks(e.target.checked)}
              className="rounded text-blue-600"
            />
            <Scissors className="w-3.5 h-3.5 text-slate-500" />
            <span>PVC Tray Alignment Guides / Cutting Marks</span>
          </label>

          <div className="flex items-center gap-3">
            <span className="text-slate-500">Spacing: {cardGapMm}mm</span>
            <input
              type="range"
              min="0"
              max="10"
              step="1"
              value={cardGapMm}
              onChange={(e) => setCardGapMm(Number(e.target.value))}
              className="w-24"
            />
          </div>
        </div>
      </div>

      {/* Print Preview Container */}
      {selectedStudents.length === 0 ? (
        <div className="no-print bg-white p-12 rounded-xl border border-slate-200 text-center text-slate-400">
          <AlertCircle className="w-8 h-8 mx-auto mb-2 text-slate-300" />
          <p className="text-sm font-medium text-slate-600">No students selected for printing.</p>
          <p className="text-xs text-slate-400 mt-1">Select one or more students or change class filter to render cards.</p>
        </div>
      ) : (
        <div ref={printSheetsContainerRef} className="print-sheets-container space-y-8">
          {chunkedPages.map((pageStudents, pageIdx) => {
            const pageNum = pageIdx + 1;

            return (
              <React.Fragment key={`page_wrapper_${pageIdx}`}>
                {/* Front Sheet */}
                {(printSide === 'front' || printSide === 'both') && (
                  <div className={`print-sheet-frame bg-white p-6 rounded-xl border border-slate-300 shadow-md ${presetConfig.sheetWidthClass} mx-auto`}>
                    {/* Sheet Header Metadata (Screen only, excluded from Print & PDF) */}
                    <div className="no-print flex items-center justify-between border-b border-slate-200 pb-2 mb-4 text-[11px] text-slate-500 font-mono">
                      <span>{schoolSettings.schoolName} — {presetConfig.name} · Pass {pageNum}</span>
                      <span>CR80 Format · Session {schoolSettings.academicSession}</span>
                    </div>

                    {/* Pure Printable Card Grid (Only ID Cards) */}
                    <div
                      data-physical-width-mm={physicalSheetWidthMm.toFixed(2)}
                      className={`print-sheet bg-white grid ${presetConfig.gridClass}`}
                      style={{
                        gap: `${effectiveGapMm}mm`,
                        ['--print-sheet-width' as string]: `${physicalSheetWidthMm.toFixed(2)}mm`,
                      }}
                    >
                      {pageStudents.map((student) => (
                        <div
                          key={`front_${student.id}`}
                          className={`relative ${showCropMarks ? 'p-[1.5px] print:p-[0.4mm] border border-dashed border-slate-300' : ''}`}
                        >
                          <CR80Card
                            student={student}
                            schoolSettings={schoolSettings}
                            customization={
                              activeCustomTemplate
                                ? {
                                    ...activeCustomTemplate.customization,
                                    templateId: getPairedTemplateId(
                                      activeCustomTemplate.baseTemplateId ||
                                        activeCustomTemplate.customization.templateId,
                                      presetConfig.orientation
                                    ),
                                    orientation: presetConfig.orientation,
                                    side: 'front',
                                  }
                                : {
                                    orientation: presetConfig.orientation,
                                    side: 'front',
                                  }
                            }
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Back Sheet */}
                {(printSide === 'back' || printSide === 'both') && (
                  <div className={`print-sheet-frame bg-white p-6 rounded-xl border border-slate-300 shadow-md ${presetConfig.sheetWidthClass} mx-auto`}>
                    {/* Sheet Header Metadata (Screen only, excluded from Print & PDF) */}
                    <div className="no-print flex items-center justify-between border-b border-slate-200 pb-2 mb-4 text-[11px] text-slate-500 font-mono">
                      <span>{schoolSettings.schoolName} — {presetConfig.name} · Reverse Pass {pageNum}</span>
                      <span>Reverse Alignment · CR80 Standard</span>
                    </div>

                    {/* Pure Printable Card Grid (Only ID Cards) */}
                    <div
                      data-physical-width-mm={physicalSheetWidthMm.toFixed(2)}
                      className={`print-sheet bg-white grid ${presetConfig.gridClass}`}
                      style={{
                        gap: `${effectiveGapMm}mm`,
                        ['--print-sheet-width' as string]: `${physicalSheetWidthMm.toFixed(2)}mm`,
                      }}
                    >
                      {pageStudents.map((student) => (
                        <div
                          key={`back_${student.id}`}
                          className={`relative ${showCropMarks ? 'p-[1.5px] print:p-[0.4mm] border border-dashed border-slate-300' : ''}`}
                        >
                          <CR80Card
                            student={student}
                            schoolSettings={schoolSettings}
                            customization={
                              activeCustomTemplate
                                ? {
                                    ...activeCustomTemplate.customization,
                                    templateId: getPairedTemplateId(
                                      activeCustomTemplate.baseTemplateId ||
                                        activeCustomTemplate.customization.templateId,
                                      presetConfig.orientation
                                    ),
                                    orientation: presetConfig.orientation,
                                    side: 'back',
                                  }
                                : {
                                    orientation: presetConfig.orientation,
                                    side: 'back',
                                  }
                            }
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      )}
    </div>
  );
};
