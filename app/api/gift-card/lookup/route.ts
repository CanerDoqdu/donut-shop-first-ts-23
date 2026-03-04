import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getStripe } from '@/lib/stripe/server';
import { env } from '@/lib/env';
import { withHandler } from '@/lib/api-handler';
import { ApiError } from '@/lib/api-error';
import { logger } from '@/lib/logger';

/**
 * GET /api/gift-card/lookup?session_id=cs_xxx
 *
 * Called by the gift card success page to retrieve the gift card code
 * after payment confirmation. The code is no longer in the URL to
 * prevent pre-payment leakage.
 *
 * Lookup order:
 *  1. Stripe session metadata (fast, set by webhook)
 *  2. DB lookup via purchaser_email + closest timestamp (fallback)
 */
export const GET = withHandler(async (req: NextRequest, { requestId }) => {
  const log = logger.withContext({ requestId, path: '/api/gift-card/lookup' });

  const sessionId = req.nextUrl.searchParams.get('session_id');
  if (!sessionId) {
    throw new ApiError('E_VALIDATION_FAILED', 'Missing session_id parameter', 400);
  }

  try {
    // 1. Try Stripe session metadata first (webhook writes code there)
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.metadata?.code) {
      log.info('gift_card.lookup_from_stripe', { sessionId, code: session.metadata.code });
      return NextResponse.json({
        code: session.metadata.code,
        amount: session.metadata.amount,
        recipientName: session.metadata.recipientName,
        status: 'ready',
      });
    }

    // 2. Fallback: look up from DB by purchaser email
    if (session.customer_email) {
      const supabase = createClient(
        env.NEXT_PUBLIC_SUPABASE_URL,
        env.SUPABASE_SERVICE_ROLE_KEY,
      );

      const { data: card } = await supabase
        .from('gift_cards')
        .select('code, initial_balance, recipient_name')
        .eq('purchaser_email', session.customer_email)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (card) {
        log.info('gift_card.lookup_from_db', { sessionId, code: card.code });
        return NextResponse.json({
          code: card.code,
          amount: card.initial_balance,
          recipientName: card.recipient_name,
          status: 'ready',
        });
      }
    }

    // 3. Not ready yet — webhook hasn't processed
    log.info('gift_card.lookup_pending', { sessionId });
    return NextResponse.json({ status: 'pending' }, { status: 202 });
  } catch (err) {
    log.error('gift_card.lookup_failed', {
      sessionId,
      error: err instanceof Error ? err.message : String(err),
    });
    throw err instanceof ApiError
      ? err
      : new ApiError('E_INTERNAL', 'Failed to look up gift card', 500);
  }
});
