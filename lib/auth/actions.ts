'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { env } from '@/lib/env';
import { rateLimit } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';
import { E_AUTH_RATE_LIMITED } from '@/lib/error-codes';
import {
  signInSchema,
  signUpSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  updateProfileSchema,
  parseBody,
} from '@/lib/validations';

/** Extract client IP from server action request headers. */
async function getActionIP(): Promise<string> {
  const h = await headers();
  return h.get('x-forwarded-for')?.split(',')[0].trim()
    ?? h.get('x-real-ip')
    ?? '127.0.0.1';
}

function checkAuthRateLimit(action: string, ip: string): AuthResult | null {
  // 5 attempts per minute per IP per action
  const result = rateLimit(`auth:${action}:${ip}`, { maxRequests: 5, windowSizeSeconds: 60 });
  if (!result.success) {
    logger.warn('auth.rate_limited', { code: E_AUTH_RATE_LIMITED, action, ip, remaining: result.remaining });
    return { success: false, error: 'Too many attempts. Please try again later.' };
  }
  return null;
}

export interface AuthResult {
  success: boolean;
  error?: string;
}

export async function signIn(formData: FormData): Promise<AuthResult> {
  const ip = await getActionIP();
  const limited = checkAuthRateLimit('signIn', ip);
  if (limited) return limited;

  const parsed = parseBody(signInSchema, {
    email: formData.get('email'),
    password: formData.get('password'),
    locale: formData.get('locale'),
  });
  if (!parsed.success) return { success: false, error: parsed.error };

  const { email, password, locale } = parsed.data;

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/', 'layout');
  redirect(`/${locale}`);
}

export async function signUp(formData: FormData): Promise<AuthResult> {
  const ip = await getActionIP();
  const limited = checkAuthRateLimit('signUp', ip);
  if (limited) return limited;

  const parsed = parseBody(signUpSchema, {
    email: formData.get('email'),
    password: formData.get('password'),
    fullName: formData.get('fullName'),
    locale: formData.get('locale'),
  });
  if (!parsed.success) return { success: false, error: parsed.error };

  const { email, password, fullName, locale } = parsed.data;

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
      emailRedirectTo: `${env.NEXT_PUBLIC_SITE_URL}/api/auth/callback?locale=${locale}`,
    },
  });

  if (error) {
    return { success: false, error: error.message };
  }

  // Create profile in profiles table
  if (data.user) {
    await supabase.from('profiles').upsert({
      id: data.user.id,
      email: data.user.email,
      full_name: fullName,
    });

    // Create initial loyalty points
    await supabase.from('loyalty_points').insert({
      user_id: data.user.id,
      total_points: 0,
      lifetime_points: 0,
      tier: 'bronze',
    });

    // Create referral code
    const referralCode = `REF-${data.user.id.substring(0, 8).toUpperCase()}`;
    await supabase.from('referral_codes').insert({
      user_id: data.user.id,
      code: referralCode,
      reward_points: 100,
    });
  }

  revalidatePath('/', 'layout');
  redirect(`/${locale}?registered=true`);
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/');
}

export async function forgotPassword(formData: FormData): Promise<AuthResult> {
  const ip = await getActionIP();
  const limited = checkAuthRateLimit('forgotPassword', ip);
  if (limited) return limited;

  const parsed = parseBody(forgotPasswordSchema, {
    email: formData.get('email'),
    locale: formData.get('locale'),
  });
  if (!parsed.success) return { success: false, error: parsed.error };

  const { email, locale } = parsed.data;

  const supabase = await createClient();

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${env.NEXT_PUBLIC_SITE_URL}/${locale}/auth/reset-password`,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function resetPassword(formData: FormData): Promise<AuthResult> {
  const parsed = parseBody(resetPasswordSchema, {
    password: formData.get('password'),
    locale: formData.get('locale'),
  });
  if (!parsed.success) return { success: false, error: parsed.error };

  const { password, locale } = parsed.data;

  const supabase = await createClient();

  const { error } = await supabase.auth.updateUser({
    password,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/', 'layout');
  redirect(`/${locale}/login?reset=true`);
}

export async function updateProfile(formData: FormData): Promise<AuthResult> {
  const parsed = parseBody(updateProfileSchema, {
    fullName: formData.get('fullName'),
    phone: formData.get('phone'),
    address: formData.get('address'),
  });
  if (!parsed.success) return { success: false, error: parsed.error };

  const { fullName, phone, address } = parsed.data;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      full_name: fullName,
      phone,
      address,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/', 'layout');
  return { success: true };
}

export async function signInWithGoogle(locale: string = 'en') {
  const supabase = await createClient();
  
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${env.NEXT_PUBLIC_SITE_URL}/api/auth/callback?locale=${locale}`,
    },
  });

  if (error) {
    return { success: false, error: error.message };
  }

  if (data.url) {
    redirect(data.url);
  }
}

export async function signInWithGithub(locale: string = 'en') {
  const supabase = await createClient();
  
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'github',
    options: {
      redirectTo: `${env.NEXT_PUBLIC_SITE_URL}/api/auth/callback?locale=${locale}`,
    },
  });

  if (error) {
    return { success: false, error: error.message };
  }

  if (data.url) {
    redirect(data.url);
  }
}
