import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';
import { getSupabasePublicEnv } from '@/lib/supabase/env';
import { logger } from '@/lib/logger';

const VALID_LOCALES = new Set(['en', 'tr']);

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const rawLocale = searchParams.get('locale') || 'en';
  // Strict locale validation — prevent path traversal
  const locale = VALID_LOCALES.has(rawLocale) ? rawLocale : 'en';
  const error = searchParams.get('error_description') || searchParams.get('error');
  const origin = request.nextUrl.origin;

  // If there's an error from the provider
  if (error) {
    logger.warn('auth.callback_provider_error', { error, locale });
    return NextResponse.redirect(
      `${origin}/${locale}/login?error=${encodeURIComponent(error)}`
    );
  }

  if (!code) {
    logger.warn('auth.callback_no_code', { locale });
    return NextResponse.redirect(
      `${origin}/${locale}/login?error=no-code`
    );
  }

  // Collect cookies that need to be set on the redirect response
  const cookiesToSet: Array<{ name: string; value: string; options: Record<string, unknown> }> = [];
  const { url, anonKey } = getSupabasePublicEnv();

  const supabase = createServerClient(
    url,
    anonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookies) {
          cookiesToSet.push(...cookies);
        },
      },
    }
  );

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    logger.error('auth.callback_code_exchange_failed', { error: exchangeError.message });
    // Don't leak raw error to client
    return NextResponse.redirect(
      `${origin}/${locale}/login?error=auth-failed`
    );
  }

  // Success — redirect to home with all auth cookies
  const response = NextResponse.redirect(`${origin}/${locale}`);

  // Transfer all cookies (session tokens) to the redirect response
  // Ensure path='/' and httpOnly=false so cookies are readable by browser JS
  cookiesToSet.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, {
      ...options,
      path: '/',
    } as Record<string, unknown>);
  });

  return response;
}
