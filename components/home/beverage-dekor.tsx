'use client';

/* ──────────────────────────────────────────────────────
   Beverage Dekor — per-drink absolute decoration set.
   Each drink has its own splash/PNG + CSS/SVG effects.
   Controlled by activeIndex: only 1 dekor visible at a time.
   Crossfades in place — NEVER slides with the slider.
   ────────────────────────────────────────────────────── */

import { AnimatePresence, motion } from 'framer-motion';
import type { Easing } from 'framer-motion';
import Image from 'next/image';

interface DekorSet {
  id: number;
  color: string;
  pngAsset?: string;                  // real PNG from public/
  pngPosition: string;                // Tailwind positioning
  pngSize: number;                    // width/height in px
  ringColor: string;                  // CSS ring glow color
  particles: Array<{
    x: string; y: string;
    size: number; delay: number;
    color: string;
  }>;
}

const DEKOR_SETS: DekorSet[] = [
  {
    id: 0, // Berry Bliss
    color: '#FF6BBF',
    pngAsset: '/milk splash.png',
    pngPosition: 'top-[10%] left-[5%]',
    pngSize: 180,
    ringColor: 'rgba(255,107,191,0.25)',
    particles: [
      { x: '15%', y: '20%', size: 8, delay: 0, color: '#FF6BBF' },
      { x: '75%', y: '15%', size: 6, delay: 0.3, color: '#FFB3DB' },
      { x: '80%', y: '70%', size: 10, delay: 0.6, color: '#FF6BBF' },
      { x: '10%', y: '75%', size: 5, delay: 0.9, color: '#FFD1EB' },
      { x: '50%', y: '85%', size: 7, delay: 1.2, color: '#FF6BBF' },
    ],
  },
  {
    id: 1, // Orange Sunset
    color: '#FF8C42',
    pngAsset: '/bars.png',
    pngPosition: 'top-[8%] right-[5%]',
    pngSize: 140,
    ringColor: 'rgba(255,140,66,0.25)',
    particles: [
      { x: '20%', y: '25%', size: 9, delay: 0.1, color: '#FF8C42' },
      { x: '70%', y: '18%', size: 7, delay: 0.4, color: '#FFB07A' },
      { x: '85%', y: '65%', size: 11, delay: 0.7, color: '#FF8C42' },
      { x: '12%', y: '80%', size: 6, delay: 1.0, color: '#FFD4AD' },
      { x: '55%', y: '90%', size: 8, delay: 0.2, color: '#FF8C42' },
    ],
  },
  {
    id: 2, // Caramel Swirl
    color: '#FFD93D',
    pngAsset: '/caramel blocks.png',
    pngPosition: 'bottom-[10%] left-[8%]',
    pngSize: 130,
    ringColor: 'rgba(255,217,61,0.25)',
    particles: [
      { x: '25%', y: '15%', size: 7, delay: 0.2, color: '#FFD93D' },
      { x: '65%', y: '22%', size: 10, delay: 0.5, color: '#FFEC8B' },
      { x: '78%', y: '60%', size: 6, delay: 0.8, color: '#FFD93D' },
      { x: '18%', y: '72%', size: 9, delay: 0.1, color: '#FFF5B5' },
      { x: '45%', y: '88%', size: 5, delay: 1.1, color: '#FFD93D' },
    ],
  },
  {
    id: 3, // Mint Fresh
    color: '#7DD3A0',
    pngAsset: '/bars 1.png',
    pngPosition: 'top-[12%] left-[10%]',
    pngSize: 120,
    ringColor: 'rgba(125,211,160,0.25)',
    particles: [
      { x: '22%', y: '18%', size: 8, delay: 0.3, color: '#7DD3A0' },
      { x: '72%', y: '12%', size: 6, delay: 0.6, color: '#A8E6C1' },
      { x: '82%', y: '68%', size: 10, delay: 0, color: '#7DD3A0' },
      { x: '15%', y: '78%', size: 7, delay: 0.9, color: '#C5F0D5' },
      { x: '60%', y: '82%', size: 5, delay: 0.4, color: '#7DD3A0' },
    ],
  },
  {
    id: 4, // Vanilla Dream
    color: '#B07DD3',
    pngAsset: '/caramel bloks 2.png',
    pngPosition: 'top-[5%] right-[8%]',
    pngSize: 130,
    ringColor: 'rgba(176,125,211,0.25)',
    particles: [
      { x: '18%', y: '22%', size: 9, delay: 0.1, color: '#B07DD3' },
      { x: '68%', y: '16%', size: 7, delay: 0.5, color: '#D4B3E8' },
      { x: '80%', y: '72%', size: 6, delay: 0.8, color: '#B07DD3' },
      { x: '10%', y: '82%', size: 10, delay: 0.3, color: '#E8D6F3' },
      { x: '52%', y: '92%', size: 8, delay: 0.7, color: '#B07DD3' },
    ],
  },
  {
    id: 5, // Classic Coffee
    color: '#8B5E3C',
    pngAsset: '/bars 2.png',
    pngPosition: 'bottom-[8%] right-[5%]',
    pngSize: 140,
    ringColor: 'rgba(139,94,60,0.25)',
    particles: [
      { x: '20%', y: '20%', size: 7, delay: 0.2, color: '#8B5E3C' },
      { x: '75%', y: '14%', size: 9, delay: 0.6, color: '#B88B6A' },
      { x: '85%', y: '62%', size: 5, delay: 0, color: '#8B5E3C' },
      { x: '12%', y: '76%', size: 8, delay: 0.9, color: '#D4B896' },
      { x: '48%', y: '86%', size: 6, delay: 0.4, color: '#8B5E3C' },
    ],
  },
];

const dekorVariants = {
  initial: { opacity: 0, scale: 0.92 },
  animate: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: 'easeOut' as Easing } },
  exit:    { opacity: 0, scale: 0.95, transition: { duration: 0.35, ease: 'easeIn' as Easing } },
};

const particleFloat = {
  animate: (delay: number) => ({
    y: [0, -8, 0, 6, 0],
    opacity: [0.5, 1, 0.7, 1, 0.5],
    transition: {
      duration: 4,
      delay,
      repeat: Infinity,
      ease: 'easeInOut' as Easing,
    },
  }),
};

interface Props {
  activeIndex: number;
}

export function BeverageDekor({ activeIndex }: Props) {
  return (
    <div className="absolute inset-0 pointer-events-none z-1 overflow-hidden">
      <AnimatePresence mode="wait">
        {DEKOR_SETS.map(
          (dekor) =>
            dekor.id === activeIndex && (
              <motion.div
                key={dekor.id}
                className="absolute inset-0"
                variants={dekorVariants}
                initial="initial"
                animate="animate"
                exit="exit"
              >
                {/* ── Glow ring behind center ── */}
                <div
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
                  style={{
                    width: '55%',
                    height: '55%',
                    border: `3px solid ${dekor.ringColor}`,
                    boxShadow: `0 0 60px 20px ${dekor.ringColor}, inset 0 0 40px 10px ${dekor.ringColor}`,
                  }}
                />

                {/* ── PNG asset ── */}
                {dekor.pngAsset && (
                  <div className={`absolute ${dekor.pngPosition} opacity-60`}>
                    <Image
                      src={dekor.pngAsset}
                      alt=""
                      width={dekor.pngSize}
                      height={dekor.pngSize}
                      className="object-contain drop-shadow-lg select-none"
                      draggable={false}
                    />
                  </div>
                )}

                {/* ── Floating particles ── */}
                {dekor.particles.map((p, i) => (
                  <motion.div
                    key={i}
                    className="absolute rounded-full"
                    style={{
                      left: p.x,
                      top: p.y,
                      width: p.size,
                      height: p.size,
                      background: p.color,
                      boxShadow: `0 0 ${p.size * 2}px ${p.color}`,
                    }}
                    custom={p.delay}
                    animate="animate"
                    variants={particleFloat}
                  />
                ))}

                {/* ── SVG splash accent — generated per-drink ── */}
                <svg
                  className="absolute top-[15%] right-[10%] opacity-20"
                  width="120"
                  height="120"
                  viewBox="0 0 120 120"
                  fill="none"
                >
                  <circle cx="60" cy="60" r="50" stroke={dekor.color} strokeWidth="2" opacity="0.4" />
                  <circle cx="60" cy="60" r="35" stroke={dekor.color} strokeWidth="1.5" opacity="0.3" />
                  <circle cx="60" cy="60" r="20" fill={dekor.color} opacity="0.1" />
                </svg>
              </motion.div>
            ),
        )}
      </AnimatePresence>
    </div>
  );
}
