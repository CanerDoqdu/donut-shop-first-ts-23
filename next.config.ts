import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';
import bundleAnalyzer from '@next/bundle-analyzer';
import { withSentryConfig } from '@sentry/nextjs';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
  openAnalyzer: false,
});

const isWindows = process.platform === 'win32';
const isProduction = process.env.NODE_ENV === 'production';

const nextConfig: NextConfig = {
  // Standalone output is useful for Linux container deploys.
  // Disable on Windows dev machines to avoid colon-in-path trace copy warnings.
  ...(isWindows ? {} : { output: 'standalone' }),

  // Force bundling for BullMQ+ioredis to avoid unresolved external warnings.
  serverExternalPackages: [],

  // Build-time env injection
  env: {
    NEXT_PUBLIC_APP_VERSION: process.env.npm_package_version ?? '0.0.0-dev',
  },

  // Image optimization
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
    ],
    minimumCacheTTL: 31536000, // 1 yıl cache
    formats: ['image/avif', 'image/webp'], // Modern formatlar
    qualities: [60, 75],
  },

  // Experimental optimizations
  experimental: {
    optimizeCss: true, // CSS minification
  },

  // Compression
  compress: true,

  // PoweredBy header kaldır (güvenlik)
  poweredByHeader: false,

  // Security + caching headers
  async headers() {
    return [
      // ── Security headers (all routes) ──────────────────────
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(self)',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              // script-src: nonce-based CSP is set per-request in middleware (proxy.ts).
              // This static fallback allows Stripe + Vercel scripts for non-middleware routes.
              `script-src 'self' 'unsafe-inline'${isProduction ? '' : " 'unsafe-eval'"} https://js.stripe.com https://va.vercel-scripts.com`,
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "img-src 'self' data: blob: https://*.supabase.co https://lh3.googleusercontent.com",
              "font-src 'self' https://fonts.gstatic.com",
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com https://*.ingest.de.sentry.io https://vitals.vercel-insights.com https://va.vercel-scripts.com https://api.pwnedpasswords.com",
              "frame-src https://js.stripe.com https://hooks.stripe.com",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'none'",
              "upgrade-insecure-requests",
            ].join('; '),
          },
        ],
      },
      // ── Static asset caching (excludes _next which Next.js caches itself) ──
      {
        source: '/:all*(svg|jpg|jpeg|png|gif|ico|webp|avif)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/:all*(woff|woff2|ttf|otf|eot)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // ── HTML pages: short CDN cache, longer SWR ───────────
      {
        source: '/:locale(tr|en)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=60, stale-while-revalidate=300',
          },
        ],
      },
      {
        source: '/:locale(tr|en)/products',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=120, stale-while-revalidate=600',
          },
        ],
      },
      {
        source: '/:locale(tr|en)/products/:slug',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=120, stale-while-revalidate=600',
          },
        ],
      },
      {
        source: '/:locale(tr|en)/stores',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=300, stale-while-revalidate=1200',
          },
        ],
      },
    ];
  },
};

export default withSentryConfig(withBundleAnalyzer(withNextIntl(nextConfig)), {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options

  org: "caner-dogdu",

  project: "javascript-nextjs",

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Uncomment to route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  // tunnelRoute: "/monitoring",

  webpack: {
    // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
    // See the following for more information:
    // https://docs.sentry.io/product/crons/
    // https://vercel.com/docs/cron-jobs
    automaticVercelMonitors: true,

    // Tree-shaking options for reducing bundle size
    treeshake: {
      // Automatically tree-shake Sentry logger statements to reduce bundle size
      removeDebugLogging: true,
    },
  },
});
