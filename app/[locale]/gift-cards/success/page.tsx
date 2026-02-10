'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Check, Gift, Copy, CheckCircle } from 'lucide-react';
import { Link } from '@/i18n/routing';

export default function GiftCardSuccessPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const locale = (params.locale as string) || 'tr';
  const code = searchParams.get('code');
  const sessionId = searchParams.get('session_id');
  const [copied, setCopied] = useState(false);
  const [processed, setProcessed] = useState(false);

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
    },
  }[locale as 'tr' | 'en'];

  useEffect(() => {
    // Process the gift card after successful payment
    async function processGiftCard() {
      if (!code || !sessionId || processed) return;
      setProcessed(true);

      try {
        // Verify payment and create gift card in database
        const response = await fetch('/api/webhook/gift-card-success', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, code }),
        });

        if (!response.ok) {
          console.error('Failed to process gift card');
        }
      } catch (error) {
        console.error('Error processing gift card:', error);
      }
    }

    processGiftCard();
  }, [code, sessionId, processed]);

  const handleCopy = async () => {
    if (code) {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-md mx-auto px-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          {/* Success Icon */}
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="w-10 h-10 text-green-600" />
          </div>

          <h1 className="text-2xl font-bold text-gray-800 mb-2">{t.title}</h1>
          <p className="text-gray-600 mb-8">{t.subtitle}</p>

          {/* Gift Card Code */}
          {code && (
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
          )}

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
    </main>
  );
}
