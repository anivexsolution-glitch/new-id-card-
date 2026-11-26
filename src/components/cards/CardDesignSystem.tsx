import React, { createContext, useContext, useId, useMemo } from 'react';
import QRCode from 'qrcode';
import { SchoolSettings, Student, TemplateId } from '../../types';
import { TEMPLATE_REGISTRY } from '../../constants/initialData';

const SANS = "'Plus Jakarta Sans', 'Inter', Arial, Helvetica, sans-serif";

interface CardFontCtx {
  bodyFont: string;
  headingFont: string;
  hasCustomBodyFont: boolean;
  hasCustomHeadingFont: boolean;
}

const CardThemeContext = createContext<CardFontCtx>({
  bodyFont: SANS,
  headingFont: SANS,
  hasCustomBodyFont: false,
  hasCustomHeadingFont: false,
});

function luminance(hex: string) {
  if (!hex || hex.length < 7 || !hex.startsWith('#')) return 0.5;
  const channels = [1, 3, 5].map(start => {
    const value = parseInt(hex.slice(start, start + 2), 16) / 255;
    return value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4;
  });
  return .2126 * channels[0] + .7152 * channels[1] + .0722 * channels[2];
}

export function getPalette(templateId: TemplateId, settings: SchoolSettings) {
  const t = TEMPLATE_REGISTRY.find(item => item.id === templateId) || TEMPLATE_REGISTRY[0];
  const custom = settings.customBrandColors;
  const ink = custom?.enabled ? custom.primary : t.primaryColor;
  const lightness = luminance(ink);
  return {
    ink,
    accent: custom?.enabled ? custom.accent : t.accentColor,
    paper: t.surfaceColor,
    muted: '#52606d',
    onInk: lightness > .42 ? '#0f172a' : '#ffffff',
    textInk: (luminance(t.surfaceColor) + .05) / (lightness + .05) < 4.5 ? '#1e293b' : ink,
  };
}

export function CardCanvas({
  orientation,
  id,
  className = '',
  label = 'Student identity card',
  surfaceColor = '#ffffff',
  watermarkUrl,
  watermarkEnabled = true,
  watermarkOpacity = 0.08,
  watermarkSize = 280,
  bodyFont,
  headingFont,
  borderRadius = 9,
  children,
}: {
  orientation: 'portrait' | 'landscape';
  id?: string;
  className?: string;
  label?: string;
  surfaceColor?: string;
  watermarkUrl?: string;
  watermarkEnabled?: boolean;
  watermarkOpacity?: number;
  watermarkSize?: number;
  bodyFont?: string;
  headingFont?: string;
  borderRadius?: number;
  children: React.ReactNode;
}) {
  const portrait = orientation === 'portrait';
  const wmSize = watermarkSize || 280;
  const w = portrait ? 540 : 856;
  const h = portrait ? 856 : 540;
  const resolvedBodyFont = bodyFont || SANS;
  const resolvedHeadingFont = headingFont || bodyFont || SANS;

  // Position watermark in the open body zone (slightly lower on portrait so header doesn't hide it)
  const wmCenterX = portrait ? 270 : 520;
  const wmCenterY = portrait ? 530 : 285;

  return (
    <CardThemeContext.Provider
      value={{
        bodyFont: resolvedBodyFont,
        headingFont: resolvedHeadingFont,
        hasCustomBodyFont: Boolean(bodyFont),
        hasCustomHeadingFont: Boolean(headingFont || bodyFont),
      }}
    >
      <div
        id={id}
        className={`print-card-box scholar-identity-card ${className}`}
        style={{
          width: '100%',
          aspectRatio: portrait ? '540 / 856' : '856 / 540',
          overflow: 'hidden',
          borderRadius,
          background: surfaceColor,
          lineHeight: 0,
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox={`0 0 ${w} ${h}`}
          role="img"
          aria-label={label}
          style={{ display: 'block', width: '100%', height: '100%', fontFamily: resolvedBodyFont }}
        >
          <title>{label}</title>
          {/* Base Card Surface */}
          <rect width={w} height={h} fill={surfaceColor} />
          {/* Institutional Logo Watermark drawn cleanly OVER the base surface */}
          {watermarkEnabled !== false && watermarkUrl && (
            <g opacity={watermarkOpacity ?? 0.08} pointerEvents="none">
              <image
                href={watermarkUrl}
                x={wmCenterX - wmSize / 2}
                y={wmCenterY - wmSize / 2}
                width={wmSize}
                height={wmSize}
                preserveAspectRatio="xMidYMid meet"
              />
            </g>
          )}
          {children}
        </svg>
      </div>
    </CardThemeContext.Provider>
  );
}

// Conservative letter widths keep the same line breaks in previews and exports.
function textWidth(text: string, size: number, spacing = 0) {
  return [...text].reduce(
    (n, c) =>
      n +
      (/[ilI1.,' :;]/.test(c) ? .32 : /[MW@%]/.test(c) ? .94 : /[A-Z0-9]/.test(c) ? .69 : c.charCodeAt(0) > 255 ? .96 : .57) *
        size +
      spacing,
    0
  );
}

function wrap(text: string, width: number, size: number, spacing: number) {
  const words = String(text || '').trim().split(/\s+/);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    if (textWidth(word, size, spacing) > width) {
      if (current) {
        lines.push(current);
        current = '';
      }
      for (const char of word) {
        if (textWidth(current + char, size, spacing) > width && current) {
          lines.push(current);
          current = '';
        }
        current += char;
      }
    } else if (textWidth(current ? `${current} ${word}` : word, size, spacing) <= width) {
      current = current ? `${current} ${word}` : word;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

export function TextBlock({
  text,
  x,
  y,
  width,
  fontSize = 20,
  lineHeight,
  maxLines = 2,
  fill = '#202b2b',
  weight = 400,
  family,
  role = 'body',
  anchor = 'start',
  letterSpacing = 0,
}: {
  text: string | number;
  x: number;
  y: number;
  width: number;
  fontSize?: number;
  lineHeight?: number;
  maxLines?: number;
  fill?: string;
  weight?: number | string;
  family?: string;
  role?: 'heading' | 'body';
  anchor?: 'start' | 'middle' | 'end';
  letterSpacing?: number;
}) {
  const ctx = useContext(CardThemeContext);
  const resolvedFamily =
    role === 'heading'
      ? ctx.hasCustomHeadingFont
        ? ctx.headingFont
        : family || ctx.headingFont
      : ctx.hasCustomBodyFont
        ? ctx.bodyFont
        : family || ctx.bodyFont;

  const value = String(text ?? '');
  let size = fontSize;
  let lines = wrap(value, width, size, letterSpacing);
  while (lines.length > maxLines && size > Math.min(fontSize, 9.5)) {
    size -= .5;
    lines = wrap(value, width, size, letterSpacing);
  }
  const clipped = lines.length > maxLines;
  lines = lines.slice(0, maxLines);
  if (clipped && lines.length) lines[lines.length - 1] = lines[lines.length - 1].replace(/.{1,3}$/, '…');
  const step = lineHeight ? (lineHeight <= 3 ? lineHeight * size : (lineHeight * size) / fontSize) : size * 1.22;
  const tx = anchor === 'middle' ? x + width / 2 : anchor === 'end' ? x + width : x;
  return (
    <text
      fill={fill}
      fontSize={size}
      fontWeight={weight}
      fontFamily={resolvedFamily}
      textAnchor={anchor}
      letterSpacing={letterSpacing}
      data-card-text={value}
    >
      <title>{value}</title>
      {lines.map((line, i) => (
        <tspan key={i} x={tx} y={y + size * .86 + i * step}>
          {line}
        </tspan>
      ))}
    </text>
  );
}

export function Photo({
  student,
  x,
  y,
  width = 160,
  height = 180,
  radius = 3,
  borderColor,
}: {
  student: Student;
  x: number;
  y: number;
  width?: number;
  height?: number;
  radius?: number;
  borderColor?: string;
}) {
  const clip = `photo-${useId().replace(/:/g, '')}`;
  const crop = student.photoCrop || { zoom: 1, x: 0, y: 0 };
  return (
    <g>
      <defs>
        <clipPath id={clip}>
          <rect x={x} y={y} width={width} height={height} rx={radius} />
        </clipPath>
      </defs>
      <rect x={x} y={y} width={width} height={height} rx={radius} fill="#e7eae6" />
      <g clipPath={`url(#${clip})`}>
        {student.photoUrl ? (
          <image
            href={student.photoUrl}
            x={x}
            y={y}
            width={width}
            height={height}
            preserveAspectRatio="xMidYMid slice"
            transform={`translate(${x + width / 2} ${y + height / 2}) scale(${crop.zoom || 1}) translate(${-(x + width / 2) + ((crop.x || 0) * width) / 100} ${-(y + height / 2) + ((crop.y || 0) * height) / 100})`}
          />
        ) : (
          <g fill="#b4beb8">
            <circle cx={x + width / 2} cy={y + height * .37} r={width * .19} />
            <ellipse cx={x + width / 2} cy={y + height * .91} rx={width * .38} ry={height * .33} />
          </g>
        )}
      </g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={radius}
        fill="none"
        stroke={borderColor || '#182f2c'}
        strokeOpacity={borderColor === 'transparent' ? 0 : borderColor ? 1 : .15}
        strokeWidth={borderColor ? 2.5 : 1}
      />
    </g>
  );
}

export function Logo({
  schoolSettings,
  x,
  y,
  size = 88,
  shape = 'circle',
  badgeStyle = 'white',
  ringColor = '#f59e0b',
}: {
  schoolSettings: SchoolSettings;
  x: number;
  y: number;
  size?: number;
  shape?: 'circle' | 'square' | 'rounded' | 'none';
  badgeStyle?: 'white' | 'gold-ring' | 'tinted' | 'minimal';
  ringColor?: string;
}) {
  const clipId = `logo-clip-${useId().replace(/:/g, '')}`;
  const r = shape === 'circle' ? size / 2 : shape === 'rounded' ? Math.round(size * 0.22) : shape === 'square' ? Math.round(size * 0.06) : 0;
  const pad = shape === 'none' ? 0 : badgeStyle === 'minimal' ? Math.max(2, Math.round(size * 0.03)) : Math.max(2, Math.round(size * 0.045));
  const innerSize = Math.max(12, size - pad * 2);
  const innerR = shape === 'circle' ? innerSize / 2 : Math.max(0, r - pad * 0.5);

  const badgeFill =
    badgeStyle === 'tinted' ? '#f8fafc' : badgeStyle === 'minimal' ? 'rgba(255,255,255,0.92)' : '#ffffff';
  const strokeColor =
    badgeStyle === 'gold-ring' ? ringColor : badgeStyle === 'tinted' ? '#cbd5e1' : 'rgba(15,23,42,0.14)';
  const strokeW = badgeStyle === 'gold-ring' ? 2.5 : 1.25;

  if (!schoolSettings.logoUrl) {
    const initials = schoolSettings.schoolName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(n => n[0])
      .join('')
      .toUpperCase();
    return (
      <g>
        {shape !== 'none' && (
          <rect
            x={x}
            y={y}
            width={size}
            height={size}
            rx={r}
            fill={badgeFill}
            stroke={strokeColor}
            strokeWidth={strokeW}
          />
        )}
        <TextBlock
          text={initials || 'SC'}
          x={x + 4}
          y={y + size * 0.32}
          width={size - 8}
          fontSize={size * 0.36}
          weight={800}
          role="heading"
          fill="#0f172a"
          anchor="middle"
          maxLines={1}
        />
      </g>
    );
  }

  return (
    <g>
      <defs>
        <clipPath id={clipId}>
          <rect x={x + pad} y={y + pad} width={innerSize} height={innerSize} rx={innerR} />
        </clipPath>
      </defs>
      {/* Outer subtle drop-shadow ring for depth */}
      {shape !== 'none' && badgeStyle === 'gold-ring' && (
        <rect
          x={x - 1.5}
          y={y - 1.5}
          width={size + 3}
          height={size + 3}
          rx={r + 1.5}
          fill="none"
          stroke="#ffffff"
          strokeOpacity="0.45"
          strokeWidth="1"
        />
      )}
      {shape !== 'none' && (
        <rect
          x={x}
          y={y}
          width={size}
          height={size}
          rx={r}
          fill={badgeFill}
          stroke={strokeColor}
          strokeWidth={strokeW}
        />
      )}
      <g clipPath={shape !== 'none' ? `url(#${clipId})` : undefined}>
        <image
          href={schoolSettings.logoUrl}
          x={x + pad}
          y={y + pad}
          width={innerSize}
          height={innerSize}
          preserveAspectRatio="xMidYMid meet"
        />
      </g>
    </g>
  );
}

export function Signature({
  schoolSettings,
  x,
  y,
  width = 140,
  height = 62,
  title = 'PRINCIPAL',
  fill = '#596560',
}: {
  schoolSettings: SchoolSettings;
  x: number;
  y: number;
  width?: number;
  height?: number;
  title?: string;
  fill?: string;
}) {
  return (
    <g>
      {schoolSettings.principalSignatureUrl && (
        <image
          href={schoolSettings.principalSignatureUrl}
          x={x + 6}
          y={y}
          width={width - 12}
          height={Math.max(18, height - 20)}
          preserveAspectRatio="xMidYMid meet"
        />
      )}
      <line x1={x} y1={y + height - 18} x2={x + width} y2={y + height - 18} stroke={fill} strokeWidth=".9" />
      <TextBlock
        text={title || 'PRINCIPAL'}
        x={x}
        y={y + height - 14}
        width={width}
        fontSize={13}
        weight={700}
        fill={fill}
        anchor="middle"
        maxLines={1}
        letterSpacing={1.2}
      />
    </g>
  );
}

export function Details({
  student,
  visibleFields,
  x,
  y,
  width,
  height,
  columns = 1,
  fill = '#25312f',
  muted = '#68726e',
  rule = '#d9ded8',
  customLabels,
  labelFontSize,
  valueFontSize,
}: {
  student: Student;
  visibleFields: SchoolSettings['visibleFields'];
  x: number;
  y: number;
  width: number;
  height: number;
  columns?: 1 | 2;
  fill?: string;
  muted?: string;
  rule?: string;
  customLabels?: Record<string, string>;
  labelFontSize?: number;
  valueFontSize?: number;
}) {
  const lblFather = customLabels?.fatherName || "Father's Name";
  const lblMother = customLabels?.motherName || "Mother's Name";
  const lblDob = customLabels?.dob || 'D.O.B.';
  const lblContact = customLabels?.contactNumber || 'Contact No.';
  const lblConveyance = customLabels?.conveyance || 'Conveyance';
  const lblAddress = customLabels?.address || 'Address';

  const rows = [
    visibleFields.fatherName !== false && student.fatherName && [lblFather, student.fatherName],
    visibleFields.motherName !== false && student.motherName && [lblMother, student.motherName],
    visibleFields.dob !== false && student.dob && [lblDob, student.dob],
    visibleFields.contactNumber !== false && student.contactNumber && [lblContact, student.contactNumber],
    visibleFields.conveyance !== false && student.conveyance && [lblConveyance, student.conveyance === 'Yes' ? 'Yes' : 'No'],
    visibleFields.address !== false && student.address && [lblAddress, student.address],
  ].filter(Boolean) as string[][];

  const rowCount = Math.ceil(rows.length / columns);
  const step = Math.min(columns === 1 ? 38 : 62, height / Math.max(1, rowCount));
  const cellWidth = (width - (columns - 1) * 20) / columns;
  const lSize = labelFontSize || (columns === 2 ? 14 : 16.5);
  const vSize = valueFontSize || (columns === 2 ? 19.5 : 20.5);

  return (
    <g>
      {rows.map(([label, value], i) => {
        const rx = x + (i % columns) * (cellWidth + 20);
        const ry = y + Math.floor(i / columns) * step;
        const isConveyance = label === lblConveyance;
        const valColor = isConveyance ? '#000000' : fill;
        const valWeight = isConveyance ? 800 : 700;

        if (columns === 2) {
          return (
            <g key={label}>
              <TextBlock
                text={label.toUpperCase()}
                x={rx}
                y={ry}
                width={cellWidth}
                fontSize={lSize}
                maxLines={1}
                fill={muted}
                letterSpacing={.6}
                weight={700}
              />
              <TextBlock
                text={value}
                x={rx}
                y={ry + Math.round(lSize * 1.18)}
                width={cellWidth}
                fontSize={vSize}
                maxLines={2}
                lineHeight={1.08}
                fill={valColor}
                weight={valWeight}
              />
            </g>
          );
        }

        const labelWidth = Math.min(152, cellWidth * .34);
        return (
          <g key={label}>
            <TextBlock
              text={`${label}:`}
              x={rx}
              y={ry + 4}
              width={labelWidth - 6}
              fontSize={lSize}
              maxLines={1}
              fill={muted}
              weight={700}
            />
            <TextBlock
              text={value}
              x={rx + labelWidth}
              y={ry + 2}
              width={cellWidth - labelWidth}
              fontSize={vSize}
              maxLines={label === lblAddress ? 2 : 1}
              lineHeight={1.08}
              fill={valColor}
              weight={valWeight}
            />
            {i < rows.length - 1 && (
              <line x1={rx} x2={rx + cellWidth} y1={ry + step - 2} y2={ry + step - 2} stroke={rule} strokeWidth=".7" />
            )}
          </g>
        );
      })}
    </g>
  );
}

export function IdentityMeta({
  student,
  visibleFields,
  x,
  y,
  width,
  fill = '#263632',
  muted = '#65726b',
  customLabels,
  accentBg,
}: {
  student: Student;
  visibleFields: SchoolSettings['visibleFields'];
  x: number;
  y: number;
  width: number;
  fill?: string;
  muted?: string;
  customLabels?: Record<string, string>;
  accentBg?: string;
}) {
  const lblClass = (customLabels?.classGrade || 'CLASS').toUpperCase();
  const lblRoll = (customLabels?.rollNo || 'ROLL NO.').toUpperCase();
  const lblBlood = (customLabels?.bloodGroup || 'BLOOD').toUpperCase();

  const fields = [
    visibleFields.classGrade !== false && student.classGrade && [lblClass, student.classGrade],
    visibleFields.rollNo !== false && student.rollNo && [lblRoll, student.rollNo],
    visibleFields.bloodGroup !== false && student.bloodGroup && [lblBlood, student.bloodGroup],
  ].filter(Boolean) as string[][];

  if (!fields.length) return null;
  const gap = 8;
  const cell = (width - gap * (fields.length - 1)) / fields.length;

  return (
    <g>
      {fields.map(([label, value], i) => {
        const cx = x + i * (cell + gap);
        return (
          <g key={label}>
            {accentBg && (
              <rect x={cx} y={y - 4} width={cell} height={46} rx="6" fill={accentBg} stroke="#e2e8f0" strokeWidth="0.9" />
            )}
            <TextBlock
              text={label}
              x={cx + (accentBg ? 8 : 0)}
              y={y}
              width={cell - (accentBg ? 14 : 6)}
              fontSize={13}
              letterSpacing={0.7}
              weight={700}
              fill={muted}
              maxLines={1}
            />
            <TextBlock
              text={value}
              x={cx + (accentBg ? 8 : 0)}
              y={y + 16}
              width={cell - (accentBg ? 14 : 6)}
              fontSize={20}
              weight={800}
              fill={fill}
              maxLines={1}
            />
          </g>
        );
      })}
    </g>
  );
}

export function buildStudentQrPayload(student: Student, schoolSettings?: SchoolSettings): string {
  const lines = [
    `ID: ${student.idCardNumber || student.id}`,
    `Name: ${student.name}`,
    student.classGrade ? `Class: ${student.classGrade}` : '',
    student.rollNo ? `Roll No: ${student.rollNo}` : '',
    student.fatherName ? `Father: ${student.fatherName}` : '',
    student.motherName ? `Mother: ${student.motherName}` : '',
    student.dob ? `DOB: ${student.dob}` : '',
    student.contactNumber ? `Phone: ${student.contactNumber}` : '',
    `Conveyance: ${student.conveyance === 'Yes' ? 'Yes' : 'No'}`,
    student.bloodGroup ? `Blood: ${student.bloodGroup}` : '',
    `Session: ${student.session || schoolSettings?.academicSession || ''}`,
    student.address ? `Address: ${student.address}` : '',
    schoolSettings?.schoolName ? `School: ${schoolSettings.schoolName}` : '',
  ].filter(Boolean);
  return lines.join('\n');
}

export function CardCode({
  student,
  schoolSettings,
  x,
  y,
  width,
  height,
  enabled,
}: {
  student: Student;
  schoolSettings?: SchoolSettings;
  x: number;
  y: number;
  width: number;
  height: number;
  enabled?: boolean;
}) {
  const cardNo = student.idCardNumber || student.id;
  const qrPayload = useMemo(
    () => buildStudentQrPayload(student, schoolSettings),
    [student, schoolSettings]
  );

  // Use errorCorrectionLevel 'L' so full student dossier scans cleanly and keeps modules bold
  const qr = useMemo(
    () => QRCode.create(qrPayload || cardNo || 'UNASSIGNED', { errorCorrectionLevel: 'L' }),
    [qrPayload, cardNo]
  );

  const side = Math.min(height, width * .45);
  const n = qr.modules.size;
  const margin = 2;
  const path = useMemo(() => {
    let d = '';
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (qr.modules.get(r, c)) {
          d += `M${c + margin} ${r + margin}h1v1h-1z`;
        }
      }
    }
    return d;
  }, [qr, n]);

  const tx = enabled ? x + side + 10 : x;
  return (
    <g>
      {enabled && (
        <g>
          <rect x={x - 1} y={y - 1} width={side + 2} height={side + 2} rx="3" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1" />
          <svg
            x={x}
            y={y}
            width={side}
            height={side}
            viewBox={`0 0 ${n + margin * 2} ${n + margin * 2}`}
            shapeRendering="crispEdges"
          >
            <rect width={n + margin * 2} height={n + margin * 2} fill="#ffffff" />
            <path d={path} fill="#000000" />
          </svg>
        </g>
      )}
      <TextBlock
        text="STUDENT ID"
        x={tx}
        y={y + 6}
        width={width - (tx - x)}
        fontSize={13}
        fill="#475569"
        weight={700}
        letterSpacing={0.8}
        maxLines={1}
      />
      <TextBlock
        text={cardNo}
        x={tx}
        y={y + 24}
        width={width - (tx - x)}
        fontSize={18.5}
        fill="#0f172a"
        weight={800}
        maxLines={2}
      />
    </g>
  );
}
