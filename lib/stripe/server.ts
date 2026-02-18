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

export async function createCheckoutSession(
  items: Array<{ name: string; price: number; quantity: number }>,
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
      unit_amount: Math.round(item.price * 100), // Convert to kuruş
    },
    quantity: item.quantity,
  }));

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: lineItems,
    customer_email: customerEmail,
    success_url: `${env.NEXT_PUBLIC_APP_URL}/${lang}/orders/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${env.NEXT_PUBLIC_APP_URL}/${lang}/cart?cancelled=true`,
    metadata: {
      orderId: orderId || '',
      items: JSON.stringify(items),
    },
  });

  return session;
}
