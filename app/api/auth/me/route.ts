import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';
import { getSupabasePublicEnv } from '@/lib/supabase/env';
import { validateOrigin } from '@/lib/security';
import { redisRateLimit } from '@/lib/redis';
import { getClientIP } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';

/**
 * GET /api/auth/me
 *
 * Returns the current authenticated user together with their profile and
 * loyalty information.  The browser Supabase client sometimes cannot read
 * the httpOnly session cookies set by server actions, so the header
 * component falls back to this endpoint to retrieve user state from the
 * server where cookies are accessible.
 *
 * Security:
 *  - CSRF origin validation
 *  - Rate limiting (20/min/IP)
 *  - Cache-Control: private, no-store
 *  - Sensitive fields stripped from user object
 *  - Session validated via getUser() (not getSession — avoids stale JWTs)
 */
export async function GET(request: NextRequest) {
  // CSRF
  const originError = validateOrigin(request);
  if (originError) return originError;

  // Rate limit: 20 requests per minute per IP
  const ip = getClientIP(request);
  const rl = await redisRateLimit(`auth-me:${ip}`, { maxRequests: 20, windowSizeSeconds: 60 });
  if (!rl.success) {
    logger.warn('auth_me.rate_limited', { ip });
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': '60', 'Cache-Control': 'private, no-store' } },
    );
  }

  const { url, anonKey } = getSupabasePublicEnv();

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      // We're only reading — no cookies to set
      setAll() {},
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const headers = { 'Cache-Control': 'private, no-store' };

  if (!user) {
    return NextResponse.json(
      { user: null, profile: null, loyalty: null },
      { status: 200, headers },
    );
  }

  const [profileResult, loyaltyResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, email, full_name')
      .eq('id', user.id)
      .maybeSingle(),
    supabase
      .from('loyalty_points')
      .select('total_points, tier, lifetime_points')
      .eq('user_id', user.id)
      .maybeSingle(),
  ]);

  // Strip sensitive fields — only return what the frontend needs
  const safeUser = {
    id: user.id,
    email: user.email,
    user_metadata: {
      full_name: user.user_metadata?.full_name ?? null,
      name: user.user_metadata?.name ?? null,
      avatar_url: user.user_metadata?.avatar_url ?? null,
    },
  };

  return NextResponse.json(
    {
      user: safeUser,
      profile: profileResult.data ?? null,
      loyalty: loyaltyResult.data ?? null,
    },
    { headers },
  );
}
