// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Only enable in production — avoids noise during development
  enabled: process.env.NODE_ENV === 'production',

  // Sample 10% of traces — keeps costs manageable in production
  tracesSampleRate: 0.1,

  // Enable logs to be sent to Sentry
  enableLogs: true,

  // GDPR: do NOT send user PII (IP, cookies, etc.) by default
  sendDefaultPii: false,

  release: process.env.NEXT_PUBLIC_APP_VERSION,
  environment: process.env.NODE_ENV,
});
