'use client';

/* ──────────────────────────────────────────────────────
  Promo News Banner — sticky below navbar.
  Desktop + mobile: infinite marquee ticker.
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
        {/* ── Desktop: marquee ticker ── */}
        <div className="hidden md:flex items-center h-full overflow-hidden">
          <div
            className="whitespace-nowrap text-white text-sm font-semibold promo-banner-track"
            style={{
              animation: 'promoBannerMarqueeDesktop 32s linear infinite',
              willChange: 'transform',
            }}
          >
            {marqueeText}
          </div>
        </div>

        {/* ── Mobile: marquee ticker ── */}
        <div className="md:hidden flex items-center h-full overflow-hidden">
          <div
            className="whitespace-nowrap text-white text-sm font-semibold promo-banner-track"
            style={{
              animation: 'promoBannerMarquee 25s linear infinite',
              willChange: 'transform',
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

        @keyframes promoBannerMarqueeDesktop {
          0% { transform: translate3d(0%, 0, 0); }
          100% { transform: translate3d(-50%, 0, 0); }
        }

        @media (prefers-reduced-motion: reduce) {
          .promo-banner-track {
            animation: none !important;
          }
        }
      ` }} />
    </div>
  );
}
