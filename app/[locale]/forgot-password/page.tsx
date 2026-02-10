'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { Link } from '@/i18n/routing';
import { motion } from 'framer-motion';
import { Mail, ArrowLeft, AlertCircle, CheckCircle, Send } from 'lucide-react';
import { forgotPassword } from '@/lib/auth/actions';

export default function ForgotPasswordPage() {
  const params = useParams();
  const locale = (params.locale as string) || 'en';
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const t = {
    tr: {
      title: 'Şifremi Unuttum',
      subtitle: 'E-posta adresinizi girin, şifre sıfırlama bağlantısı göndereceğiz',
      email: 'E-posta',
      send: 'Sıfırlama Bağlantısı Gönder',
      sending: 'Gönderiliyor...',
      backToLogin: 'Giriş sayfasına dön',
      successTitle: 'E-posta Gönderildi!',
      successMessage: 'Şifre sıfırlama bağlantısı e-posta adresinize gönderildi. Lütfen gelen kutunuzu kontrol edin.',
      checkSpam: 'E-postayı bulamazsanız spam klasörünüzü kontrol edin.',
    },
    en: {
      title: 'Forgot Password',
      subtitle: 'Enter your email address and we\'ll send you a password reset link',
      email: 'Email',
      send: 'Send Reset Link',
      sending: 'Sending...',
      backToLogin: 'Back to login',
      successTitle: 'Email Sent!',
      successMessage: 'A password reset link has been sent to your email address. Please check your inbox.',
      checkSpam: 'If you don\'t see the email, check your spam folder.',
    },
  }[locale as 'tr' | 'en'];

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    formData.append('locale', locale);

    try {
      const result = await forgotPassword(formData);
      if (result.success) {
        setSuccess(true);
      } else if (result.error) {
        setError(result.error);
      }
    } catch {
      setError(locale === 'tr' ? 'Bir hata oluştu' : 'An error occurred');
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
          {success ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center"
            >
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                {t.successTitle}
              </h2>
              <p className="text-gray-600 mb-4">{t.successMessage}</p>
              <p className="text-sm text-gray-500 mb-6">{t.checkSpam}</p>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 text-amber-600 hover:text-amber-700 font-semibold"
              >
                <ArrowLeft className="w-4 h-4" />
                {t.backToLogin}
              </Link>
            </motion.div>
          ) : (
            <>
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

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-amber-500 text-white rounded-xl font-semibold hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      {t.sending}
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      {t.send}
                    </>
                  )}
                </button>
              </form>

              {/* Back to login */}
              <div className="mt-6 text-center">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-800"
                >
                  <ArrowLeft className="w-4 h-4" />
                  {t.backToLogin}
                </Link>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </main>
  );
}
