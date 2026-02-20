/**
 * BullMQ Queue instances and job type definitions.
 *
 * Provides typed queue wrappers for:
 * - Email delivery (order confirmation, password reset)
 * - Loyalty points (award after order completion)
 * - Cleanup (expire stale stock reservations)
 *
 * Each queue uses the shared Redis connection with standard retry policy.
 */

import { Queue } from 'bullmq';
import {
  getBullMQConnection,
  QUEUE_NAMES,
  DEFAULT_JOB_OPTIONS,
  DLQ_NAME,
} from './connection';
import { logger } from '@/lib/logger';

// ─── Job Data Types ─────────────────────────────────────────

export interface EmailJobData {
  type: 'order_confirmation' | 'password_reset' | 'welcome' | 'gift_card';
  to: string;
  subject: string;
  templateData: Record<string, unknown>;
}

export interface LoyaltyJobData {
  userId: string;
  orderId: string;
  orderTotal: number;
  /** Points to award (calculated by caller) */
  points: number;
}

export interface CleanupJobData {
  /** Max age of reservation in minutes before expiry */
  maxAgeMinutes: number;
}

// ─── Queue Instances (lazy-initialized) ─────────────────────

let _emailQueue: Queue<EmailJobData> | null = null;
let _loyaltyQueue: Queue<LoyaltyJobData> | null = null;
let _cleanupQueue: Queue<CleanupJobData> | null = null;
let _dlq: Queue | null = null;

function getQueue<T>(
  name: string,
  ref: Queue<T> | null,
): Queue<T> | null {
  if (ref) return ref;

  const connection = getBullMQConnection();
  if (!connection) return null;

  return new Queue<T>(name, {
    connection,
    defaultJobOptions: DEFAULT_JOB_OPTIONS,
  });
}

export function getEmailQueue(): Queue<EmailJobData> | null {
  _emailQueue = getQueue(QUEUE_NAMES.EMAIL, _emailQueue);
  return _emailQueue;
}

export function getLoyaltyQueue(): Queue<LoyaltyJobData> | null {
  _loyaltyQueue = getQueue(QUEUE_NAMES.LOYALTY, _loyaltyQueue);
  return _loyaltyQueue;
}

export function getCleanupQueue(): Queue<CleanupJobData> | null {
  _cleanupQueue = getQueue(QUEUE_NAMES.CLEANUP, _cleanupQueue);
  return _cleanupQueue;
}

export function getDLQ(): Queue | null {
  if (_dlq) return _dlq;

  const connection = getBullMQConnection();
  if (!connection) return null;

  _dlq = new Queue(DLQ_NAME, { connection });
  return _dlq;
}

// ─── Job Enqueue Helpers ────────────────────────────────────

/**
 * Enqueue an email delivery job.
 * Returns the job ID or null if the queue is unavailable.
 */
export async function enqueueEmail(data: EmailJobData): Promise<string | null> {
  const queue = getEmailQueue();
  if (!queue) {
    logger.warn('queue.email.unavailable', { to: data.to, type: data.type });
    return null;
  }

  const job = await queue.add(`email:${data.type}`, data, {
    priority: data.type === 'password_reset' ? 1 : 5,
  });
  logger.info('queue.email.enqueued', { jobId: job.id, type: data.type, to: data.to });
  return job.id ?? null;
}

/**
 * Enqueue a loyalty points award job.
 */
export async function enqueueLoyaltyPoints(data: LoyaltyJobData): Promise<string | null> {
  const queue = getLoyaltyQueue();
  if (!queue) {
    logger.warn('queue.loyalty.unavailable', { userId: data.userId });
    return null;
  }

  const job = await queue.add('loyalty:award', data);
  logger.info('queue.loyalty.enqueued', { jobId: job.id, userId: data.userId, points: data.points });
  return job.id ?? null;
}

/**
 * Enqueue a stock reservation cleanup job.
 * Typically called by a cron trigger every 5 minutes.
 */
export async function enqueueCleanup(maxAgeMinutes = 30): Promise<string | null> {
  const queue = getCleanupQueue();
  if (!queue) {
    logger.warn('queue.cleanup.unavailable');
    return null;
  }

  const job = await queue.add('cleanup:reservations', { maxAgeMinutes }, {
    // Deduplicate: only one cleanup job at a time
    jobId: 'cleanup-reservations-singleton',
  });
  logger.info('queue.cleanup.enqueued', { jobId: job.id, maxAgeMinutes });
  return job.id ?? null;
}
