import React from 'react';

interface JtechLogoProps {
  className?: string;
  size?: number;
}

export const JtechLogo: React.FC<JtechLogoProps> = ({ className = 'w-6 h-6', size }) => {
  return (
    <svg
      viewBox="0 0 400 480"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={size ? { width: size, height: (size * 480) / 400 } : undefined}
    >
      <defs>
        {/* Main Ribbon Gradient */}
        <linearGradient id="jtech-blue-grad" x1="60" y1="460" x2="380" y2="160" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#0077C8" />
          <stop offset="35%" stopColor="#0052A3" />
          <stop offset="70%" stopColor="#0B2068" />
          <stop offset="100%" stopColor="#05123E" />
        </linearGradient>

        {/* Lower Cyan Glow Gradient */}
        <linearGradient id="jtech-cyan-loop" x1="40" y1="460" x2="200" y2="340" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#0088DB" />
          <stop offset="50%" stopColor="#0066B3" />
          <stop offset="100%" stopColor="#0A226E" />
        </linearGradient>

        {/* Right Wing Facet Gradient */}
        <linearGradient id="jtech-wing-top" x1="200" y1="180" x2="390" y2="150" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#0A2577" />
          <stop offset="100%" stopColor="#0047BA" />
        </linearGradient>

        {/* Red Signal Gradient */}
        <linearGradient id="jtech-red-grad" x1="90" y1="20" x2="210" y2="90" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#CC0000" />
          <stop offset="100%" stopColor="#A80000" />
        </linearGradient>
      </defs>

      {/* Red Signal / WiFi Arcs at Top */}
      <g fill="url(#jtech-red-grad)">
        {/* Center Dot */}
        <circle cx="150" cy="88" r="14" fill="#D32F2F" />

        {/* Inner Arc (Wave 1) */}
        <path
          d="M 120 72 A 38 38 0 0 1 180 72 C 177 66 172 63 167 65 A 25 25 0 0 0 133 65 C 128 63 123 66 120 72 Z"
          fill="#D32F2F"
        />

        {/* Middle Arc (Wave 2) */}
        <path
          d="M 105 52 A 62 62 0 0 1 195 52 C 192 46 186 42 181 44 A 48 48 0 0 0 119 44 C 114 42 108 46 105 52 Z"
          fill="#C62828"
        />

        {/* Outer Arc (Wave 3) */}
        <path
          d="M 90 32 A 86 86 0 0 1 210 32 C 206 26 200 22 194 24 A 72 72 0 0 0 106 24 C 100 22 94 26 90 32 Z"
          fill="#B71C1C"
        />
      </g>

      {/* Dynamic Stylized 'J' Logo */}
      <g>
        {/* Top Dark Column / Stem */}
        <path
          d="M 128 140 L 195 102 L 195 210 L 138 226 Z"
          fill="#06123D"
        />

        {/* Right Wing Arm */}
        <path
          d="M 195 140 L 388 140 L 350 178 L 195 258 Z"
          fill="url(#jtech-wing-top)"
        />

        {/* Dynamic Curved Main Body and Lower Loop */}
        <path
          d="M 195 210 
             L 388 140
             L 350 182
             L 204 268
             C 192 312 170 380 152 418
             C 142 438 128 456 108 464
             C 80 475 48 462 28 440
             C 8 418 2 384 10 354
             C 24 306 68 250 120 205
             C 134 193 148 182 162 172
             L 138 224
             C 106 256 68 304 54 346
             C 44 376 48 404 68 422
             C 82 434 104 436 120 422
             C 144 402 164 350 176 304
             C 182 280 188 248 195 210 Z"
          fill="url(#jtech-blue-grad)"
        />

        {/* Sweeping Cyan Tip Accent */}
        <path
          d="M 68 422
             C 86 438 112 438 132 422
             C 148 408 158 386 160 366
             C 152 390 138 412 120 422
             C 104 432 86 430 72 418
             C 52 398 50 368 62 336
             C 74 304 102 264 132 230
             L 120 205
             C 68 250 24 306 10 354
             C 2 384 8 418 28 440
             C 48 462 80 475 108 464
             C 132 454 150 432 160 410
             L 152 418
             C 132 444 102 452 78 438
             C 74 434 70 428 68 422 Z"
          fill="url(#jtech-cyan-loop)"
        />
      </g>
    </svg>
  );
};
