import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { metrics } from '@/lib/metrics';

/** Allowed Web Vital metric names. */
const VALID_VITALS = new Set(['LCP', 'FID', 'CLS', 'INP', 'FCP', 'TTFB']);

/**
 * POST /api/vitals
 *
 * Receives Core Web Vitals beacons from the client.
 * Records metrics in the in-memory MetricsCollector and emits structured logs.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validation
    if (!body.name || typeof body.value !== 'number') {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    if (!VALID_VITALS.has(body.name)) {
      return NextResponse.json({ error: 'Unknown vital' }, { status: 400 });
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

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: 'Failed to process vitals' },
      { status: 500 }
    );
  }
}
