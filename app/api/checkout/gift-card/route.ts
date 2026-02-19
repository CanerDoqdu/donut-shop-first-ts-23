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
import { logger, startTimer } from '@/lib/logger';
import { E_RATE_LIMITED, E_VALIDATION_FAILED, E_STRIPE_GIFT_CARD_FAILED } from '@/lib/error-codes';

export const POST = withHandler(async (req: NextRequest, { requestId }) => {
  const log = logger.withContext({ requestId, path: '/api/checkout/gift-card' });
  const elapsed = startTimer();

  // -- Maintenance mode --
  if (!featureFlags.checkoutEnabled) {
    throw new ApiError('MAINTENANCE', 'Checkout is temporarily disabled', 503);
  }

  // -- CSRF: verify request origin --
  const originError = validateOrigin(req);
  if (originError) return originError;

  // Rate limit: 3 gift-card checkouts per minute per IP
  const ip = getClientIP(req);
  const limiter = rateLimit(`gift-checkout:${ip}`, { maxRequests: 3, windowSizeSeconds: 60 });
  if (!limiter.success) {
    log.warn('gift_card.rate_limited', { code: E_RATE_LIMITED, ip });
    log.count('gift_card_rate_limited');
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429, headers: { 'Retry-After': '60' } }
    );
  }

  try {
    const body = await req.json();

    // -- Zod validation --
    const parsed = parseBody(giftCardCheckoutSchema, body);
    if (!parsed.success) {
      log.warn('gift_card.validation_failed', { code: E_VALIDATION_FAILED, detail: parsed.error });
      throw new ApiError(E_VALIDATION_FAILED, parsed.error, 400);
    }

    const { amount, senderName, senderEmail, recipientName, recipientEmail, message, locale } = parsed.data;

    // Generate unique gift card code for metadata
    const code = `GC-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    // Create Stripe checkout session with timeout
    const session = await withTimeout(
      stripe.checkout.sessions.create({
        mode: 'payment',
        line_items: [
          {
            price_data: {
              currency: 'try',
              product_data: {
                name: locale === 'tr' ? 'Hediye Kart\u0131' : 'Gift Card',
                description: locale === 'tr'
                  ? `${senderName}'den ${recipientName}'a hediye`
                  : `Gift from ${senderName} to ${recipientName}`,
              },
              unit_amount: Math.round(amount * 100), // Convert to kuru\u015f
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
      'stripe.giftCardCheckout',
    );

    log.info('gift_card.success', { code, amount });
    log.metric('gift_card_checkout_duration_ms', elapsed());
    log.count('gift_card_checkout_success');

    return NextResponse.json({ url: session.url, code });
  } catch (err) {
    if (!(err instanceof ApiError)) {
      log.error('gift_card.failed', { code: E_STRIPE_GIFT_CARD_FAILED, error: err instanceof Error ? err.message : String(err) });
    }
    log.count('gift_card_checkout_error');
    log.metric('gift_card_checkout_duration_ms', elapsed());
    throw err instanceof ApiError
      ? err
      : new ApiError(E_STRIPE_GIFT_CARD_FAILED, 'Failed to create checkout session', 500);
  }
});
