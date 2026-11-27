import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
  ExportHistoryRecord,
  PrinterPreset,
  SavedCustomTemplate,
  SchoolSettings,
  Student,
  TemplateId,
} from '../../types';
import { TEMPLATE_REGISTRY, getPairedTemplateId } from '../../constants/initialData';
import { CR80Card } from '../cards/CR80Card';
import { exportMultiCardA4Pdf, formatExportError } from '../../utils/export';
import { CardSurface, EmptyState, PageHeader, StatusText } from '../ui/EnterpriseUI';
import {
  Printer,
  Download,
  CheckSquare,
  Square,
  Scissors,
  CheckCircle2,
  AlertCircle,
  Layers,
  GraduationCap,
  Bookmark,
} from 'lucide-react';

interface PrintExportViewProps {
  students: Student[];
  schoolSettings: SchoolSettings;
  savedCustomTemplates?: SavedCustomTemplate[];
  onMarkCardsAsGenerated: (studentIds: string[]) => void;
  onLogExport?: (entry: Omit<ExportHistoryRecord, 'id' | 'timestamp'>) => void;
}

export const PrintExportView: React.FC<PrintExportViewProps> = ({
  students,
  schoolSettings,
  savedCustomTemplates = [],
  onMarkCardsAsGenerated,
  onLogExport,
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
    defaultOrientation === 'portrait' ? 'a4_9_portrait' : 'a4_8_landscape'
  );
  const [printSide, setPrintSide] = useState<'front' | 'back' | 'both'>('front');
  const [showCropMarks, setShowCropMarks] = useState<boolean>(true);
  const [cardGapMm, setCardGapMm] = useState<number>(4);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportSuccessMsg, setExportSuccessMsg] = useState<string>('');
  const [exportErrorMsg, setExportErrorMsg] = useState<string>('');

  const printSheetsContainerRef = useRef<HTMLDivElement>(null);

  const activeCustomTemplate = useMemo(
    () =>
      selectedPrintSource.startsWith('custom:')
        ? savedCustomTemplates.find((t) => t.id === selectedPrintSource.slice(7))
        : undefined,
    [selectedPrintSource, savedCustomTemplates]
  );

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

  useEffect(() => {
    if (activeDesignOrientation === 'portrait') {
      setPrinterPreset((prev) =>
        prev === 'a4_8_landscape' || prev === 'a4_10_compact' ? 'a4_9_portrait' : prev
      );
    } else {
      setPrinterPreset((prev) =>
        prev === 'a4_9_portrait' || prev === 'pvc_tray_5' ? 'a4_8_landscape' : prev
      );
    }
  }, [activeDesignOrientation, schoolSettings.defaultTemplateId, selectedPrintSource]);

  const classList = useMemo(() => {
    const set = new Set<string>();
    students.forEach((s) => {
      set.add((s.classGrade || 'Unassigned').trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [students]);

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

  const presetConfig = useMemo(() => {
    switch (printerPreset) {
      case 'a4_8_landscape':
        return {
          name: 'A4 Sheet (8 Cards Landscape)',
          orientation: 'landscape' as const,
          cardsPerPage: 8,
          gridClass: 'grid-cols-2',
          sheetWidthClass: 'max-w-[840px]',
          description: 'Standard A4 sheet layout (4 rows × 2 columns).',
        };
      case 'a4_9_portrait':
        return {
          name: 'A4 Sheet (9 Cards Portrait)',
          orientation: 'portrait' as const,
          cardsPerPage: 9,
          gridClass: 'grid-cols-3',
          sheetWidthClass: 'max-w-[840px]',
          description: 'Full A4 sheet layout for portrait cards (3 rows × 3 columns).',
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
          description: 'Direct PVC tray for Epson L805/L8050 & Canon G-series.',
        };
      case 'pvc_tray_2':
        return {
          name: 'Epson 2-Card PVC Tray',
          orientation: activeDesignOrientation,
          cardsPerPage: 2,
          gridClass: 'grid-cols-2',
          sheetWidthClass: 'max-w-[560px]',
          description: 'Dual card tray for Epson R260, T50, T60, and L800 printers.',
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

  const CARDS_PER_PAGE = presetConfig.cardsPerPage;
  const chunkedPages: Student[][] = [];
  for (let i = 0; i < selectedStudents.length; i += CARDS_PER_PAGE) {
    chunkedPages.push(selectedStudents.slice(i, i + CARDS_PER_PAGE));
  }

  const effectiveGapMm =
    printerPreset === 'a4_10_compact'
      ? Math.min(cardGapMm, 2)
      : printerPreset === 'a4_9_portrait'
      ? Math.min(cardGapMm, 8)
      : cardGapMm;

  const physicalSheetWidthMm = useMemo(() => {
    const portraitCardW = 53.98;
    const landscapeCardW = 85.6;
    switch (printerPreset) {
      case 'a4_8_landscape':
      case 'a4_10_compact':
        return 2 * landscapeCardW + effectiveGapMm;
      case 'a4_9_portrait':
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
    onLogExport?.({
      format: 'Browser Print',
      fileName: `${presetConfig.name} (${selectedStudents.length} cards)`,
      cardCount: selectedStudents.length,
      templateName: activeCustomTemplate?.name || activeTemplateMeta?.name || activeTemplateId,
      orientation: presetConfig.orientation,
    });
  };

  const handleExportA4Pdf = async () => {
    if (!printSheetsContainerRef.current) return;
    setIsExporting(true);
    setExportSuccessMsg('');
    setExportErrorMsg('');
    const fileName = `IDCards_${printerPreset}_${Date.now()}.pdf`;
    try {
      await exportMultiCardA4Pdf(printSheetsContainerRef.current, fileName);
      onMarkCardsAsGenerated(selectedStudentIds);
      onLogExport?.({
        format: 'A4 PDF',
        fileName,
        cardCount: selectedStudents.length,
        templateName: activeCustomTemplate?.name || activeTemplateMeta?.name || activeTemplateId,
        orientation: presetConfig.orientation,
      });
      setExportSuccessMsg('Production A4 PDF exported successfully.');
      setTimeout(() => setExportSuccessMsg(''), 5000);
    } catch (e) {
      const msg = formatExportError(e, 'Could not generate A4 PDF. Please try Print Current View.');
      console.warn('A4 PDF export failed:', msg);
      setExportErrorMsg(msg);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="print-view-root p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-5">
      <div className="no-print">
        <PageHeader
          title="Batch Print & A4 Export"
          meta={
            <span className="font-mono tabular-nums">
              {selectedStudents.length} selected · {chunkedPages.length} sheet
              {chunkedPages.length === 1 ? '' : 's'}
            </span>
          }
          subtitle="Production CR80 sheet imposition for A4 paper, PVC trays, and direct thermal printers."
          actions={
            <>
              <button
                type="button"
                onClick={handleExportA4Pdf}
                disabled={selectedStudents.length === 0 || isExporting}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#202B38] bg-white border border-[#E3E7EB] hover:bg-[#F0F2F4] disabled:opacity-45 rounded-lg transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-[#536477]" />
                <span>{isExporting ? 'Generating PDF...' : 'Save A4 PDF'}</span>
              </button>

              <button
                type="button"
                onClick={handlePrintBrowser}
                disabled={selectedStudents.length === 0}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#24364B] hover:bg-[#304A64] disabled:opacity-45 rounded-lg transition-colors"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Current View ({selectedStudents.length})</span>
              </button>
            </>
          }
        />
      </div>

      {exportSuccessMsg && (
        <div className="no-print p-3.5 rounded-lg bg-[#25845A]/10 border border-[#25845A]/30 flex items-center gap-2 text-xs text-[#25845A]">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span className="font-semibold">{exportSuccessMsg}</span>
        </div>
      )}

      {exportErrorMsg && (
        <div className="no-print p-3.5 rounded-lg bg-[#C44949]/10 border border-[#C44949]/30 flex items-center gap-2 text-xs text-[#C44949]">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span className="font-semibold">{exportErrorMsg}</span>
        </div>
      )}

      {/* Configuration Controls */}
      <CardSurface padding="md" className="no-print space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#E3E7EB]">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[#75808C]">Active Print Design:</span>
              <span className="text-xs font-bold text-[#202B38]">
                {activeCustomTemplate
                  ? `${activeCustomTemplate.name} (Custom)`
                  : activeTemplateMeta?.name || schoolSettings.defaultTemplateId}
              </span>
              <span className="text-[11px] font-mono text-[#75808C] capitalize">
                · {activeDesignOrientation}
              </span>
            </div>
            <p className="text-[11px] text-[#75808C] mt-0.5">
              Renders with your School Default template or any Saved Custom Project.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Bookmark className="w-3.5 h-3.5 text-[#A77C50]" />
            <select
              aria-label="Design source"
              value={selectedPrintSource}
              onChange={(e) => setSelectedPrintSource(e.target.value)}
              className="text-xs px-3 py-1.5 rounded-lg border border-[#E3E7EB] bg-white font-semibold text-[#202B38] focus:outline-none focus:border-[#24364B]"
            >
              <option value="school_default">
                School Default: {TEMPLATE_REGISTRY.find((t) => t.id === schoolSettings.defaultTemplateId)?.name || 'Default'}
              </option>
              {savedCustomTemplates.length > 0 && (
                <optgroup label="Saved Custom Projects">
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

        {/* Printer Presets */}
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <span className="text-xs font-bold text-[#202B38] uppercase tracking-wider inline-flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-[#536477]" />
              <span>Sheet &amp; Tray Preset</span>
            </span>
            <span className="text-[11px] text-[#75808C]">{presetConfig.description}</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {[
              { id: 'a4_8_landscape', label: 'A4 (8-in-1)', desc: 'Landscape 4×2' },
              { id: 'a4_9_portrait', label: 'A4 (9-in-1)', desc: 'Portrait 3×3' },
              { id: 'a4_10_compact', label: 'A4 (10-in-1)', desc: 'Compact 5×2' },
              { id: 'pvc_tray_5', label: '5-Card PVC Tray', desc: 'Epson / Canon' },
              { id: 'pvc_tray_2', label: '2-Card Dual Tray', desc: 'Epson R260/T50' },
              { id: 'single_cr80', label: 'Single CR80', desc: 'Thermal Direct' },
            ].map((p) => {
              const active = printerPreset === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPrinterPreset(p.id as PrinterPreset)}
                  className={`p-2.5 rounded-lg border text-left transition-colors ${
                    active
                      ? 'border-[#24364B] bg-[#F5F6F7]'
                      : 'border-[#E3E7EB] bg-white hover:bg-[#F5F6F7]/60'
                  }`}
                >
                  <span className="text-xs block font-semibold text-[#202B38] truncate">
                    {p.label}
                  </span>
                  <span className="text-[10px] text-[#75808C] block truncate">{p.desc}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Class filter, selection, side */}
        <div className="pt-3 border-t border-[#E3E7EB] flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-[#202B38]">
              <GraduationCap className="w-4 h-4 text-[#536477]" />
              <span className="font-semibold">Class:</span>
            </div>
            <select
              aria-label="Filter by class"
              value={activeClassFilter}
              onChange={(e) => handleSelectClass(e.target.value)}
              className="text-xs px-2.5 py-1.5 rounded-lg border border-[#E3E7EB] bg-white text-[#202B38] focus:outline-none focus:border-[#24364B]"
            >
              <option value="all">All Classes ({students.length})</option>
              {classList.map((cls) => (
                <option key={cls} value={cls}>
                  {cls} ({students.filter((s) => (s.classGrade || 'Unassigned').trim() === cls).length})
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={handleToggleSelectAll}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#202B38] hover:text-[#304A64]"
            >
              {selectedStudentIds.length === students.length ? (
                <CheckSquare className="w-4 h-4 text-[#24364B]" />
              ) : (
                <Square className="w-4 h-4 text-[#75808C]" />
              )}
              <span className="tabular-nums">
                Selected ({selectedStudentIds.length} / {students.length})
              </span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-[#75808C] font-medium">Card Side:</span>
            <div className="inline-flex items-center bg-[#F0F2F4] p-0.5 rounded-lg text-xs">
              {(['front', 'back', 'both'] as const).map((side) => (
                <button
                  key={side}
                  type="button"
                  onClick={() => setPrintSide(side)}
                  className={`px-3 py-1 rounded-md font-semibold capitalize transition-colors ${
                    printSide === side
                      ? 'bg-white text-[#202B38]'
                      : 'text-[#536477] hover:text-[#202B38]'
                  }`}
                >
                  {side === 'both' ? 'Double-Sided' : side}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Guides & Spacing */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-[#E3E7EB] text-xs">
          <label className="inline-flex items-center gap-2 text-[#202B38] cursor-pointer">
            <input
              type="checkbox"
              checked={showCropMarks}
              onChange={(e) => setShowCropMarks(e.target.checked)}
              className="rounded accent-[#24364B]"
            />
            <Scissors className="w-3.5 h-3.5 text-[#536477]" />
            <span>Cutting Marks / Alignment Guides</span>
          </label>

          <div className="flex items-center gap-3">
            <span className="text-[#536477] font-mono tabular-nums">
              Spacing: {cardGapMm} mm
            </span>
            <input
              type="range"
              min="0"
              max="10"
              step="1"
              value={cardGapMm}
              onChange={(e) => setCardGapMm(Number(e.target.value))}
              className="w-24 accent-[#24364B]"
            />
          </div>
        </div>
      </CardSurface>

      {/* Print Preview Container */}
      {selectedStudents.length === 0 ? (
        <div className="no-print">
          <EmptyState
            icon={<AlertCircle className="w-5 h-5" />}
            title="No students selected for printing"
            description="Select one or more students or switch the class filter above to generate A4 sheets."
          />
        </div>
      ) : (
        <div ref={printSheetsContainerRef} className="print-sheets-container space-y-8">
          {chunkedPages.map((pageStudents, pageIdx) => {
            const pageNum = pageIdx + 1;

            return (
              <React.Fragment key={`page_wrapper_${pageIdx}`}>
                {(printSide === 'front' || printSide === 'both') && (
                  <div
                    className={`print-sheet-frame bg-white p-6 rounded-[10px] border border-[#E3E7EB] ${presetConfig.sheetWidthClass} mx-auto`}
                  >
                    <div className="no-print flex items-center justify-between border-b border-[#E3E7EB] pb-2 mb-4 text-[11px] text-[#75808C] font-mono">
                      <span>
                        {schoolSettings.schoolName} · {presetConfig.name} · Pass {pageNum}
                      </span>
                      <StatusText tone="neutral" label={`CR80 · ${schoolSettings.academicSession}`} />
                    </div>

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
                          className={`relative ${
                            showCropMarks
                              ? 'p-[1.5px] print:p-[0.4mm] border border-dashed border-[#E3E7EB]'
                              : ''
                          }`}
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

                {(printSide === 'back' || printSide === 'both') && (
                  <div
                    className={`print-sheet-frame bg-white p-6 rounded-[10px] border border-[#E3E7EB] ${presetConfig.sheetWidthClass} mx-auto`}
                  >
                    <div className="no-print flex items-center justify-between border-b border-[#E3E7EB] pb-2 mb-4 text-[11px] text-[#75808C] font-mono">
                      <span>
                        {schoolSettings.schoolName} · {presetConfig.name} · Reverse Pass {pageNum}
                      </span>
                      <StatusText tone="neutral" label="Reverse CR80 Standard" />
                    </div>

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
                          className={`relative ${
                            showCropMarks
                              ? 'p-[1.5px] print:p-[0.4mm] border border-dashed border-[#E3E7EB]'
                              : ''
                          }`}
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
