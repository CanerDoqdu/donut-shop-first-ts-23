'use client';

import { useReportWebVitals } from 'next/web-vitals';

/**
 * Web Vitals reporter — tracks Core Web Vitals (LCP, CLS, INP)
 * plus supplementary metrics (FCP, TTFB).
 *
 * In production, pipe these to your analytics endpoint
 * (e.g. Google Analytics, Datadog, Vercel Analytics).
 *
 * Usage: Drop <WebVitals /> inside your root layout as a client boundary.
 */
export function WebVitals() {
  useReportWebVitals((metric) => {
    // In development, log to console with colour-coded severity
    if (process.env.NODE_ENV === 'development') {
      const thresholds: Record<string, [number, number]> = {
        LCP: [2500, 4000],
        FID: [100, 300],
        CLS: [0.1, 0.25],
        INP: [200, 500],
        FCP: [1800, 3000],
        TTFB: [800, 1800],
      };

      const [good, poor] = thresholds[metric.name] ?? [Infinity, Infinity];
      const rating =
        metric.value <= good ? '🟢' : metric.value <= poor ? '🟡' : '🔴';

      console.log(
        `${rating} ${metric.name}: ${Math.round(metric.value)}ms (${metric.rating ?? 'n/a'})`
      );
    }

    // ─── Production: send to analytics ───────────────────────
    // Replace with your real analytics endpoint
    if (process.env.NODE_ENV === 'production') {
      const body = JSON.stringify({
        name: metric.name,
        value: metric.value,
        rating: metric.rating,
        id: metric.id,
        navigationType: metric.navigationType,
        delta: metric.delta,
      });

      // Use sendBeacon for reliability (fires even on page unload)
      if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/analytics', body);
      }
    }
  });

  return null;
}
