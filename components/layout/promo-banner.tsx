'use client';

/* ──────────────────────────────────────────────────────
   Promo News Banner — sticky below navbar.
   Desktop: static row with dot separators.
   Mobile: infinite CSS marquee ticker so text is readable.
   GlazeDrip sits behind the banner (hidden behind it).
   ────────────────────────────────────────────────────── */

import { GlazeDrip } from '@/components/ui/glaze-drip';
import { useTranslations } from 'next-intl';

const PROMO_KEYS = ['freeDelivery', 'newFlavors', 'firstOrder', 'fastDelivery', 'newDonut'] as const;

export function PromoBanner() {
  const t = useTranslations('promo');
  const promos = PROMO_KEYS.map((key) => t(key));

  const marqueeText = [...promos, ...promos]
    .map((p) => `${p}   •   `)
    .join('');

  return (
    <div
      className="sticky top-20 z-90 w-full select-none"
      style={{ height: '40px', overflow: 'visible' }}
    >
      {/* ── GlazeDrip behind the banner content ── */}
      <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 0 }}>
        <GlazeDrip />
      </div>

      {/* ── Banner content (on top) ── */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{
          zIndex: 1,
          background: 'linear-gradient(90deg, #FF6BBF 0%, #FF8C42 50%, #FFD93D 100%)',
        }}
      >
        {/* ── Desktop: static row ── */}
        <div className="hidden md:flex items-center justify-center h-full gap-6 px-4">
          {promos.map((promo, i) => (
            <span key={i} className="flex items-center gap-6">
              <span className="text-white text-sm font-semibold whitespace-nowrap">{promo}</span>
              {i < promos.length - 1 && (
                <span className="text-white/40 text-xs">•</span>
              )}
            </span>
          ))}
        </div>

        {/* ── Mobile: marquee ticker ── */}
        <div className="md:hidden flex items-center h-full overflow-hidden">
          <div
            className="whitespace-nowrap text-white text-sm font-semibold"
            style={{
              animation: 'promoBannerMarquee 25s linear infinite',
            }}
          >
            {marqueeText}
          </div>
        </div>
      </div>

      {/* Keyframes injected once */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes promoBannerMarquee {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }
      ` }} />
    </div>
  );
}
