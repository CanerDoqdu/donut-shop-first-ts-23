import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe/server';
import { withHandler } from '@/lib/api-handler';
import { ApiError } from '@/lib/api-error';
import { rateLimit, getClientIP } from '@/lib/rate-limit';
import { validateOrigin } from '@/lib/security';
import { logger } from '@/lib/logger';
import { E_RATE_LIMITED } from '@/lib/error-codes';

/**
 * GET /api/gift-card/lookup?session_id=cs_xxx
 *
 * Called by the gift card success page to retrieve the gift card code
 * after payment confirmation. The code is no longer in the URL to
 * prevent pre-payment leakage.
 *
 * Lookup strategy:
 *  - Stripe session metadata ONLY (webhook writes code there)
 *  - No DB fallback — email-based queries are ambiguous when the same
 *    purchaser has multiple gift cards. If Stripe metadata isn't ready
 *    yet, return 202 and let the client poll.
 */
export const GET = withHandler(async (req: NextRequest, { requestId }) => {
  const log = logger.withContext({ requestId, path: '/api/gift-card/lookup' });

  // ── CSRF: verify request origin ──
  const originError = validateOrigin(req);
  if (originError) return originError;

  // ── Rate limit: 10 lookups per minute per IP (polling-friendly) ──
  const ip = getClientIP(req);
  const limiter = rateLimit(`gc-lookup:${ip}`, { maxRequests: 10, windowSizeSeconds: 60 });
  if (!limiter.success) {
    log.warn('gift_card.lookup_rate_limited', { code: E_RATE_LIMITED, ip });
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': '60' } },
    );
  }

  const sessionId = req.nextUrl.searchParams.get('session_id');
  if (!sessionId) {
    throw new ApiError('E_VALIDATION_FAILED', 'Missing session_id parameter', 400);
  }

  // Validate session_id format — Stripe session IDs start with cs_
  if (!/^cs_(test_|live_)?[A-Za-z0-9]+$/.test(sessionId)) {
    throw new ApiError('E_VALIDATION_FAILED', 'Invalid session_id format', 400);
  }

  try {
    // Retrieve from Stripe session metadata (webhook writes code there)
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    // Verify this is actually a gift card session
    if (session.metadata?.type !== 'gift_card') {
      throw new ApiError('E_VALIDATION_FAILED', 'Not a gift card session', 400);
    }

    // Check payment status — only return code for paid sessions
    if (session.payment_status !== 'paid') {
      log.info('gift_card.lookup_unpaid', { sessionId, paymentStatus: session.payment_status });
      return NextResponse.json({ status: 'pending' }, { status: 202 });
    }

    if (session.metadata?.code) {
      log.info('gift_card.lookup_found', { sessionId });
      return NextResponse.json({
        code: session.metadata.code,
        amount: session.metadata.amount,
        recipientName: session.metadata.recipientName,
        status: 'ready',
      });
    }

    // Webhook hasn't written the code to metadata yet — let client retry
    log.info('gift_card.lookup_pending', { sessionId });
    return NextResponse.json({ status: 'pending' }, { status: 202 });
  } catch (err) {
    if (err instanceof ApiError) throw err;

    log.error('gift_card.lookup_failed', {
      sessionId,
      error: err instanceof Error ? err.message : String(err),
    });
    throw new ApiError('E_INTERNAL', 'Failed to look up gift card', 500);
  }
});
