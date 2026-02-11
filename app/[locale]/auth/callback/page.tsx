'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

// This page is a fallback. The main PKCE callback is handled by /api/auth/callback.
// If a user lands here directly, redirect them to the home page.
export default function AuthCallbackPage() {
  const params = useParams();
  const router = useRouter();
  const locale = (params.locale as string) || 'en';

  useEffect(() => {
    // If there's a code in the URL, redirect to the API callback handler
    const queryParams = new URLSearchParams(window.location.search);
    const code = queryParams.get('code');
    if (code) {
      window.location.replace(`/api/auth/callback?code=${code}&locale=${locale}`);
      return;
    }

    // Otherwise redirect home after a short delay
    const timeout = setTimeout(() => {
      router.replace(`/${locale}`);
    }, 1000);

    return () => clearTimeout(timeout);
  }, [locale, router]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-linear-to-br from-amber-50 via-white to-pink-50">
      <div className="text-center">
        <Loader2 className="w-10 h-10 animate-spin text-amber-500 mx-auto mb-4" />
        <p className="text-gray-600 text-lg">
          {locale === 'tr' ? 'Giriş yapılıyor...' : 'Signing you in...'}
        </p>
      </div>
    </main>
  );
}
