/* eslint-disable */
// Helper: writes the full project-schema-dashboard.tsx content
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '..', 'components', 'schema', 'project-schema-dashboard.tsx');

const content = `'use client';

import { useMemo, useRef, useState } from 'react';

type Cat = 'frontend' | 'backend' | 'data' | 'infra';

type Lane = { id: Cat; title: string; subtitle: string; y: number; h: number };
type DeepDive = { title: string; body: string[] };

type NodeDef = {
  id: string;
  emoji: string;
  label: string;
  cat: Cat;
  purpose: string;
  keyMetric?: string;
  responsibilities: string[];
  deepDive?: DeepDive[];
  files: string[];
  x: number;
  y: number;
};

type FlowDef = {
  id: string;
  icon: string;
  title: string;
  description: string;
  steps: string[];
};

type GlossaryEntry = { term: string; short: string; def: string };

const LANES: Lane[] = [
  { id: 'frontend', title: 'Frontend',           subtitle: 'Pages · UI · Domain UI · Hooks · Store · i18n · Skeletons · Telemetry',        y: 40,   h: 265 },
  { id: 'backend',  title: 'Backend',            subtitle: 'Proxy · API · Security · Auth · ABAC/RLS · Cache · Feature Flags · Errors',    y: 355,  h: 265 },
  { id: 'data',     title: 'Data & Integrations',subtitle: 'Postgres · Stripe · BullMQ · Email · Realtime · Loyalty · Gift Cards · Refs',  y: 670,  h: 265 },
  { id: 'infra',    title: 'Infra & Ops',        subtitle: 'Redis · Sentry · Tests · CI/CD · Runbooks · Lighthouse · Migrations · SLO',    y: 985,  h: 265 },
];

const THEME: Record<Cat, { border: string; chip: string; bg: string; lane: string }> = {
  frontend: { border: '#f472b6', chip: 'bg-pink-500/20 text-pink-300',    bg: '#f472b60f', lane: 'rgba(244,114,182,0.07)' },
  backend:  { border: '#60a5fa', chip: 'bg-blue-500/20 text-blue-300',    bg: '#60a5fa0f', lane: 'rgba(96,165,250,0.07)'  },
  data:     { border: '#34d399', chip: 'bg-emerald-500/20 text-emerald-300', bg: '#34d3990f', lane: 'rgba(52,211,153,0.07)' },
  infra:    { border: '#a78bfa', chip: 'bg-violet-500/20 text-violet-300', bg: '#a78bfa0f', lane: 'rgba(167,139,250,0.07)'},
};

const CAT_LABEL: Record<Cat, string> = { frontend: 'On Yuz', backend: 'Arka Yuz', data: 'Veri', infra: 'Altyapi' };

// x stride = NW(210) + gap(14) = 224   x0=50 x1=274 x2=498 x3=722 x4=946 x5=1170 x6=1394 x7=1618
// y = lane.y + 60
const NODES: NodeDef[] = [

  // ── FRONTEND ──────────────────────────────────────────────────────────────────────────
  {
    id: 'pages', emoji: '📄', label: 'Pages / Routes', cat: 'frontend',
    purpose: 'Kullanici sayfalari; RSC + SSR + Streaming + ISR',
    responsibilities: [
      'Landing, /products, /cart, /checkout, /account, /orders',
      'Admin: /admin/orders, /admin/users, /admin/analytics',
      'Streaming Suspense boundaries + parallel routes',
      'generateStaticParams + ISR ile SSG optimizasyon',
    ],
    files: ['app/[locale]/page.tsx','app/[locale]/products/page.tsx','app/[locale]/checkout/page.tsx','app/[locale]/account/page.tsx','app/[locale]/admin/orders/page.tsx'],
    x: 50, y: 100,
  },
  {
    id: 'ui', emoji: '🧩', label: 'UI Components', cat: 'frontend',
    purpose: 'Tekrar kullanilabilir, erisilebilir temel component kutuphanesi',
    responsibilities: [
      'Button / Card / Input / Badge / Modal / Toast / Dropdown',
      'ARIA + keyboard navigation (WCAG 2.1 AA)',
      'Tailwind CVA variant sistemi + dark theme',
      'Radix UI primitifleri uzerinde insa edildi',
    ],
    files: ['components/ui/*','components/layout/*'],
    x: 274, y: 100,
  },
  {
    id: 'domain-ui', emoji: '🍩', label: 'Domain UI', cat: 'frontend',
    purpose: 'Is mantigi barindiran domain-specific componentler',
    responsibilities: [
      'ProductCard, ProductGrid, QuickView paneli',
      'OrderRow, OrderTimeline, TrackingBanner',
      'LoyaltyWidget, PointBalance, TierBadge',
      'GiftCardBalance, ReferralBanner, SubscriptionCard',
      'AdminOrderTable, AdminUserRow, StatsCard',
    ],
    files: ['components/home/*','components/admin/*','components/loyalty/*','components/giftcards/*','components/referrals/*'],
    x: 498, y: 100,
  },
  {
    id: 'hooks', emoji: '🪝', label: 'Custom Hooks', cat: 'frontend',
    purpose: 'Client-side davranis, async ve state orkestrasyonu',
    keyMetric: 'Stale closure hatasi getState() ile cozuldu',
    responsibilities: [
      'useCheckoutMachine — XState-style siparis state machine',
      'useOrderRealtime — canli durum subscription + polling fallback',
      'useFormValidation — Zod entegrasyonlu form hook',
      'useLatestRequest — race condition onleyici',
      'useDebounce / useTimeout / useMediaQuery / useMounted',
    ],
    deepDive: [
      {
        title: 'Stale Closure Sorunu ve Cozumu',
        body: [
          'SORUN: React hook closure, mount anindaki items degerini yakalar',
          'SENARYO: Hizli art arda 2 urun ekleme — 2. ekleme 1. urunu siliyordu',
          'NEDEN: Closure deki items bayat → guncel store degeri gorunmuyor',
          'COZUM: useAddToCart — getState() ile HER ZAMAN taze store degeri alir',
          'SONUC: Hizli art arda ekleme artik guvenli, urun kaybi yok',
          'DOSYA: hooks/use-add-to-cart.ts',
        ],
      },
      {
        title: 'Checkout Submit Hardening (4 Mekanizma)',
        body: [
          '1. Double-submit guard: isSubmitting=true iken 2. tikla ignore edilir',
          '2. Idempotency key: crypto.randomUUID() — sunucu ayni istegi 2 kez islemez',
          '3. AbortController: 30sn timeout — sonsuz spinner engellenir',
          '4. Deterministic cleanup: finally blogunda isSubmitting=false + clearTimeout',
          'DOSYA: hooks/use-checkout-submit.ts (174 satir)',
        ],
      },
    ],
    files: ['hooks/use-checkout-machine.ts','hooks/use-order-realtime.ts','hooks/use-form-validation.ts','hooks/use-checkout-submit.ts','hooks/use-add-to-cart.ts'],
    x: 722, y: 100,
  },
  {
    id: 'store', emoji: '🛒', label: 'Zustand Store', cat: 'frontend',
    purpose: 'Global client state: sepet + persist + cross-tab sync',
    responsibilities: [
      'Sepet: addItem / removeItem / updateQty / clear',
      'localStorage persist + cross-tab sync via storage event',
      'Computed totals, itemCount, subtotal',
      'Optimistic UI updates ile bekleme yonetimi',
    ],
    files: ['store/cart-store.ts','store/index.ts'],
    x: 946, y: 100,
  },
  {
    id: 'i18n', emoji: '🌐', label: 'i18n / Routing', cat: 'frontend',
    purpose: 'TR/EN lokalizasyon, locale-aware routing ve mesajlar',
    responsibilities: [
      'next-intl v4 — locale resolution middleware',
      '/tr/* ve /en/* URL prefix routing',
      'useTranslations hook ile JSX interpolasyon',
      'Date, number, currency format lokalizasyonu',
    ],
    files: ['i18n/routing.ts','i18n/request.ts','i18n/messages/tr.json','i18n/messages/en.json'],
    x: 1170, y: 100,
  },
  {
    id: 'skeletons', emoji: '💀', label: 'Skeletons / Loading', cat: 'frontend',
    purpose: 'Yuklenme UI; Streaming + CLS sifira indirme',
    responsibilities: [
      'loading.tsx ile Suspense boundary fallback',
      'Sayfa-bazli iskelet componentler (ProductSkeleton vb.)',
      'Sabit boyutlu yer tutucular ile CLS=0 hedefi',
      'Streaming SSR: hazir parcalari once gonder',
    ],
    files: ['components/skeletons/*','app/[locale]/products/loading.tsx','app/[locale]/checkout/loading.tsx'],
    x: 1394, y: 100,
  },
  {
    id: 'monitoring-ui', emoji: '📊', label: 'Client Telemetry', cat: 'frontend',
    purpose: 'Web Vitals, analytics ve Sentry client trace raporlama',
    keyMetric: 'view→cart %30 · cart→start %50 · start→success %80',
    responsibilities: [
      'Vercel Analytics + Speed Insights widget',
      'Web Vitals (CLS/LCP/FID/INP/TTFB) push to Sentry',
      'useReportWebVitals ile custom metric toplama',
      'instrumentation-client.ts — sayfa yuklenme trace',
    ],
    deepDive: [
      {
        title: 'Urun Funnel Takibi (Product Telemetry)',
        body: [
          'product_view (1000) → add_to_cart (300) → checkout_start (150) → success (120)',
          'Genel donusum orani: %12 — her adim icin ayri metrik izlenir',
          'Guardrail: checkout error rate < %5, API p95 < 2s, sepet abandon < %70',
          'Guardrail kirildiysa yeni feature geri alinir (feature flag ile aninda)',
          'DOSYA: lib/telemetry.ts (238 satir)',
        ],
      },
    ],
    files: ['components/monitoring/*','instrumentation-client.ts','app/[locale]/layout.tsx'],
    x: 1618, y: 100,
  },

  // ── BACKEND ───────────────────────────────────────────────────────────────────────────
  {
    id: 'proxy', emoji: '🛡️', label: 'Proxy Middleware', cat: 'backend',
    purpose: 'Edge request guard: auth, locale, security headers, tracing',
    responsibilities: [
      'Public / protected / admin route matrisi (config-driven)',
      'CSP, HSTS, X-Frame-Options, Referrer-Policy headerlari',
      'Supabase session cookie refresh on protected routes',
      'X-Request-ID correlation tracing inject etme',
      'next-intl locale middleware ile zincir',
    ],
    files: ['proxy.ts','lib/middleware.ts','lib/config.ts'],
    x: 50, y: 415,
  },
  {
    id: 'api', emoji: '📡', label: 'API Routes', cat: 'backend',
    purpose: 'Tum is kurallarinin type-safe server giris noktasi',
    responsibilities: [
      '/api/checkout, /api/products, /api/orders, /api/reviews',
      '/api/loyalty, /api/gift-cards, /api/referrals, /api/subscriptions',
      '/api/webhooks/stripe — idempotent event handler',
      '/api/auth/* — PKCE callback, session, logout',
      'Versioned routing: /api/v1/* backward compat',
    ],
    files: ['app/api/checkout/route.ts','app/api/products/route.ts','app/api/orders/route.ts','app/api/webhooks/stripe/route.ts'],
    x: 274, y: 415,
  },
  {
    id: 'security', emoji: '🔐', label: 'Security Layer', cat: 'backend',
    purpose: 'CSRF + rate limit + input validation + sanitization',
    keyMetric: '100 req/min/IP · 500 req/min/user · OWASP Top 10',
    responsibilities: [
      'Token bucket: 100 req/min/IP, 500/min/user',
      'Zod schema validation — tum API sinirlarinda zorunlu',
      'CSRF token + SameSite cookie enforcement',
      'OWASP input sanitization + XSS + injection korunma',
    ],
    deepDive: [
      {
        title: 'Timing-Safe Karsilastirma (Timing Attack)',
        body: [
          'SORUN: Normal === operatoru ilk farkli karakterde hemen durur',
          'ACIK: Saldirgan yanit surelerini olcerek dogru karakterleri tahmin eder',
          'COZUM: Sabit zamanli karsilastirma — HER ZAMAN tum karakterleri kontrol eder',
          'KULLANIM: Admin API key, cron job bearer token dogrulamasi',
          'DOSYA: lib/safe-compare.ts, app/api/admin/queues/route.ts',
        ],
      },
      {
        title: 'CSRF Origin Validation',
        body: [
          'Her POST/PUT/DELETE isteginde Origin veya Referer header kontrol edilir',
          'Sadece kendi domain imizden (glazedandsipped.com) gelen istekler kabul',
          'evil.com dan gelen istek → 403 Forbidden aninda',
          'Kullanim: /api/user/delete, /api/user/export (GDPR endpointleri)',
        ],
      },
      {
        title: 'XSS Korumasi (Email Template Escape)',
        body: [
          'SENARYO: Gift card alici adina <script> etiketi yazilmasi',
          'COZUM: escapeHtml() — < → &lt;  > → &gt;  & → &amp;  " → &quot;',
          'KULLANIM: Gift card email sablonu, stripe webhook handler',
          'SONUC: Zararlı script e-posta istemcisinde calistirilamamaz',
        ],
      },
    ],
    files: ['lib/security.ts','lib/rate-limit.ts','lib/validations.ts','lib/api-handler.ts'],
    x: 498, y: 415,
  },
  {
    id: 'auth', emoji: '🔑', label: 'Auth / Session', cat: 'backend',
    purpose: 'Supabase Auth: session, OAuth PKCE, JWT, MFA',
    keyMetric: 'Token SHA-256 hash olarak saklanir — plain text asla yok',
    responsibilities: [
      'SSR cookie-based session (HTTP-only, Secure flag)',
      'Google / GitHub OAuth PKCE flow',
      'Magic link + email OTP destegi',
      'JWT decode + user context injection',
    ],
    deepDive: [
      {
        title: 'Token Rotation — Calinti Token Tespiti',
        body: [
          'Her session refresh de: eski token gecersiz, yeni token verilir',
          'Calinti token tekrar gonderilirse → TUM token ailesi aninda iptal',
          'Redis e ham token degil SHA-256 hash i saklanir (Redis ihlaline karsi)',
          'Calinti tespiti sonucu: kullanici 401 + tum cihazlarda cikis',
          'DOSYA: lib/token-rotation.ts (227 satir)',
        ],
      },
      {
        title: 'Session Anomaly Detection — 4 Sinyal',
        body: [
          'new_device: User-Agent degisimi (Chrome → Safari, Desktop → Mobile)',
          'ip_change: 5 dakikada farkli ulkeden giris (TR → BR)',
          'concurrent_sessions: Esik 3 — 3+ esz. acik oturum sanipler',
          'rapid_succession: Cok kisa surede cok giris — brute-force saldirisi imasi',
          'Tespit → Step-Up Auth: hassas islem oncesi sifre tekrar istenir',
          'DOSYA: lib/session-anomaly.ts (241 satir)',
        ],
      },
    ],
    files: ['lib/auth/context.tsx','lib/supabase/server.ts','lib/supabase/client.ts','app/[locale]/auth/callback/page.tsx'],
    x: 722, y: 415,
  },
  {
    id: 'abac', emoji: '🏛️', label: 'ABAC / RLS', cat: 'backend',
    purpose: 'Attribute-based access control + Supabase row-level security',
    keyMetric: '5 rol hiyerarsisi · kaynak sahipligi bazli izin motoru',
    responsibilities: [
      'Rol hiyerarsisi: guest → user → manager → admin → superadmin',
      'Resource ownership validation (kendi kaydini gorme)',
      'Supabase RLS policy ile client-taraf satir kisilama',
      'Server ABAC ile admin route yetki kontrolu',
    ],
    deepDive: [
      {
        title: 'RBAC vs ABAC — Fark Nedir?',
        body: [
          'RBAC (eski hal): Sadece "admin mi / degil mi" — 2 seviye, kaba',
          'ABAC (yeni hal): Kim + ne + kimin + nasil → n seviye, hassas',
          'ORNEK IZIN: user-123, orders, owner=user-123, read → IZIN VER',
          'ORNEK RED: user-123, orders, owner=user-456, read → REDDET',
          'Admin herkese erisebilir; anonim sadece public_read kaynaklara',
        ],
      },
      {
        title: 'Izin Matrisi (Kim Ne Yapabilir?)',
        body: [
          'orders:      Herkes gormez | Kendi siparisini gorur     | Admin tam CRUD',
          'profiles:    Herkes gormez | Kendi profilini yonetir    | Admin tam CRUD',
          'reviews:     Herkes okur   | Kendi reviewini sil/duzenle | Admin tam CRUD',
          'products:    Herkes okur   | Kullanici yazamaz           | Admin tam CRUD',
          'gift_cards:  Herkes gormez | Satin alan yonetir          | Admin tam CRUD',
          'DOSYA: lib/abac.ts (282 satir)',
        ],
      },
    ],
    files: ['lib/abac.ts','docs/RLS.md'],
    x: 946, y: 415,
  },
  {
    id: 'cache', emoji: '💾', label: 'Cache Policy', cat: 'backend',
    purpose: 'Cok katmanli cache: in-memory, next/cache, Redis',
    keyMetric: 'Hedef hit rate > %80 · products 5dk, orders 1dk TTL',
    responsibilities: [
      'React cache() — istek icinde deduplication',
      'unstable_cache + revalidateTag — tag-bazli ISR invalidation',
      'Redis: products 5dk TTL, orders 1dk, session TTL',
      'Cache observability: hit/miss/stale metrik raporlama',
    ],
    deepDive: [
      {
        title: 'Cache Hit Rate Yorumlama',
        body: [
          '> %80 → Saglikli: veritabani yuku dusuk, hiz iyi',
          '%50-%80 → Uyari: TTL cok kisa veya cache key yapisi yanlis',
          '< %50 → Kritik: cache stratejisi bastan gozden gecirilmeli',
          'HIT = veri cache te bulundu (hizli, DB sorgusu yok)',
          'MISS = cache te yok, DB ye gidildi (yavas)',
          'EVICTION = cache doldu, eski entry silindi',
          'STALE = suresi dolmus ama kullanilabilir eski veri sunuldu',
        ],
      },
      {
        title: 'TTL Degerleri ve Gerekceleri',
        body: [
          'products: 5 dakika — sik degismez, yuksek hit rate beklenir',
          'orders: 1 dakika — kritik is verisi, guncel olmali',
          'stores: 1 saat — nadiren degisir, uzun TTL guvenli',
          'session: kullanici-bazli TTL (her refresh de uzatilir)',
          'DOSYA: lib/cache-policy.ts, lib/cache-observability.ts (197 satir)',
        ],
      },
    ],
    files: ['lib/cache-policy.ts','lib/cache-tags.ts','lib/cache-observability.ts'],
    x: 1170, y: 415,
  },
  {
    id: 'feature-flags', emoji: '🚩', label: 'Feature Flags', cat: 'backend',
    purpose: 'Runtime ozellik kontrolu: canary, A/B, kill switch',
    keyMetric: 'FNV-1a hash ile deterministic bucketing — tutarli deneyim',
    responsibilities: [
      'Flag kaynagi: env var, DB veya remote config',
      'Context-aware: user ID, rol, locale, region bazli',
      'Kill switch: tek satir kodla ozelligi aninda kapat',
      'Canary release: %x kullaniciya kademeli rollout',
    ],
    deepDive: [
      {
        title: 'Canary Release — Kademeli Acilim',
        body: [
          'Klasik deploy: v1→v2, %100 aninda, risk YUKSEK',
          'Feature flag: %0 → %5 → %25 → %50 → %100 — kademeli, kontrollü',
          'Sorun varsa: sadece o yuzdelik etkilenir, flag kapat → aninda geri al',
          'A/B variant: sadece acik/kapali degil — A veya B versiyonu secimi',
        ],
      },
      {
        title: 'FNV-1a Hash ile Deterministic Bucketing',
        body: [
          'flagName + ":" + userId birlestirilerek FNV-1a hash lenir',
          'hash % 100 → 0-99 arasi kova numarasi hesaplanir',
          'rolloutPercentage=25 → kova < 25 ise flag actir',
          'DETERMINISTIC: Ayni user her zaman ayni kovaya duser (tutarlilik)',
          'FNV-1a: Kriptografik DEGIL — hizli ve uniform dagilimli hash',
          'DOSYA: lib/feature-flags.ts (159 satir)',
        ],
      },
    ],
    files: ['lib/feature-flags.ts'],
    x: 1394, y: 415,
  },
  {
    id: 'errors', emoji: '⚠️', label: 'Error Handling', cat: 'backend',
    purpose: 'Hata siniflandirma, circuit breaker, error budget',
    keyMetric: '%99.5 uptime SLO = ayda yalnizca 3.65 dak. hata butcesi',
    responsibilities: [
      'AppError hiyerarsisi: UserError / SystemError / ExternalError',
      'Retryable vs fatal error siniflandirma',
      'Circuit breaker: 5 hatada ac, 30s sonra half-open',
      'Error budget burn rate → SLO alerting tetikleme',
    ],
    deepDive: [
      {
        title: 'Error Budget Sureci (Ne Zaman Feature Durur?)',
        body: [
          'Tum SLO yesil       → Feature gelistirmeye devam et',
          '1 SLO kirmizi       → Yeni feature DURDUR, once SLO yu duzelt',
          '2+ SLO kirmizi      → TUM gelistirme DURUR — root cause + postmortem',
          'Checkout kirmizi    → HER ZAMAN P1, aninda mudahale (gelir akisi)',
          'SLO ornekleri: checkout basari >= %95, p95 < 2s, error rate < %1',
        ],
      },
      {
        title: 'Circuit Breaker Durumlari',
        body: [
          'CLOSED (Kapali): Normal calisma — tum istekler gecebilir',
          'OPEN (Acik): 5 art arda hata → servis BLOKE, 30 saniye bekle',
          'HALF-OPEN (Yari Acik): 30s sonra 1 test istegi gonder',
          'Test basarili → CLOSED (normal), Test basarisiz → OPEN (30s daha)',
          'AMAC: Hata kaskadinii onle — kucuk bir ariza tum sistemi yikmasin',
          'DOSYA: lib/circuit-breaker.ts, lib/error-budget.ts',
        ],
      },
    ],
    files: ['lib/errors.ts','lib/error-classification.ts','lib/circuit-breaker.ts','lib/error-budget.ts','lib/error-codes.ts'],
    x: 1618, y: 415,
  },

  // ── DATA & INTEGRATIONS ───────────────────────────────────────────────────────────────
  {
    id: 'db', emoji: '🗄️', label: 'Supabase Postgres', cat: 'data',
    purpose: 'Birincil iliskisel veritabani; tum domain verileri',
    responsibilities: [
      'Tablolar: orders, order_items, products, profiles, reviews',
      'loyalty_points, gift_cards, referrals, subscriptions',
      'GIN indexler + full-text search (products)',
      'RLS enforcement + audit log triggers',
      'pg_cron ile scheduled cleanup joblar',
    ],
    files: ['supabase/schema.sql','supabase/migrations/*','lib/data.server.ts','lib/data.ts'],
    x: 50, y: 730,
  },
  {
    id: 'stripe', emoji: '💳', label: 'Stripe', cat: 'data',
    purpose: 'Odeme sessions, webhook, refund ve hibrit odeme',
    keyMetric: 'Gift card kodu artik SADECE webhook ta uretilir',
    responsibilities: [
      'checkout.session.create — sepet tutariyla session ac',
      'payment_intent.succeeded webhook — siparis onayi tetikle',
      'Idempotency key ile cift odeme korunma',
      'Refund + dispute API entegrasyonu',
      'Gift card + Stripe hibrit odeme (kalan karta biner)',
    ],
    deepDive: [
      {
        title: 'Gift Card Kodu — Guvenlik Acigi Tarihi',
        body: [
          'ESKI AKIS (ACIK): Checkout API kod uretir ve URL ye koyar',
          '  → Kullanici kodu kopyalayip odemeyi iptal edebiliyordu (bedava kod!)',
          'YENI AKIS (GUVENLI): Kod SADECE Stripe webhook ta uretilir',
          '  1. Checkout session acilar (URL de kod YOK)',
          '  2. Kullanici Stripe uzerinde odemesini tamamlar',
          '  3. Stripe → POST /api/webhooks/stripe (payment_intent.succeeded)',
          '  4. Webhook: kod uret → DB kaydet → email gonder → Stripe metadata guncelle',
          '  5. Success page polling ile kodu kullaniciya gosterir',
        ],
      },
      {
        title: 'Webhook Idempotency',
        body: [
          'Stripe bazen ayni webhook u birden fazla kez gonderebilir',
          'Cozum: event.id ile daha once islenip islenmedigini kontrol et',
          'Zaten islendiyse → 200 OK don (tekrar isleme, cift siparis yok)',
          'PRENSIP: Idempotent handler — N kez calisstirsa da sonuc 1 kez',
          'DOSYA: app/api/webhooks/stripe/route.ts',
        ],
      },
    ],
    files: ['lib/stripe/server.ts','app/api/webhooks/stripe/route.ts','docs/PAYMENTS.md'],
    x: 274, y: 730,
  },
  {
    id: 'queue', emoji: '📬', label: 'BullMQ Queue', cat: 'data',
    purpose: 'Asenkron is kuyrugu: email, loyalty, bildirimler',
    keyMetric: '3 retry · 1s→2s→4s backoff · DLQ',
    responsibilities: [
      'Kuyruklar: email-queue, loyalty-queue, notification-queue',
      'Retry: 3 deneme, exponential backoff (1s → 2s → 4s)',
      'Dead-letter queue + manuel replay destegi',
      'Worker concurrency: email=5, loyalty=2, cleanup=1',
    ],
    deepDive: [
      {
        title: 'Retry Stratejisi ve Dead-Letter Queue',
        body: [
          '1. deneme basarisiz → 1 saniye bekle → 2. deneme',
          '2. deneme basarisiz → 2 saniye bekle → 3. deneme',
          '3. deneme basarisiz → Dead-Letter Queue (DLQ) ya gonder',
          'DLQ: Manuel inceleme + replay destekli ayri kuyruk',
          'Exponential backoff prensibi: Her denemede sure 2 katina cikar',
          'AMAC: Sunucuya ani yuk bindirmemek + gecici hatalardan kurtulma sansi',
          'DOSYALAR: lib/queue/workers.ts, docs/DEAD-LETTER.md',
        ],
      },
    ],
    files: ['lib/queue/queues.ts','lib/queue/workers.ts','docs/QUEUE-RELIABILITY.md','docs/DEAD-LETTER.md'],
    x: 498, y: 730,
  },
  {
    id: 'email', emoji: '✉️', label: 'Resend Email', cat: 'data',
    purpose: 'React Email ile transaksiyonel e-posta gonderimi',
    responsibilities: [
      'Order confirmation: urun listesi + toplam + tracking link',
      'Shipping update: kargo takip no + tahmini teslimat',
      'Gift card teslim maili ile benzersiz kullanim kodu',
      'Email log: gonderim, delivery, bounce kayitlari',
    ],
    files: ['app/api/email/send/route.ts','lib/email-log.ts'],
    x: 722, y: 730,
  },
  {
    id: 'realtime', emoji: '📶', label: 'Realtime', cat: 'data',
    purpose: 'Canli siparis durum guncellemeleri via Supabase',
    responsibilities: [
      'Supabase Realtime Postgres Changes listener',
      'orders tablosu degisikliklerini filtreli subscribe',
      'Baglanti kopuklugunda otomatik yeniden baglanti',
      'Fallback: 30 saniyelik polling modu',
    ],
    files: ['hooks/use-order-realtime.ts','lib/supabase/client.ts'],
    x: 946, y: 730,
  },
  {
    id: 'loyalty', emoji: '⭐', label: 'Loyalty Engine', cat: 'data',
    purpose: 'Puan kazanma, harcama, tier yukseltme ve expire sistemi',
    keyMetric: '1 TL = 1 puan · min 500 puan = %5 indirim · 12ay expire',
    responsibilities: [
      '1 TL = 1 puan; tier carpani: Bronze x1, Silver x1.5, Gold x2',
      'Tier: Bronze (0-999), Silver (1k-5k puan), Gold (5k+)',
      'Redemption: min 500 puan = %5 siparis indirimi',
      'Puan expire: 12 ay hareketsizlikte otomatik silinme',
    ],
    deepDive: [
      {
        title: 'Tier Sistemi ve Kazanim Carpanlari',
        body: [
          'BRONZE: 0-999 puan  →  her harcanan TL icin x1 puan',
          'SILVER: 1.000-4.999 →  her harcanan TL icin x1.5 puan',
          'GOLD:   5.000+      →  her harcanan TL icin x2 puan',
          'ORNEK: Silver tier, 100 TL harcama → 150 puan kazanir',
          'Redemption: minimum 500 puan = sipariste %5 indirim olarak kullanilir',
          'Expire mekanizmasi: Son aktiviteden 12 ay gecerse tum puan silinir',
        ],
      },
    ],
    files: ['app/api/loyalty/route.ts','components/loyalty/*','lib/data.server.ts'],
    x: 1170, y: 730,
  },
  {
    id: 'giftcards', emoji: '🎁', label: 'Gift Cards', cat: 'data',
    purpose: 'Hediye karti olusturma, aktivasyon ve kullanim',
    keyMetric: '5 katmanli lookup guvenligi + exponential backoff polling',
    responsibilities: [
      '16 haneli benzersiz kod uretimi (GUID-tabanli)',
      'Bakiye takibi + kullanim gecmisi logu',
      'Stripe + gift card hibrit odeme (kalan karta biner)',
      'Expiry date + tek kullanim limiti validasyonu',
    ],
    deepDive: [
      {
        title: 'Lookup Endpoint — 5 Guvenlik Katmani',
        body: [
          '1. Origin validation → evil.com dan gelen istek: 403 Forbidden',
          '2. Rate limit: 10 istek/dak/IP (polling dostu ama saldiriya karsi)',
          '3. session_id format regex: /^cs_(test_|live_)?[a-zA-Z0-9]+$/',
          '4. Stripe session retrieve: type=gift_card? payment_status=paid?',
          '5. metadata.code var mi? → 200 ready veya 202 pending',
        ],
      },
      {
        title: 'Success Page Polling Mekanizmasi',
        body: [
          'Success page acilinir → GET /api/gift-card/lookup?session_id=...',
          '202 pending → 2 sn bekle → tekrar sor',
          '202 pending → 4 sn bekle → tekrar sor (2 kat = exponential backoff)',
          '200 ready  → kodu kullaniciya goster',
          'AbortController: Kullanici sayfayi terk ederse tum istekler iptal',
          'NEDEN POLLING: Stripe webhook asenkron — kod aninda hazir olmayabilir',
        ],
      },
    ],
    files: ['app/api/gift-cards/route.ts','app/api/gift-card/lookup/route.ts','components/giftcards/*'],
    x: 1394, y: 730,
  },
  {
    id: 'referrals', emoji: '🤝', label: 'Referrals', cat: 'data',
    purpose: 'Kullanici tavsiye kodu ve odul dagitim sistemi',
    responsibilities: [
      'Her kullaniciya benzersiz 8 haneli referral kodu atama',
      'Davet edilen ilk aliminda her iki tarafa puan odulu',
      'Kullanim sayaci + davet edilen kullanici kaydi',
      'Fraud detection: IP + email bazli max 5 davet limiti',
    ],
    files: ['app/api/referrals/route.ts','components/referrals/*'],
    x: 1618, y: 730,
  },

  // ── INFRA & OPS ───────────────────────────────────────────────────────────────────────
  {
    id: 'redis', emoji: '🔴', label: 'Redis / Upstash', cat: 'infra',
    purpose: 'Queue backend, distributed cache, rate limit storage',
    responsibilities: [
      'BullMQ job storage: pending/active/completed/failed setler',
      'Cache KV: product=5dk, order=1dk, session TTL',
      'Rate limit counter: sliding window per IP + user',
      'Pub/Sub: event-driven cache invalidation',
    ],
    files: ['lib/redis/client.ts','lib/queue/connection.ts'],
    x: 50, y: 1045,
  },
  {
    id: 'sentry', emoji: '🔎', label: 'Sentry', cat: 'infra',
    purpose: 'Error tracking, performance trace, session replay',
    keyMetric: 'tracesSampleRate 1.0→0.1 · sendDefaultPii false (GDPR)',
    responsibilities: [
      'Error capture: domain context + user identity + request trace',
      'Performance: transaction trace, N+1 query detection',
      'Session Replay: bug repro icin kullanici kaydi',
      'Alert routing: severity bazli on-call eskalasyon',
    ],
    deepDive: [
      {
        title: 'Config Hardening — Oncesi vs Sonrasi',
        body: [
          'DSN: Koda gomulu (git tarihinde okunabilir) → process.env.SENTRY_DSN',
          'Aktiflik: Tum ortamlarda → NODE_ENV=production da ONLY',
          'sendDefaultPii: true → false (GDPR uyumu — kisisel veri gondermez)',
          'tracesSampleRate: 1.0 → 0.1 (%10 istek izleniyor — 10x maliyet azaldi)',
          'DOSYALAR: sentry.edge.config.ts, sentry.server.config.ts',
        ],
      },
    ],
    files: ['sentry.client.config.ts','sentry.server.config.ts','sentry.edge.config.ts','app/global-error.tsx'],
    x: 274, y: 1045,
  },
  {
    id: 'tests', emoji: '🧪', label: 'Tests', cat: 'infra',
    purpose: 'Cok katmanli kalite bariyeri: unit / entegrasyon / e2e',
    keyMetric: '1227 test · %80 branch / %90 function coverage zorunlu',
    responsibilities: [
      'Vitest: unit (lib/*) + integration (API routes)',
      'MSW: service worker mock ile izole API test',
      'Playwright: smoke + visual regression (e2e/)',
      'Coverage: %80 branch, %90 functions threshold',
    ],
    deepDive: [
      {
        title: 'CI Pipeline Hardening',
        body: [
          'ESKI: Test sadece "ci:tests" label li PR larda calisiyordu',
          '  → Labelsiz PR lar test olmadan merge edilebiliyordu (bypass)',
          'ESKI: continue-on-error:true — guv. taramasi basarisaydi CI yine yesil',
          'YENI: Tum PR larda test ZORUNLU — label bypass kaldirildi',
          'YENI: continue-on-error KALDIRILDI — 1 test fail = pipeline fail',
          'YENI: build adimi artik test adimina bagimli (needs: [lint,typecheck,test])',
          'DOSYA: .github/workflows/ci.yml',
        ],
      },
    ],
    files: ['tests/*','e2e/smoke.spec.ts','e2e/visual-regression.spec.ts','vitest.config.ts','playwright.config.ts'],
    x: 498, y: 1045,
  },
  {
    id: 'cicd', emoji: '🚀', label: 'CI/CD Pipeline', cat: 'infra',
    purpose: 'Otomatik build, test ve Vercel deploy orkestrasyonu',
    responsibilities: [
      'PR gates: ESLint + TypeScript + Vitest + Playwright',
      'main merge: Vercel production deploy tetikle',
      'Post-deploy: smoke test + Lighthouse CI calistir',
      'Rollback: tek tikla onceki deployment aktif et',
    ],
    files: ['.github/workflows/','docs/CI.md','docs/DEPLOY-CHECKLIST.md','docs/ROLLBACK.md'],
    x: 722, y: 1045,
  },
  {
    id: 'docs', emoji: '📚', label: 'Runbooks & ADRs', cat: 'infra',
    purpose: 'Operasyon bilgisi, incident playbook ve mimari karar kayitlari',
    responsibilities: [
      'RUNBOOK.md: incident adim-adim mudahale rehberi',
      'ROLLBACK.md + DEPLOY-CHECKLIST.md',
      'SECURITY.md + THREAT-MODEL.md + GDPR.md',
      'docs/adr/*: mimari karar gecmisi (neden bu secimleri yaptik)',
    ],
    files: ['docs/RUNBOOK.md','docs/SECURITY.md','docs/adr/','docs/GDPR.md'],
    x: 946, y: 1045,
  },
  {
    id: 'lighthouse', emoji: '🏎️', label: 'Lighthouse CI', cat: 'infra',
    purpose: 'Core Web Vitals ve Lighthouse all-routes otomatik audit',
    keyMetric: '48 URL audit: 24 route × 2 locale · Hedef: Perf 95+',
    responsibilities: [
      '48 URL audit: 24 route × 2 locale (TR + EN)',
      'Hedef skorlar: Perf 95+, A11y 90+, BP 100, SEO 100',
      'until-100 script: amaca ulasana kadar iteratif retry',
      'k6 load test: 100 VU, checkout + products senaryosu',
    ],
    files: ['scripts/lighthouse-until-100.mjs','lighthouserc.json','docs/PERF.md','docs/LOAD-TEST-REPORT.md'],
    x: 1170, y: 1045,
  },
  {
    id: 'migrations', emoji: '🔄', label: 'DB Migrations', cat: 'infra',
    purpose: 'Schema degisikligi yonetimi, rollback ve backup',
    responsibilities: [
      'Supabase CLI ile versiyonlu migration dosyalari',
      'Backward compatible DDL (yeni sutun nullable)',
      'Migration checklist: PR approval + staging test zorunlu',
      'Daily automated snapshot, 30 gun retention',
    ],
    files: ['supabase/migrations/','docs/MIGRATION-CHECKLIST.md','docs/BACKUP_RESTORE.md'],
    x: 1394, y: 1045,
  },
  {
    id: 'concurrency', emoji: '⚡', label: 'Concurrency / SLO', cat: 'infra',
    purpose: 'Eszamanli istek sinirlandirma ve SLO burn rate takibi',
    keyMetric: '%99.5 uptime = ayda 3.65 dak. hata butcesi',
    responsibilities: [
      'p-limit ile concurrent DB + external API call limiting',
      'SLO: aylik %99.5 uptime = 3.65 dak/gun error budget',
      'Burn rate alerting (hizli yanis + yavas yanis modu)',
      'Postmortem template + incident severity matrisi',
    ],
    deepDive: [
      {
        title: 'Burn Rate Alerting (2 Mod)',
        body: [
          'HIZLI YANIS: Son 1 saatte budjetin %2 si harcandi → P1 alarm',
          '  Demek: 100 saat icinde tum butce tukenir — kritik!',
          'YAVAS YANIS: Son 6 saatte budjetin %5 i harcandi → P2 alarm',
          '  Demek: gercek bir incident mi yoksa kucuk spike mi? Ayirt etmek icin',
          'AMAC: Erken uyari — butce bitmeden once mudahale sansini vermek',
          'DOSYA: lib/error-budget.ts (179 satir), docs/SLO.md',
        ],
      },
    ],
    files: ['lib/concurrency.ts','lib/error-budget.ts','docs/SLO.md','docs/CONCURRENCY.md','docs/INCIDENT-SEVERITY.md'],
    x: 1618, y: 1045,
  },
];

const FLOWS: FlowDef[] = [
  {
    id: 'checkout', icon: '🛍️', title: 'Checkout E2E',
    description: 'Odeme butonundan Stripe para cekimine ve siparis onay e-postasina kadar tam zincir.',
    steps: ['pages','hooks','store','api','security','stripe','db','queue','email'],
  },
  {
    id: 'authflow', icon: '🔒', title: 'Auth Guard',
    description: 'Route koruma, Supabase session yenileme ve ABAC rol kontrol akisi.',
    steps: ['pages','proxy','auth','abac','api','db'],
  },
  {
    id: 'order-live', icon: '📶', title: 'Order Realtime',
    description: 'Siparis durumu degistiginde UI uzerinde canli push guncelleme.',
    steps: ['db','realtime','hooks','pages'],
  },
  {
    id: 'loyalty', icon: '⭐', title: 'Loyalty Flow',
    description: 'Satin alimdan puan biriktirilmesi, tier hesaplama ve expire akisi.',
    steps: ['pages','domain-ui','api','security','abac','loyalty','db','queue'],
  },
  {
    id: 'giftcard', icon: '🎁', title: 'Gift Card',
    description: 'Hediye karti satin alma, guvenli webhook ile kod uretimi ve teslim akisi.',
    steps: ['pages','api','security','stripe','queue','email'],
  },
  {
    id: 'release', icon: '🚀', title: 'Release',
    description: 'Kod degisikliginin testlerden, Lighthouse CI ve migration onayindan gecip productiona cikisi.',
    steps: ['tests','cicd','lighthouse','docs','migrations'],
  },
];

const GLOSSARY: GlossaryEntry[] = [
  { term: 'ABAC',               short: 'Attribute-Based Access Control', def: 'Kim + ne + kimin + nasil erişebilir sorusini birlikte degerlendirir. RBAC nin basit admin/user kontrolunden daha hassas ve guclu.' },
  { term: 'RBAC',               short: 'Role-Based Access Control',      def: 'Sadece kullanici rolune (admin/user) gore erisim. Kaynak sahipligi gibi baglami degerlendirmez. Daha kaba bir model.' },
  { term: 'Token Rotation',     short: 'Refresh Token Dondurmek',        def: 'Her oturum yenilemesinde eski token gecersiz olur, yeni token verilir. Calinti token tekrar kullanilirsa tum aile iptal edilir.' },
  { term: 'Token Family',       short: 'Token Ailesi',                   def: 'Bir oturum zincirindeki tum tokenlerin grubu. Herhangi bir token yeniden kullanilirsa tum aile iptal edilir.' },
  { term: 'Step-Up Auth',       short: 'Adim Yukseltme Dogrulama',       def: 'Aktif oturumu olan kullanicidan hassas islem oncesi ek dogrulama (sifre/OTP) istenir. Online bankaciligin para transferinde sifre istemesi ornektir.' },
  { term: 'Timing Attack',      short: 'Zamanlama Saldirisi',            def: 'Normal === erken cikar. Saldirgan yanit suresini olcerek dogru karakterleri tahmin eder. Sabit zamanli karsilastirma ile engellenir.' },
  { term: 'Idempotency Key',    short: 'Tekrar Guvenlik Anahtari',       def: 'Ayni istegin birden fazla kez gelmesinde yalnizca bir kez islenmesini saglayan benzersiz anahtar. Agi tekrarlarinda cift odemeyi engeller.' },
  { term: 'Dead-Letter Queue',  short: 'DLQ — Oldu Mektup Kuyrugu',     def: 'Max retry sayisina ulasan basarisiz islerin manuel inceleme ve replay icin gonderildig ayri kuyruk.' },
  { term: 'Exponential Backoff',short: 'Ustel Geri Cekilme',             def: 'Her basarisiz denemede bekleme suresini iki katina cikarma: 2s→4s→8s. Sunucuya ani yuk bindirmez.' },
  { term: 'Circuit Breaker',    short: 'Devre Kesici',                   def: 'CLOSED normal, OPEN 5 hatada acilir (30s bloke), HALF-OPEN test istegi gonderir. Hata kaskadinii onler.' },
  { term: 'Error Budget',       short: 'Hata Butcesi',                   def: 'SLO hedefine gore kabul edilebilir max hata/downtime miktari. %99.5 uptime hedefi = ayda 3.65 dak. downtime butcesi.' },
  { term: 'SLO',                short: 'Service Level Objective',        def: 'Hizmet kalitesi hedefi. Ornek: p95 latency < 2s, checkout basari orani >= %95, error rate < %1.' },
  { term: 'p95 / p99',          short: '95./99. Yuzdeli Dilim',          def: 'Isteklerin %95 (veya %99) inin altinda kalan yanit suresi. p95=2s: isteklerin %95i 2sn den hizli isleniyor.' },
  { term: 'Cache Hit Rate',     short: 'Onbellek Isabet Orani',          def: 'Cache e gelen isteklerin bulunup bulunmama orani. >%80 saglikli, <%50 kritik strateji sorunu var.' },
  { term: 'TTL',                short: 'Time To Live',                   def: 'Cache teki bir entrynin kac saniye gecerli kalacagi. Sure dolunca key silinir, bir sonraki istekte DB den taze veri cekilir.' },
  { term: 'Stale Closure',      short: 'Bayat Baglanti',                 def: 'React hook icinde bir degerin guncel state yerine eski (closure anindaki) degere referans vermesi. getState() ile cozulur.' },
  { term: 'Polling',            short: 'Yoklama',                        def: 'Sunucuya belirli araliklarla "veri hazir mi?" diye sorma. WebSocket alternatifi — basit ama bant genisligi kullanir.' },
  { term: 'CSRF',               short: 'Cross-Site Request Forgery',     def: 'Saldirganin baska siteden kullanici adina sahte istek gondermesi. Origin/Referer header ve SameSite cookie ile engellenir.' },
  { term: 'XSS',                short: 'Cross-Site Scripting',           def: 'Kullanici girdisine zararlı JS enjekte etme saldirisi. HTML escape ile engellenir: < → &lt; > → &gt; vb.' },
  { term: 'RLS',                short: 'Row-Level Security',             def: 'Supabase/PostgreSQL de kullanicinin yalnizca kendi satirlarini gormesini saglayan veritabani seviyesinde guvenlik politikasi.' },
  { term: 'Feature Flag',       short: 'Ozellik Bayragi',                def: 'Runtime da kod degisikligi gerektirmeden bir ozelligi acip kapatma mekanizmasi. Canary release, A/B test ve kill switch icin kullanilir.' },
  { term: 'Canary Release',     short: 'Kanarya Surumu',                 def: 'Yeni ozelligi once kucuk bir kullanici yuzdesine (%5) acarak riskleri azaltarak kademeli dagitim (deploy) yapmak.' },
  { term: 'Idempotent',         short: 'Tekrar Uygulanabilir',           def: 'Ayni islemin birden fazla calistirilmasinin sonucu degistirmemesi. Webhook handler idempotent olmali: ayni event 2 kez gelse 1 siparis olusur.' },
  { term: 'FNV-1a',             short: 'Fowler-Noll-Vo Hash',            def: 'Hizli, uniform dagilimli hash algoritmasi. Feature flag bucketing icin kullanilir. Kriptografik degil — dagilim kalitesi onemlidir.' },
  { term: 'Checkout Trace',     short: 'Odeme Yasam Dongusu Izleme',     def: 'Bir checkout isteğinin her adimini (cart validate, Stripe session, DB yazma vb.) tek traceId ile birlestirerek izleme. Hangi adim yavas? sorusunu saniyeler icinde cevaplar.' },
  { term: 'Burn Rate',          short: 'Hata Butcesi Tukenim Hizi',      def: 'Error budget nin ne kadar hizli harcandigi. Hizli yanis: 1 saatte %2 harcama → P1. Yavas yanis: 6 saatte %5 harcama → P2.' },
];

const CW = 1860;
const CH = 1360;
const NW = 210;
const NH = 88;

export function ProjectSchemaDashboard() {
  const [selectedId,   setSelectedId]   = useState<string>('pages');
  const [activeFlowId, setActiveFlowId] = useState<string | null>(null);
  const [zoom,  setZoom]  = useState(0.65);
  const [pan,   setPan]   = useState({ x: 18, y: 12 });
  const [query, setQuery] = useState('');
  const [isPanning, setIsPanning] = useState(false);

  const [sideTab,    setSideTab]    = useState<'detail' | 'glossary'>('detail');
  const [openDeep,   setOpenDeep]   = useState<Set<number>>(new Set([0]));
  const [openGloss,  setOpenGloss]  = useState<Set<number>>(new Set());
  const [glossaryQ,  setGlossaryQ]  = useState('');

  const panStart = useRef<{ px: number; py: number; ox: number; oy: number } | null>(null);
  const dragging = useRef(false);

  const nodeMap = useMemo(() => {
    const m = new Map<string, NodeDef>();
    NODES.forEach((n) => m.set(n.id, n));
    return m;
  }, []);

  const selected   = nodeMap.get(selectedId) ?? NODES[0];
  const activeFlow = FLOWS.find((f) => f.id === activeFlowId) ?? null;

  // map of nodeId → step numbers (same node can appear multiple times)
  const flowStepNums = useMemo<Map<string, number[]>>(() => {
    const m = new Map<string, number[]>();
    if (!activeFlow) return m;
    activeFlow.steps.forEach((id, i) => {
      if (!m.has(id)) m.set(id, []);
      m.get(id)!.push(i + 1);
    });
    return m;
  }, [activeFlow]);

  const visibleNodes = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return NODES;
    return NODES.filter(
      (n) =>
        n.label.toLowerCase().includes(q) ||
        n.purpose.toLowerCase().includes(q) ||
        n.files.some((f) => f.toLowerCase().includes(q)),
    );
  }, [query]);

  const filteredGlossary = useMemo(() => {
    const q = glossaryQ.trim().toLowerCase();
    if (!q) return GLOSSARY;
    return GLOSSARY.filter(
      (g) => g.term.toLowerCase().includes(q) || g.short.toLowerCase().includes(q) || g.def.toLowerCase().includes(q),
    );
  }, [glossaryQ]);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('[data-node]')) return;
    dragging.current = false;
    e.currentTarget.setPointerCapture(e.pointerId);
    panStart.current = { px: e.clientX, py: e.clientY, ox: pan.x, oy: pan.y };
    setIsPanning(true);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!panStart.current) return;
    dragging.current = true;
    setPan({ x: panStart.current.ox + e.clientX - panStart.current.px, y: panStart.current.oy + e.clientY - panStart.current.py });
  };
  const onPointerUp = () => { panStart.current = null; setIsPanning(false); };
  const onWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    setZoom((z) => Math.max(0.3, Math.min(1.5, z + (e.deltaY < 0 ? 0.05 : -0.05))));
  };

  const toggleDeep  = (i: number) => setOpenDeep((p)  => { const n = new Set(p); n.has(i) ? n.delete(i) : n.add(i); return n; });
  const toggleGloss = (i: number) => setOpenGloss((p) => { const n = new Set(p); n.has(i) ? n.delete(i) : n.add(i); return n; });

  return (
    <div className='flex h-screen w-screen flex-col bg-[#0d1117] text-white select-none'>

      {/* ── HEADER ── */}
      <header className='flex h-12 shrink-0 items-center gap-2 border-b border-white/10 bg-[#161b22] px-3 overflow-x-auto'>
        <span className='font-fredoka text-sm text-white/90 whitespace-nowrap'>📌 Project Overview</span>
        <span className='text-white/25'>|</span>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder='Node / dosya ara...'
          className='h-7 w-52 shrink-0 rounded-md border border-white/10 bg-white/5 px-2 text-xs text-white outline-none placeholder:text-white/35 focus:border-white/25'
        />
        <span className='text-white/25'>|</span>
        {FLOWS.map((flow) => (
          <button
            key={flow.id}
            type='button'
            onClick={() => setActiveFlowId((prev) => (prev === flow.id ? null : flow.id))}
            className={'shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ' + (activeFlowId === flow.id ? 'bg-amber-400/25 text-amber-200' : 'bg-white/8 text-white/55 hover:bg-white/14')}
          >
            {flow.icon} {flow.title}
          </button>
        ))}
        <span className='ml-auto flex shrink-0 items-center gap-1'>
          <button type='button' onClick={() => setZoom((z) => Math.max(0.3, z - 0.1))}  className='rounded px-2 py-0.5 text-sm text-white/65 hover:bg-white/10'>-</button>
          <span className='w-10 text-center text-[11px] text-white/45'>{Math.round(zoom * 100)}%</span>
          <button type='button' onClick={() => setZoom((z) => Math.min(1.5, z + 0.1))}  className='rounded px-2 py-0.5 text-sm text-white/65 hover:bg-white/10'>+</button>
          <button type='button' onClick={() => { setZoom(0.65); setPan({ x: 18, y: 12 }); }} className='rounded px-2 py-0.5 text-[11px] text-white/45 hover:bg-white/10'>Reset</button>
        </span>
      </header>

      <div className='flex flex-1 overflow-hidden'>

        {/* ── CANVAS ── */}
        <div
          className='relative flex-1 overflow-hidden'
          style={{ cursor: isPanning ? 'grabbing' : 'grab' }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onWheel={onWheel}
        >
          <div
            className='pointer-events-none absolute inset-0'
            style={{ backgroundImage: 'radial-gradient(circle,rgba(255,255,255,0.05) 1px,transparent 1px)', backgroundSize: '24px 24px' }}
          />
          <div
            className='absolute origin-top-left will-change-transform'
            style={{ width: CW, height: CH, transform: 'translate(' + pan.x + 'px,' + pan.y + 'px) scale(' + zoom + ')' }}
          >
            {/* Lane backgrounds */}
            {LANES.map((lane) => (
              <div
                key={lane.id}
                className='absolute left-0 rounded-xl border border-white/8'
                style={{ top: lane.y, width: CW - 20, height: lane.h, background: THEME[lane.id].lane }}
              >
                <div className='px-4 py-2'>
                  <p className='text-[10px] font-black uppercase tracking-[0.18em]' style={{ color: THEME[lane.id].border }}>{lane.title}</p>
                  <p className='text-[10px] text-white/40'>{lane.subtitle}</p>
                </div>
              </div>
            ))}

            {/* Nodes */}
            {visibleNodes.map((node) => {
              const isSelected  = node.id === selectedId;
              const stepNums    = flowStepNums.get(node.id);
              const inFlow      = !!stepNums;
              return (
                <button
                  key={node.id}
                  data-node='1'
                  type='button'
                  onClick={() => { if (!dragging.current) { setSelectedId(node.id); setSideTab('detail'); setOpenDeep(new Set([0])); } }}
                  className='absolute rounded-xl border text-left transition-all'
                  style={{
                    left: node.x, top: node.y, width: NW, height: NH,
                    background: isSelected ? THEME[node.cat].bg : '#161b22',
                    borderColor: isSelected ? THEME[node.cat].border : 'rgba(255,255,255,0.10)',
                    borderTopWidth: 3,
                    borderTopColor: inFlow ? '#fbbf24' : THEME[node.cat].border,
                    boxShadow: isSelected ? '0 0 0 2px ' + THEME[node.cat].border + '44, 0 10px 24px rgba(0,0,0,0.45)' : '0 2px 6px rgba(0,0,0,0.3)',
                    transform: isSelected ? 'translateY(-2px)' : 'none',
                    zIndex: isSelected ? 20 : 5,
                    padding: '8px 10px',
                  }}
                >
                  <div className='flex items-start gap-2'>
                    <span className='text-lg leading-none mt-0.5'>{node.emoji}</span>
                    <div className='min-w-0 flex-1'>
                      <p className='truncate font-fredoka text-[12px] text-white leading-tight'>{node.label}</p>
                      <p className='truncate text-[9px] text-white/50 mt-0.5'>{node.purpose}</p>
                    </div>
                    {inFlow && (
                      <div className='flex shrink-0 flex-col gap-0.5'>
                        {stepNums!.map((n) => (
                          <span key={n} className='flex h-4 w-4 items-center justify-center rounded-full bg-amber-400 text-[9px] font-black text-black leading-none'>{n}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className='mt-1.5 flex items-center gap-1'>
                    <span className={'rounded-full px-1.5 py-0.5 text-[9px] font-bold ' + THEME[node.cat].chip}>
                      {CAT_LABEL[node.cat]}
                    </span>
                    {node.keyMetric && (
                      <span className='truncate text-[9px] text-amber-300/70'>{node.keyMetric}</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── RIGHT PANEL ── */}
        <aside className='flex w-[460px] shrink-0 flex-col border-l border-white/10 bg-[#161b22]'>

          {/* Tab bar */}
          <div className='flex shrink-0 border-b border-white/10'>
            <button
              type='button'
              onClick={() => setSideTab('detail')}
              className={'flex-1 py-2.5 text-[12px] font-semibold border-b-2 ' + (sideTab === 'detail' ? 'border-white/60 text-white' : 'border-transparent text-white/40 hover:text-white/60')}
            >
              Detay
            </button>
            <button
              type='button'
              onClick={() => setSideTab('glossary')}
              className={'flex-1 py-2.5 text-[12px] font-semibold border-b-2 ' + (sideTab === 'glossary' ? 'border-white/60 text-white' : 'border-transparent text-white/40 hover:text-white/60')}
            >
              Sozluk ({GLOSSARY.length})
            </button>
          </div>

          {/* ── DETAIL TAB ── */}
          {sideTab === 'detail' && (
            <div className='flex flex-1 flex-col overflow-hidden'>

              {/* Node header */}
              <div className='shrink-0 border-b border-white/10 px-4 py-3' style={{ borderTopWidth: 3, borderTopColor: THEME[selected.cat].border }}>
                <div className='flex items-center gap-3'>
                  <span className='text-3xl leading-none'>{selected.emoji}</span>
                  <div>
                    <h2 className='font-fredoka text-lg leading-tight text-white'>{selected.label}</h2>
                    <span className={'mt-0.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ' + THEME[selected.cat].chip}>
                      {CAT_LABEL[selected.cat]}
                    </span>
                  </div>
                </div>
                <p className='mt-2 text-sm leading-relaxed text-white/70'>{selected.purpose}</p>
                {selected.keyMetric && (
                  <div className='mt-2 rounded-lg border border-amber-400/20 bg-amber-400/8 px-3 py-1.5'>
                    <p className='text-xs text-amber-300/90'>{selected.keyMetric}</p>
                  </div>
                )}
              </div>

              {/* Active flow context */}
              {activeFlow && (
                <div className='shrink-0 border-b border-white/10 bg-amber-400/5 px-4 py-3'>
                  <p className='mb-2 text-[10px] font-black uppercase tracking-widest text-amber-300/80'>
                    {activeFlow.icon} {activeFlow.title}
                  </p>
                  <p className='mb-2 text-[11px] text-white/55'>{activeFlow.description}</p>
                  <div className='flex flex-wrap gap-1'>
                    {activeFlow.steps.map((id, idx) => {
                      const n = nodeMap.get(id);
                      if (!n) return null;
                      return (
                        <button
                          key={id + '-' + idx}
                          type='button'
                          onClick={() => setSelectedId(id)}
                          className={'rounded-md border px-2 py-1 text-[10px] ' + (id === selectedId ? 'border-amber-300/60 bg-amber-300/20 text-amber-200' : 'border-amber-300/20 bg-amber-300/8 text-amber-200/70 hover:bg-amber-300/15')}
                        >
                          {idx + 1}. {n.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Scrollable body */}
              <div className='flex-1 overflow-y-auto'>

                {/* Responsibilities — always open */}
                <div className='border-b border-white/8 px-4 py-3'>
                  <p className='mb-2 text-[10px] font-black uppercase tracking-widest text-white/35'>Sorumluluklar</p>
                  <ul className='space-y-1.5'>
                    {selected.responsibilities.map((r, i) => (
                      <li key={i} className='flex gap-2 text-sm leading-relaxed text-white/70'>
                        <span className='mt-2 h-1.5 w-1.5 shrink-0 rounded-full' style={{ background: THEME[selected.cat].border }} />
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Deep dive sections */}
                {selected.deepDive && selected.deepDive.length > 0 && (
                  <div className='border-b border-white/8 px-4 py-3'>
                    <p className='mb-2 text-[10px] font-black uppercase tracking-widest text-white/35'>Detayli Bilgi</p>
                    <div className='space-y-2'>
                      {selected.deepDive.map((dd, i) => {
                        const open = openDeep.has(i);
                        return (
                          <div key={i} className='rounded-lg border border-white/10 bg-white/3 overflow-hidden'>
                            <button
                              type='button'
                              onClick={() => toggleDeep(i)}
                              className='flex w-full items-center gap-2 px-3 py-2.5 text-left hover:bg-white/5'
                            >
                              <span className={'text-[10px] text-white/40 transition-transform duration-150 ' + (open ? 'rotate-90' : '')}>▶</span>
                              <span className='text-[12px] font-semibold text-white/85'>{dd.title}</span>
                            </button>
                            {open && (
                              <div className='border-t border-white/8 px-3 pb-3 pt-2'>
                                <ul className='space-y-1.5'>
                                  {dd.body.map((b, j) => (
                                    <li key={j} className='flex gap-2 text-xs leading-relaxed text-white/65'>
                                      <span className='text-white/30 shrink-0'>•</span>
                                      {b}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Files */}
                <div className='px-4 py-3'>
                  <p className='mb-2 text-[10px] font-black uppercase tracking-widest text-white/35'>Kritik Dosyalar</p>
                  <ul className='space-y-1'>
                    {selected.files.map((f, i) => (
                      <li key={i} className='flex gap-2 text-[11px] text-white/50 font-mono'>
                        <span className='text-white/25'>›</span>
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* ── GLOSSARY TAB ── */}
          {sideTab === 'glossary' && (
            <div className='flex flex-1 flex-col overflow-hidden'>
              <div className='shrink-0 px-3 pt-3 pb-2'>
                <input
                  value={glossaryQ}
                  onChange={(e) => setGlossaryQ(e.target.value)}
                  placeholder='Terim ara... (ABAC, TTL, XSS...)'
                  className='h-8 w-full rounded-lg border border-white/10 bg-white/5 px-3 text-xs text-white outline-none placeholder:text-white/30 focus:border-white/25'
                />
              </div>
              <div className='flex-1 overflow-y-auto px-3 pb-3 space-y-1.5'>
                {filteredGlossary.map((g, i) => {
                  const open = openGloss.has(i);
                  return (
                    <div key={g.term} className='rounded-lg border border-white/8 bg-white/3 overflow-hidden'>
                      <button
                        type='button'
                        onClick={() => toggleGloss(i)}
                        className='flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-white/5'
                      >
                        <span className={'text-[9px] text-white/35 transition-transform duration-150 shrink-0 ' + (open ? 'rotate-90' : '')}>▶</span>
                        <span className='text-[12px] font-bold text-white/90'>{g.term}</span>
                        <span className='text-[11px] text-white/40 truncate'>{g.short}</span>
                      </button>
                      {open && (
                        <div className='border-t border-white/8 px-3 pb-2.5 pt-1.5'>
                          <p className='text-[12px] leading-relaxed text-white/65'>{g.def}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className='shrink-0 border-t border-white/10 bg-[#0f1319] px-4 py-2'>
            <p className='text-[10px] text-white/30'>
              32 node · 6 flow · 26 sozluk · Next.js 16 + React 19 + Supabase + Stripe + BullMQ
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
`;

fs.writeFileSync(OUT, content, 'utf8');
console.log('Written: ' + OUT);
console.log('Lines: ' + content.split('\n').length);
