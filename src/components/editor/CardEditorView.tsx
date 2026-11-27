import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  ActiveNavTab,
  CardCustomization,
  ExportHistoryRecord,
  SavedCustomTemplate,
  SchoolSettings,
  Student,
  TemplateId,
} from '../../types';
import {
  TEMPLATE_REGISTRY,
  DEMO_STUDENTS,
  CARD_FONT_OPTIONS,
  FONT_PAIRING_PRESETS,
  getPairedTemplateId,
} from '../../constants/initialData';
import { CR80Card } from '../cards/CR80Card';
import { buildStudentQrPayload } from '../cards/CardDesignSystem';
import { exportElementAsPng, exportSingleCardPdf, formatExportError } from '../../utils/export';
import { isValidityDateExpired } from '../../utils/qrCodeGenerator';
import { StatusText } from '../ui/EnterpriseUI';
import {
  ArrowLeft,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Eye,
  EyeOff,
  Download,
  ChevronDown,
  Bookmark,
  Check,
  Layers,
  Type,
  Users,
  Image as ImageIcon,
  Shapes,
  QrCode,
  ScanBarcode,
  Palette,
  ListTree,
  Grid,
  Crosshair,
  Sliders,
  Save,
  Trash2,
  Plus,
  RefreshCw,
  X,
  Move,
  Edit3,
  Printer,
  CheckSquare,
  Square,
  Shield,
  ShieldAlert,
  ExternalLink,
  Sparkles,
} from 'lucide-react';

interface CardEditorViewProps {
  students: Student[];
  schoolSettings: SchoolSettings;
  selectedStudentId?: string;
  initialTemplateId?: TemplateId;
  onUpdateSchoolSettings: (settings: SchoolSettings) => void;
  onUpdateStudentPhotoCrop?: (studentId: string, crop: { zoom: number; x: number; y: number }) => void;
  onSaveStudent?: (student: Student) => void;
  savedCustomTemplates?: SavedCustomTemplate[];
  onSaveCustomTemplate?: (template: SavedCustomTemplate) => void;
  onDeleteCustomTemplate?: (templateId: string) => void;
  onBackToProjects?: () => void;
  onNavigate?: (tab: ActiveNavTab) => void;
  onOpenLiveVerification?: (student: Student) => void;
  onLogExport?: (entry: Omit<ExportHistoryRecord, 'id' | 'timestamp'>) => void;
  onOpenSmartGenerator?: () => void;
  smartCustomizationSeed?: {
    nonce: number;
    title?: string;
    customization: CardCustomization;
  } | null;
}

type LeftToolKey =
  | 'templates'
  | 'text'
  | 'fields'
  | 'images'
  | 'shapes'
  | 'qrcode'
  | 'barcode'
  | 'background'
  | 'layers';

type CanvasElementKey =
  | 'header'
  | 'logo'
  | 'photo'
  | 'studentName'
  | 'details'
  | 'qrcode'
  | 'signature'
  | 'background';

const TOOL_RAIL_ITEMS: { key: LeftToolKey; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: 'templates', label: 'Templates', icon: Layers },
  { key: 'text', label: 'Text', icon: Type },
  { key: 'fields', label: 'Student Fields', icon: Users },
  { key: 'images', label: 'Images', icon: ImageIcon },
  { key: 'shapes', label: 'Shapes', icon: Shapes },
  { key: 'qrcode', label: 'QR Code', icon: QrCode },
  { key: 'barcode', label: 'Barcode', icon: ScanBarcode },
  { key: 'background', label: 'Background', icon: Palette },
  { key: 'layers', label: 'Layers', icon: ListTree },
];

export const CardEditorView: React.FC<CardEditorViewProps> = ({
  students,
  schoolSettings,
  selectedStudentId,
  initialTemplateId,
  onUpdateSchoolSettings,
  onUpdateStudentPhotoCrop,
  onSaveStudent,
  savedCustomTemplates = [],
  onSaveCustomTemplate,
  onDeleteCustomTemplate,
  onBackToProjects,
  onNavigate,
  onOpenLiveVerification,
  onLogExport,
  onOpenSmartGenerator,
  smartCustomizationSeed,
}) => {
  const [currentStudentId, setCurrentStudentId] = useState<string>(
    selectedStudentId || students[0]?.id || ''
  );

  const initialTemplate =
    initialTemplateId || schoolSettings.defaultTemplateId || 'portrait_red_magenta_curved';
  const initialOrientation = initialTemplate.startsWith('portrait_') ? 'portrait' : 'landscape';
  const savedDefaults = schoolSettings.defaultCustomization;

  const buildInitialCustomization = (): CardCustomization => ({
    templateId: initialTemplate,
    orientation: initialOrientation,
    side: 'front',
    showBarcode: schoolSettings.visibleFields?.barcode !== false,
    showSignature: schoolSettings.visibleFields?.principalSignature !== false,
    showLogo: schoolSettings.visibleFields?.logo !== false,
    fieldVisibility: { ...schoolSettings.visibleFields },
    fontFamily: savedDefaults?.fontFamily || '',
    headingFontFamily: savedDefaults?.headingFontFamily || '',
    schoolNameFontSize: savedDefaults?.schoolNameFontSize || 31,
    studentNameFontSize: savedDefaults?.studentNameFontSize || 33,
    fieldLabelFontSize: savedDefaults?.fieldLabelFontSize || 16,
    fieldValueFontSize: savedDefaults?.fieldValueFontSize || 20,
    addressFontSize: savedDefaults?.addressFontSize || 15,
    logoSize: savedDefaults?.logoSize || 90,
    logoShape: savedDefaults?.logoShape || 'circle',
    logoBadgeStyle: savedDefaults?.logoBadgeStyle || 'gold-ring',
    signatureWidth: savedDefaults?.signatureWidth || 144,
    signatureHeight: savedDefaults?.signatureHeight || 62,
    signatureTitle: savedDefaults?.signatureTitle || 'PRINCIPAL',
    photoWidth: savedDefaults?.photoWidth || 148,
    photoHeight: savedDefaults?.photoHeight || 160,
    photoRadius: savedDefaults?.photoRadius,
    watermarkEnabled: savedDefaults?.watermarkEnabled ?? true,
    watermarkOpacity: savedDefaults?.watermarkOpacity ?? 0.08,
    watermarkSize: savedDefaults?.watermarkSize ?? 280,
    primaryColorOverride: savedDefaults?.primaryColorOverride,
    accentColorOverride: savedDefaults?.accentColorOverride,
    surfaceColorOverride: savedDefaults?.surfaceColorOverride,
    textColorOverride: savedDefaults?.textColorOverride,
    labelColorOverride: savedDefaults?.labelColorOverride,
    customLabels: {
      fatherName: savedDefaults?.customLabels?.fatherName || "Father's Name",
      motherName: savedDefaults?.customLabels?.motherName || "Mother's Name",
      contactNumber: savedDefaults?.customLabels?.contactNumber || 'Contact No.',
      dob: savedDefaults?.customLabels?.dob || 'D.O.B.',
      conveyance: savedDefaults?.customLabels?.conveyance || 'Conveyance',
      address: savedDefaults?.customLabels?.address || 'Address',
      classGrade: savedDefaults?.customLabels?.classGrade || 'Class / Sec',
      rollNo: savedDefaults?.customLabels?.rollNo || 'Roll No',
      bloodGroup: savedDefaults?.customLabels?.bloodGroup || 'Blood Group',
      session: savedDefaults?.customLabels?.session || 'Session',
    },
  });

  // Undo / Redo History Stack
  const [history, setHistory] = useState<CardCustomization[]>(() => [buildInitialCustomization()]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);
  const customization = history[historyIndex];

  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [projectName, setProjectName] = useState<string>(() => {
    const t = TEMPLATE_REGISTRY.find((tpl) => tpl.id === initialTemplate);
    return t?.name || 'Untitled Card Project';
  });

  // Workspace UI States
  const [activeTool, setActiveTool] = useState<LeftToolKey>('templates');
  const [selectedElement, setSelectedElement] = useState<CanvasElementKey>('header');
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [showGuides, setShowGuides] = useState<boolean>(true);
  const [showInteractiveGuides, setShowInteractiveGuides] = useState<boolean>(true);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState<boolean>(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [mobilePanel, setMobilePanel] = useState<'none' | 'tools' | 'properties'>('none');

  // Notices & Save Modal
  const [saveStudentNotice, setSaveStudentNotice] = useState<string>('');
  const [studioNotice, setStudioNotice] = useState<string>('');
  const [isSaveModalOpen, setIsSaveModalOpen] = useState<boolean>(false);
  const [templateNameInput, setTemplateNameInput] = useState<string>('');

  // Drag photo pan inside canvas
  const dragPhotoRef = useRef<{
    startX: number;
    startY: number;
    initCropX: number;
    initCropY: number;
  } | null>(null);

  const exportMenuRef = useRef<HTMLDivElement>(null);
  const cardElementRef = useRef<HTMLDivElement>(null);

  const commitCustomization = useCallback(
    (updater: CardCustomization | ((prev: CardCustomization) => CardCustomization)) => {
      setHistory((prevHist) => {
        const current = prevHist[historyIndex];
        const next = typeof updater === 'function' ? updater(current) : updater;
        const sliced = prevHist.slice(0, historyIndex + 1);
        const updated = [...sliced, next].slice(-40); // cap at 40 steps
        setHistoryIndex(updated.length - 1);
        return updated;
      });
      setIsDirty(true);
    },
    [historyIndex]
  );

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  const handleUndo = useCallback(() => {
    setHistoryIndex((idx) => (idx > 0 ? idx - 1 : idx));
    setIsDirty(true);
  }, []);

  const handleRedo = useCallback(() => {
    setHistoryIndex((idx) => (idx < history.length - 1 ? idx + 1 : idx));
    setIsDirty(true);
  }, [history.length]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
        if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleUndo, handleRedo]);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setIsExportMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const rawActiveStudent =
    students.find((s) => s.id === currentStudentId) || students[0] || DEMO_STUDENTS[0];

  const [studentForm, setStudentForm] = useState<Student>(rawActiveStudent);
  const [photoCrop, setPhotoCrop] = useState<{ zoom: number; x: number; y: number }>(
    rawActiveStudent?.photoCrop || { zoom: 1, x: 0, y: 0 }
  );

  useEffect(() => {
    if (selectedStudentId && selectedStudentId !== currentStudentId) {
      setCurrentStudentId(selectedStudentId);
    }
  }, [selectedStudentId, currentStudentId]);

  useEffect(() => {
    if (initialTemplateId && initialTemplateId !== customization.templateId) {
      const isPortrait = initialTemplateId.startsWith('portrait_');
      const tpl = TEMPLATE_REGISTRY.find((t) => t.id === initialTemplateId);
      if (tpl) setProjectName(tpl.name);
      commitCustomization((prev) => ({
        ...prev,
        templateId: initialTemplateId,
        orientation: isPortrait ? 'portrait' : 'landscape',
      }));
      setIsDirty(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialTemplateId]);

  useEffect(() => {
    if (!smartCustomizationSeed) return;
    if (smartCustomizationSeed.title) {
      setProjectName(smartCustomizationSeed.title);
    }
    commitCustomization((prev) => ({
      ...prev,
      ...smartCustomizationSeed.customization,
    }));
    setStudioNotice('Loaded Smart Template suggestion');
    const timer = setTimeout(() => setStudioNotice(''), 3200);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [smartCustomizationSeed?.nonce]);

  useEffect(() => {
    if (rawActiveStudent) {
      setStudentForm(rawActiveStudent);
      setPhotoCrop(rawActiveStudent.photoCrop || { zoom: 1, x: 0, y: 0 });
    }
  }, [currentStudentId, students, rawActiveStudent]);

  const activeStudent: Student = {
    ...studentForm,
    photoCrop,
  };

  const notifyStudio = (msg: string) => {
    setStudioNotice(msg);
    setTimeout(() => setStudioNotice(''), 3200);
  };

  const handleOrientationSwitch = (orient: 'landscape' | 'portrait') => {
    const pairedId = getPairedTemplateId(customization.templateId, orient);
    commitCustomization((prev) => ({
      ...prev,
      orientation: orient,
      templateId: pairedId,
    }));
  };

  const handleSelectTemplate = (templateId: TemplateId) => {
    const isPortrait = templateId.startsWith('portrait_');
    const tpl = TEMPLATE_REGISTRY.find((t) => t.id === templateId);
    if (tpl) setProjectName(tpl.name);
    commitCustomization((prev) => ({
      ...prev,
      templateId,
      orientation: isPortrait ? 'portrait' : 'landscape',
    }));
  };

  const handleToggleField = (fieldKey: keyof SchoolSettings['visibleFields']) => {
    const current = customization.fieldVisibility?.[fieldKey] !== false;
    const nextVal = !current;
    const updatedVisibility = {
      ...(customization.fieldVisibility || schoolSettings.visibleFields),
      [fieldKey]: nextVal,
    };
    commitCustomization((prev) => ({
      ...prev,
      fieldVisibility: updatedVisibility,
      ...(fieldKey === 'logo' ? { showLogo: nextVal } : {}),
      ...(fieldKey === 'principalSignature' ? { showSignature: nextVal } : {}),
      ...(fieldKey === 'barcode' ? { showBarcode: nextVal } : {}),
    }));
  };

  const handleSetAllFields = (enabled: boolean) => {
    commitCustomization((prev) => ({
      ...prev,
      showLogo: enabled,
      showSignature: enabled,
      showBarcode: enabled,
      fieldVisibility: {
        fatherName: enabled,
        motherName: enabled,
        contactNumber: enabled,
        dob: enabled,
        address: enabled,
        conveyance: enabled,
        session: enabled,
        rollNo: enabled,
        classGrade: enabled,
        bloodGroup: false,
        principalSignature: enabled,
        logo: enabled,
        schoolAddress: enabled,
        schoolContact: enabled,
        barcode: enabled,
        validUntil: enabled,
      },
    }));
  };

  const handleSaveStudentChanges = () => {
    if (onSaveStudent) {
      onSaveStudent(activeStudent);
      setSaveStudentNotice('Student profile saved');
      setTimeout(() => setSaveStudentNotice(''), 2800);
    }
  };

  const handleSaveAsDefault = () => {
    const {
      templateId: _tid,
      orientation: _ori,
      side: _side,
      showBarcode,
      showLogo,
      showSignature,
      fieldVisibility,
      ...styleOverrides
    } = customization;

    onUpdateSchoolSettings({
      ...schoolSettings,
      defaultTemplateId: customization.templateId,
      defaultOrientation: customization.orientation,
      defaultCustomization: styleOverrides,
      visibleFields: {
        ...schoolSettings.visibleFields,
        ...(fieldVisibility || {}),
        logo: showLogo ?? true,
        principalSignature: showSignature ?? true,
        barcode: showBarcode ?? true,
      },
    });
    setIsDirty(false);
    notifyStudio('Saved as School Default');
  };

  const handleSaveCustomDesign = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = templateNameInput.trim() || projectName.trim();
    if (!cleanName) return;

    const newSavedTemplate: SavedCustomTemplate = {
      id: `custom_tpl_${Date.now()}`,
      name: cleanName,
      baseTemplateId: customization.templateId,
      orientation: customization.orientation,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      customization: { ...customization },
    };

    onSaveCustomTemplate?.(newSavedTemplate);
    setProjectName(cleanName);
    setIsSaveModalOpen(false);
    setTemplateNameInput('');
    setIsDirty(false);
    setActiveTool('templates');
    notifyStudio(`Saved "${cleanName}"`);
  };

  const handleLoadCustomTemplate = (saved: SavedCustomTemplate) => {
    commitCustomization({
      ...saved.customization,
      templateId: saved.baseTemplateId || saved.customization.templateId,
      orientation: saved.orientation || saved.customization.orientation,
    });
    setProjectName(saved.name);
    setIsDirty(false);
    notifyStudio(`Loaded "${saved.name}"`);
  };

  const handleResetDefaults = () => {
    commitCustomization((prev) => ({
      ...prev,
      fontFamily: '',
      headingFontFamily: '',
      schoolNameFontSize: 31,
      studentNameFontSize: 33,
      fieldLabelFontSize: 16,
      fieldValueFontSize: 20,
      addressFontSize: 15,
      logoSize: 90,
      logoShape: 'circle',
      logoBadgeStyle: 'gold-ring',
      signatureWidth: 144,
      signatureHeight: 62,
      signatureTitle: 'PRINCIPAL',
      photoWidth: 148,
      photoHeight: 160,
      photoRadius: undefined,
      watermarkEnabled: true,
      watermarkOpacity: 0.08,
      watermarkSize: 280,
      primaryColorOverride: undefined,
      accentColorOverride: undefined,
      surfaceColorOverride: undefined,
      textColorOverride: undefined,
      labelColorOverride: undefined,
    }));
    notifyStudio('Reset element styling to defaults');
  };

  const handleExportPng = async () => {
    if (!cardElementRef.current) return;
    setIsExporting(true);
    setIsExportMenuOpen(false);
    const fileName = `ID_Card_${activeStudent.name.replace(/\s+/g, '_')}_${customization.side}.png`;
    try {
      await exportElementAsPng(cardElementRef.current, fileName);
      onLogExport?.({
        format: 'PNG',
        fileName,
        cardCount: 1,
        templateName: projectName,
        orientation: customization.orientation,
      });
      notifyStudio('PNG exported');
    } catch (e) {
      const msg = formatExportError(e, 'Could not export PNG');
      console.warn('PNG export failed:', msg);
      notifyStudio(msg);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPdf = async () => {
    if (!cardElementRef.current) return;
    setIsExporting(true);
    setIsExportMenuOpen(false);
    const fileName = `ID_Card_${activeStudent.name.replace(/\s+/g, '_')}.pdf`;
    try {
      await exportSingleCardPdf(
        cardElementRef.current,
        activeStudent.name,
        customization.orientation
      );
      onLogExport?.({
        format: 'CR80 PDF',
        fileName,
        cardCount: 1,
        templateName: projectName,
        orientation: customization.orientation,
      });
      notifyStudio('CR80 PDF exported');
    } catch (e) {
      const msg = formatExportError(e, 'Could not export PDF');
      console.warn('PDF export failed:', msg);
      notifyStudio(msg);
    } finally {
      setIsExporting(false);
    }
  };

  const handleSelectCanvasElement = (el: CanvasElementKey, toolHint?: LeftToolKey) => {
    setSelectedElement(el);
    if (toolHint) setActiveTool(toolHint);
  };

  // Drag photo crop handlers
  const handlePhotoPointerDown = (e: React.PointerEvent) => {
    if (!showInteractiveGuides) return;
    e.stopPropagation();
    setSelectedElement('photo');
    dragPhotoRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initCropX: photoCrop.x || 0,
      initCropY: photoCrop.y || 0,
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePhotoPointerMove = (e: React.PointerEvent) => {
    if (!dragPhotoRef.current) return;
    const dx = Math.round((e.clientX - dragPhotoRef.current.startX) / 2.5);
    const dy = Math.round((e.clientY - dragPhotoRef.current.startY) / 2.5);
    const nextCrop = {
      zoom: photoCrop.zoom || 1,
      x: Math.max(-40, Math.min(40, dragPhotoRef.current.initCropX + dx)),
      y: Math.max(-40, Math.min(40, dragPhotoRef.current.initCropY + dy)),
    };
    setPhotoCrop(nextCrop);
  };

  const handlePhotoPointerUp = (e: React.PointerEvent) => {
    if (!dragPhotoRef.current) return;
    dragPhotoRef.current = null;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    onUpdateStudentPhotoCrop?.(activeStudent.id, photoCrop);
  };

  const isPortrait = customization.orientation === 'portrait';
  const availableTemplates = useMemo(
    () => TEMPLATE_REGISTRY.filter((t) => t.orientation === customization.orientation),
    [customization.orientation]
  );

  // Layer Definitions
  const layers = [
    {
      id: 'header' as CanvasElementKey,
      name: 'School Header & Title',
      meta: `${customization.schoolNameFontSize || 31}px`,
      visible: true,
    },
    {
      id: 'logo' as CanvasElementKey,
      name: 'School Crest / Logo',
      meta: `${customization.logoSize || 90}px · ${customization.logoShape || 'circle'}`,
      visible: customization.showLogo !== false,
      toggleKey: 'logo' as const,
    },
    {
      id: 'background' as CanvasElementKey,
      name: 'Background & Watermark',
      meta: `${Math.round((customization.watermarkOpacity ?? 0.08) * 100)}% opacity`,
      visible: customization.watermarkEnabled ?? true,
      isWatermark: true,
    },
    {
      id: 'photo' as CanvasElementKey,
      name: 'Student Portrait',
      meta: `${customization.photoWidth || 148}×${customization.photoHeight || 160}`,
      visible: true,
    },
    {
      id: 'studentName' as CanvasElementKey,
      name: 'Student Name Heading',
      meta: `${customization.studentNameFontSize || 33}px`,
      visible: true,
    },
    {
      id: 'details' as CanvasElementKey,
      name: 'Student Details Grid',
      meta: `${customization.fieldValueFontSize || 20}px`,
      visible: true,
    },
    {
      id: 'qrcode' as CanvasElementKey,
      name: 'QR & Verification Code',
      meta: customization.showBarcode !== false ? 'Active' : 'Hidden',
      visible: customization.showBarcode !== false,
      toggleKey: 'barcode' as const,
    },
    {
      id: 'signature' as CanvasElementKey,
      name: 'Principal Signature',
      meta: customization.signatureTitle || 'PRINCIPAL',
      visible: customization.showSignature !== false,
      toggleKey: 'principalSignature' as const,
    },
  ];

  // Render Left Tool Drawer Body
  const renderLeftToolContent = () => {
    switch (activeTool) {
      case 'templates':
        return (
          <div className="space-y-4">
            {onOpenSmartGenerator && (
              <button
                type="button"
                onClick={onOpenSmartGenerator}
                className="w-full p-2.5 rounded-lg border border-[#E3E7EB] bg-[#F5F6F7] hover:bg-[#F0F2F4] text-left flex items-center justify-between gap-2 transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Sparkles className="w-4 h-4 text-[#A77C50] shrink-0" />
                  <div className="min-w-0">
                    <span className="text-xs font-semibold text-[#202B38] block truncate">
                      Smart Match from Logo
                    </span>
                    <span className="text-[10px] text-[#75808C] block truncate">
                      Generate layouts from school crest
                    </span>
                  </div>
                </div>
              </button>
            )}

            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-bold text-[#202B38] uppercase tracking-wider">
                  {isPortrait ? 'Portrait' : 'Landscape'} Designs ({availableTemplates.length})
                </h4>
              </div>
              <div className="grid grid-cols-1 gap-2">
                {availableTemplates.map((t) => {
                  const selected = customization.templateId === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => handleSelectTemplate(t.id)}
                      className={`p-2.5 rounded-lg border text-left transition-colors flex items-center justify-between gap-2 ${
                        selected
                          ? 'border-[#24364B] bg-[#F5F6F7]'
                          : 'border-[#E3E7EB] bg-white hover:bg-[#F5F6F7]/60'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className="w-3.5 h-3.5 rounded-sm shrink-0 border border-black/10"
                          style={{ backgroundColor: t.primaryColor }}
                        />
                        <div className="min-w-0">
                          <span className="text-xs font-semibold text-[#202B38] block truncate">
                            {t.name}
                          </span>
                          <span className="text-[10px] text-[#75808C] block truncate">
                            {t.subCategory}
                          </span>
                        </div>
                      </div>
                      {selected && <Check className="w-3.5 h-3.5 text-[#24364B] shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-3 border-t border-[#E3E7EB] space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-[#202B38] uppercase tracking-wider">
                  Saved Projects ({savedCustomTemplates.length})
                </h4>
                <button
                  type="button"
                  onClick={() => {
                    setTemplateNameInput(projectName);
                    setIsSaveModalOpen(true);
                  }}
                  className="text-[11px] font-semibold text-[#24364B] hover:underline inline-flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>Save</span>
                </button>
              </div>
              {savedCustomTemplates.length === 0 ? (
                <p className="text-[11px] text-[#75808C]">
                  Save customized layouts under your own name for one-click reuse.
                </p>
              ) : (
                <div className="space-y-2">
                  {savedCustomTemplates.map((saved) => (
                    <div
                      key={saved.id}
                      className="p-2.5 rounded-lg border border-[#E3E7EB] bg-[#F5F6F7]/60 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-[#202B38] truncate">
                          {saved.name}
                        </span>
                        <span className="text-[10px] text-[#75808C] capitalize shrink-0">
                          {saved.orientation}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleLoadCustomTemplate(saved)}
                          className="flex-1 px-2 py-1 text-[11px] font-semibold bg-white border border-[#E3E7EB] hover:bg-[#F0F2F4] rounded text-[#202B38]"
                        >
                          Apply
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const {
                              templateId: _tid,
                              orientation: _ori,
                              side: _side,
                              showBarcode,
                              showLogo,
                              showSignature,
                              fieldVisibility,
                              ...styleOverrides
                            } = saved.customization;
                            const targetTemplateId =
                              saved.baseTemplateId || saved.customization.templateId;
                            onUpdateSchoolSettings({
                              ...schoolSettings,
                              defaultTemplateId: targetTemplateId,
                              defaultOrientation:
                                saved.orientation ||
                                (targetTemplateId.startsWith('portrait_')
                                  ? 'portrait'
                                  : 'landscape'),
                              defaultCustomization: styleOverrides,
                              visibleFields: {
                                ...schoolSettings.visibleFields,
                                ...(fieldVisibility || {}),
                                logo: showLogo ?? true,
                                principalSignature: showSignature ?? true,
                                barcode: showBarcode ?? true,
                              },
                            });
                            handleLoadCustomTemplate(saved);
                            notifyStudio(`"${saved.name}" set as School Default`);
                          }}
                          className="px-2 py-1 text-[11px] font-semibold bg-[#24364B] text-white hover:bg-[#304A64] rounded"
                        >
                          Default
                        </button>
                        {onDeleteCustomTemplate && (
                          <button
                            type="button"
                            onClick={() => onDeleteCustomTemplate(saved.id)}
                            className="p-1 text-[#75808C] hover:text-[#C44949]"
                            title="Delete saved project"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );

      case 'text':
        return (
          <div className="space-y-4 text-xs">
            <div>
              <h4 className="text-[11px] font-bold text-[#75808C] uppercase tracking-wider mb-2">
                Font Pairing Presets
              </h4>
              <div className="grid grid-cols-1 gap-1.5">
                {FONT_PAIRING_PRESETS.map((preset) => {
                  const isSelected =
                    customization.headingFontFamily === preset.headingFont &&
                    customization.fontFamily === preset.bodyFont;
                  return (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() =>
                        commitCustomization((prev) => ({
                          ...prev,
                          headingFontFamily: preset.headingFont,
                          fontFamily: preset.bodyFont,
                        }))
                      }
                      className={`p-2.5 rounded-lg border text-left transition-colors ${
                        isSelected
                          ? 'border-[#24364B] bg-[#F5F6F7]'
                          : 'border-[#E3E7EB] bg-white hover:bg-[#F5F6F7]/50'
                      }`}
                    >
                      <span
                        className="text-xs font-bold text-[#202B38] block truncate"
                        style={{ fontFamily: preset.headingFont }}
                      >
                        {preset.name}
                      </span>
                      <span className="text-[10px] text-[#75808C] block truncate">
                        {preset.description}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2.5 pt-3 border-t border-[#E3E7EB]">
              <div>
                <label className="block font-semibold text-[#202B38] mb-1">
                  Heading Font Family
                </label>
                <select
                  value={customization.headingFontFamily || ''}
                  onChange={(e) =>
                    commitCustomization((prev) => ({ ...prev, headingFontFamily: e.target.value }))
                  }
                  className="w-full text-xs px-2.5 py-2 rounded-lg border border-[#E3E7EB] bg-white text-[#202B38]"
                >
                  <option value="">Template Default</option>
                  {CARD_FONT_OPTIONS.map((f) => (
                    <option key={f.id} value={f.cssFamily}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[#202B38] mb-1">
                  Body &amp; Label Font Family
                </label>
                <select
                  value={customization.fontFamily || ''}
                  onChange={(e) =>
                    commitCustomization((prev) => ({ ...prev, fontFamily: e.target.value }))
                  }
                  className="w-full text-xs px-2.5 py-2 rounded-lg border border-[#E3E7EB] bg-white text-[#202B38]"
                >
                  <option value="">Template Default</option>
                  {CARD_FONT_OPTIONS.map((f) => (
                    <option key={f.id} value={f.cssFamily}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-3 pt-3 border-t border-[#E3E7EB]">
              {[
                {
                  label: 'School Name Size',
                  key: 'schoolNameFontSize' as const,
                  min: 22,
                  max: 46,
                  step: 1,
                  def: 31,
                },
                {
                  label: 'Student Name Size',
                  key: 'studentNameFontSize' as const,
                  min: 22,
                  max: 48,
                  step: 1,
                  def: 33,
                },
                {
                  label: 'Field Label Size',
                  key: 'fieldLabelFontSize' as const,
                  min: 11,
                  max: 22,
                  step: 0.5,
                  def: 16,
                },
                {
                  label: 'Student Value Size',
                  key: 'fieldValueFontSize' as const,
                  min: 14,
                  max: 26,
                  step: 0.5,
                  def: 20,
                },
                {
                  label: 'Footer Address Size',
                  key: 'addressFontSize' as const,
                  min: 11,
                  max: 20,
                  step: 0.5,
                  def: 15,
                },
              ].map((s) => (
                <div key={s.key}>
                  <div className="flex justify-between mb-1">
                    <span className="font-semibold text-[#202B38]">{s.label}</span>
                    <span className="font-mono text-[#24364B] tabular-nums">
                      {(customization[s.key] as number) || s.def}px
                    </span>
                  </div>
                  <input
                    type="range"
                    min={s.min}
                    max={s.max}
                    step={s.step}
                    value={(customization[s.key] as number) || s.def}
                    onChange={(e) =>
                      commitCustomization((prev) => ({
                        ...prev,
                        [s.key]: parseFloat(e.target.value),
                      }))
                    }
                    className="w-full accent-[#24364B]"
                  />
                </div>
              ))}
            </div>
          </div>
        );

      case 'fields':
        return (
          <div className="space-y-4 text-xs">
            <div className="space-y-1.5">
              <label className="block font-semibold text-[#202B38]">Active Student Record</label>
              <select
                value={currentStudentId}
                onChange={(e) => setCurrentStudentId(e.target.value)}
                className="w-full text-xs px-2.5 py-2 rounded-lg border border-[#E3E7EB] bg-white text-[#202B38]"
              >
                {students.map((std) => (
                  <option key={std.id} value={std.id}>
                    {std.name} ({std.classGrade || 'Class X'})
                  </option>
                ))}
              </select>
            </div>

            <div className="p-3 rounded-lg bg-[#F5F6F7] border border-[#E3E7EB] space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#536477]">
                  Quick Edit Student
                </span>
                {saveStudentNotice && (
                  <span className="text-[11px] font-semibold text-[#25845A]">
                    {saveStudentNotice}
                  </span>
                )}
              </div>
              <input
                type="text"
                value={studentForm.name}
                onChange={(e) => setStudentForm({ ...studentForm, name: e.target.value })}
                placeholder="Student Name"
                className="w-full text-xs px-2.5 py-1.5 rounded border border-[#E3E7EB] bg-white font-semibold"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={studentForm.classGrade || ''}
                  onChange={(e) => setStudentForm({ ...studentForm, classGrade: e.target.value })}
                  placeholder="Class"
                  className="w-full text-xs px-2 py-1.5 rounded border border-[#E3E7EB] bg-white"
                />
                <input
                  type="text"
                  value={studentForm.rollNo || ''}
                  onChange={(e) => setStudentForm({ ...studentForm, rollNo: e.target.value })}
                  placeholder="Roll No"
                  className="w-full text-xs px-2 py-1.5 rounded border border-[#E3E7EB] bg-white font-mono"
                />
              </div>
              <input
                type="text"
                value={studentForm.fatherName}
                onChange={(e) => setStudentForm({ ...studentForm, fatherName: e.target.value })}
                placeholder="Father's Name"
                className="w-full text-xs px-2.5 py-1.5 rounded border border-[#E3E7EB] bg-white"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={studentForm.contactNumber}
                  onChange={(e) =>
                    setStudentForm({ ...studentForm, contactNumber: e.target.value })
                  }
                  placeholder="Contact"
                  className="w-full text-xs px-2 py-1.5 rounded border border-[#E3E7EB] bg-white font-mono"
                />
                <input
                  type="text"
                  value={studentForm.dob}
                  onChange={(e) => setStudentForm({ ...studentForm, dob: e.target.value })}
                  placeholder="DOB"
                  className="w-full text-xs px-2 py-1.5 rounded border border-[#E3E7EB] bg-white font-mono"
                />
              </div>
              <input
                type="text"
                value={studentForm.validUntil || ''}
                onChange={(e) => setStudentForm({ ...studentForm, validUntil: e.target.value })}
                placeholder={`Valid Until (${schoolSettings.defaultCardValidUntil || '31/03/2026'})`}
                className="w-full text-xs px-2.5 py-1.5 rounded border border-[#E3E7EB] bg-white font-mono"
              />
              <button
                type="button"
                onClick={handleSaveStudentChanges}
                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#24364B] hover:bg-[#304A64] rounded-lg"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Student Data</span>
              </button>
            </div>

            <div className="pt-2 border-t border-[#E3E7EB] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#536477]">
                  Field Visibility &amp; Labels
                </span>
                <div className="flex gap-1.5 text-[11px]">
                  <button
                    type="button"
                    onClick={() => handleSetAllFields(true)}
                    className="text-[#24364B] hover:underline font-semibold"
                  >
                    All On
                  </button>
                  <span className="text-[#E3E7EB]">|</span>
                  <button
                    type="button"
                    onClick={() => handleSetAllFields(false)}
                    className="text-[#75808C] hover:underline"
                  >
                    Minimal
                  </button>
                </div>
              </div>
              {[
                { key: 'fatherName', defaultLabel: "Father's Name" },
                { key: 'motherName', defaultLabel: "Mother's Name" },
                { key: 'dob', defaultLabel: 'D.O.B.' },
                { key: 'contactNumber', defaultLabel: 'Contact No.' },
                { key: 'conveyance', defaultLabel: 'Conveyance' },
                { key: 'address', defaultLabel: 'Address' },
                { key: 'validUntil', defaultLabel: 'Valid Until' },
              ].map(({ key, defaultLabel }) => {
                const isVisible =
                  customization.fieldVisibility?.[key as keyof SchoolSettings['visibleFields']] !==
                  false;
                const currentLabel = (customization.customLabels as any)?.[key] || defaultLabel;
                return (
                  <div
                    key={key}
                    className="flex items-center gap-2 p-2 rounded-lg bg-[#F5F6F7] border border-[#E3E7EB]"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        handleToggleField(key as keyof SchoolSettings['visibleFields'])
                      }
                      className={isVisible ? 'text-[#24364B]' : 'text-[#75808C]'}
                    >
                      {isVisible ? (
                        <CheckSquare className="w-4 h-4" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                    <input
                      type="text"
                      value={currentLabel}
                      onChange={(e) =>
                        commitCustomization((prev) => ({
                          ...prev,
                          customLabels: {
                            ...(prev.customLabels || {}),
                            [key]: e.target.value,
                          },
                        }))
                      }
                      className="flex-1 text-xs px-2 py-1 rounded border border-[#E3E7EB] bg-white text-[#202B38]"
                    />
                  </div>
                );
              })}
            </div>
          </div>
        );

      case 'images':
        return (
          <div className="space-y-4 text-xs">
            <div className="space-y-2.5">
              <div className="flex justify-between">
                <span className="font-semibold text-[#202B38]">School Logo Size</span>
                <span className="font-mono text-[#24364B] tabular-nums">
                  {customization.logoSize || 90}px
                </span>
              </div>
              <input
                type="range"
                min="48"
                max="124"
                step="2"
                value={customization.logoSize || 90}
                onChange={(e) =>
                  commitCustomization((prev) => ({
                    ...prev,
                    logoSize: parseInt(e.target.value, 10),
                  }))
                }
                className="w-full accent-[#24364B]"
              />
            </div>

            <div className="pt-3 border-t border-[#E3E7EB] space-y-2.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#536477] block">
                Student Portrait Crop &amp; Pan
              </span>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-[#536477]">Zoom</span>
                  <span className="font-mono">{(photoCrop.zoom || 1).toFixed(1)}x</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="2.5"
                  step="0.1"
                  value={photoCrop.zoom || 1}
                  onChange={(e) => {
                    const next = { ...photoCrop, zoom: parseFloat(e.target.value) };
                    setPhotoCrop(next);
                    onUpdateStudentPhotoCrop?.(activeStudent.id, next);
                  }}
                  className="w-full accent-[#24364B]"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-[#536477]">Pan X</span>
                    <span className="font-mono">{photoCrop.x || 0}%</span>
                  </div>
                  <input
                    type="range"
                    min="-40"
                    max="40"
                    step="2"
                    value={photoCrop.x || 0}
                    onChange={(e) => {
                      const next = { ...photoCrop, x: parseInt(e.target.value, 10) };
                      setPhotoCrop(next);
                      onUpdateStudentPhotoCrop?.(activeStudent.id, next);
                    }}
                    className="w-full accent-[#24364B]"
                  />
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-[#536477]">Pan Y</span>
                    <span className="font-mono">{photoCrop.y || 0}%</span>
                  </div>
                  <input
                    type="range"
                    min="-40"
                    max="40"
                    step="2"
                    value={photoCrop.y || 0}
                    onChange={(e) => {
                      const next = { ...photoCrop, y: parseInt(e.target.value, 10) };
                      setPhotoCrop(next);
                      onUpdateStudentPhotoCrop?.(activeStudent.id, next);
                    }}
                    className="w-full accent-[#24364B]"
                  />
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-[#E3E7EB] space-y-2.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#536477] block">
                Principal Signature
              </span>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="font-semibold text-[#202B38]">Width</span>
                  <span className="font-mono">{customization.signatureWidth || 144}px</span>
                </div>
                <input
                  type="range"
                  min="70"
                  max="190"
                  step="4"
                  value={customization.signatureWidth || 144}
                  onChange={(e) =>
                    commitCustomization((prev) => ({
                      ...prev,
                      signatureWidth: parseInt(e.target.value, 10),
                    }))
                  }
                  className="w-full accent-[#24364B]"
                />
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="font-semibold text-[#202B38]">Height</span>
                  <span className="font-mono">{customization.signatureHeight || 62}px</span>
                </div>
                <input
                  type="range"
                  min="35"
                  max="85"
                  step="3"
                  value={customization.signatureHeight || 62}
                  onChange={(e) =>
                    commitCustomization((prev) => ({
                      ...prev,
                      signatureHeight: parseInt(e.target.value, 10),
                    }))
                  }
                  className="w-full accent-[#24364B]"
                />
              </div>
              <div>
                <label className="block font-semibold text-[#202B38] mb-1">
                  Designation Title
                </label>
                <input
                  type="text"
                  value={customization.signatureTitle || 'PRINCIPAL'}
                  onChange={(e) =>
                    commitCustomization((prev) => ({ ...prev, signatureTitle: e.target.value }))
                  }
                  className="w-full px-2.5 py-1.5 border border-[#E3E7EB] rounded-lg text-xs uppercase font-semibold"
                />
              </div>
            </div>
          </div>
        );

      case 'shapes':
        return (
          <div className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-[#202B38] mb-2">
                Logo Frame Badge Shape
              </label>
              <div className="grid grid-cols-2 gap-2">
                {([
                  { shape: 'circle', label: 'Circle' },
                  { shape: 'rounded', label: 'Rounded' },
                  { shape: 'square', label: 'Square' },
                  { shape: 'none', label: 'No Frame' },
                ] as const).map((item) => (
                  <button
                    key={item.shape}
                    type="button"
                    onClick={() =>
                      commitCustomization((prev) => ({ ...prev, logoShape: item.shape }))
                    }
                    className={`py-2 px-3 rounded-lg border font-semibold text-left transition-colors ${
                      (customization.logoShape || 'circle') === item.shape
                        ? 'border-[#24364B] bg-[#F5F6F7] text-[#24364B]'
                        : 'border-[#E3E7EB] bg-white text-[#536477]'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {(customization.logoShape || 'circle') !== 'none' && (
              <div className="pt-3 border-t border-[#E3E7EB]">
                <label className="block font-semibold text-[#202B38] mb-2">
                  Badge Ring Finish
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { id: 'gold-ring', label: 'Gold Ring' },
                    { id: 'white', label: 'Crisp White' },
                    { id: 'tinted', label: 'Soft Tint' },
                    { id: 'minimal', label: 'Slim Edge' },
                  ] as const).map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() =>
                        commitCustomization((prev) => ({ ...prev, logoBadgeStyle: b.id }))
                      }
                      className={`py-2 px-3 rounded-lg border font-semibold text-left transition-colors ${
                        (customization.logoBadgeStyle || 'gold-ring') === b.id
                          ? 'border-[#24364B] bg-[#F5F6F7] text-[#24364B]'
                          : 'border-[#E3E7EB] bg-white text-[#536477]'
                      }`}
                    >
                      {b.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-3 border-t border-[#E3E7EB] space-y-2">
              <div className="flex justify-between">
                <span className="font-semibold text-[#202B38]">Student Photo Corner Radius</span>
                <span className="font-mono text-[#24364B]">
                  {customization.photoRadius === undefined
                    ? 'Auto'
                    : `${customization.photoRadius}px`}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="90"
                step="2"
                value={customization.photoRadius ?? 10}
                onChange={(e) =>
                  commitCustomization((prev) => ({
                    ...prev,
                    photoRadius: parseInt(e.target.value, 10),
                  }))
                }
                className="w-full accent-[#24364B]"
              />
              <div className="grid grid-cols-3 gap-1.5 pt-1">
                {[
                  { label: 'Sharp', val: 0 },
                  { label: 'Rounded', val: 12 },
                  { label: 'Circle', val: 90 },
                ].map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() =>
                      commitCustomization((prev) => ({ ...prev, photoRadius: p.val }))
                    }
                    className="py-1.5 rounded border border-[#E3E7EB] bg-white hover:bg-[#F5F6F7] text-[11px] font-medium text-[#202B38]"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        );

      case 'qrcode':
        return (
          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between p-3 rounded-lg bg-[#F5F6F7] border border-[#E3E7EB]">
              <div>
                <span className="font-semibold text-[#202B38] block">Scannable QR Code</span>
                <span className="text-[11px] text-[#75808C]">
                  Encodes full student verification record
                </span>
              </div>
              <input
                type="checkbox"
                checked={customization.showBarcode ?? true}
                onChange={(e) =>
                  commitCustomization((prev) => ({ ...prev, showBarcode: e.target.checked }))
                }
                className="w-4 h-4 accent-[#24364B] cursor-pointer"
              />
            </div>

            {(customization.showBarcode ?? true) && (
              <div className="space-y-2.5">
                <div className="p-3 rounded-lg bg-[#202B38] text-white font-mono text-[10px] leading-relaxed break-all whitespace-pre-wrap">
                  <div className="text-[#A77C50] font-bold uppercase tracking-wider mb-1">
                    Live QR Verification URL · {activeStudent.name}
                  </div>
                  {buildStudentQrPayload(activeStudent, schoolSettings)}
                </div>
                {onOpenLiveVerification && (
                  <button
                    type="button"
                    onClick={() => onOpenLiveVerification(activeStudent)}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-[#24364B] hover:bg-[#304A64] rounded-lg transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Open Live Verification Page</span>
                  </button>
                )}
              </div>
            )}
          </div>
        );

      case 'barcode':
        return (
          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between p-3 rounded-lg bg-[#F5F6F7] border border-[#E3E7EB]">
              <div>
                <span className="font-semibold text-[#202B38] block">
                  Card Verification Strip &amp; Code
                </span>
                <span className="text-[11px] text-[#75808C]">
                  Displays CR80 verification block on card reverse/front
                </span>
              </div>
              <input
                type="checkbox"
                checked={customization.showBarcode ?? true}
                onChange={(e) =>
                  commitCustomization((prev) => ({ ...prev, showBarcode: e.target.checked }))
                }
                className="w-4 h-4 accent-[#24364B] cursor-pointer"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block font-semibold text-[#202B38]">
                Active Student Card ID Number
              </label>
              <input
                type="text"
                value={studentForm.idCardNumber || ''}
                onChange={(e) => setStudentForm({ ...studentForm, idCardNumber: e.target.value })}
                placeholder="SCH-2025-1001"
                className="w-full px-2.5 py-2 border border-[#E3E7EB] rounded-lg font-mono text-xs bg-white"
              />
              <button
                type="button"
                onClick={handleSaveStudentChanges}
                className="w-full px-3 py-1.5 text-xs font-semibold text-white bg-[#24364B] hover:bg-[#304A64] rounded-lg"
              >
                Update Card ID Number
              </button>
            </div>
          </div>
        );

      case 'background':
        return (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-1 gap-3">
              {[
                { label: 'Primary Brand Hue', key: 'primaryColorOverride' as const, fallback: '#24364B' },
                { label: 'Accent / Highlight', key: 'accentColorOverride' as const, fallback: '#A77C50' },
                { label: 'Card Surface Color', key: 'surfaceColorOverride' as const, fallback: '#FFFFFF' },
                { label: 'Text Ink Color', key: 'textColorOverride' as const, fallback: '#202B38' },
              ].map((c) => (
                <div key={c.key} className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-[#202B38]">{c.label}</span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="color"
                      value={(customization[c.key] as string) || c.fallback}
                      onChange={(e) =>
                        commitCustomization((prev) => ({ ...prev, [c.key]: e.target.value }))
                      }
                      className="w-7 h-7 rounded border border-[#E3E7EB] cursor-pointer"
                    />
                    <input
                      type="text"
                      value={(customization[c.key] as string) || c.fallback}
                      onChange={(e) =>
                        commitCustomization((prev) => ({ ...prev, [c.key]: e.target.value }))
                      }
                      className="w-20 px-2 py-1 text-[11px] font-mono uppercase border border-[#E3E7EB] rounded"
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-[#E3E7EB] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-[#A77C50]" />
                  <span className="font-semibold text-[#202B38]">Logo Watermark</span>
                </div>
                <input
                  type="checkbox"
                  checked={customization.watermarkEnabled ?? true}
                  onChange={(e) =>
                    commitCustomization((prev) => ({
                      ...prev,
                      watermarkEnabled: e.target.checked,
                    }))
                  }
                  className="w-4 h-4 accent-[#24364B] cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-[#536477]">Watermark Opacity</span>
                  <span className="font-mono">
                    {Math.round((customization.watermarkOpacity ?? 0.08) * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.02"
                  max="0.30"
                  step="0.01"
                  value={customization.watermarkOpacity ?? 0.08}
                  onChange={(e) =>
                    commitCustomization((prev) => ({
                      ...prev,
                      watermarkOpacity: parseFloat(e.target.value),
                    }))
                  }
                  className="w-full accent-[#24364B]"
                />
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-[#536477]">Watermark Diameter</span>
                  <span className="font-mono">{customization.watermarkSize || 280}px</span>
                </div>
                <input
                  type="range"
                  min="140"
                  max="450"
                  step="10"
                  value={customization.watermarkSize || 280}
                  onChange={(e) =>
                    commitCustomization((prev) => ({
                      ...prev,
                      watermarkSize: parseInt(e.target.value, 10),
                    }))
                  }
                  className="w-full accent-[#24364B]"
                />
              </div>
            </div>
          </div>
        );

      case 'layers':
        return (
          <div className="space-y-2 text-xs">
            <p className="text-[11px] text-[#75808C] mb-2">
              Click a layer to inspect and edit its properties on the right panel.
            </p>
            {layers.map((layer) => {
              const active = selectedElement === layer.id;
              return (
                <div
                  key={layer.id}
                  className={`flex items-center justify-between gap-2 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                    active
                      ? 'border-[#24364B] bg-[#F5F6F7]'
                      : 'border-[#E3E7EB] bg-white hover:bg-[#F5F6F7]/60'
                  }`}
                  onClick={() => setSelectedElement(layer.id)}
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-[#202B38] truncate">{layer.name}</p>
                    <p className="text-[10px] text-[#75808C] font-mono">{layer.meta}</p>
                  </div>
                  {(layer.toggleKey || layer.isWatermark) && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (layer.isWatermark) {
                          commitCustomization((prev) => ({
                            ...prev,
                            watermarkEnabled: !(prev.watermarkEnabled ?? true),
                          }));
                        } else if (layer.toggleKey) {
                          handleToggleField(layer.toggleKey);
                        }
                      }}
                      title={layer.visible ? 'Hide layer' : 'Show layer'}
                      className="p-1 text-[#536477] hover:text-[#202B38]"
                    >
                      {layer.visible ? (
                        <Eye className="w-3.5 h-3.5" />
                      ) : (
                        <EyeOff className="w-3.5 h-3.5 text-[#75808C]" />
                      )}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        );
    }
  };

  // Render Right Properties Inspector for Selected Element
  const renderRightProperties = () => {
    const labelMap: Record<CanvasElementKey, string> = {
      header: 'School Header & Typography',
      logo: 'School Crest & Logo',
      photo: 'Student Portrait & Frame',
      studentName: 'Student Name Heading',
      details: 'Student Details Grid',
      qrcode: 'QR & Verification Code',
      signature: 'Principal Signature',
      background: 'Card Surface & Watermark',
    };

    return (
      <div className="space-y-4 text-xs">
        <div className="pb-3 border-b border-[#E3E7EB]">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#75808C]">
            Selected Element
          </p>
          <h4 className="text-sm font-bold text-[#202B38] mt-0.5">{labelMap[selectedElement]}</h4>
          <div className="flex flex-wrap gap-1 mt-2">
            {(
              [
                { id: 'logo', label: 'Logo' },
                { id: 'header', label: 'Header' },
                { id: 'photo', label: 'Photo' },
                { id: 'studentName', label: 'Name' },
                { id: 'details', label: 'Fields' },
                { id: 'qrcode', label: 'QR' },
                { id: 'signature', label: 'Sign' },
                { id: 'background', label: 'BG' },
              ] as const
            ).map((chip) => (
              <button
                key={chip.id}
                type="button"
                onClick={() => setSelectedElement(chip.id)}
                className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors ${
                  selectedElement === chip.id
                    ? 'bg-[#24364B] text-white'
                    : 'bg-[#F0F2F4] text-[#536477] hover:text-[#202B38]'
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>

        {/* Context-sensitive sections */}
        {(selectedElement === 'header' || selectedElement === 'studentName' || selectedElement === 'details') && (
          <div className="space-y-3">
            <h5 className="text-[11px] font-bold uppercase tracking-wider text-[#75808C]">
              Typography
            </h5>
            <div>
              <label className="block font-semibold text-[#202B38] mb-1">
                {selectedElement === 'details' ? 'Body Font Family' : 'Heading Font Family'}
              </label>
              <select
                value={
                  selectedElement === 'details'
                    ? customization.fontFamily || ''
                    : customization.headingFontFamily || ''
                }
                onChange={(e) =>
                  commitCustomization((prev) => ({
                    ...prev,
                    ...(selectedElement === 'details'
                      ? { fontFamily: e.target.value }
                      : { headingFontFamily: e.target.value }),
                  }))
                }
                className="w-full px-2.5 py-1.5 rounded-lg border border-[#E3E7EB] bg-white text-xs"
              >
                <option value="">Template Default</option>
                {CARD_FONT_OPTIONS.map((f) => (
                  <option key={f.id} value={f.cssFamily}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>

            {selectedElement === 'header' && (
              <div>
                <div className="flex justify-between mb-1">
                  <span className="font-semibold text-[#202B38]">School Title Size</span>
                  <span className="font-mono">{customization.schoolNameFontSize || 31}px</span>
                </div>
                <input
                  type="range"
                  min="22"
                  max="46"
                  step="1"
                  value={customization.schoolNameFontSize || 31}
                  onChange={(e) =>
                    commitCustomization((prev) => ({
                      ...prev,
                      schoolNameFontSize: parseInt(e.target.value, 10),
                    }))
                  }
                  className="w-full accent-[#24364B]"
                />
              </div>
            )}

            {selectedElement === 'studentName' && (
              <div>
                <div className="flex justify-between mb-1">
                  <span className="font-semibold text-[#202B38]">Student Name Size</span>
                  <span className="font-mono">{customization.studentNameFontSize || 33}px</span>
                </div>
                <input
                  type="range"
                  min="22"
                  max="48"
                  step="1"
                  value={customization.studentNameFontSize || 33}
                  onChange={(e) =>
                    commitCustomization((prev) => ({
                      ...prev,
                      studentNameFontSize: parseInt(e.target.value, 10),
                    }))
                  }
                  className="w-full accent-[#24364B]"
                />
              </div>
            )}

            {selectedElement === 'details' && (
              <>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="font-semibold text-[#202B38]">Label Font Size</span>
                    <span className="font-mono">{customization.fieldLabelFontSize || 16}px</span>
                  </div>
                  <input
                    type="range"
                    min="11"
                    max="22"
                    step="0.5"
                    value={customization.fieldLabelFontSize || 16}
                    onChange={(e) =>
                      commitCustomization((prev) => ({
                        ...prev,
                        fieldLabelFontSize: parseFloat(e.target.value),
                      }))
                    }
                    className="w-full accent-[#24364B]"
                  />
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="font-semibold text-[#202B38]">Value Font Size</span>
                    <span className="font-mono">{customization.fieldValueFontSize || 20}px</span>
                  </div>
                  <input
                    type="range"
                    min="14"
                    max="26"
                    step="0.5"
                    value={customization.fieldValueFontSize || 20}
                    onChange={(e) =>
                      commitCustomization((prev) => ({
                        ...prev,
                        fieldValueFontSize: parseFloat(e.target.value),
                      }))
                    }
                    className="w-full accent-[#24364B]"
                  />
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="font-semibold text-[#202B38]">Address Font Size</span>
                    <span className="font-mono">{customization.addressFontSize || 15}px</span>
                  </div>
                  <input
                    type="range"
                    min="11"
                    max="20"
                    step="0.5"
                    value={customization.addressFontSize || 15}
                    onChange={(e) =>
                      commitCustomization((prev) => ({
                        ...prev,
                        addressFontSize: parseFloat(e.target.value),
                      }))
                    }
                    className="w-full accent-[#24364B]"
                  />
                </div>
              </>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-[#E3E7EB]">
              <span className="font-semibold text-[#202B38]">Text Color</span>
              <input
                type="color"
                value={customization.textColorOverride || '#202B38'}
                onChange={(e) =>
                  commitCustomization((prev) => ({ ...prev, textColorOverride: e.target.value }))
                }
                className="w-7 h-7 rounded border border-[#E3E7EB] cursor-pointer"
              />
            </div>
          </div>
        )}

        {selectedElement === 'logo' && (
          <div className="space-y-3">
            <h5 className="text-[11px] font-bold uppercase tracking-wider text-[#75808C]">
              Dimensions &amp; Appearance
            </h5>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[#202B38]">Visible on Card</span>
              <input
                type="checkbox"
                checked={customization.showLogo !== false}
                onChange={() => handleToggleField('logo')}
                className="w-4 h-4 accent-[#24364B]"
              />
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="font-semibold text-[#202B38]">Crest Diameter</span>
                <span className="font-mono">{customization.logoSize || 90}px</span>
              </div>
              <input
                type="range"
                min="48"
                max="124"
                step="2"
                value={customization.logoSize || 90}
                onChange={(e) =>
                  commitCustomization((prev) => ({
                    ...prev,
                    logoSize: parseInt(e.target.value, 10),
                  }))
                }
                className="w-full accent-[#24364B]"
              />
            </div>
            <div>
              <label className="block font-semibold text-[#202B38] mb-1">Frame Shape</label>
              <select
                value={customization.logoShape || 'circle'}
                onChange={(e) =>
                  commitCustomization((prev) => ({
                    ...prev,
                    logoShape: e.target.value as any,
                  }))
                }
                className="w-full px-2.5 py-1.5 rounded-lg border border-[#E3E7EB] bg-white"
              >
                <option value="circle">Circle</option>
                <option value="rounded">Rounded Square</option>
                <option value="square">Sharp Square</option>
                <option value="none">No Frame</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-[#202B38] mb-1">Ring Finish</label>
              <select
                value={customization.logoBadgeStyle || 'gold-ring'}
                onChange={(e) =>
                  commitCustomization((prev) => ({
                    ...prev,
                    logoBadgeStyle: e.target.value as any,
                  }))
                }
                className="w-full px-2.5 py-1.5 rounded-lg border border-[#E3E7EB] bg-white"
              >
                <option value="gold-ring">Gold Ring</option>
                <option value="white">Crisp White</option>
                <option value="tinted">Soft Tint</option>
                <option value="minimal">Slim Edge</option>
              </select>
            </div>
          </div>
        )}

        {selectedElement === 'photo' && (
          <div className="space-y-3">
            <h5 className="text-[11px] font-bold uppercase tracking-wider text-[#75808C]">
              Portrait Frame &amp; Position
            </h5>
            <div>
              <div className="flex justify-between mb-1">
                <span className="font-semibold text-[#202B38]">Corner Radius</span>
                <span className="font-mono">
                  {customization.photoRadius === undefined ? 'Auto' : `${customization.photoRadius}px`}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="90"
                step="2"
                value={customization.photoRadius ?? 10}
                onChange={(e) =>
                  commitCustomization((prev) => ({
                    ...prev,
                    photoRadius: parseInt(e.target.value, 10),
                  }))
                }
                className="w-full accent-[#24364B]"
              />
            </div>

            <div className="pt-2 border-t border-[#E3E7EB] space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold text-[#202B38] inline-flex items-center gap-1">
                  <Move className="w-3 h-3 text-[#536477]" />
                  <span>Crop Pan &amp; Zoom</span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const reset = { zoom: 1, x: 0, y: 0 };
                    setPhotoCrop(reset);
                    onUpdateStudentPhotoCrop?.(activeStudent.id, reset);
                  }}
                  className="text-[#24364B] hover:underline"
                >
                  Center
                </button>
              </div>
              <div>
                <div className="flex justify-between mb-0.5 text-[11px]">
                  <span className="text-[#75808C]">Zoom</span>
                  <span className="font-mono">{(photoCrop.zoom || 1).toFixed(1)}x</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="2.5"
                  step="0.1"
                  value={photoCrop.zoom || 1}
                  onChange={(e) => {
                    const next = { ...photoCrop, zoom: parseFloat(e.target.value) };
                    setPhotoCrop(next);
                    onUpdateStudentPhotoCrop?.(activeStudent.id, next);
                  }}
                  className="w-full accent-[#24364B]"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-[#75808C]">X ({photoCrop.x || 0}%)</label>
                  <input
                    type="range"
                    min="-40"
                    max="40"
                    step="2"
                    value={photoCrop.x || 0}
                    onChange={(e) => {
                      const next = { ...photoCrop, x: parseInt(e.target.value, 10) };
                      setPhotoCrop(next);
                      onUpdateStudentPhotoCrop?.(activeStudent.id, next);
                    }}
                    className="w-full accent-[#24364B]"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-[#75808C]">Y ({photoCrop.y || 0}%)</label>
                  <input
                    type="range"
                    min="-40"
                    max="40"
                    step="2"
                    value={photoCrop.y || 0}
                    onChange={(e) => {
                      const next = { ...photoCrop, y: parseInt(e.target.value, 10) };
                      setPhotoCrop(next);
                      onUpdateStudentPhotoCrop?.(activeStudent.id, next);
                    }}
                    className="w-full accent-[#24364B]"
                  />
                </div>
              </div>
              <p className="text-[10px] text-[#75808C]">
                Tip: Drag directly over the student photo on canvas to reposition.
              </p>
            </div>
          </div>
        )}

        {selectedElement === 'qrcode' && (
          <div className="space-y-3">
            <h5 className="text-[11px] font-bold uppercase tracking-wider text-[#75808C]">
              QR &amp; Verification Block
            </h5>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[#202B38]">Show QR Code</span>
              <input
                type="checkbox"
                checked={customization.showBarcode ?? true}
                onChange={(e) =>
                  commitCustomization((prev) => ({ ...prev, showBarcode: e.target.checked }))
                }
                className="w-4 h-4 accent-[#24364B]"
              />
            </div>
            <div className="p-2.5 rounded-lg bg-[#202B38] text-white font-mono text-[10px] leading-relaxed break-all whitespace-pre-wrap">
              {buildStudentQrPayload(activeStudent, schoolSettings)}
            </div>
            {onOpenLiveVerification && (
              <button
                type="button"
                onClick={() => onOpenLiveVerification(activeStudent)}
                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#24364B] hover:bg-[#304A64] rounded-lg"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open Live Verification</span>
              </button>
            )}
          </div>
        )}

        {selectedElement === 'signature' && (
          <div className="space-y-3">
            <h5 className="text-[11px] font-bold uppercase tracking-wider text-[#75808C]">
              Authorized Signatory
            </h5>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[#202B38]">Show Signature</span>
              <input
                type="checkbox"
                checked={customization.showSignature !== false}
                onChange={() => handleToggleField('principalSignature')}
                className="w-4 h-4 accent-[#24364B]"
              />
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="font-semibold text-[#202B38]">Width</span>
                <span className="font-mono">{customization.signatureWidth || 144}px</span>
              </div>
              <input
                type="range"
                min="70"
                max="190"
                step="4"
                value={customization.signatureWidth || 144}
                onChange={(e) =>
                  commitCustomization((prev) => ({
                    ...prev,
                    signatureWidth: parseInt(e.target.value, 10),
                  }))
                }
                className="w-full accent-[#24364B]"
              />
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="font-semibold text-[#202B38]">Height</span>
                <span className="font-mono">{customization.signatureHeight || 62}px</span>
              </div>
              <input
                type="range"
                min="35"
                max="85"
                step="3"
                value={customization.signatureHeight || 62}
                onChange={(e) =>
                  commitCustomization((prev) => ({
                    ...prev,
                    signatureHeight: parseInt(e.target.value, 10),
                  }))
                }
                className="w-full accent-[#24364B]"
              />
            </div>
            <div>
              <label className="block font-semibold text-[#202B38] mb-1">Title</label>
              <input
                type="text"
                value={customization.signatureTitle || 'PRINCIPAL'}
                onChange={(e) =>
                  commitCustomization((prev) => ({ ...prev, signatureTitle: e.target.value }))
                }
                className="w-full px-2.5 py-1.5 rounded-lg border border-[#E3E7EB] bg-white uppercase font-semibold"
              />
            </div>
          </div>
        )}

        {selectedElement === 'background' && (
          <div className="space-y-3">
            <h5 className="text-[11px] font-bold uppercase tracking-wider text-[#75808C]">
              Appearance &amp; Watermark
            </h5>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] text-[#536477] mb-1">Primary</label>
                <input
                  type="color"
                  value={customization.primaryColorOverride || '#24364B'}
                  onChange={(e) =>
                    commitCustomization((prev) => ({
                      ...prev,
                      primaryColorOverride: e.target.value,
                    }))
                  }
                  className="w-full h-8 rounded border border-[#E3E7EB] cursor-pointer"
                />
              </div>
              <div>
                <label className="block text-[11px] text-[#536477] mb-1">Accent</label>
                <input
                  type="color"
                  value={customization.accentColorOverride || '#A77C50'}
                  onChange={(e) =>
                    commitCustomization((prev) => ({
                      ...prev,
                      accentColorOverride: e.target.value,
                    }))
                  }
                  className="w-full h-8 rounded border border-[#E3E7EB] cursor-pointer"
                />
              </div>
              <div>
                <label className="block text-[11px] text-[#536477] mb-1">Surface</label>
                <input
                  type="color"
                  value={customization.surfaceColorOverride || '#FFFFFF'}
                  onChange={(e) =>
                    commitCustomization((prev) => ({
                      ...prev,
                      surfaceColorOverride: e.target.value,
                    }))
                  }
                  className="w-full h-8 rounded border border-[#E3E7EB] cursor-pointer"
                />
              </div>
              <div>
                <label className="block text-[11px] text-[#536477] mb-1">Text Ink</label>
                <input
                  type="color"
                  value={customization.textColorOverride || '#202B38'}
                  onChange={(e) =>
                    commitCustomization((prev) => ({
                      ...prev,
                      textColorOverride: e.target.value,
                    }))
                  }
                  className="w-full h-8 rounded border border-[#E3E7EB] cursor-pointer"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-[#E3E7EB] space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-[#202B38]">Logo Watermark</span>
                <input
                  type="checkbox"
                  checked={customization.watermarkEnabled ?? true}
                  onChange={(e) =>
                    commitCustomization((prev) => ({
                      ...prev,
                      watermarkEnabled: e.target.checked,
                    }))
                  }
                  className="w-4 h-4 accent-[#24364B]"
                />
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-[#536477]">Opacity</span>
                  <span className="font-mono">
                    {Math.round((customization.watermarkOpacity ?? 0.08) * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.02"
                  max="0.30"
                  step="0.01"
                  value={customization.watermarkOpacity ?? 0.08}
                  onChange={(e) =>
                    commitCustomization((prev) => ({
                      ...prev,
                      watermarkOpacity: parseFloat(e.target.value),
                    }))
                  }
                  className="w-full accent-[#24364B]"
                />
              </div>
            </div>
          </div>
        )}

        {/* Reset Footer */}
        <div className="pt-4 border-t border-[#E3E7EB] space-y-2">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#536477] bg-[#F5F6F7] hover:bg-[#F0F2F4] border border-[#E3E7EB] rounded-lg"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reset Styling Defaults</span>
          </button>
          <p className="text-[10px] text-[#75808C] text-center font-mono">
            CR80 · {isPortrait ? '53.98 × 85.60 mm' : '85.60 × 53.98 mm'}
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-[calc(100vh-56px)] bg-[#F5F6F7] overflow-hidden">
      {/* A. TOP STUDIO TOOLBAR */}
      <div className="bg-white border-b border-[#E3E7EB] px-3 sm:px-5 py-2.5 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
        {/* Left: Back, Project Name, Save Status */}
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={() => (onBackToProjects ? onBackToProjects() : onNavigate?.('dashboard'))}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-[#536477] hover:text-[#202B38] hover:bg-[#F0F2F4] rounded-lg transition-colors shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Back to Projects</span>
          </button>

          <span className="text-[#E3E7EB] hidden sm:inline">|</span>

          <input
            type="text"
            aria-label="Project Name"
            value={projectName}
            onChange={(e) => {
              setProjectName(e.target.value);
              setIsDirty(true);
            }}
            className="text-xs font-bold text-[#202B38] bg-transparent hover:bg-[#F5F6F7] focus:bg-white border border-transparent focus:border-[#E3E7EB] rounded px-2 py-1 min-w-[120px] max-w-[200px] truncate focus:outline-none"
          />

          <div className="hidden md:block">
            <StatusText
              tone={isDirty ? 'warning' : 'success'}
              label={studioNotice || (isDirty ? 'Unsaved changes' : 'Saved')}
            />
          </div>
        </div>

        {/* Center: Undo/Redo, Zoom, Front/Back, Orientation */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <div className="inline-flex items-center border border-[#E3E7EB] rounded-lg bg-[#F5F6F7] p-0.5">
            <button
              type="button"
              onClick={handleUndo}
              disabled={!canUndo}
              title="Undo (Ctrl+Z)"
              className="p-1.5 rounded text-[#202B38] hover:bg-white disabled:opacity-35"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleRedo}
              disabled={!canRedo}
              title="Redo (Ctrl+Shift+Z)"
              className="p-1.5 rounded text-[#202B38] hover:bg-white disabled:opacity-35"
            >
              <Redo2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Orientation */}
          <div className="hidden sm:inline-flex bg-[#F0F2F4] p-0.5 rounded-lg text-[11px] font-semibold">
            <button
              type="button"
              onClick={() => handleOrientationSwitch('portrait')}
              className={`px-2 py-1 rounded-md transition-colors ${
                isPortrait ? 'bg-white text-[#202B38]' : 'text-[#536477]'
              }`}
            >
              Portrait
            </button>
            <button
              type="button"
              onClick={() => handleOrientationSwitch('landscape')}
              className={`px-2 py-1 rounded-md transition-colors ${
                !isPortrait ? 'bg-white text-[#202B38]' : 'text-[#536477]'
              }`}
            >
              Landscape
            </button>
          </div>

          {/* Front / Back */}
          <div className="inline-flex bg-[#F0F2F4] p-0.5 rounded-lg text-[11px] font-semibold">
            <button
              type="button"
              onClick={() => commitCustomization((prev) => ({ ...prev, side: 'front' }))}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                customization.side === 'front' ? 'bg-white text-[#202B38]' : 'text-[#536477]'
              }`}
            >
              Front
            </button>
            <button
              type="button"
              onClick={() => commitCustomization((prev) => ({ ...prev, side: 'back' }))}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                customization.side === 'back' ? 'bg-white text-[#202B38]' : 'text-[#536477]'
              }`}
            >
              Back
            </button>
          </div>

          {/* Zoom */}
          <div className="hidden md:inline-flex items-center border border-[#E3E7EB] rounded-lg bg-white px-1 py-0.5 text-[11px]">
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.max(60, z - 10))}
              title="Zoom Out"
              className="p-1 text-[#536477] hover:text-[#202B38]"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setZoomLevel(100)}
              title="Reset zoom to 100%"
              className="px-1.5 font-mono tabular-nums text-[#202B38] font-semibold"
            >
              {zoomLevel}%
            </button>
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.min(160, z + 10))}
              title="Zoom In"
              className="p-1 text-[#536477] hover:text-[#202B38]"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Right: Preview & Export Dropdown */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsPreviewModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#202B38] bg-white border border-[#E3E7EB] hover:bg-[#F0F2F4] rounded-lg transition-colors"
          >
            <Eye className="w-3.5 h-3.5 text-[#536477]" />
            <span className="hidden sm:inline">Preview</span>
          </button>

          <div className="relative" ref={exportMenuRef}>
            <button
              type="button"
              onClick={() => setIsExportMenuOpen((v) => !v)}
              disabled={isExporting}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-[#24364B] hover:bg-[#304A64] rounded-lg transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>

            {isExportMenuOpen && (
              <div className="absolute right-0 mt-1.5 w-56 bg-white border border-[#E3E7EB] rounded-[10px] shadow-xl py-1.5 z-40">
                <button
                  type="button"
                  onClick={handleExportPng}
                  className="w-full px-3.5 py-2 text-left text-xs font-medium text-[#202B38] hover:bg-[#F5F6F7] flex items-center gap-2"
                >
                  <Download className="w-3.5 h-3.5 text-[#536477]" />
                  <span>Download Card PNG</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportPdf}
                  className="w-full px-3.5 py-2 text-left text-xs font-medium text-[#202B38] hover:bg-[#F5F6F7] flex items-center gap-2"
                >
                  <Download className="w-3.5 h-3.5 text-[#536477]" />
                  <span>Download CR80 PDF</span>
                </button>
                <div className="my-1 border-t border-[#E3E7EB]" />
                <button
                  type="button"
                  onClick={() => {
                    setIsExportMenuOpen(false);
                    setTemplateNameInput(projectName);
                    setIsSaveModalOpen(true);
                  }}
                  className="w-full px-3.5 py-2 text-left text-xs font-medium text-[#202B38] hover:bg-[#F5F6F7] flex items-center gap-2"
                >
                  <Bookmark className="w-3.5 h-3.5 text-[#A77C50]" />
                  <span>Save Custom Template</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsExportMenuOpen(false);
                    handleSaveAsDefault();
                  }}
                  className="w-full px-3.5 py-2 text-left text-xs font-medium text-[#202B38] hover:bg-[#F5F6F7] flex items-center gap-2"
                >
                  <Check className="w-3.5 h-3.5 text-[#25845A]" />
                  <span>Set as School Default</span>
                </button>
                {onNavigate && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsExportMenuOpen(false);
                      onNavigate('export');
                    }}
                    className="w-full px-3.5 py-2 text-left text-xs font-medium text-[#202B38] hover:bg-[#F5F6F7] flex items-center gap-2"
                  >
                    <Printer className="w-3.5 h-3.5 text-[#536477]" />
                    <span>Open Batch Print Studio</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MAIN THREE-PANEL DESKTOP WORKSPACE */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* B. LEFT SIDEBAR (Tool Rail + Active Tool Drawer) */}
        <aside className="hidden lg:flex bg-white border-r border-[#E3E7EB] shrink-0">
          {/* Narrow Icon Rail */}
          <div className="w-[72px] border-r border-[#E3E7EB] bg-[#F5F6F7] py-2 flex flex-col items-center gap-1 overflow-y-auto">
            {TOOL_RAIL_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = activeTool === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setActiveTool(item.key)}
                  className={`w-[58px] py-2 px-1 rounded-lg flex flex-col items-center gap-1 text-[10px] font-semibold transition-colors ${
                    active
                      ? 'bg-[#24364B] text-white'
                      : 'text-[#536477] hover:bg-white hover:text-[#202B38]'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate w-full text-center leading-tight">{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* Tool Content Drawer */}
          <div className="w-[264px] p-4 overflow-y-auto bg-white">{renderLeftToolContent()}</div>
        </aside>

        {/* C. CENTER CANVAS */}
        <section className="flex-1 flex flex-col min-w-0 bg-[#F0F2F4] overflow-hidden">
          {/* Sub-bar above canvas: Student switcher + Grid/Guides toggles + Mobile drawers */}
          <div className="px-4 py-2 bg-white/80 border-b border-[#E3E7EB] flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-[#75808C]">Previewing:</span>
              <select
                aria-label="Preview student"
                value={currentStudentId}
                onChange={(e) => setCurrentStudentId(e.target.value)}
                className="text-xs font-semibold px-2.5 py-1 rounded-lg border border-[#E3E7EB] bg-white text-[#202B38] max-w-[190px]"
              >
                {students.map((std) => (
                  <option key={std.id} value={std.id}>
                    {std.name} ({std.classGrade || 'Class X'})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setShowGrid((v) => !v)}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors ${
                  showGrid
                    ? 'bg-[#24364B] text-white border-[#24364B]'
                    : 'bg-white text-[#536477] border-[#E3E7EB]'
                }`}
              >
                <Grid className="w-3 h-3" />
                <span>Grid</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowGuides((v) => !v);
                  setShowInteractiveGuides((v) => !v);
                }}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors ${
                  showGuides
                    ? 'bg-[#24364B] text-white border-[#24364B]'
                    : 'bg-white text-[#536477] border-[#E3E7EB]'
                }`}
              >
                <Crosshair className="w-3 h-3" />
                <span>Guides</span>
              </button>
            </div>
          </div>

          {(() => {
            const rawStatus = activeStudent.cardStatus || 'active';
            const isDateExpired =
              rawStatus === 'active' &&
              isValidityDateExpired(activeStudent.validUntil || schoolSettings.defaultCardValidUntil);
            const effStatus = isDateExpired ? 'expired' : rawStatus;
            if (effStatus === 'active') return null;
            return (
              <div
                className={`px-4 py-2 border-b text-xs flex items-center justify-between gap-3 ${
                  effStatus === 'lost'
                    ? 'bg-rose-50 border-rose-200 text-rose-900'
                    : effStatus === 'expired'
                    ? 'bg-amber-50 border-amber-200 text-amber-900'
                    : 'bg-slate-200 border-slate-300 text-slate-900'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span className="font-semibold truncate">
                    {effStatus === 'lost'
                      ? 'Warning: This card is marked LOST — live QR scans show DO NOT HONOR.'
                      : effStatus === 'expired'
                      ? 'Notice: Card validity has expired — QR verification shows EXPIRED.'
                      : 'Notice: Card is currently SUSPENDED on live verification.'}
                  </span>
                </div>
                {onOpenLiveVerification && (
                  <button
                    type="button"
                    onClick={() => onOpenLiveVerification(activeStudent)}
                    className="text-[11px] font-bold underline shrink-0"
                  >
                    Preview Live Status
                  </button>
                )}
              </div>
            );
          })()}

          {/* Canvas Viewport */}
          <div
            className={`flex-1 overflow-auto flex items-center justify-center p-6 sm:p-10 relative ${
              showGrid ? 'studio-grid-bg' : 'bg-[#F0F2F4]'
            }`}
            onClick={() => setSelectedElement('background')}
          >
            {/* Alignment Crosshair Guides */}
            {showGuides && (
              <>
                <div className="pointer-events-none absolute inset-y-0 left-1/2 w-px border-l border-dashed border-[#A77C50]/40" />
                <div className="pointer-events-none absolute inset-x-0 top-1/2 h-px border-t border-dashed border-[#A77C50]/40" />
              </>
            )}

            {/* Scalable Card Stage */}
            <div
              style={{
                transform: `scale(${zoomLevel / 100})`,
                transformOrigin: 'center center',
                transition: 'transform 0.15s ease-out',
                maxWidth: isPortrait ? '320px' : '490px',
                width: '100%',
              }}
              className="relative"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Safe Bleed Margin Outline outside cardElementRef */}
              {showGuides && (
                <div className="pointer-events-none -inset-2.5 absolute border border-dashed border-[#24364B]/30 rounded-[12px]" />
              )}

              {/* PURE CARD CONTAINER FOR PNG/PDF EXPORTS */}
              <div
                ref={cardElementRef}
                className="bg-white rounded-[8px] shadow-md overflow-hidden"
              >
                <CR80Card
                  student={activeStudent}
                  schoolSettings={schoolSettings}
                  customization={customization}
                />
              </div>

              {/* Interactive Selection Regions Overlay (Outside cardElementRef) */}
              {showInteractiveGuides && customization.side === 'front' && (
                <div className="absolute inset-0 z-10 pointer-events-none">
                  {/* Header Zone */}
                  <button
                    type="button"
                    aria-label="Select School Header"
                    onClick={() => handleSelectCanvasElement('header', 'text')}
                    className={`pointer-events-auto absolute top-0 left-0 right-0 h-[18%] rounded-t-[8px] transition-all ${
                      selectedElement === 'header'
                        ? 'ring-2 ring-[#A77C50] bg-[#A77C50]/5'
                        : 'hover:ring-1 hover:ring-[#24364B]/40'
                    }`}
                  />
                  {/* Logo Hotspot */}
                  <button
                    type="button"
                    aria-label="Select School Logo"
                    onClick={() => handleSelectCanvasElement('logo', 'shapes')}
                    className={`pointer-events-auto absolute top-[2%] left-[4%] w-[22%] h-[16%] rounded-lg transition-all ${
                      selectedElement === 'logo'
                        ? 'ring-2 ring-[#24364B] bg-[#24364B]/10'
                        : 'hover:ring-1 hover:ring-[#24364B]/50'
                    }`}
                  />
                  {/* Student Photo Zone (Interactive drag-to-pan) */}
                  <div
                    role="button"
                    tabIndex={0}
                    aria-label="Select and drag student photo crop"
                    onPointerDown={handlePhotoPointerDown}
                    onPointerMove={handlePhotoPointerMove}
                    onPointerUp={handlePhotoPointerUp}
                    onClick={() => handleSelectCanvasElement('photo', 'images')}
                    className={`pointer-events-auto cursor-move absolute ${
                      isPortrait
                        ? 'top-[22%] left-[26%] w-[48%] h-[28%]'
                        : 'top-[25%] left-[5%] w-[25%] h-[50%]'
                    } rounded-lg transition-all ${
                      selectedElement === 'photo'
                        ? 'ring-2 ring-[#24364B] bg-[#24364B]/5'
                        : 'hover:ring-1 hover:ring-[#24364B]/50'
                    }`}
                  />
                  {/* Student Name Zone */}
                  <button
                    type="button"
                    aria-label="Select Student Name"
                    onClick={() => handleSelectCanvasElement('studentName', 'text')}
                    className={`pointer-events-auto absolute ${
                      isPortrait
                        ? 'top-[51%] left-[8%] right-[8%] h-[10%]'
                        : 'top-[24%] left-[33%] right-[6%] h-[14%]'
                    } rounded transition-all ${
                      selectedElement === 'studentName'
                        ? 'ring-2 ring-[#A77C50] bg-[#A77C50]/5'
                        : 'hover:ring-1 hover:ring-[#24364B]/40'
                    }`}
                  />
                  {/* Student Details Grid */}
                  <button
                    type="button"
                    aria-label="Select Student Details"
                    onClick={() => handleSelectCanvasElement('details', 'fields')}
                    className={`pointer-events-auto absolute ${
                      isPortrait
                        ? 'top-[62%] left-[6%] right-[6%] h-[23%]'
                        : 'top-[39%] left-[33%] right-[24%] h-[42%]'
                    } rounded transition-all ${
                      selectedElement === 'details'
                        ? 'ring-2 ring-[#24364B] bg-[#24364B]/5'
                        : 'hover:ring-1 hover:ring-[#24364B]/40'
                    }`}
                  />
                  {/* QR Code Hotspot */}
                  <button
                    type="button"
                    aria-label="Select QR Code"
                    onClick={() => handleSelectCanvasElement('qrcode', 'qrcode')}
                    className={`pointer-events-auto absolute ${
                      isPortrait
                        ? 'bottom-[3%] left-[5%] w-[26%] h-[12%]'
                        : 'bottom-[8%] right-[4%] w-[18%] h-[24%]'
                    } rounded transition-all ${
                      selectedElement === 'qrcode'
                        ? 'ring-2 ring-[#24364B] bg-[#24364B]/10'
                        : 'hover:ring-1 hover:ring-[#24364B]/40'
                    }`}
                  />
                  {/* Signature Hotspot */}
                  <button
                    type="button"
                    aria-label="Select Principal Signature"
                    onClick={() => handleSelectCanvasElement('signature', 'images')}
                    className={`pointer-events-auto absolute ${
                      isPortrait
                        ? 'bottom-[3%] right-[5%] w-[32%] h-[12%]'
                        : 'bottom-[6%] left-[5%] w-[24%] h-[18%]'
                    } rounded transition-all ${
                      selectedElement === 'signature'
                        ? 'ring-2 ring-[#A77C50] bg-[#A77C50]/10'
                        : 'hover:ring-1 hover:ring-[#24364B]/40'
                    }`}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Mobile / Tablet Quick Drawer Triggers */}
          <div className="lg:hidden bg-white border-t border-[#E3E7EB] px-4 py-2.5 flex items-center justify-between gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setMobilePanel('tools')}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold bg-[#F5F6F7] border border-[#E3E7EB] rounded-lg text-[#202B38]"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Design Tools</span>
            </button>
            <button
              type="button"
              onClick={() => setMobilePanel('properties')}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold bg-[#24364B] text-white rounded-lg"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Properties</span>
            </button>
          </div>
        </section>

        {/* D. RIGHT PROPERTIES PANEL */}
        <aside className="hidden lg:block w-[276px] bg-white border-l border-[#E3E7EB] p-4 overflow-y-auto shrink-0">
          {renderRightProperties()}
        </aside>
      </div>

      {/* Tablet/Mobile Slide-Over Panel */}
      {mobilePanel !== 'none' && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-[#202B38]/45 flex justify-end"
          onClick={() => setMobilePanel('none')}
        >
          <div
            className="w-full max-w-sm bg-white h-full flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 border-b border-[#E3E7EB] bg-[#F5F6F7] flex items-center justify-between">
              <span className="text-xs font-bold text-[#202B38] uppercase tracking-wider">
                {mobilePanel === 'tools' ? 'Studio Tools' : 'Element Properties'}
              </span>
              <button
                type="button"
                onClick={() => setMobilePanel('none')}
                className="p-1.5 rounded-lg text-[#75808C] hover:text-[#202B38]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {mobilePanel === 'tools' && (
              <div className="px-3 py-2 border-b border-[#E3E7EB] flex items-center gap-1 overflow-x-auto bg-[#F5F6F7]">
                {TOOL_RAIL_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const active = activeTool === item.key;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setActiveTool(item.key)}
                      className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold inline-flex items-center gap-1.5 shrink-0 ${
                        active ? 'bg-[#24364B] text-white' : 'bg-white text-[#536477]'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-4">
              {mobilePanel === 'tools' ? renderLeftToolContent() : renderRightProperties()}
            </div>
          </div>
        </div>
      )}

      {/* PREVIEW MODAL (Front + Back Side-by-Side) */}
      {isPreviewModalOpen && (
        <div
          className="no-print fixed inset-0 z-50 bg-[#202B38]/50 flex items-center justify-center p-4"
          onClick={() => setIsPreviewModalOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="bg-white rounded-[12px] border border-[#E3E7EB] shadow-xl w-full max-w-4xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-[#E3E7EB] flex items-center justify-between bg-[#F5F6F7]">
              <div>
                <h3 className="text-sm font-bold text-[#202B38]">
                  {projectName} · Double-Sided Inspection
                </h3>
                <p className="text-xs text-[#75808C]">
                  {activeStudent.name} · CR80 ({isPortrait ? '53.98 × 85.60 mm' : '85.60 × 53.98 mm'})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsPreviewModalOpen(false)}
                className="p-1.5 rounded-lg text-[#75808C] hover:text-[#202B38] hover:bg-[#E3E7EB]/60"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 studio-grid-bg grid grid-cols-1 md:grid-cols-2 gap-6 place-items-center max-h-[75vh] overflow-y-auto">
              <div className="flex flex-col items-center gap-2 w-full">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#536477]">
                  Front Side
                </span>
                <div className={isPortrait ? 'w-[240px]' : 'w-full max-w-[360px]'}>
                  <CR80Card
                    student={activeStudent}
                    schoolSettings={schoolSettings}
                    customization={{ ...customization, side: 'front' }}
                  />
                </div>
              </div>

              <div className="flex flex-col items-center gap-2 w-full">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#536477]">
                  Back Side
                </span>
                <div className={isPortrait ? 'w-[240px]' : 'w-full max-w-[360px]'}>
                  <CR80Card
                    student={activeStudent}
                    schoolSettings={schoolSettings}
                    customization={{ ...customization, side: 'back' }}
                  />
                </div>
              </div>
            </div>

            <div className="px-6 py-3.5 border-t border-[#E3E7EB] bg-white flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsPreviewModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-[#202B38] bg-white border border-[#E3E7EB] hover:bg-[#F0F2F4] rounded-lg"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SAVE CUSTOM TEMPLATE MODAL */}
      {isSaveModalOpen && (
        <div
          className="no-print fixed inset-0 z-50 bg-[#202B38]/45 flex items-center justify-center p-4"
          onClick={() => setIsSaveModalOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="bg-white rounded-[12px] border border-[#E3E7EB] shadow-xl max-w-md w-full p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#E3E7EB] pb-3">
              <h3 className="text-sm font-bold text-[#202B38] flex items-center gap-2">
                <Bookmark className="w-4 h-4 text-[#A77C50]" />
                <span>Save Custom Project Template</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsSaveModalOpen(false)}
                className="p-1 text-[#75808C] hover:text-[#202B38]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomDesign} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#202B38] mb-1">
                  Project / Template Name
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={templateNameInput}
                  onChange={(e) => setTemplateNameInput(e.target.value)}
                  placeholder="e.g. Annual Pass 2026"
                  className="w-full px-3 py-2 border border-[#E3E7EB] rounded-lg text-xs font-medium focus:outline-none focus:border-[#24364B]"
                />
                <p className="text-[11px] text-[#75808C] mt-1.5">
                  Stores typography, colors, logo framing, watermark settings, and custom field labels.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSaveModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-semibold text-[#202B38] bg-white border border-[#E3E7EB] hover:bg-[#F0F2F4] rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#24364B] hover:bg-[#304A64] rounded-lg"
                >
                  Save Template
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
