'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { Link } from '@/i18n/routing';
import { motion } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, User, UserPlus, AlertCircle, Check } from 'lucide-react';
import { signUp } from '@/lib/auth/actions';

export default function RegisterPage() {
  const params = useParams();
  const locale = (params.locale as string) || 'en';
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState('');

  const t = {
    tr: {
      title: 'Kayıt Ol',
      subtitle: 'Yeni hesap oluşturun',
      fullName: 'Ad Soyad',
      email: 'E-posta',
      password: 'Şifre',
      register: 'Kayıt Ol',
      haveAccount: 'Zaten hesabınız var mı?',
      login: 'Giriş Yap',
      or: 'veya',
      continueWithGoogle: 'Google ile devam et',
      continueWithX: 'X ile devam et',
      registering: 'Kayıt yapılıyor...',
      passwordRequirements: 'Şifre gereksinimleri:',
      minChars: 'En az 8 karakter',
      hasNumber: 'En az 1 rakam',
      hasUpper: 'En az 1 büyük harf',
      byRegistering: 'Kayıt olarak',
      termsOfService: 'Kullanım Şartları',
      and: 've',
      privacyPolicy: 'Gizlilik Politikası',
      agreeText: "'nı kabul etmiş olursunuz",
    },
    en: {
      title: 'Register',
      subtitle: 'Create a new account',
      fullName: 'Full Name',
      email: 'Email',
      password: 'Password',
      register: 'Create Account',
      haveAccount: 'Already have an account?',
      login: 'Sign In',
      or: 'or',
      continueWithGoogle: 'Continue with Google',
      continueWithX: 'Continue with X',
      registering: 'Creating account...',
      passwordRequirements: 'Password requirements:',
      minChars: 'At least 8 characters',
      hasNumber: 'At least 1 number',
      hasUpper: 'At least 1 uppercase letter',
      byRegistering: 'By registering, you agree to our',
      termsOfService: 'Terms of Service',
      and: 'and',
      privacyPolicy: 'Privacy Policy',
      agreeText: '',
    },
  }[locale as 'tr' | 'en'];

  const passwordChecks = {
    minChars: password.length >= 8,
    hasNumber: /\d/.test(password),
    hasUpper: /[A-Z]/.test(password),
  };

  const isPasswordValid = Object.values(passwordChecks).every(Boolean);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');

    if (!isPasswordValid) {
      setError(locale === 'tr' ? 'Şifre gereksinimlerini karşılamıyor' : 'Password does not meet requirements');
      return;
    }

    setLoading(true);

    const formData = new FormData(e.currentTarget);
    formData.append('locale', locale);

    try {
      const result = await signUp(formData);
      if (!result.success && result.error) {
        setError(result.error);
      }
    } catch {
      // Redirect happens on success
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-linear-to-br from-amber-50 via-white to-pink-50 flex items-center justify-center py-12 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <span className="text-4xl">🍩</span>
            <h1 className="text-2xl font-bold text-gray-800 mt-2">Donut Shop</h1>
          </Link>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-2xl font-bold text-gray-800 text-center mb-2">
            {t.title}
          </h2>
          <p className="text-gray-500 text-center mb-6">{t.subtitle}</p>

          {/* Error message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3"
            >
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t.fullName}
              </label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  name="fullName"
                  required
                  className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                  placeholder={locale === 'tr' ? 'Adınız Soyadınız' : 'John Doe'}
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t.email}
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  name="email"
                  required
                  className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t.password}
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-12 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              {/* Password requirements */}
              {password && (
                <div className="mt-3 space-y-1">
                  <p className="text-xs text-gray-500">{t.passwordRequirements}</p>
                  <div className="flex items-center gap-2 text-xs">
                    <Check className={`w-3 h-3 ${passwordChecks.minChars ? 'text-green-500' : 'text-gray-300'}`} />
                    <span className={passwordChecks.minChars ? 'text-green-600' : 'text-gray-500'}>
                      {t.minChars}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <Check className={`w-3 h-3 ${passwordChecks.hasNumber ? 'text-green-500' : 'text-gray-300'}`} />
                    <span className={passwordChecks.hasNumber ? 'text-green-600' : 'text-gray-500'}>
                      {t.hasNumber}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <Check className={`w-3 h-3 ${passwordChecks.hasUpper ? 'text-green-500' : 'text-gray-300'}`} />
                    <span className={passwordChecks.hasUpper ? 'text-green-600' : 'text-gray-500'}>
                      {t.hasUpper}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Terms */}
            <p className="text-xs text-gray-500 text-center">
              {t.byRegistering}{' '}
              <a href="/terms" className="text-amber-600 hover:underline">
                {t.termsOfService}
              </a>{' '}
              {t.and}{' '}
              <a href="/privacy" className="text-amber-600 hover:underline">
                {t.privacyPolicy}
              </a>
              {t.agreeText}
            </p>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-amber-500 text-white rounded-xl font-semibold hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {t.registering}
                </>
              ) : (
                <>
                  <UserPlus className="w-5 h-5" />
                  {t.register}
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-500">{t.or}</span>
            </div>
          </div>

          {/* Social Login */}
          <div className="space-y-3">
            <a
              href={`/api/auth/google?locale=${locale}`}
              className="w-full py-3 border border-gray-200 rounded-xl font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-3"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              {t.continueWithGoogle}
            </a>

            <a
              href={`/api/auth/twitter?locale=${locale}`}
              className="w-full py-3 border border-gray-200 rounded-xl font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-3"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              {t.continueWithX}
            </a>
          </div>

          {/* Login link */}
          <p className="mt-6 text-center text-gray-600">
            {t.haveAccount}{' '}
            <Link
              href="/login"
              className="text-amber-600 hover:text-amber-700 font-semibold"
            >
              {t.login}
            </Link>
          </p>
        </div>
      </motion.div>
    </main>
  );
}
