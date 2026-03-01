import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { metrics } from '@/lib/metrics';
import { apiErrorResponse, getRequestId } from '@/lib/api-error';
import { E_INTERNAL, E_VALIDATION_FAILED } from '@/lib/error-codes';

/** Allowed Web Vital metric names. */
const VALID_VITALS = new Set(['LCP', 'FID', 'CLS', 'INP', 'FCP', 'TTFB']);

/**
 * POST /api/vitals
 *
 * Receives Core Web Vitals beacons from the client.
 * Records metrics in the in-memory MetricsCollector and emits structured logs.
 */
export async function POST(request: Request) {
  const requestId = getRequestId(request);

  try {
    const body = await request.json();

    // Validation
    if (!body.name || typeof body.value !== 'number') {
      return apiErrorResponse(E_VALIDATION_FAILED, 'Invalid payload', 400, requestId);
    }

    if (!VALID_VITALS.has(body.name)) {
      return apiErrorResponse(E_VALIDATION_FAILED, 'Unknown vital', 400, requestId);
    }

    const route = typeof body.route === 'string' ? body.route : 'unknown';

    // Record in metrics collector
    metrics.recordWebVital(body.name, body.value, route);

    // Structured log with route context
    logger.metric(`web_vital.${body.name.toLowerCase()}`, Math.round(body.value), {
      vitalName: body.name,
      rating: body.rating,
      delta: body.delta,
      navigationType: body.navigationType,
      route,
    });

    return NextResponse.json({ ok: true }, { headers: { 'x-request-id': requestId } });
  } catch {
    return apiErrorResponse(E_INTERNAL, 'Failed to process vitals', 500, requestId);
  }
}
