/**
 * Sentry client-side configuration.
 *
 * This file configures the Sentry SDK for the browser.
 * It captures unhandled errors, promise rejections and performance traces.
 *
 * @see https://docs.sentry.io/platforms/javascript/guides/nextjs/
 */

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Only enable in production — avoids noise during development
  enabled: process.env.NODE_ENV === 'production',

  // Capture 10% of transactions for performance monitoring
  tracesSampleRate: 0.1,

  // Filter out noisy browser errors
  ignoreErrors: [
    'ResizeObserver loop',
    'Network request failed',
    'Load failed',
    'AbortError',
  ],

  // Tag every event with the app version
  release: process.env.NEXT_PUBLIC_APP_VERSION,
  environment: process.env.NODE_ENV,

  integrations: [Sentry.browserTracingIntegration()],
});
