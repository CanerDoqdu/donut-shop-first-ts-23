'use client';

import { WebVitals } from '@/components/monitoring/web-vitals';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Analytics } from '@vercel/analytics/next';

export function ClientMonitoring() {
  return (
    <>
      <WebVitals />
      {process.env.VERCEL && <SpeedInsights />}
      {process.env.VERCEL && <Analytics />}
    </>
  );
}
