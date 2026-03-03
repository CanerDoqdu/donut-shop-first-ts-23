import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { routing } from '@/i18n/routing';

/**
 * Root fallback page — Defense-in-depth for i18n routing.
 *
 * Normal flow: The middleware (proxy.ts) intercepts `/` and redirects
 * to `/<locale>` using full Accept-Language negotiation + cookie
 * persistence.  This page is never reached.
 *
 * Degraded flow: If Edge Runtime is unavailable (Vercel incident,
 * cold-start timeout, etc.) and the middleware cannot execute, Next.js
 * falls through to filesystem routing.  This server component
 * performs a lightweight locale detection and redirects to the best
 * match so the user sees content instead of a 404.
 *
 * This pattern follows the resilience principle from the Strong Senior
 * Layer: no single Edge dependency should be a SPOF for the entire
 * application.
 */
export default async function RootFallbackPage() {
  const headerList = await headers();
  const acceptLang = headerList.get('accept-language') ?? '';

  // Lightweight locale detection — mirrors middleware logic but runs
  // on Node.js runtime (not Edge), so it's immune to Edge outages.
  const detected = routing.locales.find((loc) =>
    acceptLang.toLowerCase().includes(loc),
  );

  const locale = detected ?? routing.defaultLocale;

  redirect(`/${locale}`);
}
