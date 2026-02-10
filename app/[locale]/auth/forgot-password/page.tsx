'use client';

import { useState, useTransition } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mail, ArrowLeft, KeyRound } from 'lucide-react';

export default function ForgotPasswordPage() {
  const params = useParams();
  const locale = (params.locale as string) || 'tr';
  
  const [isPending, startTransition] = useTransition();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const t = {
    tr: {
      title: 'Şifremi Unuttum',
      subtitle: 'Şifre sıfırlama bağlantısı göndereceğiz',
      email: 'E-posta',
      emailPlaceholder: 'ornek@email.com',
      send: 'Sıfırlama Bağlantısı Gönder',
      sending: 'Gönderiliyor...',
      backToLogin: 'Giriş sayfasına dön',
      success: 'Şifre sıfırlama bağlantısı e-postanıza gönderildi',
      error: 'Bir hata oluştu. Lütfen tekrar deneyin.',
    },
    en: {
      title: 'Forgot Password',
      subtitle: "We'll send you a password reset link",
      email: 'Email',
      emailPlaceholder: 'example@email.com',
      send: 'Send Reset Link',
      sending: 'Sending...',
      backToLogin: 'Back to login',
      success: 'Password reset link has been sent to your email',
      error: 'An error occurred. Please try again.',
    },
  }[locale as 'tr' | 'en'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    startTransition(async () => {
      const supabase = createClient();
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/${locale}/auth/reset-password`,
      });

      if (error) {
        setMessage({ type: 'error', text: error.message || t.error });
      } else {
        setMessage({ type: 'success', text: t.success });
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
              <KeyRound className="w-8 h-8 text-white" />
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

            <Button
              type="submit"
              disabled={isPending}
              className="w-full h-12 bg-linear-to-r from-amber-500 to-pink-500 hover:from-amber-600 hover:to-pink-600 text-white rounded-xl font-semibold text-lg shadow-lg shadow-amber-500/25"
            >
              {isPending ? t.sending : t.send}
            </Button>
          </form>

          {/* Back to Login */}
          <div className="mt-8 text-center">
            <Link 
              href={`/${locale}/auth/login`}
              className="inline-flex items-center gap-2 text-amber-600 hover:text-amber-700 font-medium"
            >
              <ArrowLeft className="w-4 h-4" />
              {t.backToLogin}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
