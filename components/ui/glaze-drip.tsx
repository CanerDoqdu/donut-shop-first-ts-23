'use client';

/* ──────────────────────────────────────────────────────
   Chocolate Sauce Drip — Thick chocolate pool with
   drops that detach, fall randomly, and disappear.
   ────────────────────────────────────────────────────── */

import { useEffect, useState, startTransition } from 'react';

interface FallingDrop {
  id: number;
  x: number;       // % position
  delay: number;    // start delay
  dur: number;      // fall duration
  size: number;     // drop size
  swingAmt: number; // horizontal drift
}

function generateDrops(count: number): FallingDrop[] {
  const drops: FallingDrop[] = [];
  for (let i = 0; i < count; i++) {
    drops.push({
      id: i,
      x: 3 + Math.random() * 94,
      delay: Math.random() * 6,
      dur: 1.5 + Math.random() * 2.5,
      size: 4 + Math.random() * 8,
      swingAmt: -15 + Math.random() * 30,
    });
  }
  return drops;
}

export function GlazeDrip({
  toColor = 'transparent',
}: {
  toColor?: string;
}) {
  const [drops, setDrops] = useState<FallingDrop[]>([]);

  useEffect(() => {
    startTransition(() => {
      setDrops(generateDrops(20));
    });
  }, []);

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
      </svg>

      {/* 4) Falling drops — detach from pool, fall randomly, and disappear */}
      <div
        className="absolute left-0 right-0 pointer-events-none"
        style={{ top: '18%', height: '82%', overflow: 'hidden' }}
      >
        {drops.map((d) => (
          <div
            key={d.id}
            style={{
              position: 'absolute',
              left: `${d.x}%`,
              top: '0px',
              width: `${d.size}px`,
              height: `${d.size}px`,
              borderRadius: '50%',
              background: 'radial-gradient(circle at 35% 35%, #7B3F10, #3E1F0D)',
              boxShadow: '0 2px 6px rgba(62,31,13,0.5)',
              animation: `chocoDropFall ${d.dur}s ${d.delay}s ease-in infinite`,
              ['--swing' as string]: `${d.swingAmt}px`,
            }}
          />
        ))}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes chocoDropFall {
          0% {
            transform: translateY(0) translateX(0) scale(0.5);
            opacity: 0;
          }
          8% {
            transform: translateY(0) translateX(0) scale(1);
            opacity: 0.9;
          }
          80% {
            opacity: 0.7;
          }
          100% {
            transform: translateY(200px) translateX(var(--swing)) scale(0.3);
            opacity: 0;
          }
        }
      `}} />
    </div>
  );
}
