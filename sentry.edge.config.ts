/**
 * Sentry edge runtime configuration.
 *
 * Used for middleware and edge API routes.
 *
 * @see https://docs.sentry.io/platforms/javascript/guides/nextjs/
 */

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  enabled: process.env.NODE_ENV === 'production',

  tracesSampleRate: 0.1,

  release: process.env.NEXT_PUBLIC_APP_VERSION,
  environment: process.env.NODE_ENV,
});
