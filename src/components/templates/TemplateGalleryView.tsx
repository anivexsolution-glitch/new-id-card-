import React, { useEffect, useMemo, useState } from 'react';
import { ActiveNavTab, SchoolSettings, Student, TemplateDefinition, TemplateId } from '../../types';
import { TEMPLATE_REGISTRY, DEMO_STUDENTS } from '../../constants/initialData';
import { CR80Card } from '../cards/CR80Card';
import { ArrowUpRight, Check, Eye, Sliders, X } from 'lucide-react';

interface TemplateGalleryViewProps {
  schoolSettings: SchoolSettings;
  students: Student[];
  onSetDefaultTemplate: (templateId: TemplateId) => void;
  onNavigate: (tab: ActiveNavTab) => void;
  onSelectTemplateForEditor: (templateId: TemplateId) => void;
}

const styleLabels: Record<string, string> = {
  All: 'All styles',
  'Curved Academic': 'Curved Academic',
  Institutional: 'Academic',
  Heritage: 'Heritage',
  'Geometric Modern': 'Contemporary',
  Minimal: 'Minimal',
};

export const TemplateGalleryView: React.FC<TemplateGalleryViewProps> = ({
  schoolSettings, students, onSetDefaultTemplate, onNavigate, onSelectTemplateForEditor,
}) => {
  const [activeOrientation, setActiveOrientation] = useState<'all' | 'portrait' | 'landscape'>('portrait');
  const [selectedSubCategory, setSelectedSubCategory] = useState('All');
  const [previewTemplate, setPreviewTemplate] = useState<TemplateDefinition | null>(null);
  const [previewSide, setPreviewSide] = useState<'front' | 'back'>('front');
  const sampleStudent = useMemo(() => students[0] || DEMO_STUDENTS[0], [students]);
  const currentTemplate = TEMPLATE_REGISTRY.find((template) => template.id === schoolSettings.defaultTemplateId);
  const subCategories = ['All', ...new Set(TEMPLATE_REGISTRY.map((template) => template.subCategory))];
  const filteredTemplates = TEMPLATE_REGISTRY.filter((template) =>
    (activeOrientation === 'all' || template.orientation === activeOrientation) &&
    (selectedSubCategory === 'All' || template.subCategory === selectedSubCategory)
  );

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
    <div className="min-h-full bg-[#f7f6f2] p-4 sm:p-8 lg:p-10">
      <div className="max-w-7xl mx-auto">
        <header className="flex flex-col xl:flex-row xl:items-end justify-between gap-6 pb-7 border-b border-[#dcded9]">
          <div>
            <p className="text-[10px] font-semibold tracking-[0.2em] uppercase text-[#707970] mb-3">The identity collection</p>
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-[#25332f]">School ID templates</h2>
            <p className="text-sm text-[#6d756f] mt-3 max-w-xl leading-relaxed">30 considered designs. Clear typography, balanced layouts and room for every student detail.</p>
          </div>
          <div className="border-l-2 border-[#a5b3a7] pl-4 shrink-0">
            <p className="text-[10px] uppercase tracking-wider text-[#798078] mb-1">School default</p>
            <p className="text-sm font-semibold text-[#34463d]">{currentTemplate?.name || 'Choose a template'}</p>
          </div>
        </header>

        <div className="py-6 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-1 bg-[#eaece6] rounded-lg p-1 self-start" aria-label="Card orientation">
            {(['portrait', 'landscape', 'all'] as const).map((orientation) => {
              const count = TEMPLATE_REGISTRY.filter((template) => orientation === 'all' || template.orientation === orientation).length;
              return (
                <button key={orientation} onClick={() => setActiveOrientation(orientation)} aria-pressed={activeOrientation === orientation}
                  className={`px-3 sm:px-4 py-2 text-xs font-medium rounded-md transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#34463d] ${activeOrientation === orientation ? 'bg-white text-[#25332f] shadow-sm' : 'text-[#707970] hover:text-[#25332f]'}`}>
                  {orientation === 'all' ? 'All designs' : orientation === 'portrait' ? 'Portrait' : 'Landscape'}
                  <span className="ml-2 opacity-50 tabular-nums">{count}</span>
                </button>
              );
            })}
          </div>
          <div className="flex flex-wrap items-center gap-1" aria-label="Design style">
            {subCategories.map((category) => (
              <button key={category} onClick={() => setSelectedSubCategory(category)} aria-pressed={selectedSubCategory === category}
                className={`px-3 py-2 text-xs rounded-md transition-colors focus-visible:outline-2 focus-visible:outline-[#34463d] ${selectedSubCategory === category ? 'text-[#25332f] bg-[#e5e9e1] font-semibold' : 'text-[#737b74] hover:text-[#25332f] hover:bg-[#eeefe9]'}`}>
                {styleLabels[category] || category}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between mb-4 text-[11px] text-[#7a827b]">
          <span>{filteredTemplates.length} designs in this collection</span>
          <span>CR80 · 85.60 × 53.98 mm</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 lg:gap-6">
          {filteredTemplates.map((template) => {
            const isCurrentDefault = schoolSettings.defaultTemplateId === template.id;
            const isPortrait = template.orientation === 'portrait';
            const collectionNumber = String(TEMPLATE_REGISTRY.indexOf(template) + 1).padStart(2, '0');
            return (
              <article key={template.id} className={`rounded-xl overflow-hidden bg-white border ${isCurrentDefault ? 'border-[#819684]' : 'border-[#dedfd9]'} flex flex-col`}>
                <div className="px-5 pt-4 bg-[#eeeee8] flex items-center justify-between text-[10px] text-[#8a8d84] tracking-wider uppercase">
                  <span>{collectionNumber} / {template.orientation}</span>
                  {isCurrentDefault && <span className="flex items-center gap-1 text-[#526b59]"><Check className="w-3 h-3" />Selected</span>}
                </div>
                <button type="button" onClick={() => { setPreviewTemplate(template); setPreviewSide('front'); }} aria-label={`Preview ${template.name}`}
                  className={`w-full bg-[#eeeee8] px-6 pt-6 pb-8 flex justify-center items-center cursor-zoom-in focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[#34463d] ${activeOrientation === 'all' || isPortrait ? 'min-h-[380px]' : 'min-h-[260px]'}`}>
                  <div className={`w-full shadow-[0_8px_22px_rgba(40,50,43,0.11)] rounded-[6px] overflow-hidden ${isPortrait ? 'max-w-[210px]' : 'max-w-[320px]'}`}>
                    <CR80Card student={sampleStudent} schoolSettings={schoolSettings} customization={{ templateId: template.id, orientation: template.orientation, side: 'front' }} />
                  </div>
                </button>
                <div className="p-5 flex flex-col flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[9px] uppercase tracking-[0.13em] text-[#8b9189] mb-1.5">{styleLabels[template.subCategory] || template.subCategory}</p>
                      <h3 className="font-semibold text-[16px] tracking-tight leading-tight text-[#293a32]">{template.name}</h3>
                    </div>
                    <div className="flex items-center gap-1 mt-1" aria-label="Template palette">
                      {[template.primaryColor, template.accentColor, template.surfaceColor].map((color, index) => <span key={index} className="w-3 h-3 rounded-full border border-black/10" style={{ backgroundColor: color }} />)}
                    </div>
                  </div>
                  <p className="text-xs text-[#7a817a] leading-relaxed mt-2 min-h-[40px]">{template.description}</p>
                  <div className="flex items-center justify-between gap-2 border-t border-[#eeeee9] pt-4 mt-4">
                    <div className="flex items-center gap-1">
                      <button onClick={() => { setPreviewTemplate(template); setPreviewSide('front'); }} className="flex items-center gap-1.5 py-1.5 pr-2 text-xs text-[#5e6d63] hover:text-[#263a2e]" aria-label={`Preview ${template.name}`}><Eye className="w-3.5 h-3.5" />Preview</button>
                      <button onClick={() => openEditor(template.id)} className="p-1.5 text-[#7a857b] hover:text-[#263a2e] rounded hover:bg-[#f1f3ee]" title={`Customize ${template.name}`} aria-label={`Customize ${template.name}`}><Sliders className="w-3.5 h-3.5" /></button>
                    </div>
                    <button onClick={() => onSetDefaultTemplate(template.id)} disabled={isCurrentDefault}
                      className={`flex items-center gap-1.5 px-3 py-2 text-[11px] font-medium rounded-md transition-colors ${isCurrentDefault ? 'bg-[#edf2e9] text-[#62765e]' : 'bg-[#34493d] text-white hover:bg-[#253a2e]'}`}>
                      {isCurrentDefault ? <><Check className="w-3 h-3" />Current default</> : <>Use design<ArrowUpRight className="w-3 h-3" /></>}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
        {!filteredTemplates.length && <div className="text-center text-sm text-[#7a817a] py-16 border border-dashed border-[#d7dcd3] rounded-xl">No designs match these filters. Choose another style or orientation.</div>}
      </div>

      {previewTemplate && (
        <div className="fixed inset-0 z-50 bg-[#19281f]/60 flex items-center justify-center p-4" onClick={() => setPreviewTemplate(null)}>
          <section role="dialog" aria-modal="true" aria-labelledby="template-preview-title" className="bg-[#fbfcf8] rounded-xl shadow-2xl border border-[#dce1d7] w-full max-w-xl max-h-[95vh] overflow-y-auto" onClick={(event) => event.stopPropagation()}>
            <div className="px-6 py-5 flex items-center justify-between border-b border-[#e1e4dc]">
              <div>
                <h3 id="template-preview-title" className="text-lg font-semibold tracking-tight text-[#2b3d30]">{previewTemplate.name}</h3>
                <p className="text-[11px] text-[#7a8377] mt-1">{previewTemplate.orientation === 'portrait' ? 'Portrait · 53.98 × 85.60 mm' : 'Landscape · 85.60 × 53.98 mm'} · CR80</p>
              </div>
              <button autoFocus onClick={() => setPreviewTemplate(null)} className="p-2 rounded-md text-[#8a9286] hover:text-[#34493d] hover:bg-[#edf1e8]" aria-label="Close preview"><X className="w-5 h-5" /></button>
            </div>
            <div className="px-8 py-7 bg-[#eeeee8] flex flex-col items-center justify-center">
              <div className={`w-full rounded-[7px] overflow-hidden shadow-[0_12px_32px_rgba(40,50,43,0.15)] ${previewTemplate.orientation === 'portrait' ? 'max-w-[260px]' : 'max-w-[440px]'}`}>
                <CR80Card student={sampleStudent} schoolSettings={schoolSettings} customization={{ templateId: previewTemplate.id, orientation: previewTemplate.orientation, side: previewSide }} />
              </div>
              <div className="mt-6 p-1 bg-white rounded-md flex gap-1 border border-[#dfe3d9]" aria-label="Card side">
                {(['front', 'back'] as const).map((side) => <button key={side} onClick={() => setPreviewSide(side)} aria-pressed={previewSide === side} className={`px-5 py-1.5 text-xs rounded ${previewSide === side ? 'bg-[#34493d] text-white' : 'text-[#727e6e] hover:bg-[#f0f3eb]'}`}>{side === 'front' ? 'Front' : 'Back'}</button>)}
              </div>
            </div>
            <div className="px-6 py-5 flex flex-wrap gap-3 items-center justify-between">
              <button onClick={() => openEditor(previewTemplate.id)} className="text-xs font-medium text-[#5b7159] hover:text-[#2b412c] flex items-center gap-2"><Sliders className="w-3.5 h-3.5" />Customize this design</button>
              <button onClick={() => { onSetDefaultTemplate(previewTemplate.id); setPreviewTemplate(null); }} className="flex items-center gap-2 px-4 py-2.5 text-xs font-medium text-white bg-[#34493d] hover:bg-[#263a2e] rounded-md"><Check className="w-3.5 h-3.5" />Use design</button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
};
