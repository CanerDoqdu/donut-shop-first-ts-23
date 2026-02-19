import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type Stripe from 'stripe';
import { env } from '@/lib/env';
import { logger } from '@/lib/logger';
import { getRequestId } from '@/lib/api-error';
import { featureFlags } from '@/lib/config';
import { withTimeout } from '@/lib/fetch-with-timeout';

// ── Supabase admin client (service_role — bypasses RLS) ──────
function createSupabaseAdminClient() {
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
}

// ── Idempotency ──────────────────────────────────────────────
/**
 * INSERT the Stripe event ID into `stripe_events`.
 * Returns `true` if this is a new event, `false` if already processed.
 *
 * The table uses a PRIMARY KEY on `event_id`, so a duplicate insert
 * triggers a unique-violation (23505) which we treat as "already seen".
 *
 * If the table doesn't exist yet (migration not run), we log a warning
 * and allow processing so the webhook isn't blocked.
 */
async function recordEvent(
  supabase: SupabaseClient,
  eventId: string,
  eventType: string,
): Promise<boolean> {
  const { error } = await supabase
    .from('stripe_events')
    .insert({ event_id: eventId, event_type: eventType });

  // unique_violation → already processed
  if (error?.code === '23505') return false;

  if (error) {
    // Table may not exist yet — warn but don't block
    logger.warn('webhook.idempotency_insert_failed', {
      eventId,
      code: error.code,
      error: error.message,
    });
  }

  return true;
}

// ── Main Handler ─────────────────────────────────────────────
export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);
  const log = logger.withContext({ requestId });

  // ── Maintenance mode ──
  if (!featureFlags.webhooksEnabled) {
    log.warn('webhook.maintenance_mode');
    return NextResponse.json(
      { code: 'MAINTENANCE', message: 'Webhook processing is disabled', requestId },
      { status: 503, headers: { 'x-request-id': requestId } },
    );
  }

  const supabaseAdmin = createSupabaseAdminClient();
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    log.warn('webhook.missing_signature', { requestId });
    return NextResponse.json(
      { code: 'MISSING_SIGNATURE', message: 'Missing stripe signature', requestId },
      { status: 400, headers: { 'x-request-id': requestId } },
    );
  }

  let event: Stripe.Event;

  try {
    event = getStripe().webhooks.constructEvent(
      body,
      signature,
      env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (err) {
    log.error('webhook.signature_invalid', {
      requestId,
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { code: 'INVALID_SIGNATURE', message: 'Invalid signature', requestId },
      { status: 400, headers: { 'x-request-id': requestId } },
    );
  }

  // ── Idempotency: skip already-processed events ─────────────
  const isNew = await recordEvent(supabaseAdmin, event.id, event.type);
  if (!isNew) {
    log.info('webhook.duplicate_skipped', {
      eventId: event.id,
      type: event.type,
    });
    return NextResponse.json(
      { received: true },
      { headers: { 'x-request-id': requestId } },
    );
  }

  log.info('webhook.processing', { eventId: event.id, type: event.type });

  // ── Route to handler ───────────────────────────────────────
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        await withTimeout(
          handleCheckoutCompleted(
            supabaseAdmin,
            event.data.object as Stripe.Checkout.Session,
          ),
          15_000,
          'webhook.handleCheckoutCompleted',
        );
        break;
      }

      case 'checkout.session.expired': {
        await withTimeout(
          handleCheckoutExpired(
            supabaseAdmin,
            event.data.object as Stripe.Checkout.Session,
          ),
          15_000,
          'webhook.handleCheckoutExpired',
        );
        break;
      }

      case 'payment_intent.succeeded': {
        handlePaymentIntentSucceeded(
          event.data.object as Stripe.PaymentIntent,
        );
        break;
      }

      case 'payment_intent.payment_failed': {
        handlePaymentIntentFailed(
          event.data.object as Stripe.PaymentIntent,
        );
        break;
      }

      default:
        log.info('webhook.unhandled_type', { type: event.type });
    }
  } catch (err) {
    log.error('webhook.handler_error', {
      eventId: event.id,
      type: event.type,
      error: err instanceof Error ? err.message : String(err),
    });
    // Return 500 so Stripe retries this event
    return NextResponse.json(
      { code: 'WEBHOOK_HANDLER_ERROR', message: 'Internal error', requestId },
      { status: 500, headers: { 'x-request-id': requestId } },
    );
  }

  return NextResponse.json(
    { received: true },
    { headers: { 'x-request-id': requestId } },
  );
}

// ── checkout.session.completed ───────────────────────────────
/**
 * Uses the `process_payment_completed` RPC (Postgres function) to
 * atomically update the order status AND award loyalty points in a
 * single transaction.
 *
 * Falls back to a simple UPDATE if the RPC is not deployed yet.
 */
async function handleCheckoutCompleted(
  supabase: SupabaseClient,
  session: Stripe.Checkout.Session,
) {
  logger.info('webhook.checkout_completed', {
    sessionId: session.id,
    paymentIntent: session.payment_intent,
    customerEmail: session.customer_email,
  });

  // Try transactional RPC first
  const { data, error: rpcError } = await supabase.rpc(
    'process_payment_completed',
    {
      p_stripe_session_id: session.id,
      p_payment_intent_id: (session.payment_intent as string) || '',
    },
  );

  if (rpcError) {
    // RPC not deployed yet — fall back to simple update
    logger.warn('webhook.rpc_unavailable_fallback', {
      sessionId: session.id,
      error: rpcError.message,
    });

    const { error: updateError } = await supabase
      .from('orders')
      .update({
        status: 'paid',
        stripe_payment_intent_id: session.payment_intent as string,
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_session_id', session.id)
      .eq('status', 'pending');

    if (updateError) {
      logger.error('webhook.order_update_failed', {
        sessionId: session.id,
        error: updateError.message,
      });
      throw updateError;
    }

    logger.info('webhook.order_paid_fallback', { sessionId: session.id });
    return;
  }

  const result = data as {
    success: boolean;
    order_id?: string;
    points_awarded?: number;
    reason?: string;
  } | null;

  if (!result?.success) {
    logger.warn('webhook.order_not_updated', {
      sessionId: session.id,
      reason: result?.reason,
    });
    return;
  }

  logger.info('webhook.order_paid', {
    orderId: result.order_id,
    pointsAwarded: result.points_awarded,
  });
}

// ── checkout.session.expired ─────────────────────────────────
async function handleCheckoutExpired(
  supabase: SupabaseClient,
  session: Stripe.Checkout.Session,
) {
  logger.info('webhook.checkout_expired', { sessionId: session.id });

  const { error } = await supabase
    .from('orders')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('stripe_session_id', session.id)
    .eq('status', 'pending'); // only cancel if still pending

  if (error) {
    logger.error('webhook.cancel_failed', {
      sessionId: session.id,
      error: error.message,
    });
    throw error;
  }
}

// ── payment_intent.succeeded ─────────────────────────────────
/**
 * Order status is already updated via checkout.session.completed.
 * This handler provides an additional confirmation audit log.
 */
function handlePaymentIntentSucceeded(pi: Stripe.PaymentIntent) {
  logger.info('webhook.payment_intent_succeeded', {
    paymentIntentId: pi.id,
    amount: pi.amount,
    currency: pi.currency,
  });
}

// ── payment_intent.payment_failed ────────────────────────────
function handlePaymentIntentFailed(pi: Stripe.PaymentIntent) {
  logger.warn('webhook.payment_intent_failed', {
    paymentIntentId: pi.id,
    amount: pi.amount,
    lastError: pi.last_payment_error?.message,
  });
}
