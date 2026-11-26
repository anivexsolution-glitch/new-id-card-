import React from 'react';

interface BarcodeSvgProps {
  value: string;
  className?: string;
  color?: string;
}

export const BarcodeSvg: React.FC<BarcodeSvgProps> = ({ value, className = 'h-7 w-full', color = '#1e293b' }) => {
  // Generate deterministic bar widths based on input string
  const bars: { width: number; isBar: boolean }[] = [];
  const cleanVal = (value || 'SCH20250001').toUpperCase();
  
  // Guard bars
  bars.push({ width: 2, isBar: true }, { width: 1, isBar: false }, { width: 1, isBar: true });
  
  for (let i = 0; i < cleanVal.length; i++) {
    const charCode = cleanVal.charCodeAt(i);
    const pattern = [(charCode % 3) + 1, ((charCode >> 1) % 2) + 1, ((charCode >> 2) % 3) + 1, 1];
    pattern.forEach((w, idx) => {
      bars.push({ width: w, isBar: idx % 2 === 0 });
    });
  }

  // End guard
  bars.push({ width: 1, isBar: true }, { width: 1, isBar: false }, { width: 2, isBar: true });

  const totalWidth = bars.reduce((acc, b) => acc + b.width, 0);

  let currentX = 0;
  return (
    <svg viewBox={`0 0 ${totalWidth} 40`} preserveAspectRatio="none" className={className}>
      {bars.map((bar, i) => {
        const x = currentX;
        currentX += bar.width;
        if (!bar.isBar) return null;
        return <rect key={i} x={x} y="0" width={bar.width} height="40" fill={color} />;
      })}
    </svg>
  );
};

export const MiniQrSvg: React.FC<{ value: string; className?: string; color?: string }> = ({
  value,
  className = 'w-10 h-10',
  color = '#0f172a',
}) => {
  // Pure SVG stylized 2D Matrix / QR Code
  return (
    <svg viewBox="0 0 33 33" className={className} fill={color}>
      {/* Top Left Finder */}
      <rect x="0" y="0" width="7" height="7" rx="1" fill={color} />
      <rect x="1.5" y="1.5" width="4" height="4" fill="#ffffff" />
      <rect x="2.5" y="2.5" width="2" height="2" fill={color} />

      {/* Top Right Finder */}
      <rect x="26" y="0" width="7" height="7" rx="1" fill={color} />
      <rect x="27.5" y="1.5" width="4" height="4" fill="#ffffff" />
      <rect x="28.5" y="2.5" width="2" height="2" fill={color} />

      {/* Bottom Left Finder */}
      <rect x="0" y="26" width="7" height="7" rx="1" fill={color} />
      <rect x="1.5" y="27.5" width="4" height="4" fill="#ffffff" />
      <rect x="2.5" y="28.5" width="2" height="2" fill={color} />

      {/* Decorative Matrix points */}
      <rect x="9" y="2" width="2" height="2" />
      <rect x="13" y="2" width="2" height="2" />
      <rect x="17" y="2" width="2" height="2" />
      <rect x="21" y="2" width="2" height="2" />

      <rect x="9" y="5" width="2" height="2" />
      <rect x="15" y="5" width="2" height="2" />
      <rect x="19" y="5" width="2" height="2" />

      <rect x="9" y="9" width="2" height="2" />
      <rect x="13" y="9" width="2" height="2" />
      <rect x="17" y="9" width="2" height="2" />
      <rect x="21" y="9" width="2" height="2" />
      <rect x="25" y="9" width="2" height="2" />

      <rect x="2" y="11" width="2" height="2" />
      <rect x="6" y="11" width="2" height="2" />
      <rect x="11" y="13" width="2" height="2" />
      <rect x="15" y="13" width="2" height="2" />
      <rect x="23" y="13" width="2" height="2" />
      <rect x="27" y="13" width="2" height="2" />

      <rect x="2" y="17" width="2" height="2" />
      <rect x="9" y="17" width="2" height="2" />
      <rect x="13" y="17" width="2" height="2" />
      <rect x="17" y="17" width="2" height="2" />
      <rect x="21" y="17" width="2" height="2" />
      <rect x="29" y="17" width="2" height="2" />

      <rect x="9" y="21" width="2" height="2" />
      <rect x="15" y="21" width="2" height="2" />
      <rect x="21" y="21" width="2" height="2" />
      <rect x="25" y="21" width="2" height="2" />

      <rect x="9" y="25" width="2" height="2" />
      <rect x="13" y="25" width="2" height="2" />
      <rect x="17" y="25" width="2" height="2" />
      <rect x="21" y="25" width="2" height="2" />
      <rect x="27" y="25" width="2" height="2" />

      <rect x="11" y="29" width="2" height="2" />
      <rect x="15" y="29" width="2" height="2" />
      <rect x="19" y="29" width="2" height="2" />
      <rect x="23" y="29" width="2" height="2" />
    </svg>
  );
};
