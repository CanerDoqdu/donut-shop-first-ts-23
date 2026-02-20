/**
 * BullMQ Redis connection configuration.
 *
 * BullMQ requires ioredis (TCP connection) — separate from Upstash (HTTP).
 * Uses REDIS_URL env var for the connection string.
 *
 * For local development:
 *   docker run -p 6379:6379 redis
 *   REDIS_URL=redis://localhost:6379
 *
 * For production:
 *   Use a managed Redis (Upstash with ioredis adapter, Railway, etc.)
 */

import type { ConnectionOptions } from 'bullmq';
import { logger } from '@/lib/logger';

export function getBullMQConnection(): ConnectionOptions | null {
  const url = process.env.REDIS_URL;

  if (!url) {
    logger.warn('bullmq.missing_env', {
      message: 'REDIS_URL not set — BullMQ job queues disabled',
    });
    return null;
  }

  // Parse Redis URL into connection options
  try {
    const parsed = new URL(url);
    return {
      host: parsed.hostname,
      port: parseInt(parsed.port || '6379', 10),
      password: parsed.password || undefined,
      username: parsed.username || undefined,
      ...(parsed.protocol === 'rediss:' ? { tls: {} } : {}),
    };
  } catch {
    logger.warn('bullmq.invalid_url', { message: 'Failed to parse REDIS_URL' });
    return null;
  }
}

// ─── Queue Names ────────────────────────────────────────────

export const QUEUE_NAMES = {
  EMAIL: 'email-queue',
  LOYALTY: 'loyalty-queue',
  CLEANUP: 'cleanup-queue',
} as const;

// ─── Retry Configuration ────────────────────────────────────

/** 3 attempts, exponential backoff: 1s → 4s → 16s */
export const DEFAULT_JOB_OPTIONS = {
  attempts: 3,
  backoff: {
    type: 'exponential' as const,
    delay: 1000, // 1s base delay → 4s → 16s
  },
  removeOnComplete: { count: 100, age: 86400 }, // Keep last 100 or 24 hours
  removeOnFail: false, // Keep failed jobs for DLQ inspection
};

// ─── Dead Letter Queue ──────────────────────────────────────

export const DLQ_NAME = 'dead-letter-queue';
