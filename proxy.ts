import createMiddleware from 'next-intl/middleware';
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { routing } from './i18n/routing';
import { detectLocaleFromPath, isProtectedPath } from '@/lib/middleware';
import { logger } from '@/lib/logger';

const intlMiddleware = createMiddleware(routing);

export async function proxy(request: NextRequest) {
  // Create a response object to modify
  const response = intlMiddleware(request);
  
  // Create Supabase client for session refresh
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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
          // Force httpOnly: false so browser JS can read auth cookies
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, { ...options })
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

  return response;
}

export const config = {
  matcher: ['/', '/(tr|en)/:path*', '/((?!_next|_vercel|api|.*\\..*).*)'],
};
