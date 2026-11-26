import React, { useState, useRef, useEffect } from 'react';
import { CardCustomization, SavedCustomTemplate, SchoolSettings, Student, TemplateId } from '../../types';
import {
  TEMPLATE_REGISTRY,
  DEMO_STUDENTS,
  CARD_FONT_OPTIONS,
  FONT_PAIRING_PRESETS,
  getPairedTemplateId,
} from '../../constants/initialData';
import { CR80Card } from '../cards/CR80Card';
import { buildStudentQrPayload } from '../cards/CardDesignSystem';
import { exportElementAsPng, exportSingleCardPdf } from '../../utils/export';
import {
  Sliders,
  RotateCw,
  Eye,
  Download,
  ZoomIn,
  ZoomOut,
  Check,
  Layers,
  CreditCard,
  Move,
  Camera,
  Edit3,
  Save,
  CheckSquare,
  Square,
  UserCheck,
  Type,
  Image as ImageIcon,
  Shield,
  Palette,
  Tag,
  Bookmark,
  Trash2,
  FolderHeart,
  Plus,
  RefreshCw,
  QrCode,
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
}

type EditorTab = 'templates' | 'typography' | 'elements' | 'security' | 'colors' | 'fields' | 'saved';

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
}) => {
  const [currentStudentId, setCurrentStudentId] = useState<string>(
    selectedStudentId || students[0]?.id || ''
  );

  const initialTemplate = initialTemplateId || schoolSettings.defaultTemplateId || 'portrait_red_magenta_curved';
  const initialOrientation = initialTemplate.startsWith('portrait_') ? 'portrait' : 'landscape';
  const savedDefaults = schoolSettings.defaultCustomization;

  const [activeTab, setActiveTab] = useState<EditorTab>('typography');

  const [customization, setCustomization] = useState<CardCustomization>({
    templateId: initialTemplate,
    orientation: initialOrientation,
    side: 'front',
    showBarcode: schoolSettings.visibleFields?.barcode !== false,
    showSignature: schoolSettings.visibleFields?.principalSignature !== false,
    showLogo: schoolSettings.visibleFields?.logo !== false,
    fieldVisibility: { ...schoolSettings.visibleFields },

    // Font families
    fontFamily: savedDefaults?.fontFamily || '',
    headingFontFamily: savedDefaults?.headingFontFamily || '',

    // Default sizing (print-ready CR80 proportions)
    schoolNameFontSize: savedDefaults?.schoolNameFontSize || 31,
    studentNameFontSize: savedDefaults?.studentNameFontSize || 33,
    fieldLabelFontSize: savedDefaults?.fieldLabelFontSize || 16,
    fieldValueFontSize: savedDefaults?.fieldValueFontSize || 20,
    addressFontSize: savedDefaults?.addressFontSize || 15,

    // Default logo & signature
    logoSize: savedDefaults?.logoSize || 90,
    logoShape: savedDefaults?.logoShape || 'circle',
    logoBadgeStyle: savedDefaults?.logoBadgeStyle || 'gold-ring',
    signatureWidth: savedDefaults?.signatureWidth || 144,
    signatureHeight: savedDefaults?.signatureHeight || 62,
    signatureTitle: savedDefaults?.signatureTitle || 'PRINCIPAL',

    // Photo & security
    photoWidth: savedDefaults?.photoWidth || 148,
    photoHeight: savedDefaults?.photoHeight || 160,
    photoRadius: savedDefaults?.photoRadius,
    watermarkEnabled: savedDefaults?.watermarkEnabled ?? true,
    watermarkOpacity: savedDefaults?.watermarkOpacity ?? 0.08,
    watermarkSize: savedDefaults?.watermarkSize ?? 280,

    // Colors
    primaryColorOverride: savedDefaults?.primaryColorOverride,
    accentColorOverride: savedDefaults?.accentColorOverride,
    surfaceColorOverride: savedDefaults?.surfaceColorOverride,
    textColorOverride: savedDefaults?.textColorOverride,
    labelColorOverride: savedDefaults?.labelColorOverride,

    // Custom labels
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

  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [photoCrop, setPhotoCrop] = useState<{ zoom: number; x: number; y: number }>({
    zoom: 1,
    x: 0,
    y: 0,
  });
  const [showCropPanel, setShowCropPanel] = useState<boolean>(false);
  const [showEditStudentPanel, setShowEditStudentPanel] = useState<boolean>(false);
  const [saveStudentNotice, setSaveStudentNotice] = useState<string>('');
  const [saveTemplateNotice, setSaveTemplateNotice] = useState<string>('');

  // Custom template save modal
  const [isSaveModalOpen, setIsSaveModalOpen] = useState<boolean>(false);
  const [templateNameInput, setTemplateNameInput] = useState<string>('');

  const cardElementRef = useRef<HTMLDivElement>(null);

  const rawActiveStudent =
    students.find((s) => s.id === currentStudentId) ||
    students[0] ||
    DEMO_STUDENTS[0];

  // Local state for instant student data edits
  const [studentForm, setStudentForm] = useState<Student>(rawActiveStudent);

  useEffect(() => {
    if (selectedStudentId && selectedStudentId !== currentStudentId) {
      setCurrentStudentId(selectedStudentId);
    }
  }, [selectedStudentId]);

  useEffect(() => {
    if (initialTemplateId && initialTemplateId !== customization.templateId) {
      const isPortrait = initialTemplateId.startsWith('portrait_');
      setCustomization((prev) => ({
        ...prev,
        templateId: initialTemplateId,
        orientation: isPortrait ? 'portrait' : 'landscape',
      }));
    }
  }, [initialTemplateId]);

  useEffect(() => {
    if (rawActiveStudent) {
      setStudentForm(rawActiveStudent);
    }
  }, [currentStudentId, students]);

  // Merge interactive photo crop with active student data
  const activeStudent: Student = {
    ...studentForm,
    photoCrop: studentForm.photoCrop || photoCrop,
  };

  const handleOrientationSwitch = (orient: 'landscape' | 'portrait') => {
    const pairedId = getPairedTemplateId(customization.templateId, orient);
    setCustomization((prev) => ({
      ...prev,
      orientation: orient,
      templateId: pairedId,
    }));
  };

  const handleSelectTemplate = (templateId: TemplateId) => {
    const isPortrait = templateId.startsWith('portrait_');
    setCustomization((prev) => ({
      ...prev,
      templateId,
      orientation: isPortrait ? 'portrait' : 'landscape',
    }));
  };

  // Toggle individual field on or off
  const handleToggleField = (fieldKey: keyof SchoolSettings['visibleFields']) => {
    const current = customization.fieldVisibility?.[fieldKey] !== false;
    const nextVal = !current;
    const updatedVisibility = {
      ...(customization.fieldVisibility || schoolSettings.visibleFields),
      [fieldKey]: nextVal,
    };
    setCustomization((prev) => ({
      ...prev,
      fieldVisibility: updatedVisibility,
      ...(fieldKey === 'logo' ? { showLogo: nextVal } : {}),
      ...(fieldKey === 'principalSignature' ? { showSignature: nextVal } : {}),
    }));
  };

  const handleSetAllFields = (enabled: boolean) => {
    const newVisibility = {
      fatherName: enabled,
      motherName: enabled,
      contactNumber: enabled,
      dob: enabled,
      address: enabled,
      conveyance: enabled,
      session: enabled,
      rollNo: enabled,
      classGrade: enabled,
      bloodGroup: enabled,
      principalSignature: enabled,
      logo: enabled,
      schoolAddress: enabled,
      schoolContact: enabled,
      barcode: enabled,
    };
    setCustomization((prev) => ({
      ...prev,
      showLogo: enabled,
      showSignature: enabled,
      fieldVisibility: newVisibility,
    }));
  };

  const handleSaveStudentChanges = () => {
    if (onSaveStudent) {
      onSaveStudent(activeStudent);
      setSaveStudentNotice('Student information updated successfully!');
      setTimeout(() => setSaveStudentNotice(''), 3000);
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
    setSaveTemplateNotice('Saved design, fonts & sizing as School Default!');
    setTimeout(() => setSaveTemplateNotice(''), 3500);
  };

  // Save as Custom Named Template
  const handleSaveCustomDesign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateNameInput.trim()) return;

    const newSavedTemplate: SavedCustomTemplate = {
      id: `custom_tpl_${Date.now()}`,
      name: templateNameInput.trim(),
      baseTemplateId: customization.templateId,
      orientation: customization.orientation,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      customization: { ...customization },
    };

    if (onSaveCustomTemplate) {
      onSaveCustomTemplate(newSavedTemplate);
    }

    setIsSaveModalOpen(false);
    setTemplateNameInput('');
    setSaveTemplateNotice(`Saved as custom template "${newSavedTemplate.name}"!`);
    setActiveTab('saved');
    setTimeout(() => setSaveTemplateNotice(''), 4000);
  };

  // Load a Saved Custom Template
  const handleLoadCustomTemplate = (saved: SavedCustomTemplate) => {
    setCustomization({
      ...saved.customization,
      templateId: saved.baseTemplateId || saved.customization.templateId,
      orientation: saved.orientation || saved.customization.orientation,
    });
    setSaveTemplateNotice(`Loaded custom template "${saved.name}"!`);
    setTimeout(() => setSaveTemplateNotice(''), 3000);
  };

  // Reset to default sizes
  const handleResetToTemplateDefaults = () => {
    setCustomization((prev) => ({
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
    setSaveTemplateNotice('Reset fonts, sizes and colors to template defaults.');
    setTimeout(() => setSaveTemplateNotice(''), 2500);
  };

  const handleExportPng = async () => {
    if (!cardElementRef.current) return;
    setIsExporting(true);
    try {
      await exportElementAsPng(
        cardElementRef.current,
        `ID_Card_${activeStudent.name.replace(/\s+/g, '_')}_${customization.side}.png`
      );
    } catch (e) {
      console.error(e);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPdf = async () => {
    if (!cardElementRef.current) return;
    setIsExporting(true);
    try {
      await exportSingleCardPdf(
        cardElementRef.current,
        activeStudent.name,
        customization.orientation
      );
    } catch (e) {
      console.error(e);
    } finally {
      setIsExporting(false);
    }
  };

  const isPortrait = customization.orientation === 'portrait';
  const availableTemplates = TEMPLATE_REGISTRY.filter((t) => t.orientation === customization.orientation);

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6">
      {/* Title Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Live ID Card Customizer Studio
            </h2>
            {saveTemplateNotice && (
              <span className="text-xs bg-emerald-50 text-emerald-700 font-semibold px-2.5 py-1 rounded-full border border-emerald-200 animate-in fade-in">
                {saveTemplateNotice}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Completely customize every field: text sizes, logo size, signature dimensions, security watermark, custom labels, and save as your own reusable template.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Save as Custom Template Button */}
          <button
            onClick={() => {
              setTemplateNameInput(`My Custom ${isPortrait ? 'Portrait' : 'Landscape'} Card`);
              setIsSaveModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-xs"
            title="Save this current customized card with your own custom name"
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>Save Custom Template</span>
          </button>

          <button
            onClick={handleSaveAsDefault}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-xs"
          >
            <Check className="w-3.5 h-3.5 text-emerald-600" />
            <span>Set as Default</span>
          </button>

          <button
            onClick={handleExportPng}
            disabled={isExporting}
            className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors"
          >
            PNG
          </button>
          <button
            onClick={handleExportPdf}
            disabled={isExporting}
            className="px-3.5 py-1.5 text-xs font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg disabled:opacity-50 transition-colors shadow-xs"
          >
            PDF
          </button>
        </div>
      </div>

      {/* Editor Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Viewport Stage & Live Card Render */}
        <div className="lg:col-span-7 bg-white p-6 rounded-xl border border-slate-200 space-y-4">
          {/* Stage Controls Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
            {/* Student Switcher and Quick Edit button */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium">Student:</span>
              <select
                value={currentStudentId}
                onChange={(e) => setCurrentStudentId(e.target.value)}
                className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 max-w-[180px]"
              >
                {students.map((std) => (
                  <option key={std.id} value={std.id}>
                    {std.name} ({std.classGrade || 'Class X'})
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setShowEditStudentPanel(!showEditStudentPanel)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                  showEditStudentPanel
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-300'
                }`}
                title="Edit student details directly on this card"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>{showEditStudentPanel ? 'Close Editor' : 'Edit Student Data'}</span>
              </button>
            </div>

            {/* Orientation, Side & Zoom */}
            <div className="flex items-center gap-2">
              {/* Orientation switch */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs">
                <button
                  onClick={() => handleOrientationSwitch('portrait')}
                  className={`px-2 py-1 rounded font-medium transition-colors ${
                    isPortrait ? 'bg-white text-slate-900 font-bold shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Portrait
                </button>
                <button
                  onClick={() => handleOrientationSwitch('landscape')}
                  className={`px-2 py-1 rounded font-medium transition-colors ${
                    !isPortrait ? 'bg-white text-slate-900 font-bold shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Landscape
                </button>
              </div>

              {/* Side Switcher */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs">
                <button
                  onClick={() => setCustomization({ ...customization, side: 'front' })}
                  className={`px-2.5 py-1 rounded font-medium transition-colors ${
                    customization.side === 'front'
                      ? 'bg-white text-slate-900 font-bold shadow-xs'
                      : 'text-slate-600'
                  }`}
                >
                  Front
                </button>
                <button
                  onClick={() => setCustomization({ ...customization, side: 'back' })}
                  className={`px-2.5 py-1 rounded font-medium transition-colors ${
                    customization.side === 'back'
                      ? 'bg-white text-slate-900 font-bold shadow-xs'
                      : 'text-slate-600'
                  }`}
                >
                  Back
                </button>
              </div>

              {/* Zoom Buttons */}
              <div className="flex items-center gap-0.5 text-slate-500">
                <button
                  onClick={() => setZoomLevel((z) => Math.max(70, z - 15))}
                  className="p-1 rounded hover:bg-slate-100 text-slate-600"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="text-[11px] font-mono text-slate-600 w-9 text-center">
                  {zoomLevel}%
                </span>
                <button
                  onClick={() => setZoomLevel((z) => Math.min(150, z + 15))}
                  className="p-1 rounded hover:bg-slate-100 text-slate-600"
                  title="Zoom In"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Direct Live Student Data Editor */}
          {showEditStudentPanel && (
            <div className="bg-slate-50 p-4 rounded-xl border border-blue-200 space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between pb-1 border-b border-slate-200">
                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Edit3 className="w-3.5 h-3.5 text-blue-600" />
                  <span>Edit Active Student Data (Live Real-Time Preview)</span>
                </h4>
                {saveStudentNotice && (
                  <span className="text-[11px] font-semibold text-emerald-600 animate-in fade-in">
                    {saveStudentNotice}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 text-xs">
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase">Student Name</label>
                  <input
                    type="text"
                    value={studentForm.name}
                    onChange={(e) => setStudentForm({ ...studentForm, name: e.target.value })}
                    className="w-full text-xs px-2 py-1.5 rounded border border-slate-300 bg-white font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase">Father's Name</label>
                  <input
                    type="text"
                    value={studentForm.fatherName}
                    onChange={(e) => setStudentForm({ ...studentForm, fatherName: e.target.value })}
                    className="w-full text-xs px-2 py-1.5 rounded border border-slate-300 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase">Mother's Name</label>
                  <input
                    type="text"
                    value={studentForm.motherName}
                    onChange={(e) => setStudentForm({ ...studentForm, motherName: e.target.value })}
                    className="w-full text-xs px-2 py-1.5 rounded border border-slate-300 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase">Class / Grade</label>
                  <input
                    type="text"
                    value={studentForm.classGrade || ''}
                    onChange={(e) => setStudentForm({ ...studentForm, classGrade: e.target.value })}
                    className="w-full text-xs px-2 py-1.5 rounded border border-slate-300 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase">Roll No</label>
                  <input
                    type="text"
                    value={studentForm.rollNo || ''}
                    onChange={(e) => setStudentForm({ ...studentForm, rollNo: e.target.value })}
                    className="w-full text-xs px-2 py-1.5 rounded border border-slate-300 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase">Contact Number</label>
                  <input
                    type="text"
                    value={studentForm.contactNumber}
                    onChange={(e) => setStudentForm({ ...studentForm, contactNumber: e.target.value })}
                    className="w-full text-xs px-2 py-1.5 rounded border border-slate-300 bg-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase">D.O.B. (DD/MM/YYYY)</label>
                  <input
                    type="text"
                    value={studentForm.dob}
                    onChange={(e) => setStudentForm({ ...studentForm, dob: e.target.value })}
                    className="w-full text-xs px-2 py-1.5 rounded border border-slate-300 bg-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase">Conveyance (Bus)</label>
                  <select
                    value={studentForm.conveyance}
                    onChange={(e) => setStudentForm({ ...studentForm, conveyance: e.target.value as 'Yes' | 'No' })}
                    className="w-full text-xs px-2 py-1.5 rounded border border-slate-300 bg-white font-bold"
                  >
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase">Academic Session</label>
                  <input
                    type="text"
                    value={studentForm.session}
                    onChange={(e) => setStudentForm({ ...studentForm, session: e.target.value })}
                    className="w-full text-xs px-2 py-1.5 rounded border border-slate-300 bg-white"
                  />
                </div>
                <div className="sm:col-span-2 lg:col-span-3">
                  <label className="block text-[10px] font-bold text-slate-700 uppercase">Residential Address</label>
                  <input
                    type="text"
                    value={studentForm.address}
                    onChange={(e) => setStudentForm({ ...studentForm, address: e.target.value })}
                    className="w-full text-xs px-2 py-1.5 rounded border border-slate-300 bg-white"
                  />
                </div>
              </div>
              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={handleSaveStudentChanges}
                  className="flex items-center gap-1 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold shadow-xs"
                >
                  <Save className="w-3 h-3" />
                  <span>Save to Student Profile</span>
                </button>
              </div>
            </div>
          )}

          {/* Interactive Card Canvas Container */}
          <div className="flex items-center justify-center p-6 bg-slate-100/70 rounded-xl min-h-[460px] overflow-hidden">
            <div
              style={{
                transform: `scale(${zoomLevel / 100})`,
                transformOrigin: 'center center',
                transition: 'transform 0.15s ease-out',
                maxWidth: isPortrait ? '340px' : '520px',
                width: '100%',
              }}
              ref={cardElementRef}
              className="drop-shadow-xl"
            >
              <CR80Card
                student={activeStudent}
                schoolSettings={schoolSettings}
                customization={customization}
              />
            </div>
          </div>

          {/* Quick Toolbar below card */}
          <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100">
            <button
              onClick={() => setShowCropPanel(!showCropPanel)}
              className="flex items-center gap-1.5 text-blue-600 hover:text-blue-800 font-semibold"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>{showCropPanel ? 'Hide Photo Pan & Zoom' : 'Fine-Tune Photo Crop'}</span>
            </button>
            <button
              onClick={handleResetToTemplateDefaults}
              className="flex items-center gap-1 text-slate-500 hover:text-slate-700 font-medium text-[11px]"
              title="Reset all element sizes, fonts and colors to template defaults"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Reset Sizes to Default</span>
            </button>
            <span className="text-[11px] font-mono text-slate-500">
              {isPortrait ? '53.98 × 85.60 mm' : '85.60 × 53.98 mm'} (CR80)
            </span>
          </div>

          {/* Photo Crop Drawer */}
          {showCropPanel && (
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 animate-in fade-in">
              <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Move className="w-3.5 h-3.5 text-blue-600" />
                <span>Student Portrait Fine Tuning</span>
              </h4>
              <div className="grid grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block text-[11px] text-slate-600 mb-1">
                    Zoom: {(photoCrop.zoom || 1).toFixed(1)}x
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="2.5"
                    step="0.1"
                    value={photoCrop.zoom || 1}
                    onChange={(e) => {
                      const newCrop = { ...photoCrop, zoom: parseFloat(e.target.value) };
                      setPhotoCrop(newCrop);
                      if (onUpdateStudentPhotoCrop) onUpdateStudentPhotoCrop(activeStudent.id, newCrop);
                    }}
                    className="w-full accent-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-600 mb-1">
                    Horizontal Pan: {photoCrop.x || 0}%
                  </label>
                  <input
                    type="range"
                    min="-40"
                    max="40"
                    step="2"
                    value={photoCrop.x || 0}
                    onChange={(e) => {
                      const newCrop = { ...photoCrop, x: parseInt(e.target.value) };
                      setPhotoCrop(newCrop);
                      if (onUpdateStudentPhotoCrop) onUpdateStudentPhotoCrop(activeStudent.id, newCrop);
                    }}
                    className="w-full accent-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-600 mb-1">
                    Vertical Pan: {photoCrop.y || 0}%
                  </label>
                  <input
                    type="range"
                    min="-40"
                    max="40"
                    step="2"
                    value={photoCrop.y || 0}
                    onChange={(e) => {
                      const newCrop = { ...photoCrop, y: parseInt(e.target.value) };
                      setPhotoCrop(newCrop);
                      if (onUpdateStudentPhotoCrop) onUpdateStudentPhotoCrop(activeStudent.id, newCrop);
                    }}
                    className="w-full accent-blue-600"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right: Master Multi-Tab Customization Controls Panel */}
        <div className="lg:col-span-5 space-y-4">
          {/* Navigation Tabs for Customizer */}
          <div className="flex flex-wrap items-center gap-1 bg-slate-200/80 p-1.5 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setActiveTab('typography')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
                activeTab === 'typography' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Type className="w-3.5 h-3.5" />
              <span>Fonts & Sizes</span>
            </button>
            <button
              onClick={() => setActiveTab('elements')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
                activeTab === 'elements' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Logo & Sign</span>
            </button>
            <button
              onClick={() => setActiveTab('security')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
                activeTab === 'security' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Watermark</span>
            </button>
            <button
              onClick={() => setActiveTab('colors')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
                activeTab === 'colors' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Palette className="w-3.5 h-3.5" />
              <span>Colors</span>
            </button>
            <button
              onClick={() => setActiveTab('fields')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
                activeTab === 'fields' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Tag className="w-3.5 h-3.5" />
              <span>Labels</span>
            </button>
            <button
              onClick={() => setActiveTab('templates')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
                activeTab === 'templates' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Designs</span>
            </button>
            <button
              onClick={() => setActiveTab('saved')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
                activeTab === 'saved' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Bookmark className="w-3.5 h-3.5 text-amber-500" />
              <span>Saved ({savedCustomTemplates.length})</span>
            </button>
          </div>

          {/* TAB 1: FONTS & TEXT SIZES */}
          {activeTab === 'typography' && (
            <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-5 animate-in fade-in">
              <div className="border-b border-slate-100 pb-2">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Type className="w-4 h-4 text-blue-600" />
                  <span>Font Family & Typography Studio</span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Choose professional school font pairings or customize heading & detail fonts individually.
                </p>
              </div>

              {/* Font Pairing Presets */}
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
                  Quick Font Pairing Presets
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {FONT_PAIRING_PRESETS.map((preset) => {
                    const isSelected =
                      customization.headingFontFamily === preset.headingFont &&
                      customization.fontFamily === preset.bodyFont;
                    return (
                      <button
                        key={preset.name}
                        type="button"
                        onClick={() =>
                          setCustomization({
                            ...customization,
                            headingFontFamily: preset.headingFont,
                            fontFamily: preset.bodyFont,
                          })
                        }
                        className={`p-2 rounded-lg border text-left transition-all ${
                          isSelected
                            ? 'border-blue-600 bg-blue-50/70 ring-1 ring-blue-500'
                            : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                        }`}
                      >
                        <span
                          className="text-xs font-bold text-slate-900 block truncate"
                          style={{ fontFamily: preset.headingFont }}
                        >
                          {preset.name}
                        </span>
                        <span className="text-[10px] text-slate-500 block truncate">
                          {preset.description}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Heading & Body Font Dropdowns */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-slate-100 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    School & Student Name Font
                  </label>
                  <select
                    value={customization.headingFontFamily || ''}
                    onChange={(e) =>
                      setCustomization({ ...customization, headingFontFamily: e.target.value })
                    }
                    className="w-full text-xs px-2.5 py-2 rounded-lg border border-slate-300 bg-white font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    <option value="">Template Default Font</option>
                    {CARD_FONT_OPTIONS.map((f) => (
                      <option key={f.id} value={f.cssFamily}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Details & Labels Font
                  </label>
                  <select
                    value={customization.fontFamily || ''}
                    onChange={(e) =>
                      setCustomization({ ...customization, fontFamily: e.target.value })
                    }
                    className="w-full text-xs px-2.5 py-2 rounded-lg border border-slate-300 bg-white font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    <option value="">Template Default Font</option>
                    {CARD_FONT_OPTIONS.map((f) => (
                      <option key={f.id} value={f.cssFamily}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-3.5 text-xs pt-2 border-t border-slate-100">
                {/* School Name Size */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-slate-700">School Name Font Size</span>
                    <span className="font-mono text-blue-600 font-bold">{customization.schoolNameFontSize || 31}px</span>
                  </div>
                  <input
                    type="range"
                    min="22"
                    max="46"
                    step="1"
                    value={customization.schoolNameFontSize || 31}
                    onChange={(e) => setCustomization({ ...customization, schoolNameFontSize: parseInt(e.target.value) })}
                    className="w-full accent-blue-600"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>22px (Compact)</span>
                    <span>31px (Print Bold)</span>
                    <span>46px (Extra Large)</span>
                  </div>
                </div>

                {/* Student Name Size */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-slate-700">Student Name Font Size</span>
                    <span className="font-mono text-blue-600 font-bold">{customization.studentNameFontSize || 33}px</span>
                  </div>
                  <input
                    type="range"
                    min="22"
                    max="48"
                    step="1"
                    value={customization.studentNameFontSize || 33}
                    onChange={(e) => setCustomization({ ...customization, studentNameFontSize: parseInt(e.target.value) })}
                    className="w-full accent-blue-600"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>22px (Compact)</span>
                    <span>33px (Print Bold)</span>
                    <span>48px (Extra Large)</span>
                  </div>
                </div>

                {/* Field Labels Font Size */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-slate-700">Field Labels Font Size (e.g. Father, DOB)</span>
                    <span className="font-mono text-blue-600 font-bold">{customization.fieldLabelFontSize || 16}px</span>
                  </div>
                  <input
                    type="range"
                    min="11"
                    max="22"
                    step="0.5"
                    value={customization.fieldLabelFontSize || 16}
                    onChange={(e) => setCustomization({ ...customization, fieldLabelFontSize: parseFloat(e.target.value) })}
                    className="w-full accent-blue-600"
                  />
                </div>

                {/* Field Values Font Size */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-slate-700">Student Details Font Size</span>
                    <span className="font-mono text-blue-600 font-bold">{customization.fieldValueFontSize || 20}px</span>
                  </div>
                  <input
                    type="range"
                    min="14"
                    max="26"
                    step="0.5"
                    value={customization.fieldValueFontSize || 20}
                    onChange={(e) => setCustomization({ ...customization, fieldValueFontSize: parseFloat(e.target.value) })}
                    className="w-full accent-blue-600"
                  />
                </div>

                {/* Address Font Size */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-slate-700">Footer School Address Font Size</span>
                    <span className="font-mono text-blue-600 font-bold">{customization.addressFontSize || 15}px</span>
                  </div>
                  <input
                    type="range"
                    min="11"
                    max="20"
                    step="0.5"
                    value={customization.addressFontSize || 15}
                    onChange={(e) => setCustomization({ ...customization, addressFontSize: parseFloat(e.target.value) })}
                    className="w-full accent-blue-600"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: LOGO & SIGNATURE SIZES */}
          {activeTab === 'elements' && (
            <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4 animate-in fade-in">
              <div className="border-b border-slate-100 pb-2">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-blue-600" />
                  <span>Logo Badge, Photo & Signature</span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Optimize logo badge shape & ring finish, photo corner radius, and principal signature.
                </p>
              </div>

              <div className="space-y-4 text-xs">
                {/* Logo Size */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-slate-700">School Logo Size</span>
                    <span className="font-mono text-blue-600 font-bold">{customization.logoSize || 90}px</span>
                  </div>
                  <input
                    type="range"
                    min="48"
                    max="124"
                    step="2"
                    value={customization.logoSize || 90}
                    onChange={(e) => setCustomization({ ...customization, logoSize: parseInt(e.target.value) })}
                    className="w-full accent-blue-600"
                  />
                </div>

                {/* Logo Frame Shape with visual preview */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5">Logo Frame Badge Shape</label>
                  <div className="grid grid-cols-4 gap-2 text-center text-xs">
                    {([
                      { shape: 'circle', label: 'Circle', radiusClass: 'rounded-full border-2 border-slate-400 bg-white' },
                      { shape: 'rounded', label: 'Rounded', radiusClass: 'rounded-md border-2 border-slate-400 bg-white' },
                      { shape: 'square', label: 'Square', radiusClass: 'rounded-none border-2 border-slate-400 bg-white' },
                      { shape: 'none', label: 'No Box', radiusClass: 'rounded border border-dashed border-slate-300 bg-transparent' },
                    ] as const).map((item) => (
                      <button
                        key={item.shape}
                        type="button"
                        onClick={() => setCustomization({ ...customization, logoShape: item.shape })}
                        className={`py-2 px-1.5 rounded-lg border text-[11px] font-semibold flex flex-col items-center gap-1.5 transition-colors ${
                          (customization.logoShape || 'circle') === item.shape
                            ? 'bg-blue-50 border-blue-600 text-blue-700 shadow-2xs'
                            : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                        }`}
                      >
                        <span className={`w-5 h-5 block ${item.radiusClass}`} />
                        <span>{item.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Logo Badge Finish Style */}
                {(customization.logoShape || 'circle') !== 'none' && (
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1.5">Logo Badge Ring Finish</label>
                    <div className="grid grid-cols-4 gap-2 text-center text-[11px]">
                      {([
                        { id: 'gold-ring', label: 'Gold Ring' },
                        { id: 'white', label: 'Crisp White' },
                        { id: 'tinted', label: 'Soft Tint' },
                        { id: 'minimal', label: 'Slim Edge' },
                      ] as const).map((b) => (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => setCustomization({ ...customization, logoBadgeStyle: b.id })}
                          className={`py-1.5 px-1.5 rounded-lg border font-semibold transition-colors ${
                            (customization.logoBadgeStyle || 'gold-ring') === b.id
                              ? 'bg-amber-50 border-amber-500 text-amber-900'
                              : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                          }`}
                        >
                          {b.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Photo Corner Radius */}
                <div className="pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-slate-700">Student Photo Corner Shape</span>
                    <span className="font-mono text-blue-600 font-bold">
                      {customization.photoRadius === undefined ? 'Auto' : `${customization.photoRadius}px`}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="90"
                    step="2"
                    value={customization.photoRadius ?? 10}
                    onChange={(e) => setCustomization({ ...customization, photoRadius: parseInt(e.target.value) })}
                    className="w-full accent-blue-600"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>0px (Sharp)</span>
                    <span>12px (Rounded)</span>
                    <span>90px (Oval/Circle)</span>
                  </div>
                </div>

                {/* Principal Signature Width */}
                <div className="pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-slate-700">Principal Signature Width</span>
                    <span className="font-mono text-blue-600 font-bold">{customization.signatureWidth || 135}px</span>
                  </div>
                  <input
                    type="range"
                    min="70"
                    max="190"
                    step="5"
                    value={customization.signatureWidth || 135}
                    onChange={(e) => setCustomization({ ...customization, signatureWidth: parseInt(e.target.value) })}
                    className="w-full accent-blue-600"
                  />
                </div>

                {/* Signature Height */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-slate-700">Signature Height</span>
                    <span className="font-mono text-blue-600 font-bold">{customization.signatureHeight || 56}px</span>
                  </div>
                  <input
                    type="range"
                    min="35"
                    max="85"
                    step="3"
                    value={customization.signatureHeight || 56}
                    onChange={(e) => setCustomization({ ...customization, signatureHeight: parseInt(e.target.value) })}
                    className="w-full accent-blue-600"
                  />
                </div>

                {/* Signature Title / Designation */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Official Designation Title</label>
                  <input
                    type="text"
                    value={customization.signatureTitle || 'PRINCIPAL'}
                    onChange={(e) => setCustomization({ ...customization, signatureTitle: e.target.value })}
                    placeholder="e.g. PRINCIPAL / DIRECTOR / HEADMISTRESS"
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold uppercase tracking-wider"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: WATERMARK & SECURITY */}
          {activeTab === 'security' && (
            <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4 animate-in fade-in">
              <div className="border-b border-slate-100 pb-2">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-blue-600" />
                  <span>Institutional Logo Watermark & QR Code</span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Configure school crest security watermark and scannable student QR code data.
                </p>
              </div>

              <div className="space-y-4 text-xs">
                {/* Watermark Toggle */}
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div>
                    <span className="font-bold text-slate-800 block">Enable Institutional Logo Watermark</span>
                    <span className="text-[10px] text-slate-500">Draws translucent school logo in the card background</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCustomization({ ...customization, watermarkEnabled: !(customization.watermarkEnabled ?? true) })}
                    className={`w-11 h-6 rounded-full transition-colors relative flex items-center ${
                      (customization.watermarkEnabled ?? true) ? 'bg-blue-600' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`w-4 h-4 rounded-full bg-white transition-transform ${
                        (customization.watermarkEnabled ?? true) ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Watermark Opacity Slider */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-slate-700">Watermark Opacity</span>
                    <span className="font-mono text-blue-600 font-bold">
                      {Math.round(((customization.watermarkOpacity ?? 0.08) * 100))}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.02"
                    max="0.30"
                    step="0.01"
                    value={customization.watermarkOpacity ?? 0.08}
                    onChange={(e) => setCustomization({ ...customization, watermarkOpacity: parseFloat(e.target.value) })}
                    className="w-full accent-blue-600"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>2% (Subtle)</span>
                    <span>8% (Official)</span>
                    <span>30% (Bold)</span>
                  </div>
                </div>

                {/* Watermark Size */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-slate-700">Watermark Diameter</span>
                    <span className="font-mono text-blue-600 font-bold">{customization.watermarkSize || 280}px</span>
                  </div>
                  <input
                    type="range"
                    min="140"
                    max="450"
                    step="10"
                    value={customization.watermarkSize || 280}
                    onChange={(e) => setCustomization({ ...customization, watermarkSize: parseInt(e.target.value) })}
                    className="w-full accent-blue-600"
                  />
                </div>

                {/* QR Code Toggle & Payload Preview */}
                <div className="pt-3 border-t border-slate-100 space-y-2.5">
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="flex items-center gap-2">
                      <QrCode className="w-4 h-4 text-blue-600" />
                      <div>
                        <span className="font-bold text-slate-800 block">Show Scannable QR Code</span>
                        <span className="text-[10px] text-slate-500">Embeds complete student record inside QR</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCustomization({ ...customization, showBarcode: !(customization.showBarcode ?? true) })}
                      className={`w-11 h-6 rounded-full transition-colors relative flex items-center ${
                        (customization.showBarcode ?? true) ? 'bg-blue-600' : 'bg-slate-300'
                      }`}
                    >
                      <span
                        className={`w-4 h-4 rounded-full bg-white transition-transform ${
                          (customization.showBarcode ?? true) ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {(customization.showBarcode ?? true) && (
                    <div className="p-3 rounded-lg bg-slate-900 text-slate-100 font-mono text-[10px] leading-relaxed whitespace-pre-wrap border border-slate-700">
                      <div className="text-emerald-400 font-bold mb-1 uppercase tracking-wider">
                        Live QR Scan Output ({activeStudent.name}):
                      </div>
                      {buildStudentQrPayload(activeStudent, schoolSettings)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: COLORS & THEMES */}
          {activeTab === 'colors' && (
            <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4 animate-in fade-in">
              <div className="border-b border-slate-100 pb-2">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Palette className="w-4 h-4 text-blue-600" />
                  <span>Card Brand Colors & Overrides</span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Override template palette with your official school institutional colors.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Primary Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={customization.primaryColorOverride || '#be123c'}
                      onChange={(e) => setCustomization({ ...customization, primaryColorOverride: e.target.value })}
                      className="w-9 h-9 rounded border cursor-pointer"
                    />
                    <input
                      type="text"
                      value={customization.primaryColorOverride || '#be123c'}
                      onChange={(e) => setCustomization({ ...customization, primaryColorOverride: e.target.value })}
                      className="w-24 px-2 py-1 text-xs border rounded font-mono uppercase"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Accent / Gold</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={customization.accentColorOverride || '#fbbf24'}
                      onChange={(e) => setCustomization({ ...customization, accentColorOverride: e.target.value })}
                      className="w-9 h-9 rounded border cursor-pointer"
                    />
                    <input
                      type="text"
                      value={customization.accentColorOverride || '#fbbf24'}
                      onChange={(e) => setCustomization({ ...customization, accentColorOverride: e.target.value })}
                      className="w-24 px-2 py-1 text-xs border rounded font-mono uppercase"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Card Background</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={customization.surfaceColorOverride || '#ffffff'}
                      onChange={(e) => setCustomization({ ...customization, surfaceColorOverride: e.target.value })}
                      className="w-9 h-9 rounded border cursor-pointer"
                    />
                    <input
                      type="text"
                      value={customization.surfaceColorOverride || '#ffffff'}
                      onChange={(e) => setCustomization({ ...customization, surfaceColorOverride: e.target.value })}
                      className="w-24 px-2 py-1 text-xs border rounded font-mono uppercase"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Text Ink Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={customization.textColorOverride || '#1e293b'}
                      onChange={(e) => setCustomization({ ...customization, textColorOverride: e.target.value })}
                      className="w-9 h-9 rounded border cursor-pointer"
                    />
                    <input
                      type="text"
                      value={customization.textColorOverride || '#1e293b'}
                      onChange={(e) => setCustomization({ ...customization, textColorOverride: e.target.value })}
                      className="w-24 px-2 py-1 text-xs border rounded font-mono uppercase"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: CUSTOM FIELD LABELS & TOGGLES */}
          {activeTab === 'fields' && (
            <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4 animate-in fade-in">
              <div className="border-b border-slate-100 pb-2">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Tag className="w-4 h-4 text-blue-600" />
                  <span>Custom Field Labels & Visibility</span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Rename field titles (e.g. change "Father's Name" to "Guardian Name") or toggle visibility.
                </p>
              </div>

              <div className="space-y-2.5 text-xs">
                {[
                  { key: 'fatherName', defaultLabel: "Father's Name" },
                  { key: 'motherName', defaultLabel: "Mother's Name" },
                  { key: 'dob', defaultLabel: "D.O.B." },
                  { key: 'contactNumber', defaultLabel: "Contact No." },
                  { key: 'conveyance', defaultLabel: "Conveyance" },
                  { key: 'address', defaultLabel: "Address" },
                ].map(({ key, defaultLabel }) => {
                  const isVisible = customization.fieldVisibility?.[key as keyof SchoolSettings['visibleFields']] !== false;
                  const currentLabel = (customization.customLabels as any)?.[key] || defaultLabel;
                  return (
                    <div key={key} className="flex items-center justify-between gap-2 p-2 bg-slate-50 rounded-lg border border-slate-200">
                      <button
                        type="button"
                        onClick={() => handleToggleField(key as keyof SchoolSettings['visibleFields'])}
                        className={`p-1 rounded ${isVisible ? 'text-blue-600' : 'text-slate-400'}`}
                      >
                        {isVisible ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                      </button>
                      <span className="w-24 text-[11px] text-slate-600 truncate">{defaultLabel}:</span>
                      <input
                        type="text"
                        value={currentLabel}
                        onChange={(e) => {
                          const updatedLabels = {
                            ...(customization.customLabels || {}),
                            [key]: e.target.value,
                          };
                          setCustomization({ ...customization, customLabels: updatedLabels });
                        }}
                        className="flex-1 text-xs px-2 py-1 border border-slate-300 rounded bg-white font-medium"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 6: TEMPLATES LIST */}
          {activeTab === 'templates' && (
            <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-blue-600" />
                  <span>Choose Base Design ({availableTemplates.length})</span>
                </h3>
              </div>

              <div className="grid grid-cols-2 gap-2 max-h-72 overflow-y-auto p-1">
                {availableTemplates.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => handleSelectTemplate(t.id)}
                    className={`p-2.5 rounded-lg border text-left transition-colors ${
                      customization.templateId === t.id
                        ? 'border-blue-600 bg-blue-50/50 text-blue-900 font-semibold'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <span className="text-xs font-bold block truncate">{t.name}</span>
                    <span className="text-[10px] text-slate-500 block truncate">{t.subCategory}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* TAB 7: SAVED CUSTOM TEMPLATES */}
          {activeTab === 'saved' && (
            <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Bookmark className="w-4 h-4 text-amber-500" />
                    <span>My Saved Custom Templates</span>
                  </h3>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Your personalized custom designs saved with custom names.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setTemplateNameInput(`My Custom ${isPortrait ? 'Portrait' : 'Landscape'} Card`);
                    setIsSaveModalOpen(true);
                  }}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Save Current</span>
                </button>
              </div>

              {savedCustomTemplates.length === 0 ? (
                <div className="text-center py-8 text-slate-400 space-y-2">
                  <FolderHeart className="w-8 h-8 mx-auto text-slate-300" />
                  <p className="text-xs text-slate-600 font-semibold">No saved custom templates yet.</p>
                  <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                    Customize your card's sizes, logo, and colors, then click "Save Custom Template" to store it under your own name.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto p-1">
                  {savedCustomTemplates.map((saved) => (
                    <div
                      key={saved.id}
                      className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:border-blue-400 bg-slate-50/50 hover:bg-blue-50/20 transition-all"
                    >
                      <div className="min-w-0 pr-2">
                        <span className="text-xs font-bold text-slate-900 block truncate">
                          {saved.name}
                        </span>
                        <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-500">
                          <span className="capitalize font-semibold text-blue-600">
                            {saved.orientation}
                          </span>
                          <span>·</span>
                          <span>Saved {new Date(saved.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleLoadCustomTemplate(saved)}
                          className="px-2.5 py-1 text-xs font-semibold bg-white border border-slate-300 hover:border-blue-600 text-slate-800 hover:text-blue-600 rounded-lg shadow-2xs transition-colors"
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
                            const targetTemplateId = saved.baseTemplateId || saved.customization.templateId;
                            onUpdateSchoolSettings({
                              ...schoolSettings,
                              defaultTemplateId: targetTemplateId,
                              defaultOrientation: saved.orientation || (targetTemplateId.startsWith('portrait_') ? 'portrait' : 'landscape'),
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
                            setSaveTemplateNotice(`"${saved.name}" is now your Default Print Design!`);
                            setTimeout(() => setSaveTemplateNotice(''), 3500);
                          }}
                          className="px-2.5 py-1 text-xs font-semibold bg-amber-50 border border-amber-300 hover:bg-amber-100 text-amber-800 rounded-lg shadow-2xs transition-colors"
                          title="Set this custom template as your default design for printing"
                        >
                          Set Default
                        </button>
                        {onDeleteCustomTemplate && (
                          <button
                            type="button"
                            onClick={() => onDeleteCustomTemplate(saved.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                            title="Delete this template"
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
          )}
        </div>
      </div>

      {/* SAVE CUSTOM TEMPLATE MODAL */}
      {isSaveModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Bookmark className="w-4 h-4 text-blue-600" />
                <span>Save Custom Template As Your Own</span>
              </h3>
              <button
                onClick={() => setIsSaveModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCustomDesign} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Custom Template Name
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={templateNameInput}
                  onChange={(e) => setTemplateNameInput(e.target.value)}
                  placeholder="e.g. My School Red Card 2026, DPS Annual Pass"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  This custom design will be saved with all your chosen text sizes, logo framing, signature specs, and color overrides.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSaveModalOpen(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm"
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
