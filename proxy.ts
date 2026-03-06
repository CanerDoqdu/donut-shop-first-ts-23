import createMiddleware from 'next-intl/middleware';
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { routing } from './i18n/routing';
import { detectLocaleFromPath, isProtectedPath, isAdminPath } from '@/lib/middleware';

const intlMiddleware = createMiddleware(routing);

/**
 * Helper: copy all Supabase Set-Cookie headers onto another response.
 * This keeps auth tokens in sync when we return a redirect or an intl response.
 */
function forwardAuthCookies(
  source: NextResponse,
  target: NextResponse,
): void {
  source.cookies.getAll().forEach((cookie) => {
    target.cookies.set(cookie.name, cookie.value, cookie);
  });
}

export async function proxy(request: NextRequest) {
  const requestId =
    request.headers.get('x-request-id') ?? crypto.randomUUID();

  try {
    return await _handleRequest(request, requestId);
  } catch (error) {
    // ── Graceful degradation ──────────────────────────────────
    // If Edge Runtime is unhealthy (region outage, cold-start timeout,
    // Supabase unreachable, etc.) we log the error via Sentry and fall
    // through to filesystem routing.  app/page.tsx (root fallback) and
    // app/[locale]/... pages will still render on Node.js runtime.
    //
    // This prevents a middleware failure from turning the entire site
    // into a 404/500 — the user sees content without auth guards until
    // Edge recovers.
    console.error(
      `[middleware] Unhandled error – falling through to filesystem routing.`,
      { requestId, path: request.nextUrl.pathname, error },
    );
    const fallback = NextResponse.next({ request });
    fallback.headers.set('x-request-id', requestId);
    fallback.headers.set('x-middleware-fallback', '1'); // observable signal
    return fallback;
  }
}

/**
 * Core middleware logic — extracted so the outer `proxy()` can wrap
 * it with a resilient try/catch boundary.
 */
async function _handleRequest(
  request: NextRequest,
  requestId: string,
): Promise<NextResponse> {
  // Keep standalone project wiki route outside locale middleware to avoid
  // /en/project-wiki -> /project-wiki -> /en/project-wiki redirect loops.
  if (request.nextUrl.pathname === '/project-wiki') {
    const passthrough = NextResponse.next({ request });
    const nonce = generateCspNonce();
    const csp = buildCspHeader(nonce);
    passthrough.headers.set('Content-Security-Policy', csp);
    passthrough.headers.set('x-nonce', nonce);
    passthrough.headers.set('x-request-id', requestId);
    return passthrough;
  }

  const authGuardRequired = isProtectedPath(request) || isAdminPath(request);

  // Public routes do not need Supabase auth refresh on every request.
  // This keeps homepage/navigation latency lower for anonymous traffic.
  if (!authGuardRequired) {
    const intlResponse = intlMiddleware(request);
    const nonce = generateCspNonce();
    const csp = buildCspHeader(nonce);
    intlResponse.headers.set('Content-Security-Policy', csp);
    intlResponse.headers.set('x-nonce', nonce);
    intlResponse.headers.set('x-request-id', requestId);
    return intlResponse;
  }

  // -- 1. Refresh Supabase auth session --
  // Following the official Supabase SSR pattern: create a mutable response
  // that gets recreated inside setAll so the *modified* request (with fresh
  // tokens) is forwarded to server-side rendering.
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Update the request so downstream code sees fresh values
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          // Recreate response with the modified request (critical for SSR)
          supabaseResponse = NextResponse.next({ request });
          // Persist auth cookies on the response -> browser
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANT: do NOT add code between createServerClient and getUser().
  // A single extra await here can cause random session loss.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // -- 2. Auth guards (run before intl routing) --
  if (isProtectedPath(request) && !user) {
    const locale = detectLocaleFromPath(request.nextUrl.pathname);
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}/login`;
    url.searchParams.set('redirect', request.nextUrl.pathname);
    const redirect = NextResponse.redirect(url);
    forwardAuthCookies(supabaseResponse, redirect);
    return redirect;
  }

  if (isAdminPath(request) && user) {
    const { data: adminRecord } = await supabase
      .from('admin_users')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!adminRecord) {
      const locale = detectLocaleFromPath(request.nextUrl.pathname);
      const url = request.nextUrl.clone();
      url.pathname = `/${locale}`;
      const redirect = NextResponse.redirect(url);
      forwardAuthCookies(supabaseResponse, redirect);
      return redirect;
    }
  }

  // -- 3. Internationalisation routing --
  const intlResponse = intlMiddleware(request);

  // -- 4. Merge Supabase cookies into the intl response --
  forwardAuthCookies(supabaseResponse, intlResponse);

  // -- 5. Nonce-based CSP (per-request) --
  const nonce = generateCspNonce();
  const csp = buildCspHeader(nonce);
  intlResponse.headers.set('Content-Security-Policy', csp);
  intlResponse.headers.set('x-nonce', nonce);

  // Attach request-id for observability
  intlResponse.headers.set('x-request-id', requestId);

  return intlResponse;
}

/**
 * Generate a cryptographically random nonce for CSP.
 * Uses Edge-compatible crypto.getRandomValues.
 */
function generateCspNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  // btoa + custom base64 for Edge Runtime compatibility
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Build a strict CSP header using a per-request nonce.
 * - script-src uses nonce instead of 'unsafe-inline'
 * - style-src keeps 'unsafe-inline' (required by Tailwind CSS / Next.js)
 * - upgrade-insecure-requests enforces HTTPS
 */
function buildCspHeader(nonce: string): string {
  const allowUnsafeEval = process.env.NODE_ENV !== 'production';
  const scriptSrc = [
    "'self'",
    `'nonce-${nonce}'`,
    "'strict-dynamic'",
    ...(allowUnsafeEval ? ["'unsafe-eval'"] : []),
    'https://js.stripe.com',
    'https://va.vercel-scripts.com',
  ].join(' ');

  return [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
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
  ].join('; ');
}

export const config = {
  matcher: ['/', '/(tr|en)/:path*', '/((?!_next|_vercel|api|.*\\..*).*)'],
};
