import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', {
  apiVersion: '2026-01-28.clover',
  typescript: true,
});

export async function createCheckoutSession(
  items: Array<{ name: string; price: number; quantity: number }>,
  customerEmail: string,
  orderId?: string
) {
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
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/orders/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/cart?cancelled=true`,
    metadata: {
      orderId: orderId || '',
      items: JSON.stringify(items),
    },
  });

  return session;
}
