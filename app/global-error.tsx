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
  // Detect locale from URL path — global-error has no access to next-intl
  const isTr = typeof window !== 'undefined' && window.location.pathname.startsWith('/tr');
  const lang = isTr ? 'tr' : 'en';
  const title = isTr ? 'Bir hata oluştu' : 'Something went wrong';
  const desc = isTr ? 'Bilgilendirildik ve sorunu inceliyoruz.' : "We've been notified and are looking into it.";
  const btnText = isTr ? 'Tekrar dene' : 'Try again';

  useEffect(() => {
    Sentry.captureException(error, {
      tags: { boundary: 'global-error' },
      extra: { digest: error.digest },
    });
  }, [error]);

  return (
    <html lang={lang}>
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
            {title}
          </h1>
          <p style={{ color: '#666', marginBottom: '2rem' }}>
            {desc}
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
            {btnText}
          </button>
        </div>
      </body>
    </html>
  );
}
