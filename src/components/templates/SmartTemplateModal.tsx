import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  SchoolSettings,
  SmartTemplatePalette,
  SmartTemplateResponse,
  SmartTemplateSuggestion,
  Student,
} from '../../types';
import { TEMPLATE_REGISTRY } from '../../constants/initialData';
import {
  buildCustomizationFromSuggestion,
  requestSmartTemplates,
  resolveFontLabelById,
} from '../../utils/smartTemplateApi';
import { CR80Card } from '../cards/CR80Card';
import {
  AlertCircle,
  Bookmark,
  Check,
  Palette,
  RefreshCw,
  School,
  Sliders,
  Sparkles,
  Upload,
  X,
} from 'lucide-react';

interface SmartTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  schoolSettings: SchoolSettings;
  sampleStudent: Student;
  onUpdateLogoUrl: (logoUrl: string) => void;
  onApplyAsSchoolDefault: (
    suggestion: SmartTemplateSuggestion,
    palette: SmartTemplatePalette
  ) => void;
  onApplyPaletteOnly: (palette: SmartTemplatePalette) => void;
  onSaveAsCustomTemplate: (suggestion: SmartTemplateSuggestion) => void;
  onOpenInStudio: (suggestion: SmartTemplateSuggestion) => void;
}

const STYLE_OPTIONS = [
  { value: 'auto', label: 'Auto Match Crest' },
  { value: 'Heritage', label: 'Heritage' },
  { value: 'Institutional', label: 'Institutional' },
  { value: 'Curved Academic', label: 'Curved Academic' },
  { value: 'Geometric Modern', label: 'Geometric Modern' },
  { value: 'Minimal', label: 'Minimal' },
];

export const SmartTemplateModal: React.FC<SmartTemplateModalProps> = ({
  isOpen,
  onClose,
  schoolSettings,
  sampleStudent,
  onUpdateLogoUrl,
  onApplyAsSchoolDefault,
  onApplyPaletteOnly,
  onSaveAsCustomTemplate,
  onOpenInStudio,
}) => {
  const [orientationPref, setOrientationPref] = useState<'all' | 'portrait' | 'landscape'>('all');
  const [stylePref, setStylePref] = useState<string>('auto');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [result, setResult] = useState<SmartTemplateResponse | null>(null);
  const [cardSides, setCardSides] = useState<Record<string, 'front' | 'back'>>({});
  const [appliedId, setAppliedId] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<Record<string, boolean>>({});
  const [paletteApplied, setPaletteApplied] = useState<boolean>(false);
  const lastAutoLogoRef = useRef<string>('');

  const runAnalysis = useCallback(
    async (
      logoOverride?: string,
      nextOrientation?: 'all' | 'portrait' | 'landscape',
      nextStyle?: string
    ) => {
      const targetLogo = (logoOverride ?? schoolSettings.logoUrl ?? '').trim();
      if (!targetLogo) {
        setErrorMsg('Please upload your school logo first so we can extract its brand colors.');
        return;
      }
      setIsLoading(true);
      setErrorMsg('');
      setAppliedId(null);
      setPaletteApplied(false);

      try {
        const response = await requestSmartTemplates({
          logoUrl: targetLogo,
          schoolName: schoolSettings.schoolName || 'School Institution',
          tagline: schoolSettings.tagline || '',
          orientationPreference: nextOrientation ?? orientationPref,
          stylePreference: nextStyle ?? stylePref,
        });
        setResult(response);
        setSavedIds({});
        setCardSides({});
      } catch (err: unknown) {
        setErrorMsg(
          err instanceof Error
            ? err.message
            : 'Unable to analyze logo right now. Please try again.'
        );
      } finally {
        setIsLoading(false);
      }
    },
    [orientationPref, schoolSettings.logoUrl, schoolSettings.schoolName, schoolSettings.tagline, stylePref]
  );

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  // Run initial analysis automatically the first time modal opens for the current logo
  useEffect(() => {
    if (!isOpen) return;
    const currentLogo = (schoolSettings.logoUrl || '').trim();
    if (currentLogo && currentLogo !== lastAutoLogoRef.current && !isLoading) {
      lastAutoLogoRef.current = currentLogo;
      void runAnalysis(currentLogo);
    }
  }, [isOpen, schoolSettings.logoUrl, isLoading, runAnalysis]);

  const handleUploadNewLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setErrorMsg('Invalid image format. Please upload a PNG, JPG, or WebP logo.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('Logo file exceeds 5 MB limit.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = String(ev.target?.result || '');
      if (!dataUrl) return;
      onUpdateLogoUrl(dataUrl);
      lastAutoLogoRef.current = dataUrl;
      void runAnalysis(dataUrl);
    };
    reader.onerror = () => {
      setErrorMsg('Could not read the selected logo file.');
    };
    reader.readAsDataURL(file);
  };

  if (!isOpen) return null;

  const hasLogo = Boolean((schoolSettings.logoUrl || '').trim());

  return (
    <div
      className="no-print fixed inset-0 z-50 bg-[#202B38]/55 flex items-center justify-center p-3 sm:p-5"
      onClick={onClose}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="smart-template-modal-title"
        className="bg-[#F5F6F7] border border-[#E3E7EB] rounded-[12px] shadow-2xl w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <header className="px-5 py-4 bg-white border-b border-[#E3E7EB] flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-[#24364B] text-white flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 text-[#A77C50]" />
            </div>
            <div className="min-w-0">
              <h2
                id="smart-template-modal-title"
                className="text-base font-bold text-[#202B38] truncate"
              >
                Smart Template Generator
              </h2>
              <p className="text-xs text-[#75808C] truncate">
                Extracts dominant colors from your school crest to recommend print-ready CR80 card layouts.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close Smart Template Generator"
            className="p-1.5 rounded-lg text-[#75808C] hover:text-[#202B38] hover:bg-[#F0F2F4] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Logo Source & Generator Controls Bar */}
          <div className="bg-white border border-[#E3E7EB] rounded-[10px] p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-14 h-14 rounded-lg border border-[#E3E7EB] bg-[#F5F6F7] p-1.5 flex items-center justify-center shrink-0 overflow-hidden">
                {hasLogo ? (
                  <img
                    src={schoolSettings.logoUrl}
                    alt="School logo"
                    className="w-full h-full object-contain"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <School className="w-6 h-6 text-[#75808C]" />
                )}
              </div>

              <div className="min-w-0 space-y-1">
                <p className="text-xs font-bold text-[#202B38] truncate">
                  {schoolSettings.schoolName || 'School Institution'}
                </p>
                <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#75808C]">
                  <span>{hasLogo ? 'Active crest from Settings' : 'No logo uploaded yet'}</span>
                  <span aria-hidden="true">·</span>
                  <label className="text-[#24364B] font-semibold hover:underline cursor-pointer inline-flex items-center gap-1">
                    <Upload className="w-3 h-3" />
                    <span>{hasLogo ? 'Swap Logo' : 'Upload Logo'}</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/webp"
                      onChange={handleUploadNewLogo}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 text-xs">
              <div className="flex items-center gap-1 bg-[#F0F2F4] p-1 rounded-lg">
                {(
                  [
                    { id: 'all', label: 'Mix' },
                    { id: 'portrait', label: 'Portrait' },
                    { id: 'landscape', label: 'Landscape' },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    disabled={isLoading}
                    onClick={() => setOrientationPref(opt.id)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                      orientationPref === opt.id
                        ? 'bg-white text-[#202B38] font-semibold shadow-xs'
                        : 'text-[#536477] hover:text-[#202B38]'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              <select
                value={stylePref}
                disabled={isLoading}
                onChange={(e) => setStylePref(e.target.value)}
                aria-label="Preferred card aesthetic"
                className="h-9 px-2.5 text-xs font-medium rounded-lg border border-[#E3E7EB] bg-white text-[#202B38] focus:outline-none focus:border-[#24364B]"
              >
                {STYLE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>

              <button
                type="button"
                disabled={isLoading || !hasLogo}
                onClick={() => void runAnalysis(undefined, orientationPref, stylePref)}
                className="h-9 px-4 text-xs font-semibold text-white bg-[#24364B] hover:bg-[#304A64] disabled:opacity-50 rounded-lg inline-flex items-center gap-1.5 transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                <span>{isLoading ? 'Analyzing Crest...' : result ? 'Regenerate' : 'Analyze Logo'}</span>
              </button>
            </div>
          </div>

          {/* Error Banner */}
          {errorMsg && (
            <div className="bg-white border border-[#C44949]/40 rounded-[10px] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-2.5 text-xs text-[#C44949]">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Could not generate smart layouts</p>
                  <p className="text-[#536477] mt-0.5">{errorMsg}</p>
                </div>
              </div>
              {hasLogo && (
                <button
                  type="button"
                  onClick={() => void runAnalysis()}
                  className="px-3 py-1.5 text-xs font-semibold text-[#202B38] bg-[#F5F6F7] border border-[#E3E7EB] hover:bg-[#F0F2F4] rounded-lg shrink-0 self-start sm:self-auto"
                >
                  Retry Analysis
                </button>
              )}
            </div>
          )}

          {/* No Logo Empty State */}
          {!hasLogo && !isLoading && (
            <div className="bg-white border border-dashed border-[#E3E7EB] rounded-[10px] py-12 px-6 text-center space-y-3">
              <div className="w-11 h-11 rounded-[10px] bg-[#F0F2F4] text-[#536477] flex items-center justify-center mx-auto">
                <Upload className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-[#202B38]">Upload your school logo to begin</h3>
              <p className="text-xs text-[#75808C] max-w-md mx-auto leading-relaxed">
                Upload a PNG, JPG, or WebP emblem above or in Settings. Smart Template inspects your crest palette and tailors matching typography, color contrast, and card framing.
              </p>
              <label className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#24364B] hover:bg-[#304A64] rounded-lg cursor-pointer">
                <Upload className="w-3.5 h-3.5" />
                <span>Upload School Logo</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  onChange={handleUploadNewLogo}
                  className="hidden"
                />
              </label>
            </div>
          )}

          {/* Loading Skeleton */}
          {isLoading && (
            <div className="space-y-4">
              <div className="bg-white border border-[#E3E7EB] rounded-[10px] p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#F0F2F4] animate-pulse" />
                  <div className="space-y-1.5">
                    <div className="h-3.5 w-48 bg-[#F0F2F4] rounded animate-pulse" />
                    <div className="h-2.5 w-64 bg-[#F5F6F7] rounded animate-pulse" />
                  </div>
                </div>
                <span className="text-xs font-medium text-[#75808C]">
                  Inspecting logo palette &amp; matching 30 CR80 layouts...
                </span>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {[0, 1, 2].map((idx) => (
                  <div
                    key={idx}
                    className="bg-white border border-[#E3E7EB] rounded-[10px] overflow-hidden"
                  >
                    <div className="h-9 bg-[#F5F6F7] border-b border-[#E3E7EB]" />
                    <div className="h-[270px] bg-[#F0F2F4] flex items-center justify-center p-6">
                      <div className="w-40 h-56 rounded-lg bg-white/80 border border-[#E3E7EB] animate-pulse" />
                    </div>
                    <div className="p-4 space-y-2.5">
                      <div className="h-4 w-40 bg-[#F0F2F4] rounded animate-pulse" />
                      <div className="h-3 w-full bg-[#F5F6F7] rounded animate-pulse" />
                      <div className="h-3 w-4/5 bg-[#F5F6F7] rounded animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Extracted Palette + 3 Suggested Cards */}
          {!isLoading && result && (
            <>
              {/* Extracted Brand Palette Strip */}
              <div className="bg-white border border-[#E3E7EB] rounded-[10px] p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Palette className="w-4 h-4 text-[#A77C50]" />
                    <h3 className="text-xs font-bold text-[#202B38] uppercase tracking-wider">
                      Extracted Logo Brand Palette
                    </h3>
                    <span className="text-xs text-[#75808C]">· {result.extractedPalette.colorMood}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 pt-1">
                    {[
                      { label: 'Dominant', hex: result.extractedPalette.dominantHex },
                      { label: 'Secondary', hex: result.extractedPalette.secondaryHex },
                      { label: 'Accent', hex: result.extractedPalette.accentHex },
                    ].map((swatch) => (
                      <div key={swatch.label} className="flex items-center gap-2 text-xs">
                        <span
                          className="w-5 h-5 rounded-md border border-black/15 shrink-0"
                          style={{ backgroundColor: swatch.hex }}
                        />
                        <span className="text-[#536477] font-medium">{swatch.label}</span>
                        <span className="font-mono text-[11px] uppercase text-[#202B38] tabular-nums">
                          {swatch.hex}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    onApplyPaletteOnly(result.extractedPalette);
                    setPaletteApplied(true);
                  }}
                  className={`h-9 px-3.5 text-xs font-semibold rounded-lg border inline-flex items-center gap-1.5 transition-colors shrink-0 self-start md:self-auto ${
                    paletteApplied
                      ? 'bg-[#25845A]/10 border-[#25845A]/30 text-[#25845A]'
                      : 'bg-[#F5F6F7] border-[#E3E7EB] text-[#202B38] hover:bg-[#F0F2F4]'
                  }`}
                >
                  {paletteApplied ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Brand Colors Applied</span>
                    </>
                  ) : (
                    <>
                      <Palette className="w-3.5 h-3.5 text-[#536477]" />
                      <span>Apply Palette Only</span>
                    </>
                  )}
                </button>
              </div>

              {/* 3 Recommendations Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {result.suggestions.map((suggestion) => {
                  const templateMeta = TEMPLATE_REGISTRY.find((t) => t.id === suggestion.templateId);
                  const side = cardSides[suggestion.id] || 'front';
                  const isPortrait = suggestion.orientation === 'portrait';
                  const customProps = buildCustomizationFromSuggestion(suggestion);
                  const isApplied = appliedId === suggestion.id;
                  const isSaved = Boolean(savedIds[suggestion.id]);

                  return (
                    <article
                      key={suggestion.id}
                      className={`bg-white rounded-[10px] border flex flex-col overflow-hidden transition-colors ${
                        isApplied
                          ? 'border-[#24364B] ring-1 ring-[#24364B]/20'
                          : 'border-[#E3E7EB]'
                      }`}
                    >
                      {/* Clean Metadata Bar */}
                      <div className="px-3.5 py-2.5 bg-[#F5F6F7] border-b border-[#E3E7EB] flex items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-1.5 text-[#75808C] min-w-0 truncate">
                          <span className="capitalize font-semibold text-[#536477]">
                            {suggestion.orientation}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="truncate">
                            {templateMeta?.subCategory || 'Institutional'}
                          </span>
                        </div>

                        <div className="flex items-center gap-0.5 bg-white border border-[#E3E7EB] rounded-md p-0.5 shrink-0">
                          {(['front', 'back'] as const).map((s) => (
                            <button
                              key={s}
                              type="button"
                              onClick={() =>
                                setCardSides((prev) => ({ ...prev, [suggestion.id]: s }))
                              }
                              className={`px-2 py-0.5 text-[11px] font-medium rounded transition-colors ${
                                side === s
                                  ? 'bg-[#24364B] text-white'
                                  : 'text-[#75808C] hover:text-[#202B38]'
                              }`}
                            >
                              {s === 'front' ? 'Front' : 'Back'}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Live CR80 Card Preview Stage */}
                      <div className="bg-[#F0F2F4] px-4 py-5 flex items-center justify-center h-[280px]">
                        <div
                          className={`w-full shadow-md rounded-[6px] overflow-hidden ${
                            isPortrait ? 'max-w-[154px]' : 'max-w-[274px]'
                          }`}
                        >
                          <CR80Card
                            student={sampleStudent}
                            schoolSettings={schoolSettings}
                            customization={{
                              ...customProps,
                              side,
                            }}
                          />
                        </div>
                      </div>

                      {/* Rationale & Specs */}
                      <div className="p-4 flex flex-col flex-1 justify-between gap-3.5">
                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h4 className="text-sm font-bold text-[#202B38] leading-snug">
                                {suggestion.title}
                              </h4>
                              <p className="text-[11px] text-[#75808C] mt-0.5">
                                {templateMeta?.name || suggestion.templateId}
                              </p>
                            </div>
                            <div className="flex items-center gap-1 shrink-0 pt-0.5" title="Suggested Color Pair">
                              {[
                                suggestion.primaryColor,
                                suggestion.secondaryColor,
                                suggestion.accentColor,
                              ].map((hex, i) => (
                                <span
                                  key={i}
                                  className="w-3 h-3 rounded-full border border-black/15"
                                  style={{ backgroundColor: hex }}
                                />
                              ))}
                            </div>
                          </div>

                          <p className="text-xs text-[#536477] leading-relaxed">
                            {suggestion.rationale}
                          </p>

                          <div className="pt-1 text-[11px] text-[#75808C] flex flex-wrap items-center gap-x-2 gap-y-0.5">
                            <span>
                              Fonts:{' '}
                              <strong className="font-medium text-[#202B38]">
                                {resolveFontLabelById(suggestion.headingFontId)}
                              </strong>{' '}
                              / {resolveFontLabelById(suggestion.bodyFontId)}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span className="capitalize">
                              {suggestion.logoShape} badge
                            </span>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="pt-3 border-t border-[#E3E7EB] flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => onOpenInStudio(suggestion)}
                              className="px-2.5 py-1.5 text-xs font-medium text-[#536477] hover:text-[#202B38] hover:bg-[#F0F2F4] rounded-lg inline-flex items-center gap-1 transition-colors"
                            >
                              <Sliders className="w-3.5 h-3.5" />
                              <span>Studio</span>
                            </button>
                            <button
                              type="button"
                              disabled={isSaved}
                              onClick={() => {
                                onSaveAsCustomTemplate(suggestion);
                                setSavedIds((prev) => ({ ...prev, [suggestion.id]: true }));
                              }}
                              className={`px-2.5 py-1.5 text-xs font-medium rounded-lg inline-flex items-center gap-1 transition-colors ${
                                isSaved
                                  ? 'text-[#25845A] bg-[#25845A]/10'
                                  : 'text-[#536477] hover:text-[#202B38] hover:bg-[#F0F2F4]'
                              }`}
                            >
                              {isSaved ? (
                                <>
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Saved</span>
                                </>
                              ) : (
                                <>
                                  <Bookmark className="w-3.5 h-3.5" />
                                  <span>Save</span>
                                </>
                              )}
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              onApplyAsSchoolDefault(suggestion, result.extractedPalette);
                              setAppliedId(suggestion.id);
                            }}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 transition-colors ${
                              isApplied
                                ? 'bg-[#25845A] text-white'
                                : 'bg-[#24364B] hover:bg-[#304A64] text-white'
                            }`}
                          >
                            {isApplied ? (
                              <>
                                <Check className="w-3.5 h-3.5" />
                                <span>Applied</span>
                              </>
                            ) : (
                              <span>Set Default</span>
                            )}
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <footer className="px-5 py-3 bg-white border-t border-[#E3E7EB] flex items-center justify-between gap-3 text-xs text-[#75808C] shrink-0">
          <span>
            Dimensions follow ISO/IEC 7810 ID-1 (CR80:{' '}
            <span className="font-mono text-[#202B38] tabular-nums">85.60 × 53.98 mm</span>)
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs font-semibold text-[#202B38] bg-[#F5F6F7] border border-[#E3E7EB] hover:bg-[#F0F2F4] rounded-lg"
          >
            Done
          </button>
        </footer>
      </section>
    </div>
  );
};
