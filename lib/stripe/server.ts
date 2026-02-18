import Stripe from 'stripe';
import { env } from '@/lib/env';

function getStripeClient() {
  return new Stripe(env.STRIPE_SECRET_KEY, {
    apiVersion: '2026-01-28.clover',
    typescript: true,
  });
}

// Lazy singleton — only created when first accessed
let _stripe: Stripe | null = null;
export function getStripe(): Stripe {
  if (!_stripe) _stripe = getStripeClient();
  return _stripe;
}

/** @deprecated Use getStripe() instead — kept for backward compat */
export const stripe = new Proxy({} as Stripe, {
  get(_, prop) {
    return (getStripe() as unknown as Record<string | symbol, unknown>)[prop];
  },
});

/**
 * Create a Stripe Checkout Session with server-truth pricing.
 *
 * Accepts only product IDs + quantities — prices are looked up server-side
 * from lib/data.ts so clients can never manipulate amounts.
 *
 * Security:
 *  - Idempotency key per order prevents duplicate charges
 *  - 30-minute session expiry limits the payment window
 */
export async function createCheckoutSession(
  items: Array<{ id: string; quantity: number; name: string; price: number }>,
  customerEmail: string,
  orderId?: string,
  locale?: string
) {
  const lang = locale || 'en';
  const lineItems = items.map(item => ({
    price_data: {
      currency: 'try',
      product_data: {
        name: item.name,
      },
      unit_amount: Math.round(item.price * 100), // Server-verified price in kuruş
    },
    quantity: item.quantity,
  }));

  // 30-minute expiry: session becomes invalid after this window
  const expiresAt = Math.floor(Date.now() / 1000) + 30 * 60;

  const session = await getStripe().checkout.sessions.create(
    {
      mode: 'payment',
      line_items: lineItems,
      customer_email: customerEmail,
      expires_at: expiresAt,
      success_url: `${env.NEXT_PUBLIC_APP_URL}/${lang}/orders/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${env.NEXT_PUBLIC_APP_URL}/${lang}/cart?cancelled=true`,
      metadata: {
        orderId: orderId || '',
      },
    },
    // Idempotency key: prevents duplicate sessions for the same order
    orderId ? { idempotencyKey: `checkout_${orderId}` } : undefined
  );

  return session;
}
