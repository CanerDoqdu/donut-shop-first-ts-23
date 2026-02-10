'use client';

import { useState, useTransition } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, Mail, Lock, LogIn } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const locale = (params.locale as string) || 'tr';
  const redirectTo = searchParams.get('redirect') || `/${locale}`;
  
  const [isPending, startTransition] = useTransition();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const t = {
    tr: {
      title: 'Giriş Yap',
      subtitle: 'Hesabınıza giriş yapın',
      email: 'E-posta',
      emailPlaceholder: 'ornek@email.com',
      password: 'Şifre',
      passwordPlaceholder: '••••••••',
      login: 'Giriş Yap',
      loggingIn: 'Giriş yapılıyor...',
      forgotPassword: 'Şifremi unuttum',
      noAccount: 'Hesabınız yok mu?',
      register: 'Kayıt Ol',
      invalidCredentials: 'E-posta veya şifre hatalı',
      loginSuccess: 'Giriş başarılı! Yönlendiriliyorsunuz...',
    },
    en: {
      title: 'Login',
      subtitle: 'Sign in to your account',
      email: 'Email',
      emailPlaceholder: 'example@email.com',
      password: 'Password',
      passwordPlaceholder: '••••••••',
      login: 'Login',
      loggingIn: 'Logging in...',
      forgotPassword: 'Forgot password',
      noAccount: "Don't have an account?",
      register: 'Register',
      invalidCredentials: 'Invalid email or password',
      loginSuccess: 'Login successful! Redirecting...',
    },
  }[locale as 'tr' | 'en'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    startTransition(async () => {
      const supabase = createClient();
      
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setMessage({ type: 'error', text: t.invalidCredentials });
      } else {
        setMessage({ type: 'success', text: t.loginSuccess });
        setTimeout(() => {
          router.push(redirectTo);
          router.refresh();
        }, 1000);
      }
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-amber-50 to-pink-50 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-3xl shadow-xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-linear-to-br from-amber-400 to-pink-400 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <LogIn className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">{t.title}</h1>
            <p className="text-gray-600">{t.subtitle}</p>
          </div>

          {/* Message */}
          {message && (
            <div className={`mb-6 p-4 rounded-xl ${
              message.type === 'success' 
                ? 'bg-green-50 text-green-700 border border-green-200' 
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {message.text}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <Label htmlFor="email" className="flex items-center gap-2 mb-2">
                <Mail className="w-4 h-4 text-gray-400" />
                {t.email}
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder={t.emailPlaceholder}
                className="h-12 rounded-xl"
              />
            </div>

            <div>
              <Label htmlFor="password" className="flex items-center gap-2 mb-2">
                <Lock className="w-4 h-4 text-gray-400" />
                {t.password}
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder={t.passwordPlaceholder}
                  className="h-12 rounded-xl pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="flex justify-end">
              <Link 
                href={`/${locale}/auth/forgot-password`}
                className="text-sm text-amber-600 hover:text-amber-700 font-medium"
              >
                {t.forgotPassword}
              </Link>
            </div>

            <Button
              type="submit"
              disabled={isPending}
              className="w-full h-12 bg-linear-to-r from-amber-500 to-pink-500 hover:from-amber-600 hover:to-pink-600 text-white rounded-xl font-semibold text-lg shadow-lg shadow-amber-500/25"
            >
              {isPending ? t.loggingIn : t.login}
            </Button>
          </form>

          {/* Register Link */}
          <div className="mt-8 text-center">
            <p className="text-gray-600">
              {t.noAccount}{' '}
              <Link 
                href={`/${locale}/auth/register`}
                className="text-amber-600 hover:text-amber-700 font-semibold"
              >
                {t.register}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
