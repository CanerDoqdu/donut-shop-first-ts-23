import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const locale = requestUrl.searchParams.get('locale') || 'en';
  
  const supabase = await createClient();
  
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'twitter',
    options: {
      redirectTo: `${requestUrl.origin}/${locale}/auth/callback`,
    },
  });

  if (error) {
    return NextResponse.redirect(`${requestUrl.origin}/${locale}/login?error=Could not authenticate with X`);
  }

  return NextResponse.redirect(data.url);
}
