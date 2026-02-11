'use client';

import { useParams } from 'next/navigation';
import GiftCardPurchase from '@/components/giftcards/GiftCardPurchase';

export default function GiftCardsPage() {
  const params = useParams();
  const locale = (params.locale as string) || 'tr';

  async function handlePurchase(data: {
    amount: number;
    senderName: string;
    senderEmail: string;
    recipientName: string;
    recipientEmail: string;
    message: string;
  }) {
    // Redirect to Stripe Checkout
    const response = await fetch('/api/checkout/gift-card', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...data,
        locale,
      }),
    });

    const result = await response.json();

    if (result.url) {
      // Redirect to Stripe
      window.location.href = result.url;
    } else {
      throw new Error(result.error || 'Failed to create checkout');
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-2xl mx-auto px-4">
        <GiftCardPurchase 
          locale={locale as 'tr' | 'en'} 
          onPurchase={handlePurchase}
        />
      </div>
    </main>
  );
}
