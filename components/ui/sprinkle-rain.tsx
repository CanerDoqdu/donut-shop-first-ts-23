'use client';

/* ──────────────────────────────────────────────────────
   Sprinkle Rain — Colorful sprinkles falling from the sky.
   Fixed-position overlay above navbar (z-60).
   Fades out as user scrolls (0→600px).
   ────────────────────────────────────────────────────── */

import { useEffect, useState, useCallback } from 'react';

interface RainDrop {
  id: number;
  x: number;
  delay: number;
  duration: number;
  rotation: number;
  color: string;
  width: number;
  height: number;
  opacity: number;
  swingDur: number;
}

const SPRINKLE_COLORS = [
  '#FF6BBF', '#FF8C42', '#FFD93D', '#FF5252',
  '#4FC3F7', '#81C784', '#CE93D8', '#FF7043',
  '#FFFFFF', '#FFD93D',
];

function generateSprinkles(count: number): RainDrop[] {
  const drops: RainDrop[] = [];
  for (let i = 0; i < count; i++) {
    drops.push({
      id: i,
      x: 2 + Math.random() * 92, // Keep within 2-94% to prevent overflow
      delay: Math.random() * 12,
      duration: 8 + Math.random() * 10,
      rotation: Math.random() * 360,
      color: SPRINKLE_COLORS[Math.floor(Math.random() * SPRINKLE_COLORS.length)],
      width: 3 + Math.random() * 4,
      height: 12 + Math.random() * 14,
      opacity: 0.4 + Math.random() * 0.5,
      swingDur: 4 + Math.random() * 5,
    });
  }
  return drops;
}

export function SprinkleRain({ count = 60 }: { count?: number }) {
  const [drops, setDrops] = useState<RainDrop[]>([]);
  const [scrollOpacity, setScrollOpacity] = useState(1);

  useEffect(() => {
    setDrops(generateSprinkles(count));
  }, [count]);

  const handleScroll = useCallback(() => {
    const y = window.scrollY;
    setScrollOpacity(Math.max(0, 1 - y / 600));
  }, []);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  if (drops.length === 0) return null;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes sprinkleFall {
          0% {
            transform: translateY(-30px) translateX(0) rotate(var(--rot)) scale(1);
            opacity: 0;
          }
          5% { opacity: var(--drop-opacity); }
          12.5% { transform: translateY(calc(50vh * 0.25)) translateX(8px) rotate(calc(var(--rot) + 22deg)) scale(0.9); }
          25% { transform: translateY(calc(50vh * 0.5)) translateX(0) rotate(calc(var(--rot) + 45deg)) scale(0.8); }
          37.5% { transform: translateY(calc(50vh * 0.75)) translateX(-8px) rotate(calc(var(--rot) + 67deg)) scale(0.7); }
          45% { opacity: var(--drop-opacity); }
          50% {
            transform: translateY(50vh) translateX(0) rotate(calc(var(--rot) + 90deg)) scale(0.6);
            opacity: 0;
          }
          100% {
            transform: translateY(50vh) translateX(0) rotate(calc(var(--rot) + 90deg)) scale(0.6);
            opacity: 0;
          }
        }
      `}} />
      <div
        className="fixed top-0 left-0 pointer-events-none"
        style={{
          zIndex: 45,
          opacity: scrollOpacity,
          transition: 'opacity 0.1s linear',
          willChange: 'opacity',
          overflow: 'hidden',
          width: '100%',
          height: '100vh',
        }}
        aria-hidden="true"
      >
        {drops.map((d) => (
          <div
            key={d.id}
            style={{
              position: 'absolute',
              left: `${d.x}%`,
              top: '-30px',
              width: `${d.width}px`,
              height: `${d.height}px`,
              backgroundColor: d.color,
              borderRadius: `${d.width}px`,
              ['--rot' as string]: `${d.rotation}deg`,
              ['--drop-opacity' as string]: d.opacity,
              animation: `sprinkleFall ${d.duration}s ${d.delay}s linear infinite`,
              boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
            }}
          />
        ))}
      </div>
    </>
  );
}
