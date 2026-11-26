import React, { useState, useEffect } from 'react';
import { SchoolSettings, Student } from '../../types';
import { DEFAULT_SCHOOL_SETTINGS, TEMPLATE_REGISTRY } from '../../constants/initialData';
import {
  School,
  Image,
  Sliders,
  Database,
  Upload,
  Trash2,
  RotateCcw,
  Check,
  AlertCircle,
  Download,
  CheckCircle2,
  FileCheck,
  Palette,
  Lock,
  Shield,
} from 'lucide-react';

interface SettingsViewProps {
  settings: SchoolSettings;
  students: Student[];
  onSaveSettings: (newSettings: SchoolSettings) => void;
  onRestoreData: (restoredSettings: SchoolSettings, restoredStudents: Student[]) => void;
  onResetToDemo: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  students,
  onSaveSettings,
  onRestoreData,
  onResetToDemo,
}) => {
  const [formData, setFormData] = useState<SchoolSettings>(settings);
  const [savedNotification, setSavedNotification] = useState<boolean>(false);
  const [errorNotification, setErrorNotification] = useState<string>('');

  useEffect(() => {
    setFormData(settings);
  }, [settings]);

  const handleToggleSettingField = (key: keyof SchoolSettings['visibleFields']) => {
    setFormData((prev) => ({
      ...prev,
      visibleFields: {
        ...prev.visibleFields,
        [key]: prev.visibleFields?.[key] === false ? true : false,
      },
    }));
  };

  const handleSetAllSettingFields = (enabled: boolean) => {
    setFormData((prev) => ({
      ...prev,
      visibleFields: {
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
      },
    }));
  };

  const validateAndReadFile = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        reject(new Error('Invalid format. Please upload PNG, JPG, JPEG, or WebP.'));
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        reject(new Error('File size exceeds 5MB limit. Please upload a smaller image.'));
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = () => reject(new Error('Error reading image file.'));
      reader.readAsDataURL(file);
    });
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorNotification('');
    try {
      const dataUrl = await validateAndReadFile(file);
      setFormData((prev) => ({ ...prev, logoUrl: dataUrl }));
    } catch (err: any) {
      setErrorNotification(err.message || 'Failed to upload school logo.');
    }
  };

  const handleSignatureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorNotification('');
    try {
      const dataUrl = await validateAndReadFile(file);
      setFormData((prev) => ({ ...prev, principalSignatureUrl: dataUrl }));
    } catch (err: any) {
      setErrorNotification(err.message || 'Failed to upload principal signature.');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.schoolName.trim()) {
      setErrorNotification('School Name is required.');
      return;
    }
    if (!formData.address.trim()) {
      setErrorNotification('School Address is required.');
      return;
    }
    if (!formData.contactNumber.trim()) {
      setErrorNotification('School Contact Number is required.');
      return;
    }
    if (!formData.academicSession.trim()) {
      setErrorNotification('Academic Session is required.');
      return;
    }

    setErrorNotification('');
    onSaveSettings(formData);
    setSavedNotification(true);
    setTimeout(() => setSavedNotification(false), 4500);
  };

  const handleExportBackupJson = () => {
    const data = {
      settings: formData,
      students,
      exportedAt: new Date().toISOString(),
      version: '2.0',
    };
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(data, null, 2))}`;
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', jsonString);
    downloadAnchor.setAttribute('download', `ScholarCard_Backup_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleRestoreBackupJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        try {
          const parsed = JSON.parse(uploadEvent.target?.result as string);
          if (parsed.settings && Array.isArray(parsed.students)) {
            onRestoreData(parsed.settings, parsed.students);
            setFormData(parsed.settings);
            setSavedNotification(true);
            setTimeout(() => setSavedNotification(false), 4500);
          } else {
            setErrorNotification('Invalid backup JSON schema.');
          }
        } catch (err) {
          setErrorNotification('Failed to parse backup JSON file.');
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            School Administration & Branding Settings
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Institutional profile, verified heraldic crest, authorized principal signature, and card defaults.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm"
        >
          <Check className="w-4 h-4" />
          <span>Save All Settings</span>
        </button>
      </div>

      {savedNotification && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-2.5 text-xs text-emerald-800 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-semibold">
            Branding and school profile successfully saved and persisted! All card previews and exports updated automatically.
          </span>
        </div>
      )}

      {errorNotification && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-center gap-2.5 text-xs text-red-800 animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{errorNotification}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* SECTION 1: SCHOOL PROFILE */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <School className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900">1. Institutional Profile Details</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                1. Official School Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.schoolName}
                onChange={(e) => setFormData({ ...formData, schoolName: e.target.value })}
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 font-medium"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                4. School Campus Address <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                5. School Contact Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.contactNumber}
                onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })}
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                6. Academic Session <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.academicSession}
                onChange={(e) => setFormData({ ...formData, academicSession: e.target.value })}
                placeholder="2025-2026"
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Affiliation Tagline / Motto
              </label>
              <input
                type="text"
                value={formData.tagline}
                onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                School Affiliation Code / Reg. No
              </label>
              <input
                type="text"
                value={formData.schoolCode}
                onChange={(e) => setFormData({ ...formData, schoolCode: e.target.value })}
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 font-mono"
              />
            </div>
          </div>
        </div>

        {/* SECTION 2: BRANDING (LOGO & SIGNATURE) */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <Image className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900">2. Institutional Branding & Signatures</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* School Logo */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">2. School Logo Upload</span>
                <span className="text-[10px] text-slate-500">PNG, JPG, WebP (&lt;5MB)</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-18 h-18 rounded-xl border border-slate-300 bg-white p-1 flex items-center justify-center shrink-0 shadow-xs overflow-hidden">
                  {formData.logoUrl ? (
                    <img
                      src={formData.logoUrl}
                      alt="School Crest"
                      className="w-full h-full object-contain"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <School className="w-8 h-8 text-slate-400" />
                  )}
                </div>
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2">
                    <label className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer inline-flex items-center gap-1.5 transition-colors">
                      <Upload className="w-3.5 h-3.5 text-slate-500" />
                      <span>{formData.logoUrl ? 'Replace Logo' : 'Upload Logo'}</span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/jpg,image/webp"
                        onChange={handleLogoUpload}
                        className="hidden"
                      />
                    </label>
                    {formData.logoUrl && (
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, logoUrl: '' })}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg text-xs"
                        title="Remove Logo"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, logoUrl: DEFAULT_SCHOOL_SETTINGS.logoUrl })}
                    className="text-[11px] text-blue-600 hover:text-blue-800 underline block"
                  >
                    Use Sample School Crest
                  </button>
                </div>
              </div>
            </div>

            {/* Principal Signature */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">3. Principal Signature Upload</span>
                <span className="text-[10px] text-slate-500">PNG, JPG, WebP (&lt;5MB)</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-24 h-18 rounded-xl border border-slate-300 bg-white p-1 flex items-center justify-center shrink-0 shadow-xs overflow-hidden">
                  {formData.principalSignatureUrl ? (
                    <img
                      src={formData.principalSignatureUrl}
                      alt="Signature"
                      className="w-full h-full object-contain"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <span className="text-[10px] text-slate-400 font-mono">No Signature</span>
                  )}
                </div>
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2">
                    <label className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer inline-flex items-center gap-1.5 transition-colors">
                      <Upload className="w-3.5 h-3.5 text-slate-500" />
                      <span>{formData.principalSignatureUrl ? 'Replace Signature' : 'Upload Signature'}</span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/jpg,image/webp"
                        onChange={handleSignatureUpload}
                        className="hidden"
                      />
                    </label>
                    {formData.principalSignatureUrl && (
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, principalSignatureUrl: '' })}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg text-xs"
                        title="Remove Signature"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setFormData({
                        ...formData,
                        principalSignatureUrl: DEFAULT_SCHOOL_SETTINGS.principalSignatureUrl,
                      })
                    }
                    className="text-[11px] text-blue-600 hover:text-blue-800 underline block"
                  >
                    Use Sample Authorized Stamp
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                  Signatory Designation / Title
                </label>
                <input
                  type="text"
                  value={formData.principalName}
                  onChange={(e) => setFormData({ ...formData, principalName: e.target.value })}
                  className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white"
                />
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 3: ID CARD DEFAULTS */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <Sliders className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900">3. Default Template & Dimensions</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Default Card Template (30 Designs)
              </label>
              <select
                value={formData.defaultTemplateId}
                onChange={(e) => {
                  const tId = e.target.value as any;
                  setFormData({
                    ...formData,
                    defaultTemplateId: tId,
                    defaultOrientation: tId.startsWith('portrait_') ? 'portrait' : 'landscape',
                  });
                }}
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 font-semibold text-slate-800"
              >
                <optgroup label="Portrait Designs (15)">
                  {TEMPLATE_REGISTRY.filter((t) => t.orientation === 'portrait').map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Landscape Designs (15)">
                  {TEMPLATE_REGISTRY.filter((t) => t.orientation === 'landscape').map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Default Orientation
              </label>
              <select
                value={formData.defaultOrientation}
                onChange={(e) => setFormData({ ...formData, defaultOrientation: e.target.value as any })}
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 text-slate-800"
              >
                <option value="landscape">Landscape (85.60 × 53.98 mm) - CR80</option>
                <option value="portrait">Portrait (53.98 × 85.60 mm) - CR80</option>
              </select>
            </div>
          </div>
        </div>

        {/* SECTION 4: SCHOOL BRAND CUSTOM COLOR PALETTE */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-5">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Palette className="w-4 h-4 text-blue-600" />
              <div>
                <h3 className="text-sm font-bold text-slate-900">4. School Brand Custom Color Palette</h3>
                <p className="text-[11px] text-slate-500">
                  Override default template colors with your institution's official brand colors.
                </p>
              </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
              <input
                type="checkbox"
                checked={formData.customBrandColors?.enabled || false}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    customBrandColors: {
                      enabled: e.target.checked,
                      primary: formData.customBrandColors?.primary || '#be123c',
                      secondary: formData.customBrandColors?.secondary || '#881337',
                      accent: formData.customBrandColors?.accent || '#fbbf24',
                    },
                  })
                }
                className="rounded text-blue-600 focus:ring-blue-500"
              />
              <span className="text-xs font-semibold text-slate-800">Enable Custom Palette</span>
            </label>
          </div>

          {/* Preset Palettes */}
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
              Official Indian School Theme Presets
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
              {[
                { name: 'Crimson & Amber', primary: '#be123c', secondary: '#881337', accent: '#fbbf24' },
                { name: 'Royal Navy & Gold', primary: '#1e3a8a', secondary: '#0f172a', accent: '#d97706' },
                { name: 'Forest Emerald', primary: '#065f46', secondary: '#064e3b', accent: '#f59e0b' },
                { name: 'Deep Burgundy', primary: '#881337', secondary: '#4c0519', accent: '#f43f5e' },
                { name: 'Charcoal Slate', primary: '#1e293b', secondary: '#0f172a', accent: '#ea580c' },
                { name: 'Tiranga Accent', primary: '#ea580c', secondary: '#1e3a8a', accent: '#16a34a' },
              ].map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() =>
                    setFormData({
                      ...formData,
                      customBrandColors: {
                        enabled: true,
                        primary: preset.primary,
                        secondary: preset.secondary,
                        accent: preset.accent,
                      },
                    })
                  }
                  className="p-2.5 rounded-xl border border-slate-200 bg-white hover:border-blue-400 hover:shadow-xs transition-all text-left group"
                >
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <span className="w-4 h-4 rounded-full border border-black/10" style={{ backgroundColor: preset.primary }} />
                    <span className="w-4 h-4 rounded-full border border-black/10" style={{ backgroundColor: preset.secondary }} />
                    <span className="w-4 h-4 rounded-full border border-black/10" style={{ backgroundColor: preset.accent }} />
                  </div>
                  <span className="text-[11px] font-semibold text-slate-800 block truncate group-hover:text-blue-600">
                    {preset.name}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Color Pickers */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">Primary Brand Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={formData.customBrandColors?.primary || '#be123c'}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      customBrandColors: {
                        enabled: true,
                        primary: e.target.value,
                        secondary: formData.customBrandColors?.secondary || '#881337',
                        accent: formData.customBrandColors?.accent || '#fbbf24',
                      },
                    })
                  }
                  className="w-9 h-9 rounded cursor-pointer border border-slate-300"
                />
                <input
                  type="text"
                  value={formData.customBrandColors?.primary || '#be123c'}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      customBrandColors: {
                        enabled: true,
                        primary: e.target.value,
                        secondary: formData.customBrandColors?.secondary || '#881337',
                        accent: formData.customBrandColors?.accent || '#fbbf24',
                      },
                    })
                  }
                  className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-mono text-slate-800"
                />
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">Secondary / Dark Hue</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={formData.customBrandColors?.secondary || '#881337'}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      customBrandColors: {
                        enabled: true,
                        primary: formData.customBrandColors?.primary || '#be123c',
                        secondary: e.target.value,
                        accent: formData.customBrandColors?.accent || '#fbbf24',
                      },
                    })
                  }
                  className="w-9 h-9 rounded cursor-pointer border border-slate-300"
                />
                <input
                  type="text"
                  value={formData.customBrandColors?.secondary || '#881337'}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      customBrandColors: {
                        enabled: true,
                        primary: formData.customBrandColors?.primary || '#be123c',
                        secondary: e.target.value,
                        accent: formData.customBrandColors?.accent || '#fbbf24',
                      },
                    })
                  }
                  className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-mono text-slate-800"
                />
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">Accent Gold / Highlight</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={formData.customBrandColors?.accent || '#fbbf24'}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      customBrandColors: {
                        enabled: true,
                        primary: formData.customBrandColors?.primary || '#be123c',
                        secondary: formData.customBrandColors?.secondary || '#881337',
                        accent: e.target.value,
                      },
                    })
                  }
                  className="w-9 h-9 rounded cursor-pointer border border-slate-300"
                />
                <input
                  type="text"
                  value={formData.customBrandColors?.accent || '#fbbf24'}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      customBrandColors: {
                        enabled: true,
                        primary: formData.customBrandColors?.primary || '#be123c',
                        secondary: formData.customBrandColors?.secondary || '#881337',
                        accent: e.target.value,
                      },
                    })
                  }
                  className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-mono text-slate-800"
                />
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 5: ADMINISTRATIVE PORTAL SECURITY & PASSWORD */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <Lock className="w-4 h-4 text-blue-600" />
            <div>
              <h3 className="text-sm font-bold text-slate-900">5. Administrator Portal Security & Password</h3>
              <p className="text-[11px] text-slate-500">
                Credentials required when opening the application to prevent unauthorized student card generation.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Admin Username
              </label>
              <input
                type="text"
                value={formData.adminUsername || 'admin'}
                onChange={(e) => setFormData({ ...formData, adminUsername: e.target.value })}
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Admin Password
              </label>
              <input
                type="text"
                value={formData.adminPassword || 'admin123'}
                onChange={(e) => setFormData({ ...formData, adminPassword: e.target.value })}
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 font-mono"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Default: <strong className="font-mono text-slate-600">admin123</strong>
              </span>
            </div>
          </div>
        </div>

        {/* SECTION 6: CARD DATA FIELD VISIBILITY DEFAULTS */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-blue-600" />
              <div>
                <h3 className="text-sm font-bold text-slate-900">6. Global Card Field Visibility Defaults</h3>
                <p className="text-[11px] text-slate-500">
                  Select which student data fields and school branding elements appear by default on all generated cards.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleSetAllSettingFields(true)}
                className="px-2.5 py-1 text-xs font-semibold rounded bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
              >
                Enable All
              </button>
              <button
                type="button"
                onClick={() => {
                  setFormData((prev) => ({
                    ...prev,
                    visibleFields: {
                      ...prev.visibleFields,
                      fatherName: true,
                      motherName: false,
                      contactNumber: true,
                      dob: true,
                      address: true,
                      conveyance: false,
                      session: true,
                      rollNo: true,
                      classGrade: true,
                      bloodGroup: false,
                      logo: true,
                      principalSignature: true,
                      schoolAddress: true,
                      schoolContact: true,
                      barcode: prev.visibleFields?.barcode ?? true,
                    },
                  }));
                }}
                className="px-2.5 py-1 text-xs font-semibold rounded bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
              >
                Essential Only
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                Student Record Information
              </span>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
                {[
                  { key: 'fatherName', label: "Father's Name" },
                  { key: 'motherName', label: "Mother's Name" },
                  { key: 'dob', label: 'Date of Birth (D.O.B.)' },
                  { key: 'contactNumber', label: 'Student / Parent Phone' },
                  { key: 'address', label: 'Residential Address' },
                  { key: 'conveyance', label: 'Conveyance / Transport' },
                  { key: 'session', label: 'Academic Session' },
                  { key: 'classGrade', label: 'Class & Grade' },
                  { key: 'rollNo', label: 'Roll Number' },
                  { key: 'bloodGroup', label: 'Blood Group' },
                ].map((item) => {
                  const isChecked = formData.visibleFields?.[item.key as keyof SchoolSettings['visibleFields']] !== false;
                  return (
                    <label
                      key={item.key}
                      className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200 hover:bg-slate-100/70 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleSettingField(item.key as keyof SchoolSettings['visibleFields'])}
                          className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                        <span className="text-xs font-semibold text-slate-800 truncate">{item.label}</span>
                      </div>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                          isChecked ? 'text-emerald-700 bg-emerald-100/70' : 'text-slate-400 bg-slate-200/80'
                        }`}
                      >
                        {isChecked ? 'ON' : 'OFF'}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                Institutional Header & Authorization
              </span>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5">
                {[
                  { key: 'logo', label: 'School Crest / Logo' },
                  { key: 'principalSignature', label: 'Principal Signature' },
                  { key: 'schoolAddress', label: 'Campus Address Header' },
                  { key: 'schoolContact', label: 'School Phone Header' },
                  { key: 'barcode', label: 'Scannable QR Code' },
                ].map((item) => {
                  const isChecked = formData.visibleFields?.[item.key as keyof SchoolSettings['visibleFields']] !== false;
                  return (
                    <label
                      key={item.key}
                      className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200 hover:bg-slate-100/70 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleSettingField(item.key as keyof SchoolSettings['visibleFields'])}
                          className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                        <span className="text-xs font-semibold text-slate-800 truncate">{item.label}</span>
                      </div>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                          isChecked ? 'text-emerald-700 bg-emerald-100/70' : 'text-slate-400 bg-slate-200/80'
                        }`}
                      >
                        {isChecked ? 'ON' : 'OFF'}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 7: BACKUP & DATA MANAGEMENT */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <Database className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900">7. IndexedDB Storage & Backups</h3>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div>
              <p className="text-xs font-bold text-slate-900">
                School Data Archive ({students.length} students enrolled)
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Export a full JSON archive of school profile, branding, and all enrolled student records.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportBackupJson}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-xs"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>Export Backup JSON</span>
              </button>

              <label className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors shadow-xs">
                <Upload className="w-3.5 h-3.5 text-slate-500" />
                <span>Restore JSON</span>
                <input type="file" accept=".json" onChange={handleRestoreBackupJson} className="hidden" />
              </label>

              <button
                type="button"
                onClick={() => {
                  if (confirm('Reset system data to official sample demonstration roster?')) {
                    onResetToDemo();
                    setFormData(DEFAULT_SCHOOL_SETTINGS);
                    setSavedNotification(true);
                    setTimeout(() => setSavedNotification(false), 4500);
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                <span>Reset to Demo Data</span>
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};
