import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';
import { getSupabasePublicEnv } from '@/lib/supabase/env';

/**
 * GET /api/auth/me
 *
 * Returns the current authenticated user together with their profile and
 * loyalty information.  The browser Supabase client sometimes cannot read
 * the httpOnly session cookies set by server actions, so the header
 * component falls back to this endpoint to retrieve user state from the
 * server where cookies are accessible.
 */
export async function GET(request: NextRequest) {
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

  if (!user) {
    return NextResponse.json(
      { user: null, profile: null, loyalty: null },
      { status: 200 },
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

  return NextResponse.json({
    user,
    profile: profileResult.data ?? null,
    loyalty: loyaltyResult.data ?? null,
  });
}
