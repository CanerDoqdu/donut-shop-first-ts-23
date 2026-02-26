import type { NextRequest } from 'next/server';

/**
 * Map of canonical (EN) protected path segments to their Turkish equivalents.
 * Must stay in sync with i18n/routing.ts pathnames.
 */
const PROTECTED_SEGMENTS: Record<string, string> = {
  '/admin':         '/yonetim',
  '/account':       '/hesabim',
  '/orders':        '/siparislerim',
  '/checkout':      '/odeme',
  '/loyalty':       '/sadakat',
  '/subscriptions': '/abonelik',
  '/referrals':     '/davetler',
};

/** All protected path segments (both EN and TR) */
const ALL_PROTECTED_SEGMENTS = [
  ...Object.keys(PROTECTED_SEGMENTS),
  ...Object.values(PROTECTED_SEGMENTS),
];

/**
 * Public sub-paths within otherwise-protected segments.
 * These pages don't require authentication (e.g. post-payment confirmation).
 */
const PUBLIC_EXCEPTIONS = [
  '/orders/success',
  '/siparislerim/success',
];

/** Admin path segments in both locales */
const ADMIN_SEGMENTS = ['/admin', '/yonetim'];

/**
 * Returns true when the request targets a protected path.
 * Checks both English and Turkish locale path segments.
 * Excludes public exceptions like /orders/success (post-payment landing).
 */
export function isProtectedPath(request: NextRequest): boolean {
  const pathname = request.nextUrl.pathname;
  // Strip /<locale>/ prefix to get the functional path
  const strippedPath = pathname.replace(/^\/(tr|en)/, '') || '/';

  // Allow public exceptions through without auth
  if (PUBLIC_EXCEPTIONS.some((ex) => strippedPath === ex || strippedPath.startsWith(ex + '/'))) {
    return false;
  }

  return ALL_PROTECTED_SEGMENTS.some(
    (seg) => strippedPath === seg || strippedPath.startsWith(seg + '/'),
  );
}

/** Returns true when the request targets an admin-only path (e.g. /en/admin/*, /tr/yonetim/*). */
export function isAdminPath(request: NextRequest): boolean {
  const pathname = request.nextUrl.pathname;
  const strippedPath = pathname.replace(/^\/(tr|en)/, '') || '/';
  return ADMIN_SEGMENTS.some(
    (seg) => strippedPath === seg || strippedPath.startsWith(seg + '/'),
  );
}

export function detectLocaleFromPath(pathname: string): 'tr' | 'en' {
  return pathname.startsWith('/tr') ? 'tr' : 'en';
}
