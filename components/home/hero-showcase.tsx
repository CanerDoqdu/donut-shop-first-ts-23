'use client';

/* ──────────────────────────────────────────────────────
   Hero Showcase — Graffiti-editorial style.
   Left : Beverage composite (decorations baked in).
   Right: Donut composite (decorations baked in).
   Labels, separator, vertical text remain.
   ────────────────────────────────────────────────────── */

import NextImage from 'next/image';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

function Image(props: React.ComponentProps<typeof NextImage>) {
  const { className, onLoad, ...rest } = props;
  const [loaded, setLoaded] = useState(false);

  return (
    <>
      {!loaded && (
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0.05) 65%, transparent 100%)',
            filter: 'blur(12px)',
          }}
        />
      )}
      <NextImage
        {...rest}
        className={`${className ?? ''} transition-opacity duration-500 ${loaded ? 'opacity-100' : 'opacity-0'}`}
        onLoad={(event) => {
          setLoaded(true);
          onLoad?.(event);
        }}
      />
    </>
  );
}

export function HeroShowcase() {
  const t = useTranslations('home');
  
  return (
    <div className="relative w-full flex items-center justify-center select-none overflow-hidden lg:overflow-visible">

      {/* ══════════════════════════════════════════════════════
          MOBILE & TABLET (below lg: 1024px)
          Glassmorphism menu-board — no product images, no overflow
          ══════════════════════════════════════════════════════ */}
      <div className="lg:hidden w-full px-3 sm:px-6 md:px-12">
        <div className="max-w-sm sm:max-w-md md:max-w-2xl mx-auto">
          {/* Section label */}
          <div className="text-center mb-4 sm:mb-5 md:mb-6">
            <span className="font-fredoka text-[10px] sm:text-xs md:text-sm tracking-[0.35em] uppercase text-white/40">
              ✦ {t('ourSignatures')} ✦
            </span>
          </div>

          {/* ── Signature cards grid ── */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:gap-6">
            {/* Donut Card */}
            <div
              className="relative rounded-2xl sm:rounded-3xl p-4 sm:p-5 md:p-8 flex flex-col items-center text-center overflow-hidden"
              style={{
                background: 'linear-gradient(160deg, rgba(255,255,255,0.18), rgba(255,255,255,0.05))',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                border: '1.5px solid rgba(255,255,255,0.2)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.15)',
              }}
            >
              <div className="absolute -top-4 -right-4 w-16 h-16 md:w-24 md:h-24 rounded-full blur-xl pointer-events-none" style={{ background: 'rgba(255,217,61,0.25)' }} />
              <div className="relative w-9 h-9 sm:w-12 sm:h-12 md:w-24 md:h-24 mb-2 sm:mb-3 md:mb-4">
                <Image src="/donut 5.png" alt="Chocolate Dream Donut" fill sizes="(min-width: 768px) 96px, 56px" className="object-contain drop-shadow-lg" style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.2))' }} draggable={false} />
              </div>
              <div className="inline-flex items-center gap-1 px-2 md:px-3 py-0.5 md:py-1 rounded-full mb-2 md:mb-3" style={{ background: 'rgba(255,217,61,0.15)' }}>
                <span className="w-1.5 h-1.5 rounded-full bg-[#FFD93D] animate-pulse" />
                <span className="text-[8px] sm:text-[9px] md:text-xs text-[#FFD93D] font-bold tracking-wider uppercase">{t('bestSeller')}</span>
              </div>
              <h3 className="font-fredoka text-base sm:text-lg md:text-2xl font-bold text-white leading-tight mb-1 md:mb-2" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>
                {t('chocolateDream')}
              </h3>
              <p className="text-[9px] sm:text-[10px] md:text-sm text-white/50 leading-relaxed mb-3 md:mb-4">
                {t('chocolateDreamDesc')}
              </p>
              <div className="mt-auto pt-2 md:pt-3 border-t border-white/10 w-full text-center">
                <span className="font-fredoka text-sm sm:text-base md:text-xl font-bold text-[#FFD93D]" style={{ textShadow: '0 0 12px rgba(255,217,61,0.3)' }}>₺45.00</span>
              </div>
            </div>

            {/* Drink Card */}
            <div
              className="relative rounded-2xl sm:rounded-3xl p-4 sm:p-5 md:p-8 flex flex-col items-center text-center overflow-hidden"
              style={{
                background: 'linear-gradient(160deg, rgba(255,255,255,0.18), rgba(255,255,255,0.05))',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                border: '1.5px solid rgba(255,255,255,0.2)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.15)',
              }}
            >
              <div className="absolute -top-4 -left-4 w-16 h-16 md:w-24 md:h-24 rounded-full blur-xl pointer-events-none" style={{ background: 'rgba(255,107,191,0.25)' }} />
              <div className="relative w-9 h-9 sm:w-12 sm:h-12 md:w-24 md:h-24 mb-2 sm:mb-3 md:mb-4 overflow-hidden">
                <Image src="/beverage 1.png" alt="Berry Bliss Beverage" fill sizes="(min-width: 768px) 96px, 56px" className="object-contain drop-shadow-lg" style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.2))' }} draggable={false} />
              </div>
              <div className="inline-flex items-center gap-1 px-2 md:px-3 py-0.5 md:py-1 rounded-full mb-2 md:mb-3" style={{ background: 'rgba(255,107,191,0.15)' }}>
                <span className="w-1.5 h-1.5 rounded-full bg-[#FF6BBF] animate-pulse" />
                <span className="text-[8px] sm:text-[9px] md:text-xs text-[#FF6BBF] font-bold tracking-wider uppercase">{t('signature')}</span>
              </div>
              <h3 className="font-fredoka text-base sm:text-lg md:text-2xl font-bold text-white leading-tight mb-1 md:mb-2" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>
                {t('berryBliss')}
              </h3>
              <p className="text-[9px] sm:text-[10px] md:text-sm text-white/50 leading-relaxed mb-3 md:mb-4">
                {t('berryBlissDesc')}
              </p>
              <div className="mt-auto pt-2 md:pt-3 border-t border-white/10 w-full text-center">
                <span className="font-fredoka text-sm sm:text-base md:text-xl font-bold text-[#FFD93D]" style={{ textShadow: '0 0 12px rgba(255,217,61,0.3)' }}>₺35.00</span>
              </div>
            </div>
          </div>

          {/* ── Also try – compact menu rows ── */}
          <div
            className="mt-3 sm:mt-4 md:mt-6 rounded-2xl md:rounded-3xl px-4 py-3 sm:px-5 sm:py-4 md:px-6 md:py-5"
            style={{
              background: 'linear-gradient(160deg, rgba(255,255,255,0.1), rgba(255,255,255,0.03))',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255,255,255,0.12)',
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <div className="relative w-6 h-6 sm:w-7 sm:h-7 md:w-10 md:h-10 shrink-0">
                  <Image src="/donut 5.png" alt="" fill sizes="(min-width: 768px) 40px, 28px" className="object-contain" draggable={false} />
                </div>
                <span className="font-fredoka text-xs sm:text-sm md:text-base font-semibold text-white truncate">Caramel Crunch</span>
                <span className="text-[7px] sm:text-[8px] md:text-[10px] px-1.5 md:px-2 py-0.5 rounded-full shrink-0 font-bold uppercase" style={{ background: 'rgba(255,140,66,0.2)', color: '#FF8C42' }}>New</span>
              </div>
              <span className="font-fredoka text-xs sm:text-sm md:text-base font-bold text-[#FFD93D] shrink-0 ml-2">₺48</span>
            </div>
            <div className="w-full h-px my-2 md:my-3" style={{ background: 'rgba(255,255,255,0.08)' }} />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <div className="relative w-6 h-6 sm:w-7 sm:h-7 md:w-10 md:h-10 shrink-0 overflow-hidden">
                  <Image src="/beverage 1.png" alt="" fill sizes="(min-width: 768px) 40px, 28px" className="object-contain" draggable={false} />
                </div>
                <span className="font-fredoka text-xs sm:text-sm md:text-base font-semibold text-white truncate">Mango Sunset</span>
              </div>
              <span className="font-fredoka text-xs sm:text-sm md:text-base font-bold text-[#FFD93D] shrink-0 ml-2">₺38</span>
            </div>
          </div>

          {/* Bottom decorative */}
          <div className="flex items-center justify-center gap-3 mt-4 sm:mt-5 md:mt-6">
            <div className="h-px flex-1 max-w-16 md:max-w-24" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2))' }} />
            <span className="text-white/25 text-[9px] sm:text-[10px] md:text-xs tracking-[0.2em] uppercase font-fredoka">handcrafted daily</span>
            <div className="h-px flex-1 max-w-16 md:max-w-24" style={{ background: 'linear-gradient(90deg, rgba(255,255,255,0.2), transparent)' }} />
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          DESKTOP (lg: 1024px and above)
          Original graffiti-editorial design with product images
          ══════════════════════════════════════════════════════ */}
      <div className="hidden lg:flex relative items-center justify-center max-w-4xl w-full">

        {/* ══════════════════════════════════════════════
            LEFT SIDE — DRINK
            ══════════════════════════════════════════════ */}
        <div className="relative flex-1 flex items-start justify-center pt-2">

          {/* ── Beverage composite (decorations baked in) ── */}
          <div className="relative shrink-0" style={{ transform: 'translateX(-70%) translateY(-20%) scale(2.3)', zIndex: 6 }}>
            <div className="relative" style={{ width: '240px', height: '240px' }}>
              <Image
                src="/hero-left-image.webp"
                alt="Berry Bliss Beverage"
                fill
                sizes="540px"
                priority
                fetchPriority="high"
                className="object-contain"
                style={{
                  filter: 'drop-shadow(0 12px 32px rgba(224,64,160,0.4))',
                }}
                draggable={false}
              />
            </div>
          </div>

          {/* ── Label ── */}
          <div className="absolute text-center pointer-events-none whitespace-nowrap" style={{ left: '10%', bottom: '-100px', zIndex: 10 }}>
            <p className="font-fredoka text-base sm:text-lg md:text-xl font-bold text-white" style={{ textShadow: '0 2px 12px rgba(0,0,0,0.3)' }}>
              Berry Bliss
            </p>
            <p className="text-[9px] sm:text-[10px] text-white/60 tracking-wide">Signature Drink</p>
            <p className="mt-1 font-fredoka text-[10px] sm:text-sm italic text-white/35 tracking-[0.25em] select-none">
              made with love
            </p>
          </div>

          {/* ── SMOOTH vertical text ── */}
          <span
            className="absolute font-fredoka font-black text-white/15 pointer-events-none select-none text-4xl sm:text-5xl md:text-6xl lg:text-7xl hidden sm:block"
            style={{
              top: '-10%',
              left: '-40%',
              writingMode: 'vertical-rl',
              textOrientation: 'mixed',
              letterSpacing: '0.15em',
              zIndex: 0,
            }}
          >
            SMOOTH
          </span>
        </div>

        {/* ══════════════════════════════════════════════
            CENTER — & separator
            ══════════════════════════════════════════════ */}
        <div className="flex flex-col items-center mx-2 sm:mx-6 shrink-0" style={{ zIndex: 5 }}>
          <div className="w-px h-6 sm:h-10" style={{ background: 'linear-gradient(180deg, transparent, rgba(255,255,255,0.3))' }} />
          <span className="text-white/30 text-[8px] my-0.5">✦</span>
          <span
            className="font-fredoka text-xl sm:text-2xl md:text-3xl font-bold my-0.5"
            style={{
              background: 'linear-gradient(135deg, #FF6BBF, #FFD93D)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              filter: 'drop-shadow(0 2px 8px rgba(255,107,191,0.3))',
            }}
          >
            &amp;
          </span>
          <span className="text-white/30 text-[8px] my-0.5">✦</span>
          <div className="w-px h-6 sm:h-10" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.3), transparent)' }} />
        </div>

        {/* ══════════════════════════════════════════════
            RIGHT SIDE — DONUT
            ══════════════════════════════════════════════ */}
        <div className="relative flex-1 flex items-start justify-center pt-2">

          {/* ── Donut composite (decorations baked in) ── */}
          <div className="relative shrink-0" style={{ transform: 'translateX(60%) translateY(-9%) scale(1.62)', zIndex: 3 }}>
            <div className="relative" style={{ width: '240px', height: '240px' }}>
              <Image
                src="/hero-right-image.webp"
                alt="Chocolate Dream Donut"
                fill
                sizes="390px"
                priority
                fetchPriority="high"
                className="object-contain"
                style={{
                  filter: 'drop-shadow(0 12px 32px rgba(255,107,191,0.4))',
                }}
                draggable={false}
              />
            </div>
          </div>

          {/* ── Label ── */}
          <div className="absolute text-center pointer-events-none whitespace-nowrap" style={{ right: '10%', bottom: '-100px', zIndex: 4 }}>
            <p className="font-fredoka text-base sm:text-lg md:text-xl font-bold text-white" style={{ textShadow: '0 2px 12px rgba(0,0,0,0.3)' }}>
              Chocolate Dream
            </p>
            <p className="text-[9px] sm:text-[10px] text-white/60 tracking-wide">Best Seller</p>
            <p className="mt-1 font-fredoka text-[10px] sm:text-sm italic text-white/35 tracking-[0.25em] select-none">
              glazed &amp; sipped
            </p>
          </div>

          {/* ── SWEET vertical text ── */}
          <span
            className="absolute font-fredoka font-black text-white/15 pointer-events-none select-none text-4xl sm:text-5xl md:text-6xl lg:text-7xl hidden sm:block"
            style={{
              top: '-20%',
              right: '-40%',
              writingMode: 'vertical-rl',
              textOrientation: 'mixed',
              letterSpacing: '0.15em',
              zIndex: 0,
            }}
          >
            SWEET
          </span>
        </div>

        {/* ══════════════════════════════════════════════
            FLOATING CORNER TYPOGRAPHY
            ══════════════════════════════════════════════ */}

        <span className="absolute -top-5 sm:-top-7 left-2 sm:left-0 font-fredoka text-[10px] sm:text-sm italic text-white/40 tracking-[0.25em] pointer-events-none select-none -rotate-12 hidden sm:block">
          handcrafted
        </span>

        <span className="absolute -top-5 sm:-top-7 right-2 sm:right-0 font-fredoka text-[10px] sm:text-sm italic text-white/40 tracking-[0.25em] pointer-events-none select-none rotate-12 hidden sm:block">
          daily fresh
        </span>

      </div>
    </div>
  );
}
