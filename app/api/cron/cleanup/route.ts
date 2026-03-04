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
import { apiErrorResponse, getRequestId } from '@/lib/api-error';
import { E_AUTH_SESSION_MISSING, E_INTERNAL } from '@/lib/error-codes';
import { withVersionHeader } from '@/lib/api-handler';
import { safeCompare } from '@/lib/safe-compare';

export async function POST(req: Request): Promise<NextResponse> {
  const requestId = getRequestId(req);
  // Verify cron secret — reject if env var is not configured
  const secret = req.headers.get('x-cron-secret') || req.headers.get('authorization')?.replace('Bearer ', '');
  if (!safeCompare(secret, process.env.CRON_SECRET)) {
    return withVersionHeader(apiErrorResponse(E_AUTH_SESSION_MISSING, 'Unauthorized', 401, requestId));
  }

  try {
    const jobId = await enqueueCleanup(30); // Expire reservations older than 30 minutes

    if (!jobId) {
      logger.warn('cron.cleanup.queue_unavailable');
      return withVersionHeader(NextResponse.json(
        { message: 'Queue unavailable — cleanup skipped', fallback: true },
        { status: 200 },
      ));
    }

    return withVersionHeader(NextResponse.json(
      { jobId, enqueuedAt: new Date().toISOString() },
      { headers: { 'x-request-id': requestId } },
    ));
  } catch (err) {
    logger.error('cron.cleanup.error', {
      error: err instanceof Error ? err.message : String(err),
    });
    return withVersionHeader(apiErrorResponse(E_INTERNAL, 'Internal error', 500, requestId));
  }
}
