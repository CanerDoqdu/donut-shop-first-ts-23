'use client';

import { useState, useEffect, useTransition } from 'react';
import { useParams } from 'next/navigation';
import { Link, useRouter } from '@/i18n/routing';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTranslations } from 'next-intl';

export default function ResetPasswordPage() {
  const t = useTranslations('auth');
  const router = useRouter();
  const params = useParams();
  const locale = (params.locale as string) || 'tr';
  const [isPending, startTransition] = useTransition();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isValidToken, setIsValidToken] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    
    // Check if we have a valid session from the recovery link
    supabase.auth.getSession().then(({ data: { session } }) => {
      startTransition(() => {
        if (session) {
          setIsValidToken(true);
        } else {
          setMessage({ type: 'error', text: t('invalidResetLink') });
        }
      });
    });
  }, [t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      setMessage({ type: 'error', text: t('passwordsDoNotMatch') });
      return;
    }

    if (password.length < 6) {
      setMessage({ type: 'error', text: t('passwordTooShort') });
      return;
    }

    startTransition(async () => {
      const supabase = createClient();
      
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) {
        setMessage({ type: 'error', text: error.message });
      } else {
        setMessage({ type: 'success', text: t('passwordResetSuccess') });
        setTimeout(() => {
          router.push('/login');
        }, 2000);
      }
    });
  };

  if (!isValidToken && !message) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-amber-50 to-pink-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">{t('verifying')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-amber-50 to-pink-50 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-3xl shadow-xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">{t('resetPassword')}</h1>
            <p className="text-gray-600">{t('enterNewPassword')}</p>
          </div>

          {message && (
            <div className={`mb-6 p-4 rounded-xl ${
              message.type === 'success' 
                ? 'bg-green-50 text-green-700 border border-green-200' 
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {message.text}
            </div>
          )}

          {isValidToken && (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="password">{t('newPassword')}</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="mt-1"
                  placeholder="••••••••"
                  minLength={6}
                />
              </div>

              <div>
                <Label htmlFor="confirmPassword">{t('confirmPassword')}</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="mt-1"
                  placeholder="••••••••"
                  minLength={6}
                />
              </div>

              <Button
                type="submit"
                disabled={isPending}
                className="w-full bg-linear-to-r from-amber-500 to-pink-500 hover:from-amber-600 hover:to-pink-600 text-white py-3 rounded-xl"
              >
                {isPending ? t('resetting') : t('resetPassword')}
              </Button>
            </form>
          )}

          <div className="mt-6 text-center">
            <Link 
              href="/login" 
              className="text-amber-600 hover:text-amber-700 font-medium"
            >
              {t('backToLogin')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
