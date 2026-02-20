'use client';

/**
 * Global error boundary.
 *
 * Next.js renders this when an unhandled error occurs at the root layout level.
 * We report the error to Sentry and show a minimal recovery UI.
 */

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error, {
      tags: { boundary: 'global-error' },
      extra: { digest: error.digest },
    });
  }, [error]);

  return (
    <html lang="en">
      <body>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          fontFamily: 'system-ui, sans-serif',
          padding: '2rem',
          textAlign: 'center',
        }}>
          <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>
            Something went wrong
          </h1>
          <p style={{ color: '#666', marginBottom: '2rem' }}>
            We&apos;ve been notified and are looking into it.
          </p>
          <button
            onClick={reset}
            style={{
              padding: '0.75rem 2rem',
              borderRadius: '0.5rem',
              border: 'none',
              background: '#FF6BBF',
              color: 'white',
              cursor: 'pointer',
              fontSize: '1rem',
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
