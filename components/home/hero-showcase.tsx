'use client';

/* ──────────────────────────────────────────────────────
   Hero Showcase — Graffiti-editorial style.
   Left : Drink tilted -30°, caramel blocks + bars behind it,
          milk splash, "SMOOTH" text split around drink.
   Right: Donut tilted, chocolate bars + caramel behind it,
          milk splash, "SWEET" text split around donut.
   ────────────────────────────────────────────────────── */

import Image from 'next/image';
import { useTranslations } from 'next-intl';

export function HeroShowcase() {
  const t = useTranslations('home');
  
  return (
    <div className="relative w-full flex items-center justify-center select-none overflow-hidden lg:overflow-visible">

      {/* ══════════════════════════════════════════════════════
          MOBILE & TABLET (below lg: 1024px)
          Glassmorphism menu-board — no product images, no overflow
          ══════════════════════════════════════════════════════ */}
      <div className="lg:hidden w-full px-3 sm:px-6 md:px-10">
        <div className="max-w-sm sm:max-w-md mx-auto">
          {/* Section label */}
          <div className="text-center mb-4 sm:mb-5">
            <span className="font-fredoka text-[10px] sm:text-xs tracking-[0.35em] uppercase text-white/40">
              ✦ {t('ourSignatures')} ✦
            </span>
          </div>

          {/* ── Signature cards grid ── */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {/* Donut Card */}
            <div
              className="relative rounded-2xl sm:rounded-3xl p-4 sm:p-5 md:p-6 flex flex-col items-center text-center overflow-hidden"
              style={{
                background: 'linear-gradient(160deg, rgba(255,255,255,0.18), rgba(255,255,255,0.05))',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                border: '1.5px solid rgba(255,255,255,0.2)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.15)',
              }}
            >
              <div className="absolute -top-4 -right-4 w-16 h-16 rounded-full blur-xl pointer-events-none" style={{ background: 'rgba(255,217,61,0.25)' }} />
              <div className="relative w-9 h-9 sm:w-12 sm:h-12 md:w-14 md:h-14 mb-2 sm:mb-3">
                <Image src="/donut 5.png" alt="Chocolate Dream Donut" fill sizes="56px" className="object-contain drop-shadow-lg" style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.2))' }} draggable={false} />
              </div>
              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full mb-2" style={{ background: 'rgba(255,217,61,0.15)' }}>
                <span className="w-1.5 h-1.5 rounded-full bg-[#FFD93D] animate-pulse" />
                <span className="text-[8px] sm:text-[9px] text-[#FFD93D] font-bold tracking-wider uppercase">{t('bestSeller')}</span>
              </div>
              <h3 className="font-fredoka text-base sm:text-lg md:text-xl font-bold text-white leading-tight mb-1" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>
                {t('chocolateDream')}
              </h3>
              <p className="text-[9px] sm:text-[10px] md:text-xs text-white/50 leading-relaxed mb-3">
                {t('chocolateDreamDesc')}
              </p>
              <div className="mt-auto pt-2 border-t border-white/10 w-full text-center">
                <span className="font-fredoka text-sm sm:text-base md:text-lg font-bold text-[#FFD93D]" style={{ textShadow: '0 0 12px rgba(255,217,61,0.3)' }}>₺45.00</span>
              </div>
            </div>

            {/* Drink Card */}
            <div
              className="relative rounded-2xl sm:rounded-3xl p-4 sm:p-5 md:p-6 flex flex-col items-center text-center overflow-hidden"
              style={{
                background: 'linear-gradient(160deg, rgba(255,255,255,0.18), rgba(255,255,255,0.05))',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                border: '1.5px solid rgba(255,255,255,0.2)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.15)',
              }}
            >
              <div className="absolute -top-4 -left-4 w-16 h-16 rounded-full blur-xl pointer-events-none" style={{ background: 'rgba(255,107,191,0.25)' }} />
              <div className="relative w-9 h-9 sm:w-12 sm:h-12 md:w-14 md:h-14 mb-2 sm:mb-3 overflow-hidden">
                <Image src="/beverage 1.png" alt="Berry Bliss Beverage" fill sizes="56px" className="object-contain drop-shadow-lg" style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.2))' }} draggable={false} />
              </div>
              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full mb-2" style={{ background: 'rgba(255,107,191,0.15)' }}>
                <span className="w-1.5 h-1.5 rounded-full bg-[#FF6BBF] animate-pulse" />
                <span className="text-[8px] sm:text-[9px] text-[#FF6BBF] font-bold tracking-wider uppercase">{t('signature')}</span>
              </div>
              <h3 className="font-fredoka text-base sm:text-lg md:text-xl font-bold text-white leading-tight mb-1" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>
                {t('berryBliss')}
              </h3>
              <p className="text-[9px] sm:text-[10px] md:text-xs text-white/50 leading-relaxed mb-3">
                {t('berryBlissDesc')}
              </p>
              <div className="mt-auto pt-2 border-t border-white/10 w-full text-center">
                <span className="font-fredoka text-sm sm:text-base md:text-lg font-bold text-[#FFD93D]" style={{ textShadow: '0 0 12px rgba(255,217,61,0.3)' }}>₺35.00</span>
              </div>
            </div>
          </div>

          {/* ── Also try – compact menu rows ── */}
          <div
            className="mt-3 sm:mt-4 rounded-2xl px-4 py-3 sm:px-5 sm:py-4"
            style={{
              background: 'linear-gradient(160deg, rgba(255,255,255,0.1), rgba(255,255,255,0.03))',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255,255,255,0.12)',
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <div className="relative w-6 h-6 sm:w-7 sm:h-7 shrink-0">
                  <Image src="/donut 5.png" alt="" fill sizes="28px" className="object-contain" draggable={false} />
                </div>
                <span className="font-fredoka text-xs sm:text-sm font-semibold text-white truncate">Caramel Crunch</span>
                <span className="text-[7px] sm:text-[8px] px-1.5 py-0.5 rounded-full shrink-0 font-bold uppercase" style={{ background: 'rgba(255,140,66,0.2)', color: '#FF8C42' }}>New</span>
              </div>
              <span className="font-fredoka text-xs sm:text-sm font-bold text-[#FFD93D] shrink-0 ml-2">₺48</span>
            </div>
            <div className="w-full h-px my-2" style={{ background: 'rgba(255,255,255,0.08)' }} />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <div className="relative w-6 h-6 sm:w-7 sm:h-7 shrink-0 overflow-hidden">
                  <Image src="/beverage 1.png" alt="" fill sizes="28px" className="object-contain" draggable={false} />
                </div>
                <span className="font-fredoka text-xs sm:text-sm font-semibold text-white truncate">Mango Sunset</span>
              </div>
              <span className="font-fredoka text-xs sm:text-sm font-bold text-[#FFD93D] shrink-0 ml-2">₺38</span>
            </div>
          </div>

          {/* Bottom decorative */}
          <div className="flex items-center justify-center gap-3 mt-4 sm:mt-5">
            <div className="h-px flex-1 max-w-16" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2))' }} />
            <span className="text-white/25 text-[9px] sm:text-[10px] tracking-[0.2em] uppercase font-fredoka">handcrafted daily</span>
            <div className="h-px flex-1 max-w-16" style={{ background: 'linear-gradient(90deg, rgba(255,255,255,0.2), transparent)' }} />
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

          {/* ── Milk splash directly behind drink ── */}
          <div className="absolute pointer-events-none" style={{ top: '-60%', left: '-40%', width: '100%', height: '100%', zIndex: 1 }}>
            <Image src="/milk splash.png" alt="" fill sizes="320px" className="object-contain" draggable={false} />
          </div>

          {/* ── Caramel blocks — big, right behind the drink ── */}
          <div className="absolute w-22 h-22 sm:w-24 sm:h-24 md:w-28 md:h-28 pointer-events-none" style={{ top: '60%', left: '-2%', transform: 'rotate(12deg)', zIndex: 2 }}>
            <Image src="/caramel blocks.png" alt="" fill sizes="112px" className="object-contain" draggable={false} />
          </div>
          <div className="absolute w-12 h-12 sm:w-18 sm:h-18 md:w-22 md:h-22 pointer-events-none" style={{ bottom: '25%', left: '10%', transform: 'rotate(-8deg)', zIndex: 2 }}>
            <Image src="/caramel bloks 2.png" alt="" fill sizes="88px" className="object-contain" draggable={false} />
          </div>

          {/* ── Caramel blocks — big, right behind the donut ── */}
          <div className="absolute w-22 h-22 sm:w-32 sm:h-32 md:w-40 md:h-40 pointer-events-none" style={{ bottom: '15%', right: '50%', transform: 'rotate(15deg)', zIndex: 2 }}>
            <Image src="/caramel blocks (2).png" alt="" fill sizes="160px" className="object-contain" draggable={false} />
          </div>
          

          {/* ── Drink image — tilted -30° ── */}
          <div className="relative" style={{ transform: 'translateX(-45%) translateY(-25%) scale(1.4)', zIndex: 6 }}>
            <div className="relative" style={{ width: '320px', height: '320px' }}>
              <Image
                src="/beverage 1.png"
                alt="Berry Bliss Beverage"
                fill
                sizes="320px"
                loading="eager"
                className="object-contain"
                style={{
                  transform: 'rotate(-30deg)',
                  filter: 'drop-shadow(0 12px 32px rgba(224,64,160,0.4))',
                }}
                draggable={false}
              />
            </div>
          </div>

          {/* ── Label ── */}
          <div className="absolute bottom-0 sm:-bottom-1 left-1/2 -translate-x-1/2 text-center pointer-events-none" style={{ zIndex: 4 }}>
            <p className="font-fredoka text-base sm:text-lg md:text-xl font-bold text-white" style={{ textShadow: '0 2px 12px rgba(0,0,0,0.3)' }}>
              Berry Bliss
            </p>
            <p className="text-[9px] sm:text-[10px] text-white/60 tracking-wide">Signature Drink</p>
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

          {/* ── Chocolate bars — behind and near the donut ── */}
          <div className="absolute w-28 h-28 sm:w-44 sm:h-44 md:w-52 md:h-52 pointer-events-none" style={{ top: '10%', right: '-10%', transform: 'rotate(-20deg)', zIndex: 2 }}>
            <Image src="/bars 2.png" alt="" fill sizes="208px" className="object-contain" draggable={false} />
          </div>
          <div className="absolute w-56 h-56 sm:w-56 sm:h-56 md:w-60 md:h-60 pointer-events-none" style={{ bottom: '50%', left: '60%', transform: 'rotate(18deg)', zIndex: 2 }}>
            <Image src="/bars 1.png" alt="" fill sizes="240px" className="object-contain" draggable={false} />
          </div>

          {/* ── Caramel blocks — big, right behind the donut ── */}
          <div className="absolute w-28 h-28 sm:w-40 sm:h-40 md:w-48 md:h-48 pointer-events-none" style={{ bottom: '15%', right: '-15%', transform: 'rotate(15deg)', zIndex: 2 }}>
            <Image src="/caramel blocks (2).png" alt="" fill sizes="192px" className="object-contain" draggable={false} />
          </div>
          <div className="absolute w-22 h-22 sm:w-32 sm:h-32 md:w-40 md:h-40 pointer-events-none" style={{ top: '5%', left: '30%', transform: 'rotate(-10deg)', zIndex: 2 }}>
            <Image src="/caramel blocks.png" alt="" fill sizes="160px" className="object-contain" draggable={false} />
          </div>

          {/* ── Donut image — bigger, tilted 15° ── */}
          <div className="relative" style={{ transform: 'translateX(35%) translateY(-0%)', zIndex: 3 }}>
            <div className="relative w-44 h-44 sm:w-56 sm:h-56 md:w-72 md:h-72 lg:w-80 lg:h-80">
              <Image
                src="/donut 5.png"
                alt="Chocolate Dream Donut"
                fill
                sizes="320px"
                className="object-contain"
                style={{
                  transform: 'rotate(15deg)',
                  filter: 'drop-shadow(0 12px 32px rgba(255,107,191,0.4))',
                }}
                draggable={false}
              />
            </div>
          </div>

          {/* ── Label ── */}
          <div className="absolute bottom-0 sm:-bottom-1 left-1/2 -translate-x-1/2 text-center pointer-events-none" style={{ zIndex: 4 }}>
            <p className="font-fredoka text-base sm:text-lg md:text-xl font-bold text-white" style={{ textShadow: '0 2px 12px rgba(0,0,0,0.3)' }}>
              Chocolate Dream
            </p>
            <p className="text-[9px] sm:text-[10px] text-white/60 tracking-wide">Best Seller</p>
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

        <span className="absolute -bottom-4 sm:-bottom-6 left-4 sm:left-2 font-fredoka text-[10px] sm:text-sm italic text-white/35 tracking-[0.25em] pointer-events-none select-none rotate-3 hidden sm:block">
          made with love
        </span>

        <span className="absolute -bottom-4 sm:-bottom-6 right-4 sm:right-2 font-fredoka text-[10px] sm:text-sm italic text-white/35 tracking-[0.25em] pointer-events-none select-none -rotate-3 hidden sm:block">
          glazed &amp; sipped
        </span>
      </div>
    </div>
  );
}
