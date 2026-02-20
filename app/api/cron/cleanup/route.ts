/**
 * Cron trigger for cleanup queue.
 *
 * POST /api/cron/cleanup
 *
 * Designed to be called by Vercel Cron or an external scheduler
 * every 5 minutes. Enqueues a cleanup job to expire stale
 * stock reservations.
 *
 * Protected by CRON_SECRET header to prevent unauthorized access.
 */

import { NextResponse } from 'next/server';
import { enqueueCleanup } from '@/lib/queue';
import { logger } from '@/lib/logger';

export async function POST(req: Request): Promise<NextResponse> {
  // Verify cron secret
  const secret = req.headers.get('x-cron-secret') || req.headers.get('authorization')?.replace('Bearer ', '');
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const jobId = await enqueueCleanup(30); // Expire reservations older than 30 minutes

    if (!jobId) {
      logger.warn('cron.cleanup.queue_unavailable');
      return NextResponse.json(
        { message: 'Queue unavailable — cleanup skipped', fallback: true },
        { status: 200 },
      );
    }

    return NextResponse.json({ jobId, enqueuedAt: new Date().toISOString() });
  } catch (err) {
    logger.error('cron.cleanup.error', {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
