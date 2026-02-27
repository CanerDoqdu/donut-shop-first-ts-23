'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { env } from '@/lib/env';
import { redisRateLimit } from '@/lib/redis';
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

async function checkAuthRateLimit(action: string, ip: string): Promise<AuthResult | null> {
  // Rate limiting runs in ALL environments (Redis-backed, with in-memory fallback)
  const result = await redisRateLimit(`auth:${action}:${ip}`, { maxRequests: 10, windowSizeSeconds: 60 });
  if (!result.success) {
    logger.warn('auth.rate_limited', { code: E_AUTH_RATE_LIMITED, action, ip, remaining: result.remaining });
    return { success: false, error: 'Too many attempts. Please try again later.' };
  }
  return null;
}

export interface AuthResult {
  success: boolean;
  error?: string;
  needsEmailConfirmation?: boolean;
}

export async function signIn(formData: FormData): Promise<AuthResult> {
  const ip = await getActionIP();
  const limited = await checkAuthRateLimit('signIn', ip);
  if (limited) return limited;

  const parsed = parseBody(signInSchema, {
    email: formData.get('email'),
    password: formData.get('password'),
    locale: formData.get('locale'),
  });
  if (!parsed.success) return { success: false, error: parsed.error };

  const { email, password } = parsed.data;

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    logger.warn('auth.signin_failed', { email, error: error.message });

    const friendlyErrors: Record<string, string> = {
      'Invalid login credentials': 'Invalid email or password.',
      'Email not confirmed': 'Please verify your email before logging in.',
      'Invalid Refresh Token: Refresh Token Not Found': 'Session expired. Please log in again.',
    };
    return { success: false, error: friendlyErrors[error.message] ?? 'Sign in failed. Please try again.' };
  }

  revalidatePath('/', 'layout');
  return { success: true };
}

export async function signUp(formData: FormData): Promise<AuthResult> {
  const ip = await getActionIP();
  const limited = await checkAuthRateLimit('signUp', ip);
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
    // Log original error server-side for debugging
    logger.warn('auth.signup_failed', { email, error: error.message });

    // Map ALL Supabase errors to safe user-facing messages
    const friendlyErrors: Record<string, string> = {
      'email rate limit exceeded': 'Too many sign-up attempts. Please wait a few minutes and try again.',
      'User already registered': 'An account with this email already exists. Try signing in instead.',
      'Password should be at least 6 characters': 'Password must be at least 6 characters.',
      'Unable to validate email address: invalid format': 'Please enter a valid email address.',
      'Signup requires a valid password': 'Please enter a valid password.',
    };
    return { success: false, error: friendlyErrors[error.message] ?? 'Sign up failed. Please try again.' };
  }

  // Profile, loyalty_points, and referral_codes are now created automatically
  // by the handle_new_user() DB trigger (SECURITY DEFINER, idempotent).
  // No manual inserts needed here.

  // If Supabase returned a session, the user is auto-logged-in
  // (email confirmation disabled or auto-confirmed).
  // Otherwise, email confirmation is required.
  const hasSession = !!data.session;

  // Signal the client-side toast via a short-lived cookie.
  // This avoids query-params that the App Router strips during hydration.
  const { cookies } = await import('next/headers');
  const cookieStore = await cookies();
  cookieStore.set('auth-toast', hasSession ? 'confirmed' : 'needs-confirmation', {
    path: '/',
    maxAge: 60,          // 1 minute — plenty of time to read it
    httpOnly: false,     // must be readable from JS
    sameSite: 'lax',
    secure: env.isProduction,
  });

  revalidatePath('/', 'layout');
  return { success: true, needsEmailConfirmation: !hasSession };
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/');
}

export async function forgotPassword(formData: FormData): Promise<AuthResult> {
  const ip = await getActionIP();
  const limited = await checkAuthRateLimit('forgotPassword', ip);
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
    logger.warn('auth.forgot_password_failed', { email, error: error.message });
    // Don't reveal whether the email exists — always return success
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
    logger.warn('auth.reset_password_failed', { error: error.message });
    return { success: false, error: 'Failed to reset password. Please try again.' };
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
    logger.warn('auth.update_profile_failed', { userId: user.id, error: error.message });
    return { success: false, error: 'Failed to update profile. Please try again.' };
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
    logger.warn('auth.google_oauth_failed', { error: error.message });
    return { success: false, error: 'Google sign-in failed. Please try again.' };
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
    logger.warn('auth.github_oauth_failed', { error: error.message });
    return { success: false, error: 'GitHub sign-in failed. Please try again.' };
  }

  if (data.url) {
    redirect(data.url);
  }
}
