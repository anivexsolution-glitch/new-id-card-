import React, { useState, useEffect } from 'react';
import { AuthenticatedUser, SchoolSettings, Student } from '../../types';
import { DEFAULT_SCHOOL_SETTINGS, TEMPLATE_REGISTRY } from '../../constants/initialData';
import { CardSurface, PageHeader } from '../ui/EnterpriseUI';
import {
  School,
  Image as ImageIcon,
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
  Ruler,
  Cloud,
  LogOut,
  ShieldCheck,
} from 'lucide-react';

interface SettingsViewProps {
  settings: SchoolSettings;
  students: Student[];
  currentUser?: AuthenticatedUser | null;
  onSaveSettings: (newSettings: SchoolSettings) => void;
  onRestoreData: (restoredSettings: SchoolSettings, restoredStudents: Student[]) => void;
  onResetToDemo: () => void;
  onLogout?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  students,
  currentUser,
  onSaveSettings,
  onRestoreData,
  onResetToDemo,
  onLogout,
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
        bloodGroup: false,
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
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(data, null, 2)
    )}`;
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', jsonString);
    downloadAnchor.setAttribute('download', `THE_ID_MAKER_Backup_${Date.now()}.json`);
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
        } catch {
          setErrorNotification('Failed to parse backup JSON file.');
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      <PageHeader
        title="Settings"
        subtitle="Configure school details, institutional branding, CR80 card defaults, visibility preferences, JSON backups, and your connected cloud account."
        actions={
          <button
            type="button"
            onClick={handleSubmit}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#24364B] hover:bg-[#304A64] rounded-lg transition-colors"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Save Settings</span>
          </button>
        }
      />

      {savedNotification && (
        <div className="p-3.5 rounded-lg bg-[#25845A]/10 border border-[#25845A]/30 flex items-center gap-2 text-xs text-[#25845A]">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span className="font-semibold">
            Settings saved to your private cloud workspace. Card previews and print sheets updated across devices.
          </span>
        </div>
      )}

      {errorNotification && (
        <div className="p-3.5 rounded-lg bg-[#C44949]/10 border border-[#C44949]/30 flex items-center gap-2 text-xs text-[#C44949]">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorNotification}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* 1. SCHOOL INFORMATION */}
        <CardSurface padding="lg" className="space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-[#E3E7EB]">
            <School className="w-4 h-4 text-[#24364B]" />
            <h3 className="text-sm font-bold text-[#202B38]">1. School Information</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="md:col-span-2">
              <label className="block font-semibold text-[#202B38] mb-1">
                Official School Name <span className="text-[#C44949]">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.schoolName}
                onChange={(e) => setFormData({ ...formData, schoolName: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-[#E3E7EB] focus:outline-none focus:border-[#24364B]"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block font-semibold text-[#202B38] mb-1">
                Campus Address <span className="text-[#C44949]">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-[#E3E7EB] focus:outline-none focus:border-[#24364B]"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#202B38] mb-1">
                Contact Number <span className="text-[#C44949]">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.contactNumber}
                onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-[#E3E7EB] focus:outline-none focus:border-[#24364B] font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#202B38] mb-1">
                Academic Session <span className="text-[#C44949]">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.academicSession}
                onChange={(e) => setFormData({ ...formData, academicSession: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-[#E3E7EB] focus:outline-none focus:border-[#24364B] font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#202B38] mb-1">
                Affiliation Tagline
              </label>
              <input
                type="text"
                value={formData.tagline}
                onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-[#E3E7EB] focus:outline-none focus:border-[#24364B]"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#202B38] mb-1">
                School Registration / Affiliation Code
              </label>
              <input
                type="text"
                value={formData.schoolCode}
                onChange={(e) => setFormData({ ...formData, schoolCode: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-[#E3E7EB] focus:outline-none focus:border-[#24364B] font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#202B38] mb-1">Official Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-[#E3E7EB] focus:outline-none focus:border-[#24364B]"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#202B38] mb-1">Website</label>
              <input
                type="text"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-[#E3E7EB] focus:outline-none focus:border-[#24364B]"
              />
            </div>
          </div>
        </CardSurface>

        {/* 2. BRANDING */}
        <CardSurface padding="lg" className="space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-[#E3E7EB]">
            <ImageIcon className="w-4 h-4 text-[#24364B]" />
            <h3 className="text-sm font-bold text-[#202B38]">2. Branding &amp; Color Palette</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* School Logo */}
            <div className="p-4 rounded-[10px] border border-[#E3E7EB] bg-[#F5F6F7] space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-[#202B38]">School Crest / Logo</span>
                <span className="text-[11px] text-[#75808C]">PNG, JPG, WebP</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-lg border border-[#E3E7EB] bg-white p-1 flex items-center justify-center shrink-0 overflow-hidden">
                  {formData.logoUrl ? (
                    <img
                      src={formData.logoUrl}
                      alt="School Crest"
                      className="w-full h-full object-contain"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <School className="w-6 h-6 text-[#75808C]" />
                  )}
                </div>
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2">
                    <label className="px-3 py-1.5 text-xs font-semibold text-[#202B38] bg-white border border-[#E3E7EB] hover:bg-[#F0F2F4] rounded-lg cursor-pointer inline-flex items-center gap-1.5">
                      <Upload className="w-3.5 h-3.5 text-[#536477]" />
                      <span>{formData.logoUrl ? 'Replace' : 'Upload'}</span>
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
                        className="p-1.5 text-[#C44949] hover:bg-white rounded-lg"
                        title="Remove Logo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setFormData({ ...formData, logoUrl: DEFAULT_SCHOOL_SETTINGS.logoUrl })
                    }
                    className="text-[11px] text-[#24364B] hover:underline block"
                  >
                    Restore Sample Crest
                  </button>
                </div>
              </div>
            </div>

            {/* Principal Signature */}
            <div className="p-4 rounded-[10px] border border-[#E3E7EB] bg-[#F5F6F7] space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-[#202B38]">Authorized Signature</span>
                <span className="text-[11px] text-[#75808C]">PNG, JPG, WebP</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-24 h-16 rounded-lg border border-[#E3E7EB] bg-white p-1 flex items-center justify-center shrink-0 overflow-hidden">
                  {formData.principalSignatureUrl ? (
                    <img
                      src={formData.principalSignatureUrl}
                      alt="Signature"
                      className="w-full h-full object-contain"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <span className="text-[10px] text-[#75808C] font-mono">None</span>
                  )}
                </div>
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2">
                    <label className="px-3 py-1.5 text-xs font-semibold text-[#202B38] bg-white border border-[#E3E7EB] hover:bg-[#F0F2F4] rounded-lg cursor-pointer inline-flex items-center gap-1.5">
                      <Upload className="w-3.5 h-3.5 text-[#536477]" />
                      <span>{formData.principalSignatureUrl ? 'Replace' : 'Upload'}</span>
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
                        className="p-1.5 text-[#C44949] hover:bg-white rounded-lg"
                        title="Remove Signature"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
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
                    className="text-[11px] text-[#24364B] hover:underline block"
                  >
                    Restore Sample Stamp
                  </button>
                </div>
              </div>
              <input
                type="text"
                aria-label="Signatory designation"
                value={formData.principalName}
                onChange={(e) => setFormData({ ...formData, principalName: e.target.value })}
                placeholder="Principal / Director"
                className="w-full px-2.5 py-1.5 rounded-lg border border-[#E3E7EB] bg-white text-xs"
              />
            </div>
          </div>

          {/* Custom Brand Palette */}
          <div className="pt-3 border-t border-[#E3E7EB] space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-[#202B38]">Institutional Brand Palette Override</p>
                <p className="text-[11px] text-[#75808C]">
                  Apply custom primary, secondary, and accent colors across all card templates.
                </p>
              </div>
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.customBrandColors?.enabled || false}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      customBrandColors: {
                        enabled: e.target.checked,
                        primary: formData.customBrandColors?.primary || '#24364B',
                        secondary: formData.customBrandColors?.secondary || '#182433',
                        accent: formData.customBrandColors?.accent || '#A77C50',
                      },
                    })
                  }
                  className="rounded accent-[#24364B]"
                />
                <span className="font-semibold text-[#202B38]">Enable Override</span>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { label: 'Primary', key: 'primary' as const, def: '#24364B' },
                { label: 'Secondary', key: 'secondary' as const, def: '#182433' },
                { label: 'Accent', key: 'accent' as const, def: '#A77C50' },
              ].map((c) => {
                const val = formData.customBrandColors?.[c.key] || c.def;
                return (
                  <div
                    key={c.key}
                    className="p-3 rounded-lg bg-[#F5F6F7] border border-[#E3E7EB] flex items-center justify-between gap-2"
                  >
                    <span className="font-semibold text-[#202B38]">{c.label}</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={val}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            customBrandColors: {
                              enabled: true,
                              primary: formData.customBrandColors?.primary || '#24364B',
                              secondary: formData.customBrandColors?.secondary || '#182433',
                              accent: formData.customBrandColors?.accent || '#A77C50',
                              [c.key]: e.target.value,
                            },
                          })
                        }
                        className="w-7 h-7 rounded border border-[#E3E7EB] cursor-pointer"
                      />
                      <span className="font-mono text-[11px] uppercase text-[#536477]">{val}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </CardSurface>

        {/* 3. CARD DIMENSIONS */}
        <CardSurface padding="lg" className="space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E3E7EB]">
            <div className="flex items-center gap-2">
              <Ruler className="w-4 h-4 text-[#24364B]" />
              <h3 className="text-sm font-bold text-[#202B38]">3. Card Dimensions (ISO/IEC 7810 ID-1)</h3>
            </div>
            <button
              type="button"
              onClick={() =>
                setFormData({
                  ...formData,
                  cardDimensions:
                    formData.defaultOrientation === 'portrait'
                      ? { widthMm: 53.98, heightMm: 85.6 }
                      : { widthMm: 85.6, heightMm: 53.98 },
                })
              }
              className="text-xs font-semibold text-[#24364B] hover:underline"
            >
              Reset to CR80 Standard
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-[#202B38] mb-1">
                Physical Card Width (mm)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.cardDimensions?.widthMm ?? 85.6}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    cardDimensions: {
                      widthMm: parseFloat(e.target.value) || 85.6,
                      heightMm: formData.cardDimensions?.heightMm ?? 53.98,
                    },
                  })
                }
                className="w-full px-3 py-2 rounded-lg border border-[#E3E7EB] font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-[#202B38] mb-1">
                Physical Card Height (mm)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.cardDimensions?.heightMm ?? 53.98}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    cardDimensions: {
                      widthMm: formData.cardDimensions?.widthMm ?? 85.6,
                      heightMm: parseFloat(e.target.value) || 53.98,
                    },
                  })
                }
                className="w-full px-3 py-2 rounded-lg border border-[#E3E7EB] font-mono"
              />
            </div>
          </div>
        </CardSurface>

        {/* 4. DEFAULT TEMPLATES */}
        <CardSurface padding="lg" className="space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-[#E3E7EB]">
            <Sliders className="w-4 h-4 text-[#24364B]" />
            <h3 className="text-sm font-bold text-[#202B38]">4. Default Templates</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-[#202B38] mb-1">
                Default Template (30 Designs)
              </label>
              <select
                value={formData.defaultTemplateId}
                onChange={(e) => {
                  const tId = e.target.value as any;
                  const isPort = tId.startsWith('portrait_');
                  setFormData({
                    ...formData,
                    defaultTemplateId: tId,
                    defaultOrientation: isPort ? 'portrait' : 'landscape',
                    cardDimensions: isPort
                      ? { widthMm: 53.98, heightMm: 85.6 }
                      : { widthMm: 85.6, heightMm: 53.98 },
                  });
                }}
                className="w-full px-3 py-2 rounded-lg border border-[#E3E7EB] bg-white font-semibold text-[#202B38]"
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
              <label className="block font-semibold text-[#202B38] mb-1">
                Default Orientation
              </label>
              <select
                value={formData.defaultOrientation}
                onChange={(e) =>
                  setFormData({ ...formData, defaultOrientation: e.target.value as any })
                }
                className="w-full px-3 py-2 rounded-lg border border-[#E3E7EB] bg-white text-[#202B38]"
              >
                <option value="landscape">Landscape (85.60 × 53.98 mm)</option>
                <option value="portrait">Portrait (53.98 × 85.60 mm)</option>
              </select>
            </div>
          </div>
        </CardSurface>

        {/* 5. PREFERENCES (GLOBAL FIELD VISIBILITY) */}
        <CardSurface padding="lg" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#E3E7EB]">
            <div className="flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-[#24364B]" />
              <h3 className="text-sm font-bold text-[#202B38]">5. Preferences &amp; Field Visibility</h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleSetAllSettingFields(true)}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-[#F5F6F7] border border-[#E3E7EB] hover:bg-[#F0F2F4] text-[#202B38]"
              >
                Enable All
              </button>
              <button
                type="button"
                onClick={() =>
                  setFormData((prev) => ({
                    ...prev,
                    visibleFields: {
                      ...prev.visibleFields,
                      fatherName: true,
                      motherName: false,
                      contactNumber: true,
                      dob: true,
                      address: true,
                      conveyance: true,
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
                  }))
                }
                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-[#F5F6F7] border border-[#E3E7EB] hover:bg-[#F0F2F4] text-[#202B38]"
              >
                Essential Only
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 text-xs">
            {[
              { key: 'fatherName', label: "Father's Name" },
              { key: 'motherName', label: "Mother's Name" },
              { key: 'dob', label: 'Date of Birth' },
              { key: 'contactNumber', label: 'Contact Number' },
              { key: 'address', label: 'Address' },
              { key: 'conveyance', label: 'Conveyance' },
              { key: 'session', label: 'Session' },
              { key: 'classGrade', label: 'Class & Grade' },
              { key: 'rollNo', label: 'Roll Number' },
              { key: 'logo', label: 'School Logo' },
              { key: 'principalSignature', label: 'Signature' },
              { key: 'schoolAddress', label: 'School Address' },
              { key: 'schoolContact', label: 'School Phone' },
              { key: 'barcode', label: 'QR Code' },
            ].map((item) => {
              const isChecked =
                formData.visibleFields?.[item.key as keyof SchoolSettings['visibleFields']] !== false;
              return (
                <label
                  key={item.key}
                  className="flex items-center gap-2 p-2.5 rounded-lg bg-[#F5F6F7] border border-[#E3E7EB] cursor-pointer hover:bg-[#F0F2F4]"
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() =>
                      handleToggleSettingField(item.key as keyof SchoolSettings['visibleFields'])
                    }
                    className="rounded accent-[#24364B] cursor-pointer"
                  />
                  <span className="font-medium text-[#202B38] truncate">{item.label}</span>
                </label>
              );
            })}
          </div>
        </CardSurface>

        {/* 6. DATA MANAGEMENT */}
        <CardSurface padding="lg" className="space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-[#E3E7EB]">
            <Database className="w-4 h-4 text-[#24364B]" />
            <h3 className="text-sm font-bold text-[#202B38]">6. Data Management</h3>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-[10px] bg-[#F5F6F7] border border-[#E3E7EB] text-xs">
            <div>
              <p className="font-bold text-[#202B38] tabular-nums">
                Cloud Workspace Archive (Firebase Firestore) · {students.length} students synced
              </p>
              <p className="text-[#75808C] mt-0.5">
                Export or restore a complete JSON backup of school settings and enrolled students.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleExportBackupJson}
                className="inline-flex items-center gap-1.5 px-3 py-2 font-semibold text-[#202B38] bg-white border border-[#E3E7EB] hover:bg-[#F0F2F4] rounded-lg"
              >
                <Download className="w-3.5 h-3.5 text-[#536477]" />
                <span>Export JSON</span>
              </button>

              <label className="inline-flex items-center gap-1.5 px-3 py-2 font-semibold text-[#202B38] bg-white border border-[#E3E7EB] hover:bg-[#F0F2F4] rounded-lg cursor-pointer">
                <Upload className="w-3.5 h-3.5 text-[#536477]" />
                <span>Restore JSON</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleRestoreBackupJson}
                  className="hidden"
                />
              </label>

              <button
                type="button"
                onClick={() => {
                  if (confirm('Reset system data to official demonstration roster?')) {
                    onResetToDemo();
                    setFormData(DEFAULT_SCHOOL_SETTINGS);
                    setSavedNotification(true);
                    setTimeout(() => setSavedNotification(false), 4500);
                  }
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 font-semibold text-[#C44949] bg-white border border-[#E3E7EB] hover:bg-[#F0F2F4] rounded-lg"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Demo</span>
              </button>
            </div>
          </div>
        </CardSurface>

        {/* 7. ACCOUNT SETTINGS */}
        <CardSurface padding="lg" className="space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-[#E3E7EB]">
            <ShieldCheck className="w-4 h-4 text-[#25845A]" />
            <h3 className="text-sm font-bold text-[#202B38]">7. Connected Account &amp; Multi-Device Sync</h3>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-[10px] bg-[#F5F6F7] border border-[#E3E7EB] text-xs">
            <div className="flex items-center gap-3 min-w-0">
              {currentUser?.photoURL ? (
                <img
                  src={currentUser.photoURL}
                  alt={currentUser.displayName || 'Account avatar'}
                  className="w-10 h-10 rounded-lg object-cover border border-[#E3E7EB] shrink-0"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-[#24364B] text-white text-sm font-bold flex items-center justify-center shrink-0 uppercase">
                  {(currentUser?.displayName || currentUser?.email || 'U').charAt(0)}
                </div>
              )}
              <div className="min-w-0">
                <p className="font-bold text-[#202B38] truncate">
                  {currentUser?.displayName || 'Google Account'}
                </p>
                <p className="text-[#75808C] truncate">
                  {currentUser?.email || 'Verified Workspace'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#25845A]/10 text-[#25845A] font-semibold">
                <Cloud className="w-3.5 h-3.5" />
                <span>Private Cloud Sync Active</span>
              </span>
              {onLogout && (
                <button
                  type="button"
                  onClick={onLogout}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 font-semibold text-[#C44949] bg-white border border-[#E3E7EB] hover:bg-[#F0F2F4] rounded-lg"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              )}
            </div>
          </div>

          <div className="p-3.5 rounded-lg border border-[#E3E7EB] bg-white flex items-start gap-2.5 text-xs">
            <ShieldCheck className="w-4 h-4 text-[#25845A] shrink-0 mt-0.5" />
            <p className="text-[#536477] leading-relaxed">
              Your workspace is strictly isolated to your Google account ID (
              <span className="font-mono text-[#202B38]">{currentUser?.uid || '—'}</span>
              ). Other users cannot view or sync your school records, and signing in with this same Google account on another device automatically keeps your students, settings, and templates synchronized.
            </p>
          </div>
        </CardSurface>
      </form>
    </div>
  );
};
