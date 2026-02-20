/**
 * Sentry server-side configuration.
 *
 * This file configures the Sentry SDK for Node.js server-side code
 * (API routes, RSC, middleware).
 *
 * @see https://docs.sentry.io/platforms/javascript/guides/nextjs/
 */

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Only enable in production
  enabled: process.env.NODE_ENV === 'production',

  // Capture 20% of server transactions
  tracesSampleRate: 0.2,

  // Release tracking for sourcemaps
  release: process.env.NEXT_PUBLIC_APP_VERSION,
  environment: process.env.NODE_ENV,

  // Attach server context to every event
  initialScope: {
    tags: {
      service: 'donut-shop',
      runtime: 'node',
    },
  },
});
