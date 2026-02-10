import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const locale = requestUrl.pathname.split('/')[1] || 'en';
  
  const supabase = await createClient();
  
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'github',
    options: {
      redirectTo: `${requestUrl.origin}/${locale}/auth/callback`,
    },
  });

  if (error) {
    return NextResponse.redirect(`${requestUrl.origin}/${locale}/login?error=Could not authenticate with GitHub`);
  }

  return NextResponse.redirect(data.url);
}
