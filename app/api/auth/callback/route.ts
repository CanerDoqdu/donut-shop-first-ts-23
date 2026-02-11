import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const locale = searchParams.get('locale') || 'en';
  const error = searchParams.get('error_description') || searchParams.get('error');
  const origin = request.nextUrl.origin;

  // If there's an error from the provider
  if (error) {
    return NextResponse.redirect(
      `${origin}/${locale}/login?error=${encodeURIComponent(error)}`
    );
  }

  if (!code) {
    return NextResponse.redirect(
      `${origin}/${locale}/login?error=no-code`
    );
  }

  // Collect cookies that need to be set on the redirect response
  const cookiesToSet: Array<{ name: string; value: string; options: Record<string, unknown> }> = [];

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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
    console.error('Code exchange error:', exchangeError.message);
    return NextResponse.redirect(
      `${origin}/${locale}/login?error=${encodeURIComponent(exchangeError.message)}`
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
