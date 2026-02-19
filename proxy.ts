import createMiddleware from 'next-intl/middleware';
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { routing } from './i18n/routing';
import { detectLocaleFromPath, isProtectedPath, isAdminPath } from '@/lib/middleware';
import { logger } from '@/lib/logger';
import { getSupabasePublicEnv } from '@/lib/supabase/env';

const intlMiddleware = createMiddleware(routing);

export async function proxy(request: NextRequest) {
  // Create a response object to modify
  const response = intlMiddleware(request);
  const { url, anonKey } = getSupabasePublicEnv();
  
  // Create Supabase client for session refresh
  const supabase = createServerClient(
    url,
    anonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          // Set cookies on the existing intl response instead of replacing it
          // Pass Supabase cookie options through unchanged (httpOnly, Secure, SameSite)
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session and get user (single call)
  const { data: { user } } = await supabase.auth.getUser();

  if (isProtectedPath(request) && !user) {
    // Determine locale from pathname
    const locale = detectLocaleFromPath(request.nextUrl.pathname);
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}/login`;
    url.searchParams.set('redirect', request.nextUrl.pathname);
    logger.warn('Unauthenticated user redirected from protected route', {
      path: request.nextUrl.pathname,
      locale,
    });
    return NextResponse.redirect(url);
  }

  // ── Admin RBAC: server-side guard for /admin routes ──
  if (isAdminPath(request) && user) {
    const { data: adminRecord } = await supabase
      .from('admin_users')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!adminRecord) {
      const locale = detectLocaleFromPath(request.nextUrl.pathname);
      logger.warn('Non-admin user blocked from admin route', {
        userId: user.id,
        path: request.nextUrl.pathname,
      });
      const url = request.nextUrl.clone();
      url.pathname = `/${locale}`;
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: ['/', '/(tr|en)/:path*', '/((?!_next|_vercel|api|.*\\..*).*)'],
};
