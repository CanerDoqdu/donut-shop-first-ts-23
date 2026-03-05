import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { rateLimit, getClientIP } from '@/lib/rate-limit';
import { getSupabasePublicEnv, getSupabaseServiceRoleKey } from '@/lib/supabase/env';
import { validateOrigin } from '@/lib/security';
import { promoCodeSchema, parseBody } from '@/lib/validations';
import { withHandler } from '@/lib/api-handler';
import { ApiError } from '@/lib/api-error';
import { previewPromo } from '@/lib/promo';
import { logger, startTimer } from '@/lib/logger';
import { featureFlags } from '@/lib/config';
import {
  E_RATE_LIMITED,
  E_VALIDATION_FAILED,
  E_PROMO_INVALID,
  E_PROMO_EXPIRED,
  E_PROMO_DEPLETED,
  E_PROMO_MIN_ORDER,
} from '@/lib/error-codes';

function createAdminClient() {
  const { url } = getSupabasePublicEnv();
  const serviceRoleKey = getSupabaseServiceRoleKey();

  return createServerClient(url, serviceRoleKey, {
    cookies: {
      getAll: () => [],
      setAll: () => {},
    },
  });
}

const REASON_TO_CODE: Record<string, string> = {
  INVALID_CODE: E_PROMO_INVALID,
  INACTIVE: E_PROMO_INVALID,
  EXPIRED: E_PROMO_EXPIRED,
  DEPLETED: E_PROMO_DEPLETED,
  MIN_ORDER_NOT_MET: E_PROMO_MIN_ORDER,
};

/**
 * POST /api/checkout/validate-promo
 *
 * Preview a promo code's discount without applying it.
 * Body: { code: string, orderTotal: number }
 * Returns: { discountType, discountValue, finalTotal } or error.
 */
export const POST = withHandler(async (req: NextRequest, { requestId }) => {
  const log = logger.withContext({ requestId, path: '/api/checkout/validate-promo' });
  const elapsed = startTimer();

  // CSRF
  const originError = validateOrigin(req);
  if (originError) return originError;

  // Rate limit: 10 promo checks per minute per IP
  const ip = getClientIP(req);
  const limiter = rateLimit(`promo:${ip}`, { maxRequests: 10, windowSizeSeconds: 60 });
  if (!limiter.success) {
    log.warn('promo.rate_limited', { code: E_RATE_LIMITED, ip });
    throw new ApiError(
      E_RATE_LIMITED,
      'Too many requests. Please try again later.',
      429,
      { headers: { 'Retry-After': '60' } },
    );
  }

  const body = await req.json();
  const parsed = parseBody(promoCodeSchema, body);
  if (!parsed.success) {
    log.warn('promo.validation_failed', { code: E_VALIDATION_FAILED, detail: parsed.error });
    throw new ApiError(E_VALIDATION_FAILED, parsed.error, 400);
  }

  const { code, orderTotal } = parsed.data;
  const normalizedCode = featureFlags.normalizePromoCodes ? code.trim().toUpperCase() : code;
  const admin = createAdminClient();

  const result = await previewPromo(admin, normalizedCode, orderTotal);

  log.metric('promo_validate_ms', elapsed());

  if (!result.success) {
    const errorCode = REASON_TO_CODE[result.reason] || E_PROMO_INVALID;
    log.info('promo.rejected', { code: errorCode, reason: result.reason, promoCode: normalizedCode });
    throw new ApiError(errorCode, result.message, 400);
  }

  log.info('promo.validated', { promoCode: normalizedCode, discountValue: result.discountValue });
  return NextResponse.json({
    valid: true,
    discountType: result.discountType,
    discountValue: result.discountValue,
    finalTotal: result.finalTotal,
  });
});
