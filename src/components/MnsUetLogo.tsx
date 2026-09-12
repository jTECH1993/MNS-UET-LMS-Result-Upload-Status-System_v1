import React from 'react';

interface Props {
  className?: string;
  size?: number | 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}

const SIZE_PRESETS: Record<'xs' | 'sm' | 'md' | 'lg' | 'xl', number> = {
  xs: 24,
  sm: 32,
  md: 48,
  lg: 64,
  xl: 80,
};

/**
 * Official Emblem of Muhammad Nawaz Sharif University of Engineering & Technology (MNS-UET), Multan.
 * Features the signature 16-toothed blue gear, golden-yellow border, official circular typography,
 * wind turbines, structural bridge, high-voltage transmission pylon, photovoltaic solar panels,
 * and green landscape.
 */
export const MnsUetLogo: React.FC<Props> = ({ className = 'w-12 h-12', size }) => {
  const numericSize = typeof size === 'string' ? SIZE_PRESETS[size] : size;
  const dimension = numericSize ? `${numericSize}px` : undefined;

  return (
    <svg
      viewBox="0 0 240 240"
      className={`shrink-0 ${className}`}
      style={dimension ? { width: dimension, height: dimension } : undefined}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="MNS-UET Multan Official Logo"
    >
      <defs>
        {/* Gradients */}
        <radialGradient id="skyGrad" cx="50%" cy="45%" r="55%">
          <stop offset="0%" stopColor="#d9f0fc" />
          <stop offset="65%" stopColor="#9cc9e8" />
          <stop offset="100%" stopColor="#6aa7d4" />
        </radialGradient>

        <linearGradient id="gearGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1e469a" />
          <stop offset="40%" stopColor="#11337c" />
          <stop offset="100%" stopColor="#081e52" />
        </linearGradient>

        <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffe680" />
          <stop offset="45%" stopColor="#d99b1a" />
          <stop offset="75%" stopColor="#b3780a" />
          <stop offset="100%" stopColor="#875803" />
        </linearGradient>

        <linearGradient id="solarGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#2c5e94" />
          <stop offset="100%" stopColor="#122f54" />
        </linearGradient>

        <linearGradient id="greenHills" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#629e32" />
          <stop offset="60%" stopColor="#3d6c1b" />
          <stop offset="100%" stopColor="#25470d" />
        </linearGradient>

        {/* 16-toothed cogwheel path */}
        <filter id="gearShadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#040e28" floodOpacity="0.45" />
        </filter>
      </defs>

      {/* 16 Gear Teeth Cogwheel */}
      <g id="gear-teeth" filter="url(#gearShadow)">
        {/* Outer 16 teeth constructed symmetrically */}
        {Array.from({ length: 16 }).map((_, i) => {
          const angle = (i * 360) / 16;
          return (
            <path
              key={i}
              d="M 112 10 L 128 10 L 132 28 L 108 28 Z"
              fill="url(#gearGrad)"
              stroke="url(#goldGrad)"
              strokeWidth="2.5"
              strokeLinejoin="round"
              transform={`rotate(${angle} 120 120)`}
            />
          );
        })}

        {/* Outer Main Gear Body Circle */}
        <circle
          cx="120"
          cy="120"
          r="98"
          fill="url(#gearGrad)"
          stroke="url(#goldGrad)"
          strokeWidth="3.5"
        />
      </g>

      {/* Golden Separator Ring */}
      <circle
        cx="120"
        cy="120"
        r="75"
        fill="none"
        stroke="url(#goldGrad)"
        strokeWidth="2.5"
      />

      {/* Outer Ring Text: Circular Curved Paths */}
      <defs>
        {/* Top arc for University Name (clockwise) */}
        <path
          id="topTextArc"
          d="M 36 120 A 84 84 0 1 1 204 120"
          fill="none"
        />
        {/* Bottom arc for Multan text (clockwise) */}
        <path
          id="bottomTextArc"
          d="M 60 130 A 82 82 0 0 0 180 130"
          fill="none"
        />
      </defs>

      <text
        fill="#ffffff"
        fontSize="9.2"
        fontWeight="bold"
        fontFamily="sans-serif"
        letterSpacing="0.6px"
      >
        <textPath href="#topTextArc" startOffset="50%" textAnchor="middle">
          ★ MUHAMMAD NAWAZ SHARIF UNIVERSITY OF ENGINEERING &amp; TECHNOLOGY ★
        </textPath>
      </text>

      <text
        fill="#ffffff"
        fontSize="10"
        fontWeight="bold"
        fontFamily="sans-serif"
        letterSpacing="2px"
      >
        <textPath href="#bottomTextArc" startOffset="50%" textAnchor="middle">
          ★ MULTAN ★
        </textPath>
      </text>

      {/* Inner Medallion: Clip Path to Circle (radius 72) */}
      <clipPath id="innerMedallionClip">
        <circle cx="120" cy="120" r="72" />
      </clipPath>

      <g clipPath="url(#innerMedallionClip)">
        {/* Sky Background */}
        <rect x="40" y="40" width="160" height="160" fill="url(#skyGrad)" />

        {/* Distant Clouds */}
        <path
          d="M 65 95 Q 75 88 88 92 Q 100 85 112 92 Q 120 89 128 95 Z"
          fill="#ffffff"
          opacity="0.5"
        />
        <path
          d="M 130 90 Q 142 82 155 87 Q 168 83 175 92 Z"
          fill="#ffffff"
          opacity="0.45"
        />

        {/* Steel Truss Bridge in Background */}
        <g id="bridge" stroke="#52657e" strokeWidth="1.2" fill="none" opacity="0.85">
          {/* Bridge Horizontal deck */}
          <line x1="50" y1="118" x2="190" y2="118" strokeWidth="2.5" stroke="#3b4d66" />
          <line x1="50" y1="123" x2="190" y2="123" strokeWidth="1.5" stroke="#3b4d66" />
          {/* Truss Arches & Diagonals */}
          <path d="M 60 118 Q 85 96 110 118" />
          <path d="M 110 118 Q 135 96 160 118" />
          <path d="M 160 118 Q 175 102 190 118" />
          {/* Vertical hangers */}
          <line x1="72" y1="108" x2="72" y2="118" />
          <line x1="85" y1="100" x2="85" y2="118" />
          <line x1="98" y1="108" x2="98" y2="118" />
          <line x1="122" y1="108" x2="122" y2="118" />
          <line x1="135" y1="100" x2="135" y2="118" />
          <line x1="148" y1="108" x2="148" y2="118" />
          {/* Bridge Pillars */}
          <rect x="58" y="118" width="5" height="40" fill="#465a73" />
          <rect x="108" y="118" width="5" height="40" fill="#465a73" />
          <rect x="158" y="118" width="5" height="40" fill="#465a73" />
        </g>

        {/* High Voltage Electrical Transmission Tower / Pylon (Center-Left) */}
        <g id="electric-pylon" stroke="#37485c" strokeWidth="1.2" fill="none">
          {/* Tower Legs */}
          <line x1="100" y1="140" x2="108" y2="85" strokeWidth="1.6" />
          <line x1="116" y1="140" x2="108" y2="85" strokeWidth="1.6" />
          {/* Lattice crossbars */}
          <line x1="102" y1="130" x2="114" y2="130" />
          <line x1="104" y1="118" x2="112" y2="118" />
          <line x1="105" y1="105" x2="111" y2="105" />
          <line x1="107" y1="92" x2="109" y2="92" />
          {/* Cross braces */}
          <line x1="102" y1="130" x2="112" y2="118" />
          <line x1="114" y1="130" x2="104" y2="118" />
          <line x1="104" y1="118" x2="111" y2="105" />
          <line x1="112" y1="118" x2="105" y2="105" />
          {/* Cross arms for power cables */}
          <line x1="98" y1="95" x2="118" y2="95" strokeWidth="1.8" />
          <line x1="95" y1="108" x2="121" y2="108" strokeWidth="1.8" />
        </g>

        {/* Wind Turbine 1 (Prominent Center-Left) */}
        <g id="wind-turbine-1">
          {/* Tower */}
          <polygon points="98,138 101,138 100,76 99,76" fill="#f0f4f8" stroke="#cbd5e1" strokeWidth="0.5" />
          {/* Hub */}
          <circle cx="99.5" cy="76" r="2.2" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="0.5" />
          {/* 3 Blades */}
          <path d="M 99.5 76 Q 98 62 99.5 50 Q 101 62 99.5 76" fill="#ffffff" stroke="#94a3b8" strokeWidth="0.5" />
          <path d="M 99.5 76 Q 112 80 122 84 Q 110 85 99.5 76" fill="#ffffff" stroke="#94a3b8" strokeWidth="0.5" />
          <path d="M 99.5 76 Q 89 86 80 94 Q 87 84 99.5 76" fill="#ffffff" stroke="#94a3b8" strokeWidth="0.5" />
        </g>

        {/* Wind Turbine 2 (Smaller, Background Left) */}
        <g id="wind-turbine-2" opacity="0.9">
          <polygon points="78,130 80,130 79,88 78.5,88" fill="#e2e8f0" />
          <circle cx="79" cy="88" r="1.6" fill="#cbd5e1" />
          <path d="M 79 88 Q 78 78 79 68 Q 80 78 79 88" fill="#ffffff" />
          <path d="M 79 88 Q 88 92 95 96 Q 86 94 79 88" fill="#ffffff" />
          <path d="M 79 88 Q 72 95 65 101 Q 71 93 79 88" fill="#ffffff" />
        </g>

        {/* Green Rolling Hills Landscape (Bottom Base) */}
        <path
          d="M 40 148 Q 70 135 105 142 Q 140 136 175 145 Q 195 150 200 160 L 200 200 L 40 200 Z"
          fill="url(#greenHills)"
        />
        <path
          d="M 40 158 Q 75 148 115 155 Q 155 148 200 162 L 200 200 L 40 200 Z"
          fill="#224b0c"
          opacity="0.8"
        />

        {/* Slanted Photovoltaic Solar Panel Array (Foreground Right Slope) */}
        <g id="solar-panels" transform="translate(118, 126)">
          {/* Main panel board tilted perspective */}
          <polygon
            points="12,18 64,10 54,48 4,52"
            fill="url(#solarGrad)"
            stroke="#cbd5e1"
            strokeWidth="1.2"
          />
          {/* Grid lines inside solar array */}
          {/* Vertical grid cell separators */}
          <line x1="25" y1="16" x2="16" y2="49" stroke="#93c5fd" strokeWidth="0.8" opacity="0.75" />
          <line x1="38" y1="14" x2="29" y2="48" stroke="#93c5fd" strokeWidth="0.8" opacity="0.75" />
          <line x1="51" y1="12" x2="42" y2="48" stroke="#93c5fd" strokeWidth="0.8" opacity="0.75" />
          {/* Horizontal grid rows */}
          <line x1="10" y1="26" x2="61" y2="19" stroke="#93c5fd" strokeWidth="0.8" opacity="0.75" />
          <line x1="8" y1="35" x2="59" y2="28" stroke="#93c5fd" strokeWidth="0.8" opacity="0.75" />
          <line x1="6" y1="44" x2="56" y2="38" stroke="#93c5fd" strokeWidth="0.8" opacity="0.75" />

          {/* Metal mounting stands */}
          <line x1="12" y1="51" x2="12" y2="58" stroke="#64748b" strokeWidth="1.8" />
          <line x1="48" y1="48" x2="48" y2="56" stroke="#64748b" strokeWidth="1.8" />
        </g>
      </g>

      {/* Inner Bezel Border */}
      <circle
        cx="120"
        cy="120"
        r="72"
        fill="none"
        stroke="url(#goldGrad)"
        strokeWidth="3.2"
      />
    </svg>
  );
};
