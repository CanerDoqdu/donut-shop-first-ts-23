'use client';

/* ──────────────────────────────────────────────────────
   Chocolate Sauce Drip — Thick chocolate pool with
   drops that detach, fall randomly, and disappear.
   ────────────────────────────────────────────────────── */

export function GlazeDrip({
  toColor = 'transparent',
}: {
  toColor?: string;
}) {
  const poolH = 50;
  const totalH = poolH + 220;

  return (
    <div className="relative w-full overflow-hidden" style={{ marginTop: '-2px' }}>
      <svg
        viewBox={`0 0 1000 ${totalH}`}
        xmlns="http://www.w3.org/2000/svg"
        className="w-full block"
        preserveAspectRatio="none"
        style={{ height: '260px', display: 'block' }}
      >
        <defs>
          {/* Rich chocolate gradient */}
          <linearGradient id="choco-main" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor="#3E1F0D" />
            <stop offset="25%"  stopColor="#5C2E0E" />
            <stop offset="50%"  stopColor="#7B3F10" />
            <stop offset="75%"  stopColor="#5C2E0E" />
            <stop offset="100%" stopColor="#3E1F0D" />
          </linearGradient>
          <linearGradient id="choco-gloss" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"  stopColor="#D4A76A" stopOpacity="0.6" />
            <stop offset="40%" stopColor="#C08840" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#3E1F0D" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="choco-shimmer" x1="0%" y1="0" x2="100%" y2="0">
            <stop offset="0%"  stopColor="#D4A76A" stopOpacity="0">
              <animate attributeName="offset" values="-0.3;1" dur="3s" repeatCount="indefinite" />
            </stop>
            <stop offset="15%" stopColor="#D4A76A" stopOpacity="0.35">
              <animate attributeName="offset" values="-0.15;1.15" dur="3s" repeatCount="indefinite" />
            </stop>
            <stop offset="30%" stopColor="#D4A76A" stopOpacity="0">
              <animate attributeName="offset" values="0;1.3" dur="3s" repeatCount="indefinite" />
            </stop>
          </linearGradient>
          <filter id="drip-glow">
            <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="rgba(62,31,13,0.4)" />
          </filter>
        </defs>

        {/* 1) Background — next section color */}
        <rect x="0" y={poolH} width="1000" height={totalH - poolH} fill={toColor} />

        {/* 2) Thick chocolate sauce pool — wavy bottom edge */}
        <path
          d={`
            M0,0 L1000,0 L1000,${poolH}
            C980,${poolH + 8} 955,${poolH - 3} 930,${poolH + 5}
            C900,${poolH + 12} 870,${poolH - 4} 840,${poolH + 6}
            C810,${poolH + 14} 780,${poolH - 2} 750,${poolH + 4}
            C720,${poolH + 10} 690,${poolH - 5} 660,${poolH + 7}
            C630,${poolH + 13} 600,${poolH - 3} 570,${poolH + 5}
            C540,${poolH + 11} 510,${poolH - 4} 480,${poolH + 6}
            C450,${poolH + 9}  420,${poolH - 2} 390,${poolH + 8}
            C360,${poolH + 12} 330,${poolH - 5} 300,${poolH + 4}
            C270,${poolH + 10} 240,${poolH - 3} 210,${poolH + 7}
            C180,${poolH + 14} 150,${poolH - 4} 120,${poolH + 5}
            C90,${poolH + 11}  60,${poolH - 2}  30,${poolH + 6}
            C15,${poolH + 9}   5,${poolH - 1}   0,${poolH + 3}
            Z
          `}
          fill="url(#choco-main)"
          filter="url(#drip-glow)"
        />
        {/* Glossy sheen */}
        <rect x="0" y="0" width="1000" height={poolH * 0.5} rx="0" fill="url(#choco-gloss)" />
        {/* Animated shimmer */}
        <rect x="0" y="2" width="1000" height={poolH * 0.3} fill="url(#choco-shimmer)" />

        {/* 3) Falling chocolate drops */}
        <g opacity="0.95">
          <ellipse cx="120" cy={poolH + 10} rx="9" ry="12" fill="#5C2E0E">
            <animate attributeName="cy" values={`${poolH + 10};${poolH + 180}`} dur="2.8s" begin="0.2s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0;0.95;0.95;0" dur="2.8s" begin="0.2s" repeatCount="indefinite" />
          </ellipse>

          <ellipse cx="245" cy={poolH + 8} rx="7" ry="10" fill="#7B3F10">
            <animate attributeName="cy" values={`${poolH + 8};${poolH + 170}`} dur="2.4s" begin="1.1s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0;0.9;0.9;0" dur="2.4s" begin="1.1s" repeatCount="indefinite" />
          </ellipse>

          <ellipse cx="410" cy={poolH + 12} rx="10" ry="13" fill="#3E1F0D">
            <animate attributeName="cy" values={`${poolH + 12};${poolH + 190}`} dur="3.1s" begin="0.7s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0;1;1;0" dur="3.1s" begin="0.7s" repeatCount="indefinite" />
          </ellipse>

          <ellipse cx="575" cy={poolH + 9} rx="8" ry="11" fill="#5C2E0E">
            <animate attributeName="cy" values={`${poolH + 9};${poolH + 175}`} dur="2.6s" begin="1.8s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0;0.9;0.9;0" dur="2.6s" begin="1.8s" repeatCount="indefinite" />
          </ellipse>

          <ellipse cx="735" cy={poolH + 11} rx="9" ry="12" fill="#7B3F10">
            <animate attributeName="cy" values={`${poolH + 11};${poolH + 185}`} dur="2.9s" begin="0.4s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0;0.95;0.95;0" dur="2.9s" begin="0.4s" repeatCount="indefinite" />
          </ellipse>

          <ellipse cx="890" cy={poolH + 7} rx="7" ry="10" fill="#3E1F0D">
            <animate attributeName="cy" values={`${poolH + 7};${poolH + 165}`} dur="2.2s" begin="1.4s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0;0.85;0.85;0" dur="2.2s" begin="1.4s" repeatCount="indefinite" />
          </ellipse>
        </g>
      </svg>

    </div>
  );
}
