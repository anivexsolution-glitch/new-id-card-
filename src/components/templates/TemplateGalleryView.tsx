import React, { useEffect, useMemo, useState } from 'react';
import { ActiveNavTab, SchoolSettings, Student, TemplateDefinition, TemplateId } from '../../types';
import { TEMPLATE_REGISTRY, DEMO_STUDENTS } from '../../constants/initialData';
import { CR80Card } from '../cards/CR80Card';
import { PageHeader, EmptyState } from '../ui/EnterpriseUI';
import { ArrowUpRight, Check, Eye, Search, Sliders, X, Layers } from 'lucide-react';

interface TemplateGalleryViewProps {
  schoolSettings: SchoolSettings;
  students: Student[];
  onSetDefaultTemplate: (templateId: TemplateId) => void;
  onNavigate: (tab: ActiveNavTab) => void;
  onSelectTemplateForEditor: (templateId: TemplateId) => void;
}

const styleLabels: Record<string, string> = {
  All: 'All Categories',
  'Curved Academic': 'Curved Academic',
  Institutional: 'Institutional',
  Heritage: 'Heritage',
  'Geometric Modern': 'Geometric Modern',
  Minimal: 'Minimal',
};

export const TemplateGalleryView: React.FC<TemplateGalleryViewProps> = ({
  schoolSettings,
  students,
  onSetDefaultTemplate,
  onNavigate,
  onSelectTemplateForEditor,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeOrientation, setActiveOrientation] = useState<'all' | 'portrait' | 'landscape'>('all');
  const [selectedSubCategory, setSelectedSubCategory] = useState('All');
  const [cardPreviewSides, setCardPreviewSides] = useState<Record<string, 'front' | 'back'>>({});
  const [previewTemplate, setPreviewTemplate] = useState<TemplateDefinition | null>(null);
  const [previewSide, setPreviewSide] = useState<'front' | 'back'>('front');

  const sampleStudent = useMemo(() => students[0] || DEMO_STUDENTS[0], [students]);
  const currentTemplate = TEMPLATE_REGISTRY.find(
    (template) => template.id === schoolSettings.defaultTemplateId
  );
  const subCategories = ['All', ...new Set(TEMPLATE_REGISTRY.map((template) => template.subCategory))];

  const filteredTemplates = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return TEMPLATE_REGISTRY.filter((template) => {
      const matchOrientation =
        activeOrientation === 'all' || template.orientation === activeOrientation;
      const matchCategory =
        selectedSubCategory === 'All' || template.subCategory === selectedSubCategory;
      const matchSearch =
        !q ||
        template.name.toLowerCase().includes(q) ||
        template.subCategory.toLowerCase().includes(q) ||
        template.description.toLowerCase().includes(q);
      return matchOrientation && matchCategory && matchSearch;
    });
  }, [activeOrientation, selectedSubCategory, searchQuery]);

  useEffect(() => {
    if (!previewTemplate) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPreviewTemplate(null);
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [previewTemplate]);

  const openEditor = (templateId: TemplateId) => {
    onSelectTemplateForEditor(templateId);
    setPreviewTemplate(null);
    onNavigate('editor');
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto space-y-6">
      <PageHeader
        title="ID Card Templates"
        subtitle="Select a school default layout or open any template in the ID Card Studio to customize typography, branding, and fields."
        meta={
          <span>
            Active default: <strong className="text-[#202B38]">{currentTemplate?.name || 'Custom'}</strong>
          </span>
        }
        actions={
          <button
            type="button"
            onClick={() => openEditor(schoolSettings.defaultTemplateId)}
            className="h-9 px-4 text-xs font-semibold text-white bg-[#24364B] hover:bg-[#304A64] rounded-lg flex items-center gap-1.5 transition-colors"
          >
            <Sliders className="w-4 h-4" />
            <span>Customize Active Design</span>
          </button>
        }
      />

      {/* Search, Orientation & Category Filter Toolbar */}
      <div className="bg-white border border-[#E3E7EB] rounded-[10px] p-4 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-[#75808C] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search templates by name, style, or description..."
              aria-label="Search templates"
              className="w-full h-9 pl-9 pr-3 text-xs rounded-lg border border-[#E3E7EB] bg-[#F5F6F7] text-[#202B38] placeholder:text-[#75808C] focus:outline-none focus:bg-white focus:border-[#24364B]"
            />
          </div>

          {/* Orientation Segmented Filter */}
          <div
            className="flex flex-wrap items-center gap-1 bg-[#F0F2F4] rounded-lg p-1 self-start lg:self-auto"
            role="group"
            aria-label="Orientation Filter"
          >
            {(['all', 'portrait', 'landscape'] as const).map((orientation) => {
              const count = TEMPLATE_REGISTRY.filter(
                (t) => orientation === 'all' || t.orientation === orientation
              ).length;
              return (
                <button
                  key={orientation}
                  type="button"
                  onClick={() => setActiveOrientation(orientation)}
                  aria-pressed={activeOrientation === orientation}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                    activeOrientation === orientation
                      ? 'bg-white text-[#202B38] font-semibold shadow-xs'
                      : 'text-[#536477] hover:text-[#202B38]'
                  }`}
                >
                  {orientation === 'all'
                    ? 'All Designs'
                    : orientation === 'portrait'
                    ? 'Portrait'
                    : 'Landscape'}{' '}
                  <span className="ml-1 text-[#75808C] tabular-nums">{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Category Filter Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#E3E7EB]">
          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Category Filter">
            {subCategories.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => setSelectedSubCategory(category)}
                aria-pressed={selectedSubCategory === category}
                className={`px-3 py-1.5 text-xs rounded-lg transition-colors whitespace-nowrap ${
                  selectedSubCategory === category
                    ? 'bg-[#24364B] text-white font-semibold'
                    : 'bg-[#F5F6F7] text-[#536477] hover:bg-[#F0F2F4] hover:text-[#202B38]'
                }`}
              >
                {styleLabels[category] || category}
              </button>
            ))}
          </div>

          <span className="text-xs text-[#75808C] font-mono tabular-nums">
            Showing {filteredTemplates.length} of {TEMPLATE_REGISTRY.length} · CR80
          </span>
        </div>
      </div>

      {/* Template Grid */}
      {filteredTemplates.length === 0 ? (
        <EmptyState
          icon={<Layers className="w-5 h-5" />}
          title="No matching templates"
          description="Try clearing your search query or selecting another orientation and category filter."
          action={
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setActiveOrientation('all');
                setSelectedSubCategory('All');
              }}
              className="h-9 px-4 text-xs font-semibold text-white bg-[#24364B] hover:bg-[#304A64] rounded-lg"
            >
              Reset Filters
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredTemplates.map((template) => {
            const isCurrentDefault = schoolSettings.defaultTemplateId === template.id;
            const isPortrait = template.orientation === 'portrait';
            const side = cardPreviewSides[template.id] || 'front';

            return (
              <article
                key={template.id}
                className={`bg-white rounded-[10px] border transition-colors flex flex-col overflow-hidden ${
                  isCurrentDefault
                    ? 'border-[#24364B] ring-1 ring-[#24364B]/20'
                    : 'border-[#E3E7EB] hover:border-[#536477]/50'
                }`}
              >
                {/* Clean Metadata Header */}
                <div className="px-4 py-2.5 bg-[#F5F6F7] border-b border-[#E3E7EB] flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-1.5 text-[#75808C]">
                    <span className="capitalize font-medium text-[#536477]">
                      {template.orientation}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{template.subCategory}</span>
                  </div>

                  {/* Quick Front / Back Thumbnail Toggle */}
                  <div className="flex items-center gap-1 bg-white border border-[#E3E7EB] rounded-md p-0.5">
                    {(['front', 'back'] as const).map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setCardPreviewSides((prev) => ({ ...prev, [template.id]: s }))}
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

                {/* Consistent Card Preview Stage */}
                <button
                  type="button"
                  onClick={() => {
                    setPreviewTemplate(template);
                    setPreviewSide(side);
                  }}
                  aria-label={`Inspect ${template.name}`}
                  className="w-full bg-[#F0F2F4] px-6 py-6 flex items-center justify-center h-[320px] cursor-zoom-in focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[#24364B]"
                >
                  <div
                    className={`w-full shadow-md rounded-[6px] overflow-hidden ${
                      isPortrait ? 'max-w-[178px]' : 'max-w-[300px]'
                    }`}
                  >
                    <CR80Card
                      student={sampleStudent}
                      schoolSettings={schoolSettings}
                      customization={{
                        templateId: template.id,
                        orientation: template.orientation,
                        side,
                      }}
                    />
                  </div>
                </button>

                {/* Card Details & Actions */}
                <div className="p-4 flex flex-col flex-1 justify-between gap-4">
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-bold text-[#202B38] truncate">
                        {template.name}
                      </h3>
                      <div className="flex items-center gap-1 shrink-0" aria-hidden="true">
                        {[template.primaryColor, template.accentColor].map((color, i) => (
                          <span
                            key={i}
                            className="w-3 h-3 rounded-full border border-black/10"
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-[#75808C] mt-1 line-clamp-2 leading-relaxed">
                      {template.description}
                    </p>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-3 border-t border-[#E3E7EB]">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setPreviewTemplate(template);
                          setPreviewSide(side);
                        }}
                        className="px-2.5 py-1.5 text-xs font-medium text-[#536477] hover:text-[#202B38] hover:bg-[#F0F2F4] rounded-lg flex items-center gap-1 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Preview</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => openEditor(template.id)}
                        className="px-2.5 py-1.5 text-xs font-medium text-[#536477] hover:text-[#202B38] hover:bg-[#F0F2F4] rounded-lg flex items-center gap-1 transition-colors"
                      >
                        <Sliders className="w-3.5 h-3.5" />
                        <span>Studio</span>
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => onSetDefaultTemplate(template.id)}
                      disabled={isCurrentDefault}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors ${
                        isCurrentDefault
                          ? 'bg-[#25845A]/10 text-[#25845A] cursor-default'
                          : 'bg-[#24364B] text-white hover:bg-[#304A64]'
                      }`}
                    >
                      {isCurrentDefault ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Default</span>
                        </>
                      ) : (
                        <>
                          <span>Use Design</span>
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Full Front / Back Inspection Modal */}
      {previewTemplate && (
        <div
          className="fixed inset-0 z-50 bg-[#202B38]/50 flex items-center justify-center p-4"
          onClick={() => setPreviewTemplate(null)}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="template-preview-title"
            className="bg-white rounded-[12px] shadow-xl border border-[#E3E7EB] w-full max-w-xl max-h-[95vh] overflow-y-auto"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="px-6 py-4 flex items-center justify-between border-b border-[#E3E7EB] bg-[#F5F6F7]">
              <div>
                <h3 id="template-preview-title" className="text-base font-bold text-[#202B38]">
                  {previewTemplate.name}
                </h3>
                <p className="text-xs text-[#75808C] mt-0.5">
                  {previewTemplate.orientation === 'portrait'
                    ? 'Portrait · 53.98 × 85.60 mm'
                    : 'Landscape · 85.60 × 53.98 mm'}{' '}
                  · {previewTemplate.subCategory}
                </p>
              </div>
              <button
                type="button"
                autoFocus
                onClick={() => setPreviewTemplate(null)}
                aria-label="Close preview"
                className="p-1.5 rounded-lg text-[#75808C] hover:text-[#202B38] hover:bg-[#E3E7EB]/60"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 bg-[#F0F2F4] flex flex-col items-center justify-center">
              <div
                className={`w-full rounded-[8px] overflow-hidden shadow-lg ${
                  previewTemplate.orientation === 'portrait' ? 'max-w-[260px]' : 'max-w-[440px]'
                }`}
              >
                <CR80Card
                  student={sampleStudent}
                  schoolSettings={schoolSettings}
                  customization={{
                    templateId: previewTemplate.id,
                    orientation: previewTemplate.orientation,
                    side: previewSide,
                  }}
                />
              </div>

              <div className="mt-5 p-1 bg-white rounded-lg flex gap-1 border border-[#E3E7EB]">
                {(['front', 'back'] as const).map((side) => (
                  <button
                    key={side}
                    type="button"
                    onClick={() => setPreviewSide(side)}
                    aria-pressed={previewSide === side}
                    className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                      previewSide === side
                        ? 'bg-[#24364B] text-white'
                        : 'text-[#536477] hover:text-[#202B38]'
                    }`}
                  >
                    {side === 'front' ? 'Front Side' : 'Back Side'}
                  </button>
                ))}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-[#E3E7EB] flex flex-wrap gap-3 items-center justify-between bg-white">
              <button
                type="button"
                onClick={() => openEditor(previewTemplate.id)}
                className="text-xs font-semibold text-[#24364B] hover:underline flex items-center gap-1.5"
              >
                <Sliders className="w-3.5 h-3.5 text-[#A77C50]" />
                <span>Open in ID Card Studio</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onSetDefaultTemplate(previewTemplate.id);
                  setPreviewTemplate(null);
                }}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#24364B] hover:bg-[#304A64] rounded-lg transition-colors"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Set as School Default</span>
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
};
