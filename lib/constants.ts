/**
 * Application-wide constants.
 * Single source of truth — no magic numbers scattered in components.
 */

// ─── Cart ────────────────────────────────────────────────────────
export const CART_EXPIRY_MS = 2 * 24 * 60 * 60 * 1000; // 2 days
export const CART_STORAGE_KEY = 'donut-cart-storage';

// ─── Pagination ──────────────────────────────────────────────────
export const DEFAULT_PAGE_SIZE = 12;

// ─── Search ──────────────────────────────────────────────────────
export const SEARCH_DEBOUNCE_MS = 300;

// ─── Rate Limiting ───────────────────────────────────────────────
export const RATE_LIMIT_MAX_REQUESTS = 10;
export const RATE_LIMIT_WINDOW_SECONDS = 60;

// ─── Cache TTLs (seconds) ────────────────────────────────────────
export const IMAGE_CACHE_TTL = 31_536_000; // 1 year
export const STATIC_ASSET_CACHE_TTL = 31_536_000;
export const ISR_REVALIDATE_SECONDS = 3600; // 1 hour

// ─── Breakpoints (must match Tailwind config) ────────────────────
export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

// ─── Routes ──────────────────────────────────────────────────────
export const PROTECTED_ROUTES = [
  '/admin',
  '/account',
  '/orders',
  '/checkout',
  '/loyalty',
  '/subscriptions',
  '/referrals',
] as const;

export const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/register',
  '/forgot-password',
  '/products',
  '/stores',
  '/gift-cards',
] as const;

// ─── Supported locales ──────────────────────────────────────────
export const LOCALES = ['tr', 'en'] as const;
export type SupportedLocale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: SupportedLocale = 'tr';

// ─── Checkout Machine ────────────────────────────────────────────
export const CHECKOUT_MACHINE_STORAGE_KEY = 'donut-checkout-machine';
export const CHECKOUT_TIMEOUT_MS = 30_000; // 30 seconds
export const CHECKOUT_MAX_RETRIES = 3;
export const CHECKOUT_STALE_MS = 5 * 60 * 1000; // 5 min

// ─── Product categories ─────────────────────────────────────────
export const PRODUCT_CATEGORIES = [
  'all',
  'glazed',
  'filled',
  'specialty',
  'seasonal',
  'beverage',
] as const;
export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];
