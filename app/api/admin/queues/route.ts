/**
 * Queue health / status endpoint (admin only).
 *
 * GET /api/admin/queues
 *
 * Returns job counts for each queue: waiting, active, completed, failed, delayed.
 * Useful for monitoring dashboards and debugging.
 */

import { NextResponse } from 'next/server';
import { getEmailQueue, getLoyaltyQueue, getCleanupQueue, getDLQ } from '@/lib/queue';
import { logger } from '@/lib/logger';
import type { Queue } from 'bullmq';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getQueueStats(name: string, getQueue: () => Queue<any> | null) {
  const queue = getQueue();
  if (!queue) return { name, status: 'unavailable' };

  try {
    const counts = await queue.getJobCounts(
      'waiting',
      'active',
      'completed',
      'failed',
      'delayed',
    );
    return { name, status: 'ok', counts };
  } catch (err) {
    return {
      name,
      status: 'error',
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function GET(req: Request): Promise<NextResponse> {
  // Simple auth check — in production use proper admin middleware
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.ADMIN_API_KEY}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const [email, loyalty, cleanup, dlq] = await Promise.all([
      getQueueStats('email-queue', getEmailQueue),
      getQueueStats('loyalty-queue', getLoyaltyQueue),
      getQueueStats('cleanup-queue', getCleanupQueue),
      getQueueStats('dead-letter-queue', getDLQ),
    ]);

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      queues: { email, loyalty, cleanup, dlq },
    });
  } catch (err) {
    logger.error('admin.queues.error', {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
