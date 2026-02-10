import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin, pathname } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';
  
  // Extract locale from pathname (e.g., /en/auth/callback -> en)
  const locale = pathname.split('/')[1] || 'tr';

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error && data.user) {
      // Update profile with Google user data
      const user = data.user;
      const metadata = user.user_metadata;
      
      // Check if profile exists
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single();

      if (!existingProfile) {
        // Create new profile
        await supabase.from('profiles').insert({
          id: user.id,
          email: user.email,
          full_name: metadata?.full_name || metadata?.name || user.email?.split('@')[0],
          avatar_url: metadata?.avatar_url || metadata?.picture || null,
        });

        // Initialize loyalty points
        await supabase.from('loyalty_points').insert({
          user_id: user.id,
          total_points: 0,
          tier: 'bronze',
          lifetime_points: 0,
        });
      } else {
        // Update existing profile with latest OAuth data
        await supabase.from('profiles').update({
          full_name: metadata?.full_name || metadata?.name || null,
          avatar_url: metadata?.avatar_url || metadata?.picture || null,
        }).eq('id', user.id);
      }
      
      return NextResponse.redirect(`${origin}/${locale}`);
    }
  }

  // Return the user to login page with error indicator
  return NextResponse.redirect(`${origin}/${locale}/login?error=auth-code-error`);
}
