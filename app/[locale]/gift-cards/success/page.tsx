'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { Check, Gift, Copy, CheckCircle, Loader2 } from 'lucide-react';
import { Link } from '@/i18n/routing';

export default function GiftCardSuccessPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const locale = (params.locale as string) || 'tr';
  const sessionId = searchParams.get('session_id');
  const [code, setCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const t = {
    tr: {
      title: 'Hediye Kartı Oluşturuldu!',
      subtitle: 'Ödemeniz başarıyla alındı',
      code: 'Hediye Kartı Kodu',
      copyCode: 'Kodu Kopyala',
      copied: 'Kopyalandı!',
      emailSent: 'Alıcıya e-posta gönderildi',
      backToShop: 'Alışverişe Devam Et',
      buyAnother: 'Başka Bir Hediye Kartı Al',
      loading: 'Hediye kartınız hazırlanıyor...',
    },
    en: {
      title: 'Gift Card Created!',
      subtitle: 'Your payment was successful',
      code: 'Gift Card Code',
      copyCode: 'Copy Code',
      copied: 'Copied!',
      emailSent: 'Email sent to recipient',
      backToShop: 'Continue Shopping',
      buyAnother: 'Buy Another Gift Card',
      loading: 'Preparing your gift card...',
    },
  }[locale as 'tr' | 'en'];

  const fetchGiftCard = useCallback(async (sid: string, attempt = 0): Promise<void> => {
    try {
      const res = await fetch(`/api/gift-card/lookup?session_id=${encodeURIComponent(sid)}`);
      const data = await res.json();

      if (data.status === 'ready' && data.code) {
        setCode(data.code);
        setLoading(false);
        return;
      }

      // Webhook hasn't processed yet — retry with backoff (max 5 attempts, ~15s total)
      if (attempt < 5) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
        await new Promise((r) => setTimeout(r, delay));
        return fetchGiftCard(sid, attempt + 1);
      }

      // Give up — show fallback message
      setLoading(false);
    } catch {
      if (attempt < 3) {
        await new Promise((r) => setTimeout(r, 2000));
        return fetchGiftCard(sid, attempt + 1);
      }
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!sessionId) {
      setLoading(false);
      return;
    }
    fetchGiftCard(sessionId);
  }, [sessionId, fetchGiftCard]);

  const handleCopy = async () => {
    if (code) {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <section className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-md mx-auto px-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          {/* Success Icon */}
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="w-10 h-10 text-green-600" />
          </div>

          <h1 className="text-2xl font-bold text-gray-800 mb-2">{t.title}</h1>
          <p className="text-gray-600 mb-8">{t.subtitle}</p>

          {/* Gift Card Code — fetched from server after payment confirmation */}
          {loading ? (
            <div className="bg-linear-to-br from-amber-50 to-pink-50 rounded-xl p-6 mb-6 flex items-center justify-center gap-3">
              <Loader2 className="w-5 h-5 text-amber-600 animate-spin" />
              <span className="text-gray-600">{t.loading}</span>
            </div>
          ) : code ? (
            <div className="bg-linear-to-br from-amber-50 to-pink-50 rounded-xl p-6 mb-6">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Gift className="w-5 h-5 text-amber-600" />
                <span className="text-sm text-gray-600">{t.code}</span>
              </div>
              <p className="text-2xl font-bold text-gray-800 font-mono mb-4">{code}</p>
              <button
                onClick={handleCopy}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors border border-gray-200"
              >
                {copied ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    {t.copied}
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    {t.copyCode}
                  </>
                )}
              </button>
            </div>
          ) : null}

          <p className="text-sm text-gray-500 mb-8">
            <CheckCircle className="w-4 h-4 inline mr-1 text-green-500" />
            {t.emailSent}
          </p>

          {/* Actions */}
          <div className="space-y-3">
            <Link
              href="/"
              className="block w-full py-3 bg-amber-500 text-white rounded-xl font-semibold hover:bg-amber-600 transition-colors"
            >
              {t.backToShop}
            </Link>
            <Link
              href="/gift-cards"
              className="block w-full py-3 border border-gray-200 rounded-xl font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              {t.buyAnother}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
