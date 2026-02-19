import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

/**
 * POST /api/vitals
 *
 * Receives Core Web Vitals beacons from the client.
 * In a real production setup you'd forward these to your
 * observability platform (Datadog, Grafana, BigQuery, etc.).
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Basic validation
    if (!body.name || typeof body.value !== 'number') {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    logger.info('web-vital', {
      metric: body.name,
      value: Math.round(body.value),
      rating: body.rating,
      delta: body.delta,
      navigationType: body.navigationType,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: 'Failed to process vitals' },
      { status: 500 }
    );
  }
}
