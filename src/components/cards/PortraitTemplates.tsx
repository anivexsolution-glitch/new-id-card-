import React from 'react';
import { CardRenderProps } from './CardShared';
import { PortraitTemplateId } from '../../types';
import {
  CardCanvas, CardCode, Details, getPalette, IdentityMeta, Logo, Photo,
  Signature, TextBlock,
} from './CardDesignSystem';

interface PortraitTemplateProps extends CardRenderProps {
  templateId: PortraitTemplateId;
}

export const RenderPortraitTemplate: React.FC<PortraitTemplateProps> = (props) => {
  const {
    student, schoolSettings, templateId, showLogo = true, showSignature = true,
    showBarcode = true, visibleFields, id, className = '',
  } = props;

  const cust = props.customization;
  const base = getPalette(templateId, schoolSettings);
  const ink = cust?.primaryColorOverride || props.primaryColorOverride || base.ink;
  const accent = cust?.accentColorOverride || props.accentColorOverride || base.accent;
  const paper = cust?.surfaceColorOverride || base.paper || '#ffffff';
  const textInk = cust?.textColorOverride || base.textInk;
  const muted = cust?.labelColorOverride || base.muted || '#475569';

  const logoVisible = showLogo && visibleFields.logo !== false;
  const signatureVisible = showSignature && visibleFields.principalSignature !== false;
  const sessionVisible = visibleFields.session !== false;

  // Custom dimensions & typography overrides (print-legible CR80 defaults)
  const schoolNameSize = cust?.schoolNameFontSize || 31;
  const studentNameSize = cust?.studentNameFontSize || 33;
  const customLogoSize = cust?.logoSize || 90;
  const customLogoShape = cust?.logoShape || 'circle';
  const customLogoBadgeStyle = cust?.logoBadgeStyle || 'gold-ring';
  const customSigWidth = cust?.signatureWidth || 144;
  const customSigHeight = cust?.signatureHeight || 62;
  const customSigTitle = cust?.signatureTitle || 'PRINCIPAL';
  const customPhotoW = cust?.photoWidth || 148;
  const customPhotoH = cust?.photoHeight || 160;
  const customPhotoR = cust?.photoRadius;

  // Reusable components
  const renderDetails = (y = 466, x = 36, width = 468, height = 228) => (
    <Details
      student={student}
      visibleFields={visibleFields}
      x={x}
      y={y}
      width={width}
      height={height}
      columns={1}
      fill={textInk}
      muted={muted}
      rule="#e2e8f0"
      customLabels={cust?.customLabels}
      labelFontSize={cust?.fieldLabelFontSize}
      valueFontSize={cust?.fieldValueFontSize}
    />
  );

  const renderQrAndSignature = (ruleColor = '#e2e8f0', sigColor = '#334155') => (
    <>
      <line x1="36" y1="698" x2="504" y2="698" stroke={ruleColor} strokeWidth="1" />
      <CardCode
        student={student}
        schoolSettings={schoolSettings}
        x={36}
        y={704}
        width={306}
        height={64}
        enabled={showBarcode}
      />
      {signatureVisible && (
        <Signature
          schoolSettings={schoolSettings}
          x={360}
          y={703}
          width={customSigWidth}
          height={customSigHeight}
          title={customSigTitle}
          fill={sigColor}
        />
      )}
    </>
  );

  // Clean light-surface footer (address + phone)
  const renderLightFooterInfo = (textColor = muted, yAddr = 776, yPhone = 816) => (
    <>
      {visibleFields.schoolAddress !== false && schoolSettings.address && (
        <TextBlock
          text={schoolSettings.address}
          x={28}
          y={yAddr}
          width={484}
          fontSize={cust?.addressFontSize || 15}
          lineHeight={1.12}
          maxLines={2}
          anchor="middle"
          fill={textColor}
          weight={600}
        />
      )}
      {visibleFields.schoolContact !== false && schoolSettings.contactNumber && (
        <TextBlock
          text={`Helpline: ${schoolSettings.contactNumber}`}
          x={28}
          y={yPhone}
          width={484}
          fontSize={16}
          maxLines={1}
          anchor="middle"
          fill={textColor}
          weight={800}
        />
      )}
    </>
  );

  // High-contrast dark/colored footer wave/band text (always crisp & legible)
  const renderColoredFooterBand = (bandColor = ink, trimColor = '#f59e0b', textColor = '#ffffff') => (
    <>
      <path d="M 0,776 Q 160,762 270,774 Q 390,786 540,770 L 540,856 L 0,856 Z" fill={bandColor} />
      <path d="M 0,776 Q 160,762 270,774 Q 390,786 540,770" stroke={trimColor} strokeWidth="2.5" fill="none" />
      {visibleFields.schoolAddress !== false && schoolSettings.address && (
        <TextBlock
          text={schoolSettings.address}
          x={26}
          y={786}
          width={488}
          fontSize={cust?.addressFontSize || 15}
          lineHeight={1.12}
          maxLines={2}
          anchor="middle"
          fill={textColor}
          weight={600}
        />
      )}
      {visibleFields.schoolContact !== false && schoolSettings.contactNumber && (
        <TextBlock
          text={schoolSettings.contactNumber}
          x={26}
          y={827}
          width={488}
          fontSize={16}
          maxLines={1}
          anchor="middle"
          fill={trimColor}
          weight={800}
        />
      )}
    </>
  );

  // Helper for Header Title + Session (never clips or overlaps on 1 or 2 line names)
  const renderHeaderTitle = (x: number, y: number, w: number, titleFill: string, sessionFill: string, family?: string) => (
    <>
      <TextBlock
        text={schoolSettings.schoolName}
        x={x}
        y={y}
        width={w}
        fontSize={schoolNameSize}
        lineHeight={1.08}
        maxLines={2}
        weight={800}
        role="heading"
        family={family}
        fill={titleFill}
      />
      {sessionVisible && (
        <TextBlock
          text={`SESSION ${student.session || schoolSettings.academicSession}`}
          x={x}
          y={y + (schoolSettings.schoolName.length > 18 ? 66 : 40)}
          width={w}
          fontSize={14}
          weight={800}
          letterSpacing={1.1}
          fill={sessionFill}
        />
      )}
    </>
  );

  // Template 1: Red & Magenta Curved Academic (Flagship Gold-Standard)
  const renderRedMagentaCurved = () => (
    <>
      <path d="M 0,0 L 540,0 L 540,144 Q 380,182 270,152 Q 140,122 0,166 Z" fill={accent} opacity="0.35" />
      <path d="M 0,0 L 540,0 L 540,134 Q 390,164 270,138 Q 120,112 0,154 Z" fill={ink} />
      <path d="M 0,156 Q 120,114 270,140 Q 390,166 540,136" stroke="#f59e0b" strokeWidth="3" fill="none" />

      {logoVisible && (
        <Logo schoolSettings={schoolSettings} x={24} y={14} size={customLogoSize} shape={customLogoShape} badgeStyle={customLogoBadgeStyle} ringColor="#f59e0b" />
      )}
      {renderHeaderTitle(logoVisible ? 24 + customLogoSize + 14 : 30, 16, logoVisible ? 486 - (customLogoSize + 14) : 480, '#ffffff', '#fef08a')}

      {/* Pill Badge */}
      <g transform="translate(130, 142)">
        <rect x="0" y="0" width="280" height="28" rx="14" fill={ink} stroke="#f59e0b" strokeWidth="2" />
        <TextBlock text="STUDENT IDENTITY CARD" x={0} y={5} width={280} fontSize={14} letterSpacing={1.5} weight={800} anchor="middle" fill="#ffffff" />
      </g>

      {/* Circular Photo with Gold Halo */}
      <circle cx="270" cy="264" r={(customPhotoW / 2) + 6} fill="none" stroke="#f59e0b" strokeWidth="3.5" />
      <Photo
        student={student}
        x={270 - (customPhotoW / 2)}
        y={264 - (customPhotoH / 2)}
        width={customPhotoW}
        height={customPhotoH}
        radius={customPhotoR !== undefined ? customPhotoR : 88}
        borderColor={ink}
      />

      {/* Student Nameplate */}
      <g transform="translate(36, 356)">
        <rect x="0" y="0" width="468" height="44" rx="8" fill={ink} />
        <TextBlock text={student.name} x={0} y={6} width={468} fontSize={studentNameSize} weight={800} role="heading" anchor="middle" fill="#ffffff" />
      </g>

      <IdentityMeta student={student} visibleFields={visibleFields} x={36} y={412} width={468} fill={ink} muted={muted} customLabels={cust?.customLabels} accentBg="#fff1f2" />
      {renderDetails(466, 36, 468, 228)}
      {renderQrAndSignature('#cbd5e1', '#334155')}
      {renderColoredFooterBand(ink, '#fde047', '#ffffff')}
    </>
  );

  // Template 2: Royal Navy & Imperial Gold
  const renderNavyGoldPremium = () => (
    <>
      <rect x="0" y="0" width="540" height="136" fill={ink} />
      <line x1="0" y1="136" x2="540" y2="136" stroke={accent} strokeWidth="5" />
      <line x1="36" y1="146" x2="504" y2="146" stroke={accent} strokeWidth="1" strokeDasharray="5 3" />

      {logoVisible && <Logo schoolSettings={schoolSettings} x={24} y={20} size={customLogoSize} shape={customLogoShape} badgeStyle={customLogoBadgeStyle} ringColor={accent} />}
      {renderHeaderTitle(logoVisible ? 24 + customLogoSize + 14 : 30, 22, logoVisible ? 486 - (customLogoSize + 14) : 480, '#ffffff', accent)}

      <rect x="140" y="156" width="260" height="26" rx="4" fill={accent} />
      <TextBlock text="OFFICIAL STUDENT PASS" x={140} y={161} width={260} fontSize={13.5} letterSpacing={1.6} weight={800} anchor="middle" fill="#0f172a" />

      <rect x={270 - (customPhotoW / 2) - 5} y={194 - 5} width={customPhotoW + 10} height={customPhotoH + 10} fill="none" stroke={accent} strokeWidth="2.5" rx="6" />
      <Photo student={student} x={270 - (customPhotoW / 2)} y={194} width={customPhotoW} height={customPhotoH} radius={customPhotoR ?? 4} borderColor={ink} />

      <TextBlock text={student.name} x={36} y={366} width={468} fontSize={studentNameSize} weight={800} role="heading" anchor="middle" fill={ink} />
      <line x1="150" y1="404" x2="390" y2="404" stroke={accent} strokeWidth="2" />

      <IdentityMeta student={student} visibleFields={visibleFields} x={36} y={414} width={468} fill={ink} muted={muted} customLabels={cust?.customLabels} accentBg="#f8fafc" />
      {renderDetails(466, 36, 468, 228)}
      {renderQrAndSignature('#cbd5e1', ink)}
      {renderColoredFooterBand(ink, accent, '#ffffff')}
    </>
  );

  // Template 3: Graphite Slate & Amber Flare
  const renderCharcoalOrangeGeom = () => (
    <>
      <polygon points="0,0 540,0 540,126 0,164" fill={ink} />
      <polygon points="0,164 540,126 540,138 0,176" fill={accent} />

      {logoVisible && <Logo schoolSettings={schoolSettings} x={24} y={18} size={customLogoSize} shape={customLogoShape} badgeStyle={customLogoBadgeStyle} ringColor={accent} />}
      {renderHeaderTitle(logoVisible ? 24 + customLogoSize + 14 : 30, 20, logoVisible ? 486 - (customLogoSize + 14) : 480, '#ffffff', accent)}

      <Photo student={student} x={36} y={194} width={150} height={174} radius={customPhotoR ?? 6} borderColor={accent} />

      <g transform="translate(204, 198)">
        <rect x="0" y="0" width="110" height="24" rx="4" fill={accent} />
        <TextBlock text="STUDENT" x={0} y={4} width={110} fontSize={13} weight={800} letterSpacing={1.4} anchor="middle" fill="#ffffff" />
        <TextBlock text={student.name} x={0} y={32} width={300} fontSize={studentNameSize > 28 ? 28 : studentNameSize} weight={800} role="heading" fill={ink} />
        <line x1="0" y1="88" x2="296" y2="88" stroke={accent} strokeWidth="2.5" />
        <IdentityMeta student={student} visibleFields={visibleFields} x={0} y={102} width={300} fill={ink} muted={muted} customLabels={cust?.customLabels} />
      </g>

      {renderDetails(394, 36, 468, 294)}
      {renderQrAndSignature('#cbd5e1', ink)}
      <polygon points="0,776 540,764 540,856 0,856" fill={ink} />
      <polygon points="0,776 540,764 540,769 0,781" fill={accent} />
      {visibleFields.schoolAddress !== false && schoolSettings.address && (
        <TextBlock text={schoolSettings.address} x={26} y={786} width={488} fontSize={cust?.addressFontSize || 15} lineHeight={1.12} maxLines={2} anchor="middle" fill="#ffffff" weight={600} />
      )}
      {visibleFields.schoolContact !== false && schoolSettings.contactNumber && (
        <TextBlock text={schoolSettings.contactNumber} x={26} y={827} width={488} fontSize={16} maxLines={1} anchor="middle" fill={accent} weight={800} />
      )}
    </>
  );

  // Template 4: Cobalt Sapphire Convent
  const renderRoyalBlueInst = () => (
    <>
      <path d="M 0,0 L 540,0 L 540,124 C 440,152 370,128 270,152 C 170,128 100,152 0,124 Z" fill={ink} />
      <path d="M 0,124 C 100,152 170,128 270,152 C 370,128 440,152 540,124" stroke={accent} strokeWidth="4" fill="none" />

      {logoVisible && <Logo schoolSettings={schoolSettings} x={24} y={14} size={customLogoSize} shape={customLogoShape} badgeStyle={customLogoBadgeStyle} ringColor={accent} />}
      {renderHeaderTitle(logoVisible ? 24 + customLogoSize + 14 : 30, 16, logoVisible ? 486 - (customLogoSize + 14) : 480, '#ffffff', '#fef08a')}

      <circle cx="270" cy="252" r={(customPhotoW / 2) + 6} fill="none" stroke={ink} strokeWidth="4" />
      <circle cx="270" cy="252" r={(customPhotoW / 2) + 2} fill="none" stroke={accent} strokeWidth="2" />
      <Photo student={student} x={270 - (customPhotoW / 2)} y={252 - (customPhotoH / 2)} width={customPhotoW} height={customPhotoH} radius={customPhotoR ?? 85} borderColor="transparent" />

      <TextBlock text={student.name} x={36} y={346} width={468} fontSize={studentNameSize} weight={800} role="heading" anchor="middle" fill={ink} />
      <rect x="160" y="384" width="220" height="23" rx="11.5" fill="#dbeafe" />
      <TextBlock text="STUDENT IDENTITY" x={160} y={388} width={220} fontSize={13} letterSpacing={1.5} weight={800} anchor="middle" fill={ink} />

      <IdentityMeta student={student} visibleFields={visibleFields} x={36} y={416} width={468} fill={ink} muted={muted} customLabels={cust?.customLabels} accentBg="#eff6ff" />
      {renderDetails(468, 36, 468, 226)}
      {renderQrAndSignature('#cbd5e1', ink)}
      {renderColoredFooterBand(ink, accent, '#ffffff')}
    </>
  );

  // Template 5: National Tricolour Sovereign
  const renderTricolourAccent = () => (
    <>
      <path d="M 0,0 L 540,0 L 540,104 Q 360,130 270,112 Q 140,94 0,124 Z" fill="#ff9933" />
      <path d="M 0,124 Q 140,94 270,112 Q 360,130 540,104 L 540,122 Q 360,146 270,128 Q 140,110 0,140 Z" fill="#ffffff" />
      <path d="M 0,140 Q 140,110 270,128 Q 360,146 540,122 L 540,144 Q 360,168 270,148 Q 140,128 0,158 Z" fill="#138808" />

      {logoVisible && <Logo schoolSettings={schoolSettings} x={24} y={14} size={customLogoSize} shape={customLogoShape} badgeStyle={customLogoBadgeStyle} ringColor="#0f2b5c" />}
      {renderHeaderTitle(logoVisible ? 24 + customLogoSize + 14 : 30, 14, logoVisible ? 486 - (customLogoSize + 14) : 480, '#0f2b5c', '#0f2b5c')}

      <rect x={270 - (customPhotoW / 2) - 4} y={178 - 4} width={customPhotoW + 8} height={customPhotoH + 8} rx="10" fill="none" stroke="#ff9933" strokeWidth="3" />
      <Photo student={student} x={270 - (customPhotoW / 2)} y={178} width={customPhotoW} height={customPhotoH} radius={customPhotoR ?? 8} borderColor="#138808" />

      <g transform="translate(36, 354)">
        <rect x="0" y="0" width="468" height="44" rx="6" fill="#0f2b5c" />
        <TextBlock text={student.name} x={0} y={6} width={468} fontSize={studentNameSize} weight={800} role="heading" anchor="middle" fill="#ffffff" />
      </g>

      <IdentityMeta student={student} visibleFields={visibleFields} x={36} y={410} width={468} fill="#0f2b5c" muted={muted} customLabels={cust?.customLabels} accentBg="#f8fafc" />
      {renderDetails(466, 36, 468, 228)}
      {renderQrAndSignature('#cbd5e1', '#0f2b5c')}
      {renderLightFooterInfo('#0f2b5c', 772, 811)}

      <rect x="0" y="838" width="540" height="6" fill="#ff9933" />
      <rect x="0" y="844" width="540" height="5" fill="#ffffff" />
      <rect x="0" y="849" width="540" height="7" fill="#138808" />
    </>
  );

  // Template 6: Emerald Pine & Gold Crest
  const renderEmeraldGreen = () => (
    <>
      <path d="M 0,0 L 540,0 L 540,134 Q 380,164 270,142 Q 120,120 0,152 Z" fill={ink} />
      <path d="M 0,152 Q 120,120 270,142 Q 380,164 540,134" stroke={accent} strokeWidth="4" fill="none" />

      {logoVisible && <Logo schoolSettings={schoolSettings} x={24} y={16} size={customLogoSize} shape={customLogoShape} badgeStyle={customLogoBadgeStyle} ringColor={accent} />}
      {renderHeaderTitle(logoVisible ? 24 + customLogoSize + 14 : 30, 18, logoVisible ? 486 - (customLogoSize + 14) : 480, '#ffffff', accent)}

      <rect x={270 - (customPhotoW / 2) - 4} y={180 - 4} width={customPhotoW + 8} height={customPhotoH + 8} rx="12" fill="none" stroke={accent} strokeWidth="3" />
      <Photo student={student} x={270 - (customPhotoW / 2)} y={180} width={customPhotoW} height={customPhotoH} radius={customPhotoR ?? 10} borderColor={ink} />

      <TextBlock text={student.name} x={36} y={358} width={468} fontSize={studentNameSize} weight={800} role="heading" anchor="middle" fill={ink} />
      <line x1="150" y1="398" x2="390" y2="398" stroke={accent} strokeWidth="2" />

      <IdentityMeta student={student} visibleFields={visibleFields} x={36} y={410} width={468} fill={ink} muted={muted} customLabels={cust?.customLabels} accentBg="#ecfdf5" />
      {renderDetails(466, 36, 468, 228)}
      {renderQrAndSignature('#cbd5e1', ink)}
      {renderColoredFooterBand(ink, accent, '#ffffff')}
    </>
  );

  // Template 7: Imperial Burgundy & Champagne
  const renderBurgundyIvory = () => (
    <>
      <rect x="14" y="14" width="512" height="828" fill="none" stroke={accent} strokeWidth="2" />
      <rect x="20" y="20" width="500" height="816" fill="none" stroke={ink} strokeWidth="1" />

      <rect x="21" y="21" width="498" height="122" fill={ink} />
      {logoVisible && <Logo schoolSettings={schoolSettings} x={30} y={30} size={customLogoSize} shape={customLogoShape} badgeStyle={customLogoBadgeStyle} ringColor={accent} />}
      {renderHeaderTitle(logoVisible ? 30 + customLogoSize + 14 : 34, 32, logoVisible ? 474 - (customLogoSize + 14) : 472, '#ffffff', accent, 'Playfair Display, Georgia, serif')}

      <Photo student={student} x={270 - (customPhotoW / 2)} y={166} width={customPhotoW} height={customPhotoH} radius={customPhotoR ?? 4} borderColor={accent} />

      <TextBlock text={student.name} x={36} y={346} width={468} fontSize={studentNameSize} weight={800} role="heading" family="Playfair Display, Georgia, serif" anchor="middle" fill={ink} />
      <line x1="170" y1="386" x2="370" y2="386" stroke={accent} strokeWidth="2" />

      <IdentityMeta student={student} visibleFields={visibleFields} x={36} y={398} width={468} fill={ink} muted={muted} customLabels={cust?.customLabels} accentBg="#fef2f2" />
      {renderDetails(458, 36, 468, 232)}
      {renderQrAndSignature('#e2e8f0', ink)}
      {renderLightFooterInfo(ink, 774, 810)}
    </>
  );

  // Template 8: Executive Pure White & Cyan
  const renderWhiteMinimal = () => (
    <>
      <rect x="0" y="0" width="540" height="12" fill={ink} />
      <rect x="0" y="12" width="540" height="4" fill={accent} />

      {logoVisible && <Logo schoolSettings={schoolSettings} x={28} y={24} size={customLogoSize} shape={customLogoShape} badgeStyle={customLogoBadgeStyle} ringColor={ink} />}
      {renderHeaderTitle(logoVisible ? 28 + customLogoSize + 14 : 32, 26, logoVisible ? 484 - (customLogoSize + 14) : 480, ink, '#0f172a')}

      <line x1="28" y1="126" x2="512" y2="126" stroke="#e2e8f0" strokeWidth="2" />

      <Photo student={student} x={34} y={142} width={150} height={175} radius={customPhotoR ?? 6} borderColor={ink} />
      <g transform="translate(202, 146)">
        <rect x="0" y="0" width="128" height="23" rx="4" fill="#e0f2fe" />
        <TextBlock text="STUDENT ID" x={0} y={4} width={128} fontSize={12.5} letterSpacing={1.4} weight={800} anchor="middle" fill={ink} />
        <TextBlock text={student.name} x={0} y={30} width={302} fontSize={studentNameSize > 28 ? 28 : studentNameSize} weight={800} role="heading" fill="#0f172a" />
        <line x1="0" y1="88" x2="296" y2="88" stroke={ink} strokeWidth="2.5" />
        <IdentityMeta student={student} visibleFields={visibleFields} x={0} y={102} width={302} fill="#0f172a" muted={muted} customLabels={cust?.customLabels} />
      </g>

      {renderDetails(348, 36, 468, 336)}
      {renderQrAndSignature('#e2e8f0', '#0f172a')}
      {renderLightFooterInfo('#334155', 776, 814)}
      <rect x="0" y="848" width="540" height="8" fill={ink} />
    </>
  );

  // Template 9: Scarlet Ruby & Pure White
  const renderRedWhiteModern = () => (
    <>
      <polygon points="0,0 540,0 540,148 0,114" fill={ink} />
      <polygon points="0,114 540,148 540,158 0,124" fill={accent} />

      {logoVisible && <Logo schoolSettings={schoolSettings} x={24} y={14} size={customLogoSize} shape={customLogoShape} badgeStyle={customLogoBadgeStyle} ringColor={accent} />}
      {renderHeaderTitle(logoVisible ? 24 + customLogoSize + 14 : 30, 16, logoVisible ? 486 - (customLogoSize + 14) : 480, '#ffffff', '#fee2e2')}

      <rect x={270 - (customPhotoW / 2) - 4} y={178 - 4} width={customPhotoW + 8} height={customPhotoH + 8} rx="12" fill="none" stroke={ink} strokeWidth="3" />
      <Photo student={student} x={270 - (customPhotoW / 2)} y={178} width={customPhotoW} height={customPhotoH} radius={customPhotoR ?? 10} borderColor={accent} />

      <g transform="translate(36, 356)">
        <rect x="0" y="0" width="468" height="44" rx="8" fill={ink} />
        <TextBlock text={student.name} x={0} y={6} width={468} fontSize={studentNameSize} weight={800} role="heading" anchor="middle" fill="#ffffff" />
      </g>

      <IdentityMeta student={student} visibleFields={visibleFields} x={36} y={412} width={468} fill={ink} muted={muted} customLabels={cust?.customLabels} accentBg="#fef2f2" />
      {renderDetails(466, 36, 468, 228)}
      {renderQrAndSignature('#cbd5e1', ink)}
      {renderColoredFooterBand(ink, '#ffffff', '#ffffff')}
    </>
  );

  // Template 10: Midnight Obsidian & Gold
  const renderDarkPremiumGeom = () => (
    <>
      <polygon points="0,0 540,0 540,134 270,158 0,134" fill={ink} />
      <polygon points="0,134 270,158 540,134 540,140 270,164 0,140" fill={accent} />

      {logoVisible && <Logo schoolSettings={schoolSettings} x={24} y={16} size={customLogoSize} shape={customLogoShape} badgeStyle={customLogoBadgeStyle} ringColor={accent} />}
      {renderHeaderTitle(logoVisible ? 24 + customLogoSize + 14 : 30, 18, logoVisible ? 486 - (customLogoSize + 14) : 480, '#ffffff', accent)}

      <rect x={270 - (customPhotoW / 2) - 4} y={178 - 4} width={customPhotoW + 8} height={customPhotoH + 8} rx="8" fill="none" stroke={accent} strokeWidth="3" />
      <Photo student={student} x={270 - (customPhotoW / 2)} y={178} width={customPhotoW} height={customPhotoH} radius={customPhotoR ?? 6} borderColor={ink} />

      <g transform="translate(36, 356)">
        <rect x="0" y="0" width="468" height="44" rx="6" fill={ink} stroke={accent} strokeWidth="1.5" />
        <TextBlock text={student.name} x={0} y={6} width={468} fontSize={studentNameSize} weight={800} role="heading" anchor="middle" fill="#ffffff" />
      </g>

      <IdentityMeta student={student} visibleFields={visibleFields} x={36} y={412} width={468} fill={ink} muted={muted} customLabels={cust?.customLabels} accentBg="#f8fafc" />
      {renderDetails(466, 36, 468, 228)}
      {renderQrAndSignature('#cbd5e1', ink)}
      {renderColoredFooterBand(ink, accent, '#ffffff')}
    </>
  );

  // Template 11: Azure Wave & Sky Cyan
  const renderBlueDiagonal = () => (
    <>
      <path d="M 0,0 L 540,0 L 540,134 Q 360,170 200,128 L 0,162 Z" fill={ink} />
      <path d="M 0,162 L 200,128 Q 360,170 540,134 L 540,148 Q 360,184 200,142 L 0,176 Z" fill={accent} />

      {logoVisible && <Logo schoolSettings={schoolSettings} x={24} y={14} size={customLogoSize} shape={customLogoShape} badgeStyle={customLogoBadgeStyle} ringColor={accent} />}
      {renderHeaderTitle(logoVisible ? 24 + customLogoSize + 14 : 30, 16, logoVisible ? 486 - (customLogoSize + 14) : 480, '#ffffff', '#bae6fd')}

      <circle cx="270" cy="260" r={(customPhotoW / 2) + 5} fill="none" stroke={accent} strokeWidth="3.5" />
      <Photo student={student} x={270 - (customPhotoW / 2)} y={260 - (customPhotoH / 2)} width={customPhotoW} height={customPhotoH} radius={customPhotoR ?? 85} borderColor={ink} />

      <g transform="translate(36, 356)">
        <rect x="0" y="0" width="468" height="44" rx="8" fill={ink} />
        <TextBlock text={student.name} x={0} y={6} width={468} fontSize={studentNameSize} weight={800} role="heading" anchor="middle" fill="#ffffff" />
      </g>

      <IdentityMeta student={student} visibleFields={visibleFields} x={36} y={412} width={468} fill={ink} muted={muted} customLabels={cust?.customLabels} accentBg="#eff6ff" />
      {renderDetails(466, 36, 468, 228)}
      {renderQrAndSignature('#cbd5e1', ink)}
      {renderColoredFooterBand(ink, '#67e8f9', '#ffffff')}
    </>
  );

  // Template 12: Classic Collegiate Heritage
  const renderSchoolCrest = () => (
    <>
      <rect x="14" y="14" width="512" height="828" fill="none" stroke={ink} strokeWidth="2.5" />
      <rect x="20" y="20" width="500" height="816" fill="none" stroke={accent} strokeWidth="1" />

      {logoVisible && <Logo schoolSettings={schoolSettings} x={270 - (Math.min(customLogoSize, 90) / 2)} y={24} size={Math.min(customLogoSize, 90)} shape={customLogoShape} badgeStyle={customLogoBadgeStyle} ringColor={accent} />}
      <TextBlock
        text={schoolSettings.schoolName}
        x={32}
        y={24 + Math.min(customLogoSize, 90) + 6}
        width={476}
        fontSize={schoolNameSize > 28 ? 28 : schoolNameSize}
        weight={800}
        role="heading"
        family="Cinzel, Georgia, serif"
        anchor="middle"
        fill={ink}
      />
      {sessionVisible && (
        <TextBlock
          text={`STUDENT IDENTITY • SESSION ${student.session || schoolSettings.academicSession}`}
          x={32}
          y={24 + Math.min(customLogoSize, 90) + 42}
          width={476}
          fontSize={13}
          letterSpacing={1.1}
          weight={800}
          anchor="middle"
          fill={accent}
        />
      )}

      <line x1="60" y1="180" x2="480" y2="180" stroke={accent} strokeWidth="1.5" />

      <rect x={270 - (customPhotoW / 2) - 4} y={192 - 4} width={customPhotoW + 8} height={(customPhotoH - 10) + 8} fill="none" stroke={accent} strokeWidth="2" />
      <Photo student={student} x={270 - (customPhotoW / 2)} y={192} width={customPhotoW} height={customPhotoH - 10} radius={customPhotoR ?? 2} borderColor={ink} />

      <TextBlock text={student.name} x={36} y={356} width={468} fontSize={studentNameSize} weight={800} role="heading" family="Playfair Display, Georgia, serif" anchor="middle" fill={ink} />
      <IdentityMeta student={student} visibleFields={visibleFields} x={36} y={404} width={468} fill={ink} muted={muted} customLabels={cust?.customLabels} accentBg="#fefce8" />
      {renderDetails(462, 36, 468, 230)}
      {renderQrAndSignature('#cbd5e1', ink)}
      {renderLightFooterInfo(ink, 774, 810)}
    </>
  );

  // Template 13: Montessori Sunshine & Teal
  const renderColorfulPrimary = () => (
    <>
      <path d="M 0,0 L 540,0 L 540,128 Q 420,156 300,136 Q 150,116 0,148 Z" fill={ink} />
      <path d="M 0,148 Q 150,116 300,136 Q 420,156 540,128 L 540,142 Q 420,170 300,150 Q 150,130 0,162 Z" fill={accent} />

      {logoVisible && <Logo schoolSettings={schoolSettings} x={24} y={14} size={customLogoSize} shape={customLogoShape} badgeStyle={customLogoBadgeStyle} ringColor={accent} />}
      {renderHeaderTitle(logoVisible ? 24 + customLogoSize + 14 : 30, 16, logoVisible ? 486 - (customLogoSize + 14) : 480, '#ffffff', '#fef08a')}

      <rect x={270 - (customPhotoW / 2) - 5} y={178 - 5} width={customPhotoW + 10} height={customPhotoH + 10} rx="24" fill="none" stroke={accent} strokeWidth="4" />
      <Photo student={student} x={270 - (customPhotoW / 2)} y={178} width={customPhotoW} height={customPhotoH} radius={customPhotoR ?? 20} borderColor={ink} />

      <g transform="translate(36, 356)">
        <rect x="0" y="0" width="468" height="44" rx="22" fill={ink} />
        <TextBlock text={student.name} x={0} y={6} width={468} fontSize={studentNameSize} weight={800} role="heading" anchor="middle" fill="#ffffff" />
      </g>

      <IdentityMeta student={student} visibleFields={visibleFields} x={36} y={412} width={468} fill={ink} muted={muted} customLabels={cust?.customLabels} accentBg="#f0fdfa" />
      {renderDetails(466, 36, 468, 228)}
      {renderQrAndSignature('#cbd5e1', ink)}
      {renderColoredFooterBand(ink, '#fde047', '#ffffff')}
    </>
  );

  // Template 14: Presidential Jet Black & 24K Gold
  const renderBlackGold = () => (
    <>
      <rect x="0" y="0" width="540" height="136" fill={ink} />
      <line x1="0" y1="136" x2="540" y2="136" stroke={accent} strokeWidth="5" />
      <line x1="36" y1="146" x2="504" y2="146" stroke={accent} strokeWidth="1" />

      {logoVisible && <Logo schoolSettings={schoolSettings} x={24} y={20} size={customLogoSize} shape={customLogoShape} badgeStyle={customLogoBadgeStyle} ringColor={accent} />}
      {renderHeaderTitle(logoVisible ? 24 + customLogoSize + 14 : 30, 22, logoVisible ? 486 - (customLogoSize + 14) : 480, '#ffffff', accent)}

      <rect x={270 - (customPhotoW / 2) - 4} y={176 - 4} width={customPhotoW + 8} height={customPhotoH + 8} rx="6" fill="none" stroke={accent} strokeWidth="3" />
      <Photo student={student} x={270 - (customPhotoW / 2)} y={176} width={customPhotoW} height={customPhotoH} radius={customPhotoR ?? 4} borderColor={ink} />

      <g transform="translate(36, 356)">
        <rect x="0" y="0" width="468" height="44" rx="4" fill={ink} stroke={accent} strokeWidth="1.5" />
        <TextBlock text={student.name} x={0} y={6} width={468} fontSize={studentNameSize} weight={800} role="heading" anchor="middle" fill={accent} />
      </g>

      <IdentityMeta student={student} visibleFields={visibleFields} x={36} y={412} width={468} fill={ink} muted={muted} customLabels={cust?.customLabels} accentBg="#fefce8" />
      {renderDetails(466, 36, 468, 228)}
      {renderQrAndSignature('#cbd5e1', ink)}
      {renderColoredFooterBand(ink, accent, '#ffffff')}
    </>
  );

  // Template 15: Royal Amethyst & Honey Amber
  const renderModernCurved = () => (
    <>
      <path d="M 0,0 L 540,0 L 540,136 Q 400,172 270,142 Q 120,112 0,154 Z" fill={ink} />
      <path d="M 0,154 Q 120,112 270,142 Q 400,172 540,136" stroke={accent} strokeWidth="4" fill="none" />

      {logoVisible && <Logo schoolSettings={schoolSettings} x={24} y={14} size={customLogoSize} shape={customLogoShape} badgeStyle={customLogoBadgeStyle} ringColor={accent} />}
      {renderHeaderTitle(logoVisible ? 24 + customLogoSize + 14 : 30, 16, logoVisible ? 486 - (customLogoSize + 14) : 480, '#ffffff', accent)}

      <circle cx="270" cy="260" r={(customPhotoW / 2) + 6} fill="none" stroke={ink} strokeWidth="3" />
      <circle cx="270" cy="260" r={(customPhotoW / 2) + 2} fill="none" stroke={accent} strokeWidth="2.5" />
      <Photo student={student} x={270 - (customPhotoW / 2)} y={260 - (customPhotoH / 2)} width={customPhotoW} height={customPhotoH} radius={customPhotoR ?? 85} borderColor="transparent" />

      <g transform="translate(36, 356)">
        <rect x="0" y="0" width="468" height="44" rx="8" fill={ink} />
        <TextBlock text={student.name} x={0} y={6} width={468} fontSize={studentNameSize} weight={800} role="heading" anchor="middle" fill="#ffffff" />
      </g>

      <IdentityMeta student={student} visibleFields={visibleFields} x={36} y={412} width={468} fill={ink} muted={muted} customLabels={cust?.customLabels} accentBg="#faf5ff" />
      {renderDetails(466, 36, 468, 228)}
      {renderQrAndSignature('#cbd5e1', ink)}
      {renderColoredFooterBand(ink, accent, '#ffffff')}
    </>
  );

  const renderContent = () => {
    switch (templateId) {
      case 'portrait_red_magenta_curved':
        return renderRedMagentaCurved();
      case 'portrait_navy_gold_premium':
        return renderNavyGoldPremium();
      case 'portrait_charcoal_orange_geom':
        return renderCharcoalOrangeGeom();
      case 'portrait_royal_blue_inst':
        return renderRoyalBlueInst();
      case 'portrait_tricolour_accent':
        return renderTricolourAccent();
      case 'portrait_emerald_green':
        return renderEmeraldGreen();
      case 'portrait_burgundy_ivory':
        return renderBurgundyIvory();
      case 'portrait_white_minimal':
        return renderWhiteMinimal();
      case 'portrait_red_white_modern':
        return renderRedWhiteModern();
      case 'portrait_dark_premium_geom':
        return renderDarkPremiumGeom();
      case 'portrait_blue_diagonal':
        return renderBlueDiagonal();
      case 'portrait_school_crest':
        return renderSchoolCrest();
      case 'portrait_colorful_primary':
        return renderColorfulPrimary();
      case 'portrait_black_gold':
        return renderBlackGold();
      case 'portrait_modern_curved':
        return renderModernCurved();
      default:
        return renderRedMagentaCurved();
    }
  };

  return (
    <CardCanvas
      orientation="portrait"
      id={id}
      className={className}
      label={`Student identity card for ${student.name}`}
      surfaceColor={paper}
      watermarkUrl={schoolSettings.logoUrl}
      watermarkEnabled={cust?.watermarkEnabled ?? true}
      watermarkOpacity={cust?.watermarkOpacity ?? 0.08}
      watermarkSize={cust?.watermarkSize ?? 280}
      bodyFont={cust?.fontFamily}
      headingFont={cust?.headingFontFamily}
    >
      {renderContent()}
    </CardCanvas>
  );
};
