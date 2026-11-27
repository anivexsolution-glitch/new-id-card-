import React from 'react';
import { CardRenderProps } from './CardShared';
import { LandscapeTemplateId } from '../../types';
import {
  CardCanvas, CardCode, Details, IdentityMeta, Logo, Photo, Signature, TextBlock, getPalette,
} from './CardDesignSystem';

interface LandscapeTemplateProps extends CardRenderProps {
  templateId: LandscapeTemplateId;
}

export const RenderLandscapeTemplate: React.FC<LandscapeTemplateProps> = ({
  student, schoolSettings, templateId, visibleFields,
  showLogo = true, showSignature = true, showBarcode = true,
  primaryColorOverride, accentColorOverride, customization, id, className = '',
}) => {
  const cust = customization;
  const palette = getPalette(templateId, schoolSettings);
  const ink = cust?.primaryColorOverride || primaryColorOverride || palette.ink;
  const accent = cust?.accentColorOverride || accentColorOverride || palette.accent;
  const paper = cust?.surfaceColorOverride || palette.paper || '#ffffff';
  const muted = cust?.labelColorOverride || palette.muted || '#475569';
  const bodyInk = cust?.textColorOverride || '#1e293b';

  const logoVisible = showLogo && visibleFields.logo !== false;
  const signatureVisible = showSignature && visibleFields.principalSignature !== false;
  const sessionVisible = visibleFields.session !== false;

  const schoolNameSize = cust?.schoolNameFontSize || 29;
  const studentNameSize = cust?.studentNameFontSize || 30;
  const customLogoSize = cust?.logoSize || 80;
  const customLogoShape = cust?.logoShape || 'circle';
  const customLogoBadgeStyle = cust?.logoBadgeStyle || 'gold-ring';
  const customSigWidth = cust?.signatureWidth || 144;
  const customSigHeight = cust?.signatureHeight || 60;
  const customSigTitle = cust?.signatureTitle || 'PRINCIPAL';
  const customPhotoW = cust?.photoWidth || 160;
  const customPhotoH = cust?.photoHeight || 184;
  const customPhotoR = cust?.photoRadius;

  const renderDetails2Col = (x = 222, y = 224, width = 602, height = 188) => (
    <Details
      student={student}
      visibleFields={visibleFields}
      x={x}
      y={y}
      width={width}
      height={height}
      columns={2}
      fill={bodyInk}
      muted={muted}
      rule="#e2e8f0"
      customLabels={cust?.customLabels}
      labelFontSize={cust?.fieldLabelFontSize}
      valueFontSize={cust?.fieldValueFontSize}
    />
  );

  const renderFooterRow = (xCode = 222, xSig = 670, y = 418, sigColor = muted) => (
    <>
      <CardCode
        student={student}
        schoolSettings={schoolSettings}
        x={xCode}
        y={y}
        width={310}
        height={62}
        enabled={showBarcode}
      />
      {signatureVisible && (
        <Signature
          schoolSettings={schoolSettings}
          x={xSig}
          y={y - 2}
          width={customSigWidth}
          height={customSigHeight}
          title={customSigTitle}
          fill={sigColor}
        />
      )}
    </>
  );

  const renderBottomBar = (bgColor = ink, trimColor = accent, textColor = '#ffffff') => {
    const infoParts = [
      visibleFields.schoolAddress !== false ? schoolSettings.address : '',
      visibleFields.schoolContact !== false ? schoolSettings.contactNumber : '',
    ].filter(Boolean);
    const infoText = infoParts.join('  •  ');
    return (
      <>
        <rect x="0" y="492" width="856" height="48" fill={bgColor} />
        <line x1="0" y1="492" x2="856" y2="492" stroke={trimColor} strokeWidth="2.5" />
        {infoText && (
          <TextBlock
            text={infoText}
            x={26}
            y={506}
            width={804}
            fontSize={cust?.addressFontSize || 15}
            maxLines={1}
            anchor="middle"
            fill={textColor}
            weight={700}
          />
        )}
      </>
    );
  };

  // Template 1: Crimson & Magenta Curved Horizon
  const renderRedCurvedSchool = () => (
    <>
      <path d="M 0,0 L 856,0 L 856,104 Q 600,132 400,108 Q 200,84 0,122 Z" fill={accent} opacity="0.35" />
      <path d="M 0,0 L 856,0 L 856,96 Q 600,124 400,100 Q 200,76 0,114 Z" fill={ink} />
      <path d="M 0,116 Q 200,78 400,102 Q 600,126 856,98" stroke="#f59e0b" strokeWidth="3" fill="none" />

      {logoVisible && <Logo schoolSettings={schoolSettings} x={28} y={12} size={customLogoSize} shape={customLogoShape} badgeStyle={customLogoBadgeStyle} ringColor="#f59e0b" />}
      <TextBlock text={schoolSettings.schoolName} x={logoVisible ? 28 + customLogoSize + 16 : 30} y={14} width={logoVisible ? 792 - (customLogoSize + 16) : 796} fontSize={schoolNameSize} weight={800} role="heading" fill="#ffffff" maxLines={1} />
      {sessionVisible && (
        <TextBlock
          text={`SESSION ${schoolSettings.academicSession || student.session}  •  STUDENT IDENTITY CARD`}
          x={logoVisible ? 28 + customLogoSize + 16 : 30}
          y={54}
          width={620}
          fontSize={14}
          letterSpacing={1.0}
          weight={800}
          fill="#fef08a"
        />
      )}

      <rect x={32 - 4} y={136 - 4} width={customPhotoW + 8} height={customPhotoH + 8} rx="12" fill="none" stroke="#f59e0b" strokeWidth="3" />
      <Photo student={student} x={32} y={136} width={customPhotoW} height={customPhotoH} radius={customPhotoR ?? 10} borderColor={ink} />

      {/* Session / Status chip below photo */}
      <rect x={32} y={136 + customPhotoH + 14} width={customPhotoW} height="30" rx="6" fill="#fff1f2" stroke={ink} strokeWidth="1.2" />
      <TextBlock text={student.idCardNumber || student.id} x={32} y={136 + customPhotoH + 20} width={customPhotoW} fontSize={14} weight={800} anchor="middle" fill={ink} maxLines={1} />

      <g transform="translate(220, 126)">
        <rect x="0" y="0" width="606" height="42" rx="6" fill={ink} />
        <TextBlock text={student.name} x={16} y={7} width={574} fontSize={studentNameSize} weight={800} role="heading" fill="#ffffff" />
      </g>

      <IdentityMeta student={student} visibleFields={visibleFields} x={220} y={178} width={606} fill={ink} muted={muted} customLabels={cust?.customLabels} accentBg="#fff1f2" />
      {renderDetails2Col(220, 228, 606, 186)}
      {renderFooterRow(220, 675, 418, '#334155')}
      {renderBottomBar(ink, '#fde047', '#ffffff')}
    </>
  );

  // Template 2: Royal Navy & Gold Institutional
  const renderNavyGoldInst = () => {
    const sideLogoSize = Math.min(customLogoSize, 86);
    const sidePhotoY = logoVisible ? Math.max(114, 18 + sideLogoSize + 12) : 34;
    return (
      <>
        <rect x="0" y="0" width="214" height="540" fill={ink} />
        <line x1="214" y1="0" x2="214" y2="540" stroke={accent} strokeWidth="4" />

        <rect x="214" y="0" width="642" height="92" fill="#f8fafc" />
        <line x1="214" y1="92" x2="856" y2="92" stroke={accent} strokeWidth="2" />

        {logoVisible && <Logo schoolSettings={schoolSettings} x={107 - (sideLogoSize / 2)} y={18} size={sideLogoSize} shape={customLogoShape} badgeStyle={customLogoBadgeStyle} ringColor={accent} />}
        <Photo student={student} x={107 - (customPhotoW / 2)} y={sidePhotoY} width={customPhotoW} height={customPhotoH} radius={customPhotoR ?? 6} borderColor={accent} />

        <rect x="24" y={sidePhotoY + customPhotoH + 16} width="166" height="30" rx="4" fill={accent} />
        <TextBlock text="STUDENT CARD" x={24} y={sidePhotoY + customPhotoH + 22} width={166} fontSize={13.5} weight={800} letterSpacing={1.2} anchor="middle" fill="#0f172a" />
        {sessionVisible && (
          <TextBlock text={`SESSION ${schoolSettings.academicSession || student.session}`} x={24} y={sidePhotoY + customPhotoH + 56} width={166} fontSize={13.5} weight={700} anchor="middle" fill="#e2e8f0" />
        )}

      <TextBlock text={schoolSettings.schoolName} x={238} y={14} width={592} fontSize={schoolNameSize} weight={800} role="heading" fill={ink} maxLines={1} />
      {visibleFields.schoolAddress !== false && schoolSettings.address && (
        <TextBlock text={`${schoolSettings.address}${schoolSettings.contactNumber ? ` • ${schoolSettings.contactNumber}` : ''}`} x={238} y={54} width={592} fontSize={14.5} maxLines={1} fill={muted} weight={600} />
      )}

      <TextBlock text={student.name} x={238} y={104} width={592} fontSize={studentNameSize} weight={800} role="heading" fill={ink} />
      <line x1="238" y1="144" x2="830" y2="144" stroke={accent} strokeWidth="1.5" />

      <IdentityMeta student={student} visibleFields={visibleFields} x={238} y={154} width={592} fill={ink} muted={muted} customLabels={cust?.customLabels} accentBg="#f8fafc" />
      {renderDetails2Col(238, 212, 592, 198)}
      {renderFooterRow(238, 675, 424, ink)}
      <rect x="214" y="528" width="642" height="12" fill={ink} />
    </>
    );
  };

  // Template 3: Graphite Slate & Amber Horizon
  const renderCharcoalOrange = () => (
    <>
      <polygon points="0,0 856,0 856,86 0,114" fill={ink} />
      <polygon points="0,114 856,86 856,94 0,122" fill={accent} />

      {logoVisible && <Logo schoolSettings={schoolSettings} x={28} y={12} size={customLogoSize} shape={customLogoShape} badgeStyle={customLogoBadgeStyle} ringColor={accent} />}
      <TextBlock text={schoolSettings.schoolName} x={logoVisible ? 28 + customLogoSize + 16 : 30} y={14} width={logoVisible ? 792 - (customLogoSize + 16) : 796} fontSize={schoolNameSize} weight={800} role="heading" fill="#ffffff" maxLines={1} />
      {sessionVisible && (
        <TextBlock text={`ACADEMIC SESSION: ${schoolSettings.academicSession || student.session}`} x={logoVisible ? 28 + customLogoSize + 16 : 30} y={54} width={560} fontSize={14} weight={800} fill={accent} />
      )}

      <Photo student={student} x={32} y={136} width={customPhotoW} height={customPhotoH} radius={customPhotoR ?? 6} borderColor={accent} />

      <g transform="translate(220, 126)">
        <TextBlock text={student.name} x={0} y={0} width={606} fontSize={studentNameSize} weight={800} role="heading" fill={ink} />
        <line x1="0" y1="38" x2="606" y2="38" stroke={accent} strokeWidth="2.5" />
        <IdentityMeta student={student} visibleFields={visibleFields} x={0} y={50} width={606} fill={ink} muted={muted} customLabels={cust?.customLabels} accentBg="#fff7ed" />
      </g>

      {renderDetails2Col(220, 228, 606, 186)}
      {renderFooterRow(220, 675, 418, ink)}
      {renderBottomBar(ink, accent, '#ffffff')}
    </>
  );

  // Template 4: Cobalt Sapphire Dual-Rail
  const renderBlueSplit = () => (
    <>
      <rect x="0" y="0" width="856" height="98" fill={ink} />
      <rect x="0" y="98" width="856" height="6" fill={accent} />

      {logoVisible && <Logo schoolSettings={schoolSettings} x={28} y={10} size={customLogoSize} shape={customLogoShape} badgeStyle={customLogoBadgeStyle} ringColor={accent} />}
      <TextBlock text={schoolSettings.schoolName} x={logoVisible ? 28 + customLogoSize + 16 : 30} y={14} width={logoVisible ? 792 - (customLogoSize + 16) : 796} fontSize={schoolNameSize} weight={800} role="heading" fill="#ffffff" maxLines={1} />
      {sessionVisible && (
        <TextBlock text={`SESSION ${schoolSettings.academicSession || student.session}`} x={logoVisible ? 28 + customLogoSize + 16 : 30} y={54} width={560} fontSize={14} weight={800} fill="#fef08a" />
      )}

      <rect x={32 - 4} y={128 - 4} width={customPhotoW + 8} height={customPhotoH + 8} rx="8" fill="none" stroke={ink} strokeWidth="3" />
      <Photo student={student} x={32} y={128} width={customPhotoW} height={customPhotoH} radius={customPhotoR ?? 6} borderColor={accent} />

      <g transform="translate(220, 120)">
        <rect x="0" y="0" width="606" height="42" rx="5" fill="#eff6ff" stroke="#bfdbfe" strokeWidth="1.2" />
        <TextBlock text={student.name} x={16} y={7} width={574} fontSize={studentNameSize} weight={800} role="heading" fill={ink} />
        <IdentityMeta student={student} visibleFields={visibleFields} x={0} y={54} width={606} fill={ink} muted={muted} customLabels={cust?.customLabels} accentBg="#f8fafc" />
      </g>

      {renderDetails2Col(220, 224, 606, 188)}
      {renderFooterRow(220, 675, 418, ink)}
      {renderBottomBar(ink, accent, '#ffffff')}
    </>
  );

  // Template 5: Sovereign Tricolour Panoramic
  const renderTricolourHoriz = () => (
    <>
      <rect x="0" y="0" width="856" height="36" fill="#ff9933" />
      <rect x="0" y="36" width="856" height="38" fill="#ffffff" />
      <rect x="0" y="74" width="856" height="18" fill="#138808" />

      {logoVisible && <Logo schoolSettings={schoolSettings} x={28} y={10} size={customLogoSize} shape={customLogoShape} badgeStyle={customLogoBadgeStyle} ringColor="#0f2b5c" />}
      <TextBlock text={schoolSettings.schoolName} x={logoVisible ? 28 + customLogoSize + 16 : 30} y={24} width={logoVisible ? 792 - (customLogoSize + 16) : 796} fontSize={schoolNameSize} weight={800} role="heading" fill="#0f2b5c" maxLines={1} />

      <Photo student={student} x={32} y={124} width={customPhotoW} height={customPhotoH} radius={customPhotoR ?? 6} borderColor="#138808" />

      <g transform="translate(220, 114)">
        <rect x="0" y="0" width="606" height="42" rx="5" fill="#0f2b5c" />
        <TextBlock text={student.name} x={16} y={7} width={574} fontSize={studentNameSize} weight={800} role="heading" fill="#ffffff" />
        <IdentityMeta student={student} visibleFields={visibleFields} x={0} y={54} width={606} fill="#0f2b5c" muted={muted} customLabels={cust?.customLabels} accentBg="#f8fafc" />
      </g>

      {renderDetails2Col(220, 220, 606, 190)}
      {renderFooterRow(220, 675, 416, '#0f2b5c')}

      {(visibleFields.schoolAddress !== false || visibleFields.schoolContact !== false) && (
        <TextBlock
          text={[visibleFields.schoolAddress !== false ? schoolSettings.address : '', visibleFields.schoolContact !== false ? schoolSettings.contactNumber : ''].filter(Boolean).join(' • ')}
          x={26}
          y={490}
          width={804}
          fontSize={cust?.addressFontSize || 15}
          maxLines={1}
          anchor="middle"
          fill="#0f2b5c"
          weight={700}
        />
      )}
      <rect x="0" y="520" width="856" height="7" fill="#ff9933" />
      <rect x="0" y="527" width="856" height="6" fill="#ffffff" />
      <rect x="0" y="533" width="856" height="7" fill="#138808" />
    </>
  );

  // Template 6: Emerald Convent Horizon
  const renderGreenCream = () => {
    const sideLogoSize = Math.min(customLogoSize, 86);
    const sidePhotoY = logoVisible ? Math.max(114, 18 + sideLogoSize + 12) : 34;
    return (
      <>
        <rect x="0" y="0" width="214" height="540" fill={ink} />
        <line x1="214" y1="0" x2="214" y2="540" stroke={accent} strokeWidth="3.5" />

        {logoVisible && <Logo schoolSettings={schoolSettings} x={107 - (sideLogoSize / 2)} y={18} size={sideLogoSize} shape={customLogoShape} badgeStyle={customLogoBadgeStyle} ringColor={accent} />}
        <Photo student={student} x={107 - (customPhotoW / 2)} y={sidePhotoY} width={customPhotoW} height={customPhotoH} radius={customPhotoR ?? 8} borderColor={accent} />

        <rect x="24" y={sidePhotoY + customPhotoH + 16} width="166" height="28" rx="14" fill={accent} />
        <TextBlock text="IDENTITY PASS" x={24} y={sidePhotoY + customPhotoH + 21} width={166} fontSize={13.5} weight={800} letterSpacing={1.1} anchor="middle" fill="#064e3b" />

        <TextBlock text={schoolSettings.schoolName} x={238} y={14} width={592} fontSize={schoolNameSize} weight={800} role="heading" fill={ink} maxLines={1} />
        {visibleFields.schoolAddress !== false && schoolSettings.address && (
          <TextBlock text={`${schoolSettings.address}${schoolSettings.contactNumber ? ` • ${schoolSettings.contactNumber}` : ''}`} x={238} y={54} width={592} fontSize={14.5} maxLines={1} fill={muted} weight={600} />
        )}
        <TextBlock text={student.name} x={238} y={96} width={592} fontSize={studentNameSize} weight={800} role="heading" fill={ink} />
        <line x1="238" y1="136" x2="830" y2="136" stroke={accent} strokeWidth="2" />

        <IdentityMeta student={student} visibleFields={visibleFields} x={238} y={146} width={592} fill={ink} muted={muted} customLabels={cust?.customLabels} accentBg="#ecfdf5" />
        {renderDetails2Col(238, 206, 592, 204)}
        {renderFooterRow(238, 675, 424, ink)}
        <rect x="214" y="528" width="642" height="12" fill={ink} />
      </>
    );
  };

  // Template 7: Imperial Burgundy Archival
  const renderBurgundyPremium = () => {
    const headerLogoSize = Math.min(customLogoSize, 82);
    return (
      <>
        <rect x="14" y="14" width="828" height="512" fill="none" stroke={accent} strokeWidth="2" />
        <rect x="20" y="20" width="816" height="500" fill="none" stroke={ink} strokeWidth="1" />

        <rect x="21" y="21" width="814" height="90" fill={ink} />
        {logoVisible && <Logo schoolSettings={schoolSettings} x={32} y={24} size={headerLogoSize} shape={customLogoShape} badgeStyle={customLogoBadgeStyle} ringColor={accent} />}
        <TextBlock text={schoolSettings.schoolName} x={logoVisible ? 32 + headerLogoSize + 16 : 34} y={28} width={logoVisible ? 770 - (headerLogoSize + 16) : 770} fontSize={schoolNameSize} weight={800} role="heading" family="Playfair Display, Georgia, serif" fill="#ffffff" maxLines={1} />
        {sessionVisible && (
          <TextBlock text={`SESSION ${schoolSettings.academicSession || student.session}`} x={logoVisible ? 32 + headerLogoSize + 16 : 34} y={68} width={500} fontSize={14} letterSpacing={1.2} weight={800} fill={accent} />
        )}

        <Photo student={student} x={34} y={128} width={customPhotoW} height={customPhotoH} radius={customPhotoR ?? 4} borderColor={accent} />

      <TextBlock text={student.name} x={224} y={120} width={590} fontSize={studentNameSize} weight={800} role="heading" family="Playfair Display, Georgia, serif" fill={ink} />
      <line x1="224" y1="158" x2="814" y2="158" stroke={accent} strokeWidth="1.5" />

      <IdentityMeta student={student} visibleFields={visibleFields} x={224} y={168} width={590} fill={ink} muted={muted} customLabels={cust?.customLabels} accentBg="#fef2f2" />
      {renderDetails2Col(224, 224, 590, 186)}
      {renderFooterRow(224, 670, 416, ink)}
      {(visibleFields.schoolAddress !== false || visibleFields.schoolContact !== false) && (
        <TextBlock
          text={[visibleFields.schoolAddress !== false ? schoolSettings.address : '', visibleFields.schoolContact !== false ? schoolSettings.contactNumber : ''].filter(Boolean).join(' • ')}
          x={28}
          y={490}
          width={800}
          fontSize={cust?.addressFontSize || 15}
          maxLines={1}
          anchor="middle"
          fill={ink}
          weight={700}
        />
      )}
    </>
    );
  };

  // Template 8: Executive Cyan Clean Rail
  const renderMinimalWhiteGrid = () => (
    <>
      <rect x="0" y="0" width="856" height="9" fill={ink} />
      <rect x="0" y="9" width="856" height="3" fill={accent} />

      {logoVisible && <Logo schoolSettings={schoolSettings} x={28} y={18} size={customLogoSize} shape={customLogoShape} badgeStyle={customLogoBadgeStyle} ringColor={ink} />}
      <TextBlock text={schoolSettings.schoolName} x={logoVisible ? 28 + customLogoSize + 16 : 30} y={20} width={logoVisible ? 792 - (customLogoSize + 16) : 796} fontSize={schoolNameSize} weight={800} role="heading" fill={ink} maxLines={1} />
      {sessionVisible && (
        <TextBlock text={`SESSION: ${schoolSettings.academicSession || student.session}`} x={logoVisible ? 28 + customLogoSize + 16 : 30} y={60} width={500} fontSize={14} weight={800} fill="#334155" />
      )}

      <Photo student={student} x={32} y={116} width={customPhotoW} height={customPhotoH} radius={customPhotoR ?? 6} borderColor={ink} />

      <TextBlock text={student.name} x={220} y={108} width={606} fontSize={studentNameSize} weight={800} role="heading" fill="#0f172a" />
      <line x1="220" y1="146" x2="826" y2="146" stroke={ink} strokeWidth="2.5" />

      <IdentityMeta student={student} visibleFields={visibleFields} x={220} y={158} width={606} fill="#0f172a" muted={muted} customLabels={cust?.customLabels} accentBg="#f0f9ff" />
      {renderDetails2Col(220, 218, 606, 190)}
      {renderFooterRow(220, 675, 418, '#0f172a')}
      {renderBottomBar('#0f172a', ink, '#ffffff')}
    </>
  );

  // Template 9: Cobalt Dynamic Angle
  const renderRoyalBlueGeom = () => (
    <>
      <polygon points="0,0 856,0 856,86 0,112" fill={ink} />
      <polygon points="0,112 856,86 856,94 0,120" fill={accent} />

      {logoVisible && <Logo schoolSettings={schoolSettings} x={28} y={12} size={customLogoSize} shape={customLogoShape} badgeStyle={customLogoBadgeStyle} ringColor={accent} />}
      <TextBlock text={schoolSettings.schoolName} x={logoVisible ? 28 + customLogoSize + 16 : 30} y={14} width={logoVisible ? 792 - (customLogoSize + 16) : 796} fontSize={schoolNameSize} weight={800} role="heading" fill="#ffffff" maxLines={1} />
      {sessionVisible && (
        <TextBlock text={`SESSION ${schoolSettings.academicSession || student.session}`} x={logoVisible ? 28 + customLogoSize + 16 : 30} y={54} width={560} fontSize={14} weight={800} fill="#fef08a" />
      )}

      <Photo student={student} x={32} y={134} width={customPhotoW} height={customPhotoH} radius={customPhotoR ?? 8} borderColor={accent} />

      <g transform="translate(220, 124)">
        <rect x="0" y="0" width="606" height="42" rx="6" fill={ink} />
        <TextBlock text={student.name} x={16} y={7} width={574} fontSize={studentNameSize} weight={800} role="heading" fill="#ffffff" />
        <IdentityMeta student={student} visibleFields={visibleFields} x={0} y={52} width={606} fill={ink} muted={muted} customLabels={cust?.customLabels} accentBg="#eff6ff" />
      </g>

      {renderDetails2Col(220, 226, 606, 186)}
      {renderFooterRow(220, 675, 418, ink)}
      {renderBottomBar(ink, accent, '#ffffff')}
    </>
  );

  // Template 10: Midnight Cyber Amber
  const renderDarkCharcoal = () => {
    const sideLogoSize = Math.min(customLogoSize, 86);
    const sidePhotoY = logoVisible ? Math.max(114, 18 + sideLogoSize + 12) : 34;
    return (
      <>
        <rect x="0" y="0" width="214" height="540" fill={ink} />
        <line x1="214" y1="0" x2="214" y2="540" stroke={accent} strokeWidth="3.5" />

        {logoVisible && <Logo schoolSettings={schoolSettings} x={107 - (sideLogoSize / 2)} y={18} size={sideLogoSize} shape={customLogoShape} badgeStyle={customLogoBadgeStyle} ringColor={accent} />}
        <Photo student={student} x={107 - (customPhotoW / 2)} y={sidePhotoY} width={customPhotoW} height={customPhotoH} radius={customPhotoR ?? 6} borderColor={accent} />

        <rect x="24" y={sidePhotoY + customPhotoH + 16} width="166" height="28" rx="4" fill={accent} />
        <TextBlock text="STUDENT ID" x={24} y={sidePhotoY + customPhotoH + 21} width={166} fontSize={13.5} weight={800} letterSpacing={1.2} anchor="middle" fill="#0f172a" />

        <TextBlock text={schoolSettings.schoolName} x={238} y={14} width={592} fontSize={schoolNameSize} weight={800} role="heading" fill={ink} maxLines={1} />
        {visibleFields.schoolAddress !== false && schoolSettings.address && (
          <TextBlock text={`${schoolSettings.address}${schoolSettings.contactNumber ? ` • ${schoolSettings.contactNumber}` : ''}`} x={238} y={54} width={592} fontSize={14.5} maxLines={1} fill={muted} weight={600} />
        )}
        <TextBlock text={student.name} x={238} y={96} width={592} fontSize={studentNameSize} weight={800} role="heading" fill={ink} />
        <line x1="238" y1="136" x2="830" y2="136" stroke={accent} strokeWidth="2" />

        <IdentityMeta student={student} visibleFields={visibleFields} x={238} y={146} width={592} fill={ink} muted={muted} customLabels={cust?.customLabels} accentBg="#f8fafc" />
        {renderDetails2Col(238, 206, 592, 204)}
        {renderFooterRow(238, 675, 424, ink)}
        <rect x="214" y="528" width="642" height="12" fill={ink} />
      </>
    );
  };

  // Template 11: Scarlet Diagonal Velocity
  const renderRedDiagonal = () => (
    <>
      <polygon points="0,0 856,0 856,82 0,112" fill={ink} />
      <polygon points="0,112 856,82 856,90 0,120" fill={accent} />

      {logoVisible && <Logo schoolSettings={schoolSettings} x={28} y={12} size={customLogoSize} shape={customLogoShape} badgeStyle={customLogoBadgeStyle} ringColor={accent} />}
      <TextBlock text={schoolSettings.schoolName} x={logoVisible ? 28 + customLogoSize + 16 : 30} y={14} width={logoVisible ? 792 - (customLogoSize + 16) : 796} fontSize={schoolNameSize} weight={800} role="heading" fill="#ffffff" maxLines={1} />
      {sessionVisible && (
        <TextBlock text={`SESSION ${schoolSettings.academicSession || student.session}`} x={logoVisible ? 28 + customLogoSize + 16 : 30} y={54} width={560} fontSize={14} weight={800} fill="#fee2e2" />
      )}

      <Photo student={student} x={32} y={134} width={customPhotoW} height={customPhotoH} radius={customPhotoR ?? 8} borderColor={ink} />

      <g transform="translate(220, 124)">
        <rect x="0" y="0" width="606" height="42" rx="6" fill={ink} />
        <TextBlock text={student.name} x={16} y={7} width={574} fontSize={studentNameSize} weight={800} role="heading" fill="#ffffff" />
        <IdentityMeta student={student} visibleFields={visibleFields} x={0} y={52} width={606} fill={ink} muted={muted} customLabels={cust?.customLabels} accentBg="#fef2f2" />
      </g>

      {renderDetails2Col(220, 226, 606, 186)}
      {renderFooterRow(220, 675, 418, ink)}
      {renderBottomBar(ink, '#ffffff', '#ffffff')}
    </>
  );

  // Template 12: Heritage Double-Pinstripe
  const renderClassicBorder = () => {
    const headerLogoSize = Math.min(customLogoSize, 82);
    const photoY = logoVisible ? Math.max(120, 24 + headerLogoSize + 12) : 120;
    return (
      <>
        <rect x="14" y="14" width="828" height="512" fill="none" stroke={ink} strokeWidth="2.5" />
        <rect x="20" y="20" width="816" height="500" fill="none" stroke={accent} strokeWidth="1" />

        {logoVisible && <Logo schoolSettings={schoolSettings} x={32} y={24} size={headerLogoSize} shape={customLogoShape} badgeStyle={customLogoBadgeStyle} ringColor={accent} />}
        <TextBlock text={schoolSettings.schoolName} x={logoVisible ? 32 + headerLogoSize + 16 : 34} y={28} width={logoVisible ? 770 - (headerLogoSize + 16) : 770} fontSize={schoolNameSize} weight={800} role="heading" family="Cinzel, Georgia, serif" fill={ink} maxLines={1} />
        {sessionVisible && (
          <TextBlock text={`ACADEMIC SESSION ${schoolSettings.academicSession || student.session}`} x={logoVisible ? 32 + headerLogoSize + 16 : 34} y={68} width={560} fontSize={14} letterSpacing={1.1} weight={800} fill={accent} />
        )}

        <Photo student={student} x={34} y={photoY} width={customPhotoW} height={customPhotoH} radius={customPhotoR ?? 4} borderColor={accent} />

        <TextBlock text={student.name} x={224} y={112} width={590} fontSize={studentNameSize} weight={800} role="heading" family="Playfair Display, Georgia, serif" fill={ink} />
        <line x1="224" y1="150" x2="814" y2="150" stroke={accent} strokeWidth="1.5" />

        <IdentityMeta student={student} visibleFields={visibleFields} x={224} y={160} width={590} fill={ink} muted={muted} customLabels={cust?.customLabels} accentBg="#fefce8" />
        {renderDetails2Col(224, 218, 590, 190)}
        {renderFooterRow(224, 670, 416, ink)}
        {(visibleFields.schoolAddress !== false || visibleFields.schoolContact !== false) && (
          <TextBlock
            text={[visibleFields.schoolAddress !== false ? schoolSettings.address : '', visibleFields.schoolContact !== false ? schoolSettings.contactNumber : ''].filter(Boolean).join(' • ')}
            x={28}
            y={490}
            width={800}
            fontSize={cust?.addressFontSize || 15}
            maxLines={1}
            anchor="middle"
            fill={ink}
            weight={700}
          />
        )}
      </>
    );
  };

  // Template 13: Azure Sapphire Split Wing
  const renderPhotoPanel = () => (
    <>
      <path d="M 0,0 L 856,0 L 856,96 Q 500,124 0,104 Z" fill={ink} />
      <path d="M 0,104 Q 500,124 856,96 L 856,104 Q 500,132 0,112 Z" fill={accent} />

      {logoVisible && <Logo schoolSettings={schoolSettings} x={28} y={12} size={customLogoSize} shape={customLogoShape} badgeStyle={customLogoBadgeStyle} ringColor={accent} />}
      <TextBlock text={schoolSettings.schoolName} x={logoVisible ? 28 + customLogoSize + 16 : 30} y={14} width={logoVisible ? 792 - (customLogoSize + 16) : 796} fontSize={schoolNameSize} weight={800} role="heading" fill="#ffffff" maxLines={1} />
      {sessionVisible && (
        <TextBlock text={`SESSION ${schoolSettings.academicSession || student.session}`} x={logoVisible ? 28 + customLogoSize + 16 : 30} y={54} width={560} fontSize={14} weight={800} fill="#bae6fd" />
      )}

      <Photo student={student} x={32} y={134} width={customPhotoW} height={customPhotoH} radius={customPhotoR ?? 10} borderColor={accent} />

      <g transform="translate(220, 124)">
        <rect x="0" y="0" width="606" height="42" rx="8" fill={ink} />
        <TextBlock text={student.name} x={16} y={7} width={574} fontSize={studentNameSize} weight={800} role="heading" fill="#ffffff" />
        <IdentityMeta student={student} visibleFields={visibleFields} x={0} y={52} width={606} fill={ink} muted={muted} customLabels={cust?.customLabels} accentBg="#eff6ff" />
      </g>

      {renderDetails2Col(220, 226, 606, 186)}
      {renderFooterRow(220, 675, 418, ink)}
      {renderBottomBar(ink, '#67e8f9', '#ffffff')}
    </>
  );

  // Template 14: Oxford Seal Collegiate
  const renderCrestHeader = () => {
    const headerLogoSize = Math.min(customLogoSize, 76);
    return (
      <>
        <rect x="0" y="0" width="856" height="98" fill={ink} />
        <line x1="0" y1="98" x2="856" y2="98" stroke={accent} strokeWidth="3.5" />

        {logoVisible && <Logo schoolSettings={schoolSettings} x={28} y={11} size={headerLogoSize} shape={customLogoShape} badgeStyle={customLogoBadgeStyle} ringColor={accent} />}
        <TextBlock text={schoolSettings.schoolName} x={logoVisible ? 28 + headerLogoSize + 16 : 30} y={16} width={logoVisible ? 792 - (headerLogoSize + 16) : 796} fontSize={schoolNameSize} weight={800} role="heading" family="Cinzel, Georgia, serif" fill="#ffffff" maxLines={1} />
        {sessionVisible && (
          <TextBlock text={`SESSION ${schoolSettings.academicSession || student.session}`} x={logoVisible ? 28 + headerLogoSize + 16 : 30} y={56} width={560} fontSize={14} weight={800} fill={accent} />
        )}

        <Photo student={student} x={32} y={128} width={customPhotoW} height={customPhotoH} radius={customPhotoR ?? 4} borderColor={accent} />

        <TextBlock text={student.name} x={220} y={118} width={606} fontSize={studentNameSize} weight={800} role="heading" family="Playfair Display, Georgia, serif" fill={ink} />
        <line x1="220" y1="156" x2="826" y2="156" stroke={accent} strokeWidth="1.5" />

        <IdentityMeta student={student} visibleFields={visibleFields} x={220} y={166} width={606} fill={ink} muted={muted} customLabels={cust?.customLabels} accentBg="#fefce8" />
        {renderDetails2Col(220, 222, 606, 188)}
        {renderFooterRow(220, 675, 418, ink)}
        {renderBottomBar(ink, accent, '#ffffff')}
      </>
    );
  };

  // Template 15: Amethyst Wave Modern
  const renderModernAsymmetric = () => (
    <>
      <path d="M 0,0 L 856,0 L 856,100 Q 600,128 400,104 Q 200,80 0,118 Z" fill={ink} />
      <path d="M 0,118 Q 200,80 400,104 Q 600,128 856,100" stroke={accent} strokeWidth="3.5" fill="none" />

      {logoVisible && <Logo schoolSettings={schoolSettings} x={28} y={12} size={customLogoSize} shape={customLogoShape} badgeStyle={customLogoBadgeStyle} ringColor={accent} />}
      <TextBlock text={schoolSettings.schoolName} x={logoVisible ? 28 + customLogoSize + 16 : 30} y={14} width={logoVisible ? 792 - (customLogoSize + 16) : 796} fontSize={schoolNameSize} weight={800} role="heading" fill="#ffffff" maxLines={1} />
      {sessionVisible && (
        <TextBlock text={`SESSION ${schoolSettings.academicSession || student.session}`} x={logoVisible ? 28 + customLogoSize + 16 : 30} y={54} width={560} fontSize={14} weight={800} fill={accent} />
      )}

      <Photo student={student} x={32} y={134} width={customPhotoW} height={customPhotoH} radius={customPhotoR ?? 8} borderColor={accent} />

      <g transform="translate(220, 124)">
        <rect x="0" y="0" width="606" height="42" rx="8" fill={ink} />
        <TextBlock text={student.name} x={16} y={7} width={574} fontSize={studentNameSize} weight={800} role="heading" fill="#ffffff" />
        <IdentityMeta student={student} visibleFields={visibleFields} x={0} y={52} width={606} fill={ink} muted={muted} customLabels={cust?.customLabels} accentBg="#faf5ff" />
      </g>

      {renderDetails2Col(220, 226, 606, 186)}
      {renderFooterRow(220, 675, 418, ink)}
      {renderBottomBar(ink, accent, '#ffffff')}
    </>
  );

  const renderContent = () => {
    switch (templateId) {
      case 'landscape_red_curved_school':
        return renderRedCurvedSchool();
      case 'landscape_navy_gold_inst':
        return renderNavyGoldInst();
      case 'landscape_charcoal_orange':
        return renderCharcoalOrange();
      case 'landscape_blue_split':
        return renderBlueSplit();
      case 'landscape_tricolour_horiz':
        return renderTricolourHoriz();
      case 'landscape_green_cream':
        return renderGreenCream();
      case 'landscape_burgundy_premium':
        return renderBurgundyPremium();
      case 'landscape_minimal_white_grid':
        return renderMinimalWhiteGrid();
      case 'landscape_royal_blue_geom':
        return renderRoyalBlueGeom();
      case 'landscape_dark_charcoal':
        return renderDarkCharcoal();
      case 'landscape_red_diagonal':
        return renderRedDiagonal();
      case 'landscape_classic_border':
        return renderClassicBorder();
      case 'landscape_photo_panel':
        return renderPhotoPanel();
      case 'landscape_crest_header':
        return renderCrestHeader();
      case 'landscape_modern_asymmetric':
        return renderModernAsymmetric();
      default:
        return renderRedCurvedSchool();
    }
  };

  return (
    <CardCanvas
      orientation="landscape"
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
