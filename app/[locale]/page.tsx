'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardTitle } from '@/components/ui/card';
import { SprinkleRain } from '@/components/ui/sprinkle-rain';
import { HeroShowcase } from '@/components/home/hero-showcase';
import { DonutConveyor } from '@/components/home/donut-conveyor';
import {
  FadeIn,
  StaggerContainer,
  StaggerItem,
  FloatingElement,
} from '@/components/ui/animations';
import { formatPrice } from '@/lib/utils';
import { sampleProducts } from '@/lib/data';
import { useCartStore } from '@/store/cart-store';
import { Star, Clock, Heart, ArrowRight, MapPin, Phone, Award, ShoppingBag } from 'lucide-react';

export default function Home() {
  const t = useTranslations();
  const addItem = useCartStore((state) => state.addItem);

  const featuredProducts = sampleProducts.filter((p) => p.featured).slice(0, 4);

  return (
    <div className="flex flex-col overflow-x-hidden">
      {/* Sprinkle rain — fixed, falls over navbar, fades on scroll */}
      <SprinkleRain count={80} />

      {/* ═══════════════════════════════════════════════════════ */}
      {/*  HERO — Full viewport: Typo top | Bev left Donut right | Belt bottom */}
      {/* ═══════════════════════════════════════════════════════ */}
      <section
        className="relative overflow-hidden lg:overflow-visible flex flex-col min-h-[70vh] sm:min-h-[80vh] md:min-h-[85vh] lg:min-h-[90vh]"
        style={{ maxHeight: '100vh' }}
      >
        {/* ── BACKGROUND: base gradient + radial lights ── */}
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'linear-gradient(155deg, #FF6BBF 0%, #FF8C42 40%, #FFD93D 100%)',
        }} />
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'radial-gradient(ellipse 55% 70% at 20% 60%, rgba(80,20,40,0.35) 0%, transparent 70%)',
        }} />
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'radial-gradient(ellipse 50% 60% at 80% 40%, rgba(255,255,255,0.18) 0%, transparent 65%)',
        }} />
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'linear-gradient(180deg, rgba(0,0,0,0.08) 0%, transparent 30%, transparent 80%, rgba(0,0,0,0.06) 100%)',
        }} />

        {/* ── CONTENT ── */}
        <div className="relative flex-1 flex flex-col pt-16 sm:pt-20 md:pt-24" style={{ maxHeight: '100vh' }}>

          {/* ── TOP CENTER — "Sip. Bite. Smile." ────── */}
          <div className="relative text-center px-4 pt-0 pb-0 shrink-0" style={{ zIndex: 5 }}>
            <FadeIn direction="down" delay={0.05}>
              <h1
                className="font-fredoka text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold text-white leading-[1.05] mb-1"
                style={{ textShadow: '0 4px 30px rgba(0,0,0,0.18)' }}
              >
                {t('home.heroTagline')}
              </h1>
              <p className="text-xs sm:text-sm text-white/80 max-w-md mx-auto mb-2 leading-relaxed font-medium">
                {t('home.heroDesc')}
              </p>
              <div className="flex gap-3 justify-center">
                <Button
                  asChild
                  size="sm"
                  className="text-xs sm:text-sm px-5 sm:px-8 py-3 sm:py-4 font-bold rounded-full transition-all duration-300 hover:scale-105 hover:shadow-[0_0_30px_rgba(255,107,191,0.4)]"
                  style={{
                    background: 'linear-gradient(135deg, #FF6BBF, #FF3DA0)',
                    color: 'white',
                    boxShadow: '0 8px 30px rgba(255,61,160,0.3)',
                  }}
                >
                  <Link href="/products">
                    {t('home.cta')} <ArrowRight className="ml-1 h-3 w-3" />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="sm"
                  className="text-xs sm:text-sm px-5 sm:px-8 py-3 sm:py-4 font-bold rounded-full transition-all duration-300 hover:scale-105 hover:shadow-[0_0_30px_rgba(74,44,26,0.3)]"
                  style={{
                    background: 'linear-gradient(135deg, #4A2C1A, #6B3E26)',
                    color: '#FFD93D',
                    border: '1.5px solid rgba(255,217,61,0.25)',
                    boxShadow: '0 8px 30px rgba(74,44,26,0.25)',
                  }}
                >
                  <Link href="/products">
                    <ShoppingBag className="mr-1 h-3 w-3" /> {t('nav.products')}
                  </Link>
                </Button>
              </div>
            </FadeIn>
          </div>

          {/* ── MID ROW: Unified Showcase ────── */}
          <div className="flex-1 flex items-start justify-center px-0 lg:px-2 pt-2 pb-4 sm:pb-6 min-h-0 overflow-hidden lg:overflow-visible relative z-10 lg:max-h-[60vh]">
            <HeroShowcase />
          </div>
        </div>

      </section>

      {/* ═══════════════════════════════════════════════ */}
      {/*  FEATURED PRODUCTS                              */}
      {/* ═══════════════════════════════════════════════ */}
      <section className="relative z-20 pt-24 pb-0 px-4" style={{ background: '#FFF8E7' }}>
        <div className="container mx-auto">
          <FadeIn>
            <div className="text-center mb-16">
              <span className="inline-flex items-center gap-2 text-sm font-bold tracking-widest uppercase mb-4" style={{ color: '#FF6BBF' }}>
                <Award className="h-4 w-4" /> {t('home.bestSellers')}
              </span>
              <h2 className="font-fredoka text-4xl sm:text-5xl lg:text-6xl font-bold mb-4"
                style={{
                  background: 'linear-gradient(135deg, #FF6BBF, #FF8C42)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                {t('home.featured')}
              </h2>
              <p className="text-gray-500 text-lg max-w-2xl mx-auto">
                {t('home.bestSellersDesc')}
              </p>
            </div>
          </FadeIn>

          <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {featuredProducts.map((product) => (
              <StaggerItem key={product.id}>
                <Card className="group cursor-pointer border-0 shadow-lg hover:shadow-2xl transition-all duration-500 overflow-hidden rounded-3xl bg-white">
                  <Link href={{ pathname: '/products/[slug]', params: { slug: product.slug } }}>
                    <CardContent className="pt-8 pb-4 relative">
                      <div
                        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                        style={{
                          background: 'radial-gradient(circle at 50% 0%, rgba(255,107,191,0.1), transparent 70%)',
                        }}
                      />
                      <div className="w-full aspect-square relative mb-4 transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-3">
                        <Image
                          src={product.image_url}
                          alt={product.name_en}
                          fill
                          sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                          className="object-contain drop-shadow-xl"
                        />
                      </div>
                      <CardTitle className="text-center mb-2 text-lg">{product.name_en}</CardTitle>
                      <p className="text-center font-fredoka text-2xl font-bold" style={{ color: '#FF6BBF' }}>
                        {formatPrice(product.price)}
                      </p>
                    </CardContent>
                  </Link>
                  <CardFooter className="px-6 pb-6">
                    <Button className="w-full rounded-2xl" size="lg" onClick={() => addItem(product)}>
                      {t('products.addToCart')}
                    </Button>
                  </CardFooter>
                </Card>
              </StaggerItem>
            ))}
          </StaggerContainer>

          <FadeIn delay={0.3}>
            <div className="text-center mt-14">
              <Button asChild variant="outline" size="lg" className="text-lg px-10 rounded-full border-2 hover:scale-105 transition-transform">
                <Link href="/products">
                  {t('nav.products')} <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════ */}
      {/*  CONVEYOR BELT                                  */}
      {/* ═══════════════════════════════════════════════ */}
      <div className="relative z-20">
        <DonutConveyor />
      </div>

      {/* ═══════════════════════════════════════════════ */}
      {/*  ABOUT US                                       */}
      {/* ═══════════════════════════════════════════════ */}
      <section
        className="relative z-20 py-24 px-4 overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #FFF8E7 0%, #FFB3DB15 50%, #FFF8E7 100%)',
        }}
      >
        <div className="container mx-auto">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            {/* Left — Story */}
            <FadeIn direction="left" className="w-full lg:w-1/2">
              <span className="inline-flex items-center gap-2 text-sm font-bold tracking-widest uppercase mb-4" style={{ color: '#FF6BBF' }}>
                <Heart className="h-4 w-4" /> {t('home.aboutTitle')}
              </span>
              <h2 className="font-fredoka text-4xl sm:text-5xl font-bold mb-8 text-gray-900 leading-tight">
                {t('home.aboutSubtitle')}
              </h2>
              <p className="text-gray-600 text-lg leading-relaxed mb-6">
                {t('home.aboutParagraph1')}
              </p>
              <p className="text-gray-600 text-lg leading-relaxed mb-10">
                {t('home.aboutParagraph2')}
              </p>
              <div className="flex gap-10">
                <div>
                  <p className="font-fredoka text-4xl font-bold" style={{ color: '#FF6BBF' }}>5+</p>
                  <p className="text-sm text-gray-400 font-medium">{t('home.years')}</p>
                </div>
                <div>
                  <p className="font-fredoka text-4xl font-bold" style={{ color: '#FF8C42' }}>50+</p>
                  <p className="text-sm text-gray-400 font-medium">{t('home.flavors')}</p>
                </div>
                <div>
                  <p className="font-fredoka text-4xl font-bold" style={{ color: '#FFD93D' }}>3</p>
                  <p className="text-sm text-gray-400 font-medium">{t('home.locations')}</p>
                </div>
              </div>
            </FadeIn>

            {/* Right — Visual composition */}
            <FadeIn direction="right" className="w-full lg:w-1/2">
              <div className="relative">
                <div
                  className="w-full aspect-square max-w-md mx-auto rounded-[2.5rem] flex items-center justify-center relative overflow-hidden shadow-2xl"
                  style={{
                    background: 'linear-gradient(135deg, #FF6BBF 0%, #FF8C42 50%, #FFD93D 100%)',
                  }}
                >
                  <FloatingElement duration={3} distance={10}>
                    <Image
                      src="/freepik__adjust__37854.png"
                      alt="Delicious donuts"
                      width={320}
                      height={320}
                      className="drop-shadow-2xl"
                      style={{ width: 'auto', height: 'auto' }}
                    />
                  </FloatingElement>

                  {/* Decorative floating donuts inside */}
                  <FloatingElement className="absolute top-6 left-6" duration={4} distance={8}>
                    <Image src="/donut.png" alt="" width={55} height={55} className="drop-shadow-lg opacity-80" style={{ width: 'auto', height: 'auto' }} />
                  </FloatingElement>
                  <FloatingElement className="absolute bottom-10 right-6" duration={3.5} distance={12}>
                    <Image src="/donut (3).png" alt="" width={50} height={50} className="drop-shadow-lg opacity-80" style={{ width: 'auto', height: 'auto' }} />
                  </FloatingElement>
                  <FloatingElement className="absolute top-10 right-10" duration={5} distance={6}>
                    <Image src="/787a097af800f098a6771a29fb1a6020.png" alt="" width={45} height={45} className="drop-shadow-lg opacity-70" style={{ width: 'auto', height: 'auto' }} />
                  </FloatingElement>
                </div>

                {/* Review Card floating */}
                <FloatingElement
                  className="absolute -bottom-4 -left-4 sm:bottom-4 sm:left-0"
                  duration={4}
                  distance={6}
                >
                  <div className="rounded-2xl p-4 shadow-xl max-w-48 bg-white">
                    <div className="flex gap-1 mb-1">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="h-3.5 w-3.5 fill-[#FFD93D] text-[#FFD93D]" />
                      ))}
                    </div>
                    <p className="text-xs text-gray-600">&quot;Lorem ipsum dolor sit amet, consectetur adipiscing elit!&quot;</p>
                    <p className="text-xs font-semibold mt-1">— Jane D.</p>
                  </div>
                </FloatingElement>

                {/* Order count badge */}
                <FloatingElement
                  className="absolute -top-3 -right-3 sm:top-2 sm:right-2"
                  duration={3}
                  distance={5}
                >
                  <div
                    className="rounded-2xl px-4 py-3 shadow-xl text-center"
                    style={{ background: 'linear-gradient(135deg, #FF6BBF, #FF8C42)', color: 'white' }}
                  >
                    <p className="font-fredoka text-2xl font-bold">50K+</p>
                    <p className="text-[10px] font-medium opacity-80">{t('home.happyCustomers')}</p>
                  </div>
                </FloatingElement>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════ */}
      {/*  FIND US / LOCATIONS                            */}
      {/* ═══════════════════════════════════════════════ */}
      <section className="relative z-20 py-24 px-4 bg-white">
        <div className="container mx-auto">
          <FadeIn>
            <div className="text-center mb-16">
              <span className="inline-flex items-center gap-2 text-sm font-bold tracking-widest uppercase mb-4" style={{ color: '#FF6BBF' }}>
                <MapPin className="h-4 w-4" /> {t('home.ourLocations')}
              </span>
              <h2 className="font-fredoka text-4xl sm:text-5xl lg:text-6xl font-bold mb-4"
                style={{
                  background: 'linear-gradient(135deg, #FF6BBF, #FFD93D)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                {t('home.findUs')}
              </h2>
              <p className="text-gray-500 text-lg max-w-xl mx-auto">
                {t('home.findUsDesc')}
              </p>
            </div>
          </FadeIn>

          <StaggerContainer className="grid grid-cols-1 md:grid-cols-3 gap-8" staggerDelay={0.1}>
            {[
              {
                name: 'Downtown',
                address: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, No:42',
                hours: 'Mon-Sun 07:00 - 22:00',
                phone: '+1 (555) 123-4567',
                highlight: 'Flagship Store',
                highlightColor: '#FF6BBF',
              },
              {
                name: 'Waterfront',
                address: 'Sed do eiusmod tempor incididunt ut labore, No:18',
                hours: 'Mon-Sun 08:00 - 21:00',
                phone: '+1 (555) 234-5678',
                highlight: 'Ocean View',
                highlightColor: '#FF8C42',
              },
              {
                name: 'Uptown',
                address: 'Ut enim ad minim veniam quis nostrud exercitation, No:7',
                hours: 'Mon-Sat 09:00 - 23:00',
                phone: '+1 (555) 345-6789',
                highlight: 'New! Grand Opening',
                highlightColor: '#FFD93D',
              },
            ].map((location) => (
              <StaggerItem key={location.name}>
                <div
                  className="p-8 rounded-3xl border border-gray-100 hover:shadow-2xl transition-all duration-500 h-full flex flex-col bg-white group"
                >
                  <div className="flex items-center gap-3 mb-6">
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shrink-0"
                      style={{ background: `linear-gradient(135deg, ${location.highlightColor}, #FF8C42)` }}
                    >
                      <MapPin className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-fredoka text-xl font-bold">{location.name}</h3>
                      <span
                        className="text-xs font-semibold px-2.5 py-0.5 rounded-full"
                        style={{ background: `${location.highlightColor}15`, color: location.highlightColor }}
                      >
                        {location.highlight}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-4 flex-1">
                    <div className="flex items-start gap-3">
                      <MapPin className="h-4 w-4 mt-1 shrink-0 text-gray-400" />
                      <p className="text-gray-500 text-sm">{location.address}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Clock className="h-4 w-4 shrink-0 text-gray-400" />
                      <p className="text-gray-500 text-sm">{location.hours}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Phone className="h-4 w-4 shrink-0 text-gray-400" />
                      <p className="text-gray-500 text-sm">{location.phone}</p>
                    </div>
                  </div>

                  <a
                    href="https://maps.google.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-6 inline-flex items-center justify-center w-full rounded-2xl py-3 text-sm font-semibold transition-all duration-300 text-white hover:scale-[1.02]"
                    style={{
                      background: `linear-gradient(135deg, ${location.highlightColor}, #FF8C42)`,
                    }}
                  >
                    {t('home.getDirections')} <ArrowRight className="ml-2 h-4 w-4" />
                  </a>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════ */}
      {/*  CTA BANNER                                     */}
      {/* ═══════════════════════════════════════════════ */}
      <section
        className="relative z-20 py-24 px-4 overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #FF6BBF 0%, #FF8C42 50%, #FFD93D 100%)',
        }}
      >
        {/* Background decorative donuts */}
        <FloatingElement className="absolute top-6 left-[8%] opacity-15 select-none pointer-events-none" duration={5} distance={15}>
          <Image src="/donut 3.png" alt="" width={120} height={120} style={{ width: 'auto', height: 'auto' }} />
        </FloatingElement>
        <FloatingElement className="absolute bottom-8 right-[10%] opacity-10 select-none pointer-events-none" duration={4} distance={12}>
          <Image src="/donut (2).png" alt="" width={100} height={100} style={{ width: 'auto', height: 'auto' }} />
        </FloatingElement>
        <FloatingElement className="absolute top-[40%] right-[5%] opacity-[0.08] select-none pointer-events-none" duration={6} distance={10}>
          <Image src="/donut.png" alt="" width={80} height={80} style={{ width: 'auto', height: 'auto' }} />
        </FloatingElement>

        <div className="container mx-auto text-center relative z-10">
          <FadeIn>
            <h2 className="font-fredoka text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6"
              style={{ textShadow: '0 4px 20px rgba(0,0,0,0.12)' }}
            >
              {t('home.ctaTitle')}
            </h2>
            <p className="text-xl text-white/90 mb-10 max-w-2xl mx-auto leading-relaxed">
              {t('home.ctaDesc')} <span className="font-bold">{t('home.ctaFree')}</span>!
              {t('home.ctaCode')} <span className="font-bold bg-white/20 px-3 py-1 rounded-full">FIRSTDONUT</span> {t('home.ctaCodeSuffix')}
            </p>
            <Button
              asChild
              size="lg"
              className="text-lg px-12 py-7 shadow-2xl font-bold rounded-full transition-all duration-300 hover:scale-105"
            >
              <Link href="/products">
                Order Now <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </FadeIn>
        </div>
      </section>
    </div>
  );
}

