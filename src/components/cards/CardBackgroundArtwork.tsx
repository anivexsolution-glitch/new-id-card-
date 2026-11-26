import React from 'react';

export interface CardBackgroundArtworkProps {
  orientation?: 'portrait' | 'landscape';
  primaryColor?: string; // e.g. #991b1b, #be123c, #1e3a8a
  accentColor?: string; // e.g. #e11d48, #d97706, #f59e0b
  className?: string;
  theme?: 'crimson' | 'navy' | 'charcoal' | 'emerald' | 'burgundy' | 'gold' | 'tricolour' | 'minimal';
}

export const CardBackgroundArtwork: React.FC<CardBackgroundArtworkProps> = ({
  orientation = 'portrait',
  primaryColor = '#be123c',
  accentColor = '#f59e0b',
  className = '',
  theme = 'crimson',
}) => {
  const isPortrait = orientation === 'portrait';
  const viewBox = isPortrait ? '0 0 540 856' : '0 0 856 540';

  // Palette mappings for rich, nuanced card backgrounds
  const themeGradients = {
    crimson: {
      stop1: '#ffffff',
      stop2: '#fff5f7',
      stop3: '#fdf2f4',
      primaryWave: primaryColor || '#be123c',
      accentLine: accentColor || '#f59e0b',
    },
    navy: {
      stop1: '#ffffff',
      stop2: '#f8fafc',
      stop3: '#f1f5f9',
      primaryWave: primaryColor || '#1e3a8a',
      accentLine: accentColor || '#d97706',
    },
    charcoal: {
      stop1: '#ffffff',
      stop2: '#fafaf9',
      stop3: '#f5f5f4',
      primaryWave: primaryColor || '#334155',
      accentLine: accentColor || '#ea580c',
    },
    emerald: {
      stop1: '#ffffff',
      stop2: '#fefce8',
      stop3: '#f0fdf4',
      primaryWave: primaryColor || '#065f46',
      accentLine: accentColor || '#d97706',
    },
    burgundy: {
      stop1: '#ffffff',
      stop2: '#fff5f7',
      stop3: '#fdf2f8',
      primaryWave: primaryColor || '#881337',
      accentLine: accentColor || '#fbbf24',
    },
    gold: {
      stop1: '#ffffff',
      stop2: '#fefce8',
      stop3: '#fef3c7',
      primaryWave: primaryColor || '#854d0e',
      accentLine: accentColor || '#ca8a04',
    },
    tricolour: {
      stop1: '#ffffff',
      stop2: '#fffbeb',
      stop3: '#f0fdf4',
      primaryWave: '#ea580c',
      accentLine: '#15803d',
    },
    minimal: {
      stop1: '#ffffff',
      stop2: '#fafaf9',
      stop3: '#f5f5f4',
      primaryWave: '#64748b',
      accentLine: '#94a3b8',
    },
  };

  const currentTheme = themeGradients[theme] || themeGradients.crimson;

  return (
    <svg
      viewBox={viewBox}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="none"
      className={`absolute inset-0 w-full h-full pointer-events-none select-none ${className}`}
      aria-hidden="true"
    >
      <defs>
        {/* Subtle diagonal micro-security pattern */}
        <pattern
          id={`microSecurityPinstripes_${orientation}_${theme}`}
          width="14"
          height="14"
          patternTransform="rotate(45 0 0)"
          patternUnits="userSpaceOnUse"
        >
          <line
            x1="0"
            y1="0"
            x2="0"
            y2="14"
            stroke={currentTheme.primaryWave}
            strokeWidth="0.6"
            strokeOpacity="0.04"
          />
        </pattern>

        {/* Soft atmospheric background gradient */}
        <linearGradient
          id={`bgFieldGrad_${orientation}_${theme}`}
          x1="0%"
          y1="0%"
          x2="100%"
          y2="100%"
        >
          <stop offset="0%" stopColor={currentTheme.stop1} />
          <stop offset="40%" stopColor={currentTheme.stop2} />
          <stop offset="85%" stopColor={currentTheme.stop3} stopOpacity="0.8" />
          <stop offset="100%" stopColor="#ffffff" />
        </linearGradient>

        {/* Gold accent line gradient */}
        <linearGradient
          id={`goldRibbonGrad_${orientation}_${theme}`}
          x1="0%"
          y1="0%"
          x2="100%"
          y2="0%"
        >
          <stop offset="0%" stopColor={currentTheme.accentLine} stopOpacity="0.85" />
          <stop offset="50%" stopColor="#fef08a" stopOpacity="1" />
          <stop offset="100%" stopColor={currentTheme.accentLine} stopOpacity="0.85" />
        </linearGradient>

        {/* Radial highlight for photo anchor */}
        <radialGradient
          id={`photoBackingRadial_${orientation}_${theme}`}
          cx="50%"
          cy={isPortrait ? "24%" : "50%"}
          r={isPortrait ? "28%" : "38%"}
        >
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="60%" stopColor={currentTheme.stop2} stopOpacity="0.5" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* 1. Base luminous soft-toned field */}
      <rect
        width="100%"
        height="100%"
        fill={`url(#bgFieldGrad_${orientation}_${theme})`}
      />

      {/* 2. Micro-security texture over body */}
      <rect
        width="100%"
        height="100%"
        fill={`url(#microSecurityPinstripes_${orientation}_${theme})`}
      />

      {/* 3. Radial photo highlight */}
      <rect
        width="100%"
        height="100%"
        fill={`url(#photoBackingRadial_${orientation}_${theme})`}
      />

      {isPortrait ? (
        // ================= PORTRAIT ARTWORK =================
        <g>
          {/* Subtle Guilloche Security Waves in lower and middle sections */}
          <g stroke={currentTheme.primaryWave} strokeWidth="0.8" fill="none" opacity="0.065">
            <path d="M-40 370 Q 140 310, 270 380 T 580 360" />
            <path d="M-40 390 Q 140 330, 270 400 T 580 380" />
            <path d="M-40 410 Q 140 350, 270 420 T 580 400" />
            <path d="M-40 430 Q 140 370, 270 440 T 580 420" />
            <path d="M-40 450 Q 140 390, 270 460 T 580 440" />
            <path d="M-40 470 Q 140 410, 270 480 T 580 460" />
            <path d="M-40 490 Q 140 430, 270 500 T 580 480" />
            <path d="M-40 510 Q 140 450, 270 520 T 580 500" />
          </g>

          {/* Lateral flowing curves connecting top and bottom */}
          <path
            d="M 0 150 C 95 185, 110 275, 45 375 C -10 455, 25 615, 0 715 L 0 150 Z"
            fill={currentTheme.primaryWave}
            fillOpacity="0.03"
          />
          <path
            d="M 540 170 C 455 205, 425 305, 485 405 C 525 475, 515 635, 540 725 L 540 170 Z"
            fill={currentTheme.primaryWave}
            fillOpacity="0.03"
          />

          {/* Central Watermark: Academic Seal & Heraldic Laurel */}
          <g transform="translate(270, 520) scale(1.15)" opacity="0.05">
            {/* Outer Laurel circle */}
            <circle r="110" stroke={currentTheme.primaryWave} strokeWidth="2" strokeDasharray="6 4" fill="none" />
            <circle r="95" stroke={currentTheme.primaryWave} strokeWidth="1" fill="none" />
            {/* Stylized Book of Learning */}
            <path
              d="M -45 -10 Q 0 -22, 0 25 Q -25 15, -45 20 Z"
              fill={currentTheme.primaryWave}
            />
            <path
              d="M 45 -10 Q 0 -22, 0 25 Q 25 15, 45 20 Z"
              fill={currentTheme.primaryWave}
            />
            {/* Star of Knowledge */}
            <path
              d="M 0 -45 L 8 -25 L 30 -25 L 12 -12 L 18 10 L 0 -2 L -18 10 L -12 -12 L -30 -25 L -8 -25 Z"
              fill={currentTheme.primaryWave}
            />
          </g>

          {/* Decorative Corner Filigree Accents in Data Area */}
          <g stroke={currentTheme.primaryWave} strokeWidth="1.2" opacity="0.18">
            {/* Top Left filigree */}
            <path d="M 22 360 L 22 340 L 42 340" fill="none" />
            <circle cx="22" cy="340" r="1.5" fill={currentTheme.primaryWave} />

            {/* Top Right filigree */}
            <path d="M 518 360 L 518 340 L 498 340" fill="none" />
            <circle cx="518" cy="340" r="1.5" fill={currentTheme.primaryWave} />

            {/* Bottom Left filigree */}
            <path d="M 22 725 L 22 745 L 42 745" fill="none" />
            <circle cx="22" cy="745" r="1.5" fill={currentTheme.primaryWave} />

            {/* Bottom Right filigree */}
            <path d="M 518 725 L 518 745 L 498 745" fill="none" />
            <circle cx="518" cy="745" r="1.5" fill={currentTheme.primaryWave} />
          </g>

          {/* Lower Geometric Waves connecting to Footer */}
          <path
            d="M 0 755 Q 180 735, 270 765 T 540 750 L 540 788 L 0 788 Z"
            fill={currentTheme.primaryWave}
            fillOpacity="0.04"
          />
        </g>
      ) : (
        // ================= LANDSCAPE ARTWORK =================
        <g>
          {/* Subtle Guilloche Waves across horizontal card */}
          <g stroke={currentTheme.primaryWave} strokeWidth="0.8" fill="none" opacity="0.065">
            <path d="M 120 115 Q 320 75, 520 125 T 920 105" />
            <path d="M 120 135 Q 320 95, 520 145 T 920 125" />
            <path d="M 120 155 Q 320 115, 520 165 T 920 145" />
            <path d="M 120 175 Q 320 135, 520 185 T 920 165" />
            <path d="M 120 195 Q 320 155, 520 205 T 920 185" />
            <path d="M 120 215 Q 320 175, 520 225 T 920 205" />
            <path d="M 120 235 Q 320 195, 520 245 T 920 225" />
            <path d="M 120 255 Q 320 215, 520 265 T 920 245" />
          </g>

          {/* Soft Left Side Curved Panel Behind Photo */}
          <path
            d="M 0 65 Q 245 55, 235 255 T 0 455 Z"
            fill={currentTheme.primaryWave}
            fillOpacity="0.025"
          />

          {/* Right Area Academic Crest Watermark */}
          <g transform="translate(670, 270) scale(1.1)" opacity="0.05">
            <circle r="95" stroke={currentTheme.primaryWave} strokeWidth="2" strokeDasharray="5 4" fill="none" />
            <circle r="80" stroke={currentTheme.primaryWave} strokeWidth="1" fill="none" />
            <path
              d="M -38 -8 Q 0 -18, 0 20 Q -20 12, -38 16 Z"
              fill={currentTheme.primaryWave}
            />
            <path
              d="M 38 -8 Q 0 -18, 0 20 Q 20 12, 38 16 Z"
              fill={currentTheme.primaryWave}
            />
            <path
              d="M 0 -38 L 7 -20 L 25 -20 L 10 -10 L 15 8 L 0 -1 L -15 8 L -10 -10 L -25 -20 L -7 -20 Z"
              fill={currentTheme.primaryWave}
            />
          </g>

          {/* Decorative Corner Filigree in Landscape */}
          <g stroke={currentTheme.primaryWave} strokeWidth="1.2" opacity="0.18">
            <path d="M 235 105 L 235 90 L 250 90" fill="none" />
            <path d="M 830 105 L 830 90 L 815 90" fill="none" />
            <path d="M 235 435 L 235 450 L 250 450" fill="none" />
            <path d="M 830 435 L 830 450 L 815 450" fill="none" />
          </g>
        </g>
      )}

      {/* Fine Gold Accent Divider at Top */}
      <line
        x1="0"
        y1={isPortrait ? "110" : "75"}
        x2="100%"
        y2={isPortrait ? "110" : "75"}
        stroke={`url(#goldRibbonGrad_${orientation}_${theme})`}
        strokeWidth="1.5"
      />
    </svg>
  );
};
