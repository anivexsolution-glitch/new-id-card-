import { CardCustomization, SchoolSettings, Student, TemplateId } from '../../types';
import { CardCanvas, TextBlock, Logo, Signature, CardCode, getPalette } from './CardDesignSystem';

export interface CardRenderProps {
  student: Student;
  schoolSettings: SchoolSettings;
  showLogo?: boolean;
  showSignature?: boolean;
  showBarcode?: boolean;
  visibleFields: SchoolSettings['visibleFields'];
  primaryColorOverride?: string;
  accentColorOverride?: string;
  customization?: Partial<CardCustomization>;
  id?: string;
  className?: string;
}

// HTML equivalents used by the student verification screen.
export const StudentPhoto: React.FC<{ student: Student; className?: string; borderClass?: string }> = ({ student, className = 'w-16 h-20', borderClass = 'border border-slate-200' }) => {
  const crop = student.photoCrop || { zoom: 1, x: 0, y: 0 };
  return <div className={`relative overflow-hidden bg-slate-100 flex items-center justify-center shrink-0 ${borderClass} ${className}`}>
    {student.photoUrl ? <img src={student.photoUrl} alt={student.name} className="w-full h-full object-cover" style={{ transform: `scale(${crop.zoom || 1}) translate(${crop.x || 0}%, ${crop.y || 0}%)` }} /> : <span className="text-xs text-slate-400">Photo</span>}
  </div>;
};
export const SchoolLogo: React.FC<{ schoolSettings: SchoolSettings; className?: string }> = ({ schoolSettings, className = 'w-9 h-9' }) => <div className={`shrink-0 bg-white flex items-center justify-center ${className}`}>
  {schoolSettings.logoUrl ? <img src={schoolSettings.logoUrl} alt={schoolSettings.schoolName} className="max-w-full max-h-full object-contain" /> : <span className="font-serif text-sm">SCH</span>}
</div>;

export const CardBackSide: React.FC<CardRenderProps & { orientation: 'portrait' | 'landscape'; templateId: TemplateId }> = ({ student, schoolSettings, orientation, templateId, visibleFields, showLogo = true, showSignature = true, showBarcode = false, customization, id, className }) => {
  const p = getPalette(templateId, schoolSettings);
  const cust = customization;
  const ink = cust?.primaryColorOverride || p.ink;
  const accent = cust?.accentColorOverride || p.accent;
  const paper = cust?.surfaceColorOverride || p.paper;
  const textInk = cust?.textColorOverride || p.textInk;
  const muted = cust?.labelColorOverride || p.muted;
  const logoShape = cust?.logoShape || 'circle';
  const logoBadgeStyle = cust?.logoBadgeStyle || 'white';

  const portrait = orientation === 'portrait';
  const w = portrait ? 540 : 856, h = portrait ? 856 : 540;
  const inset = 36, content = w - inset * 2;
  const backLogoSize = Math.min(Math.max(cust?.logoSize ? Math.round(cust.logoSize * 0.9) : (portrait ? 82 : 76), 68), 88);
  const titleOffset = showLogo ? backLogoSize + 16 : 0;
  const instructions = [
    'Carry this card during school hours and school transport.',
    'This card is non-transferable and remains school property.',
    'Report a lost card to the school office.',
    'If found, please return this card to the school.'
  ];
  const bodyY = portrait ? 174 : 162;
  const bodyStep = portrait ? 58 : 54;
  const bodyW = portrait ? content : 444;
  const contactX = portrait ? inset : 524;
  const contactY = portrait ? 434 : 162;
  const contactW = portrait ? content : 296;
  return (
    <CardCanvas
      orientation={orientation}
      id={id}
      className={className}
      label={`${schoolSettings.schoolName} — ${student.name}, reverse`}
      surfaceColor={paper}
      watermarkUrl={schoolSettings.logoUrl}
      watermarkEnabled={cust?.watermarkEnabled ?? true}
      watermarkOpacity={cust?.watermarkOpacity ?? 0.08}
      watermarkSize={cust?.watermarkSize ?? 280}
      bodyFont={cust?.fontFamily}
      headingFont={cust?.headingFontFamily}
    >
      <rect width={w} height={10} fill={ink} />
      {showLogo && <Logo schoolSettings={schoolSettings} x={inset} y={24} size={backLogoSize} shape={logoShape} badgeStyle={logoBadgeStyle} ringColor={accent} />}
      <TextBlock text={schoolSettings.schoolName} x={inset + titleOffset} y={30} width={content - titleOffset} fontSize={cust?.schoolNameFontSize ? Math.min(cust.schoolNameFontSize, 34) : (portrait ? 30 : 32)} lineHeight={1.08} weight={700} role="heading" fill={textInk} maxLines={2} />
      <TextBlock text="CARDHOLDER INFORMATION" x={inset} y={portrait ? 124 : 114} width={content} fontSize={14.5} weight={700} letterSpacing={2.2} fill={muted} maxLines={1} />
      <line x1={inset} x2={w - inset} y1={portrait ? 152 : 142} y2={portrait ? 152 : 142} stroke={accent} strokeWidth={2} />
      {instructions.map((instruction, index) => <g key={instruction}>
        <TextBlock text={`0${index + 1}`} x={inset} y={bodyY + index * bodyStep} width={34} fontSize={16} fill={textInk} weight={700} />
        <TextBlock text={instruction} x={inset + 44} y={bodyY + index * bodyStep} width={bodyW - 44} fontSize={19.5} lineHeight={1.15} weight={500} maxLines={2} fill="#2d3733" />
      </g>)}
      <TextBlock text="SCHOOL OFFICE" x={contactX} y={contactY} width={contactW} fontSize={14} fill={textInk} weight={700} letterSpacing={1.4} />
      {visibleFields.schoolContact !== false && <TextBlock text={schoolSettings.contactNumber} x={contactX} y={contactY + 24} width={contactW} fontSize={24} weight={700} maxLines={1} fill={textInk} />}
      {visibleFields.schoolAddress !== false && <TextBlock text={schoolSettings.address} x={contactX} y={contactY + 58} width={contactW} fontSize={19.5} lineHeight={1.15} weight={500} maxLines={3} fill="#3d4943" />}
      {visibleFields.contactNumber !== false && <>
        <TextBlock text="EMERGENCY CONTACT" x={contactX} y={contactY + 144} width={contactW} fontSize={14} weight={700} letterSpacing={1.2} fill={muted} />
        <TextBlock text={student.emergencyContact || student.contactNumber} x={contactX} y={contactY + 168} width={contactW} fontSize={23} weight={700} fill={textInk} maxLines={1} />
      </>}
      <line x1={inset} x2={w - inset} y1={h - 140} y2={h - 140} stroke="#ccd3cb" />
      <CardCode student={student} schoolSettings={schoolSettings} x={inset} y={h - 126} width={portrait ? 290 : 350} height={72} enabled={showBarcode} />
      {showSignature && <Signature schoolSettings={schoolSettings} x={w - 184} y={h - 122} width={cust?.signatureWidth || 144} height={cust?.signatureHeight || 62} title={cust?.signatureTitle || 'PRINCIPAL'} fill={ink} />}
      <rect x={0} y={h - 34} width={w} height={34} fill={ink} />
      <TextBlock text={visibleFields.session !== false ? `ACADEMIC SESSION  ${student.session || schoolSettings.academicSession}` : 'STUDENT IDENTITY CARD'} x={inset} y={h - 24} width={content} fontSize={14} weight={700} fill={p.onInk} letterSpacing={1.4} maxLines={1} />
    </CardCanvas>
  );
};

