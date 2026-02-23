'use client';

import { useReportWebVitals } from 'next/web-vitals';
import { usePathname } from 'next/navigation';

/** Web Vitals rating thresholds per metric (good / needs-improvement). */
const THRESHOLDS: Record<string, [number, number]> = {
  LCP: [2500, 4000],
  FID: [100, 300],
  CLS: [0.1, 0.25],
  INP: [200, 500],
  FCP: [1800, 3000],
  TTFB: [800, 1800],
};

/**
 * Derive a human-readable route tag from the pathname.
 * Examples: '/en' → 'home', '/tr/admin/orders' → 'admin', '/en/checkout' → 'checkout'
 */
function routeTag(pathname: string): string {
  // Strip locale prefix: /en/checkout → /checkout
  const clean = pathname.replace(/^\/(tr|en)/, '') || '/';
  if (clean === '/') return 'home';

  const segment = clean.split('/').filter(Boolean)[0]!;
  return segment;
}

/**
 * Web Vitals reporter — tracks Core Web Vitals (LCP, CLS, INP)
 * plus supplementary metrics (FCP, TTFB).
 *
 * Features:
 *  - Route tagging (home, products, checkout, admin, etc.)
 *  - Structured beacon payload with route context
 *  - Colour-coded dev console logging
 *
 * Usage: Drop <WebVitals /> inside your root layout as a client boundary.
 */
export function WebVitals() {
  const pathname = usePathname();
  const route = routeTag(pathname);

  useReportWebVitals((metric) => {
    // In development, log to console with colour-coded severity
    if (process.env.NODE_ENV === 'development') {
      const [good, poor] = THRESHOLDS[metric.name] ?? [Infinity, Infinity];
      const icon =
        metric.value <= good ? '🟢' : metric.value <= poor ? '🟡' : '🔴';

      console.log(
        `${icon} ${metric.name}: ${Math.round(metric.value)}ms [${route}] (${metric.rating ?? 'n/a'})`
      );
    }

    // ─── Send to backend (all environments) ──────────────────
    const body = JSON.stringify({
      name: metric.name,
      value: metric.value,
      rating: metric.rating,
      id: metric.id,
      navigationType: metric.navigationType,
      delta: metric.delta,
      route,
    });

    // Use sendBeacon for reliability (fires even on page unload)
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      navigator.sendBeacon('/api/vitals', body);
    }
  });

  return null;
}

export { routeTag };
