import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe/server';
import { env } from '@/lib/env';
import { rateLimit, getClientIP } from '@/lib/rate-limit';
import { validateOrigin } from '@/lib/security';
import { giftCardCheckoutSchema, parseBody } from '@/lib/validations';
import { withHandler } from '@/lib/api-handler';
import { ApiError } from '@/lib/api-error';
import { featureFlags } from '@/lib/config';
import { withTimeout } from '@/lib/fetch-with-timeout';

export const POST = withHandler(async (req: NextRequest) => {
  // ── Maintenance mode ──
  if (!featureFlags.checkoutEnabled) {
    throw new ApiError('MAINTENANCE', 'Checkout is temporarily disabled', 503);
  }

  // ── CSRF: verify request origin ──
  const originError = validateOrigin(req);
  if (originError) return originError;

  // Rate limit: 3 gift-card checkouts per minute per IP
  const ip = getClientIP(req);
  const limiter = rateLimit(`gift-checkout:${ip}`, { maxRequests: 3, windowSizeSeconds: 60 });
  if (!limiter.success) {
    throw new ApiError('RATE_LIMITED', 'Too many requests. Please try again later.', 429);
  }

  const body = await req.json();

  // ── Zod validation ──
  const parsed = parseBody(giftCardCheckoutSchema, body);
  if (!parsed.success) {
    throw new ApiError('VALIDATION_ERROR', parsed.error, 400);
  }

  const { amount, senderName, senderEmail, recipientName, recipientEmail, message, locale } = parsed.data;

  // Generate unique gift card code for metadata
  const code = `GC-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

  // Create Stripe checkout session (10s timeout)
  const session = await withTimeout(
    stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'try',
            product_data: {
              name: locale === 'tr' ? 'Hediye Kartı' : 'Gift Card',
              description: locale === 'tr'
                ? `${senderName}'den ${recipientName}'a hediye`
                : `Gift from ${senderName} to ${recipientName}`,
            },
            unit_amount: Math.round(amount * 100), // Convert to kuruş
          },
          quantity: 1,
        },
      ],
      customer_email: senderEmail,
      success_url: `${env.NEXT_PUBLIC_APP_URL}/${locale}/gift-cards/success?session_id={CHECKOUT_SESSION_ID}&code=${code}`,
      cancel_url: `${env.NEXT_PUBLIC_APP_URL}/${locale}/gift-cards?cancelled=true`,
      metadata: {
        type: 'gift_card',
        code,
        amount: amount.toString(),
        senderName,
        senderEmail,
        recipientName,
        recipientEmail,
        message: message || '',
      },
    }),
    10_000,
    'stripe.checkout.sessions.create',
  );

  return NextResponse.json({ url: session.url, code });
});
