'use client';

import { useState, useTransition } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, Mail, Lock, User, UserPlus } from 'lucide-react';

export default function RegisterPage() {
  const params = useParams();
  const locale = (params.locale as string) || 'tr';
  
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const t = {
    tr: {
      title: 'Kayıt Ol',
      subtitle: 'Yeni hesap oluşturun',
      name: 'Ad Soyad',
      namePlaceholder: 'John Doe',
      email: 'E-posta',
      emailPlaceholder: 'ornek@email.com',
      password: 'Şifre',
      passwordPlaceholder: '••••••••',
      confirmPassword: 'Şifre Tekrarı',
      register: 'Kayıt Ol',
      registering: 'Kayıt yapılıyor...',
      hasAccount: 'Zaten hesabınız var mı?',
      login: 'Giriş Yap',
      passwordMismatch: 'Şifreler eşleşmiyor',
      passwordTooShort: 'Şifre en az 6 karakter olmalı',
      registerSuccess: 'Kayıt başarılı! Lütfen e-postanızı doğrulayın.',
      registerError: 'Kayıt sırasında bir hata oluştu',
    },
    en: {
      title: 'Register',
      subtitle: 'Create a new account',
      name: 'Full Name',
      namePlaceholder: 'John Doe',
      email: 'Email',
      emailPlaceholder: 'example@email.com',
      password: 'Password',
      passwordPlaceholder: '••••••••',
      confirmPassword: 'Confirm Password',
      register: 'Register',
      registering: 'Registering...',
      hasAccount: 'Already have an account?',
      login: 'Login',
      passwordMismatch: 'Passwords do not match',
      passwordTooShort: 'Password must be at least 6 characters',
      registerSuccess: 'Registration successful! Please verify your email.',
      registerError: 'An error occurred during registration',
    },
  }[locale as 'tr' | 'en'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (password !== confirmPassword) {
      setMessage({ type: 'error', text: t.passwordMismatch });
      return;
    }

    if (password.length < 6) {
      setMessage({ type: 'error', text: t.passwordTooShort });
      return;
    }

    startTransition(async () => {
      const supabase = createClient();
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
          },
          emailRedirectTo: `${window.location.origin}/${locale}/auth/callback`,
        },
      });

      if (error) {
        setMessage({ type: 'error', text: error.message || t.registerError });
      } else {
        setMessage({ type: 'success', text: t.registerSuccess });
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
              <UserPlus className="w-8 h-8 text-white" />
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
              <Label htmlFor="name" className="flex items-center gap-2 mb-2">
                <User className="w-4 h-4 text-gray-400" />
                {t.name}
              </Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder={t.namePlaceholder}
                className="h-12 rounded-xl"
              />
            </div>

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
                  minLength={6}
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

            <div>
              <Label htmlFor="confirmPassword" className="flex items-center gap-2 mb-2">
                <Lock className="w-4 h-4 text-gray-400" />
                {t.confirmPassword}
              </Label>
              <Input
                id="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder={t.passwordPlaceholder}
                className="h-12 rounded-xl"
                minLength={6}
              />
            </div>

            <Button
              type="submit"
              disabled={isPending}
              className="w-full h-12 bg-linear-to-r from-amber-500 to-pink-500 hover:from-amber-600 hover:to-pink-600 text-white rounded-xl font-semibold text-lg shadow-lg shadow-amber-500/25"
            >
              {isPending ? t.registering : t.register}
            </Button>
          </form>

          {/* Login Link */}
          <div className="mt-8 text-center">
            <p className="text-gray-600">
              {t.hasAccount}{' '}
              <Link 
                href={`/${locale}/auth/login`}
                className="text-amber-600 hover:text-amber-700 font-semibold"
              >
                {t.login}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
