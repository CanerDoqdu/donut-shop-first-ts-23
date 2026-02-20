/**
 * BullMQ Workers — process jobs from queues.
 *
 * Workers are long-lived processes. In production, run them via:
 *   node --import tsx scripts/start-workers.ts
 *
 * Or trigger processing from a cron-invoked API route for serverless.
 *
 * Each worker:
 * 1. Processes its job type
 * 2. On final failure (exhausted retries) → moves to DLQ
 * 3. Logs structured output for observability
 */

import { Worker, Job } from 'bullmq';
import {
  getBullMQConnection,
  QUEUE_NAMES,
  DLQ_NAME,
} from './connection';
import type { EmailJobData, LoyaltyJobData, CleanupJobData } from './queues';
import { logger } from '@/lib/logger';

// ─── DLQ Helper ─────────────────────────────────────────────

async function moveToDLQ(job: Job, error: Error): Promise<void> {
  const connection = getBullMQConnection();
  if (!connection) return;

  // We import Queue dynamically to avoid circular deps
  const { Queue } = await import('bullmq');
  const dlq = new Queue(DLQ_NAME, { connection });

  await dlq.add('dead-letter', {
    originalQueue: job.queueName,
    originalJobId: job.id,
    originalJobName: job.name,
    data: job.data,
    failedReason: error.message,
    stackTrace: error.stack,
    attemptsMade: job.attemptsMade,
    failedAt: new Date().toISOString(),
  });

  logger.error('dlq.moved', {
    queue: job.queueName,
    jobId: job.id,
    reason: error.message,
    attempts: job.attemptsMade,
  });

  await dlq.close();
}

// ─── Email Worker ───────────────────────────────────────────

async function processEmail(job: Job<EmailJobData>): Promise<void> {
  const { type, to, subject, templateData } = job.data;

  logger.info('worker.email.processing', {
    jobId: job.id,
    type,
    to,
    attempt: job.attemptsMade + 1,
  });

  // In production, this would call the Resend API
  // For now, we simulate the email delivery
  const { Resend } = await import('resend');
  const resend = new Resend(process.env.RESEND_API_KEY);

  const { error } = await resend.emails.send({
    from: process.env.EMAIL_FROM || 'Donut Shop <noreply@donutshop.com>',
    to,
    subject,
    html: `<pre>${JSON.stringify(templateData, null, 2)}</pre>`,
  });

  if (error) {
    throw new Error(`Resend error: ${error.message}`);
  }

  logger.info('worker.email.sent', { jobId: job.id, type, to });
}

// ─── Loyalty Worker ─────────────────────────────────────────

async function processLoyalty(job: Job<LoyaltyJobData>): Promise<void> {
  const { userId, orderId, points } = job.data;

  logger.info('worker.loyalty.processing', {
    jobId: job.id,
    userId,
    orderId,
    points,
    attempt: job.attemptsMade + 1,
  });

  // Award loyalty points via Supabase
  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // Upsert loyalty record: increment points
  const { error } = await supabase.rpc('award_loyalty_points', {
    p_user_id: userId,
    p_points: points,
    p_order_id: orderId,
  });

  if (error) {
    throw new Error(`Loyalty RPC error: ${error.message}`);
  }

  logger.info('worker.loyalty.awarded', { jobId: job.id, userId, points });
}

// ─── Cleanup Worker ─────────────────────────────────────────

async function processCleanup(job: Job<CleanupJobData>): Promise<void> {
  const { maxAgeMinutes } = job.data;

  logger.info('worker.cleanup.processing', {
    jobId: job.id,
    maxAgeMinutes,
  });

  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // Release stock reservations older than maxAgeMinutes
  const cutoff = new Date(Date.now() - maxAgeMinutes * 60_000).toISOString();

  const { data, error } = await supabase
    .from('stock_reservations')
    .update({ status: 'expired', released_at: new Date().toISOString() })
    .eq('status', 'reserved')
    .lt('created_at', cutoff)
    .select('id');

  if (error) {
    throw new Error(`Cleanup error: ${error.message}`);
  }

  logger.info('worker.cleanup.completed', {
    jobId: job.id,
    expiredCount: data?.length ?? 0,
  });
}

// ─── Worker Factory ─────────────────────────────────────────

export interface WorkerSet {
  emailWorker: Worker<EmailJobData>;
  loyaltyWorker: Worker<LoyaltyJobData>;
  cleanupWorker: Worker<CleanupJobData>;
  shutdown: () => Promise<void>;
}

/**
 * Start all BullMQ workers.
 * Returns a shutdown function for graceful termination.
 *
 * Each worker has an 'error' → DLQ handler for jobs that exhaust retries.
 */
export function startWorkers(): WorkerSet | null {
  const connection = getBullMQConnection();
  if (!connection) {
    logger.warn('workers.skipped', { message: 'No Redis connection — workers not started' });
    return null;
  }

  const emailWorker = new Worker<EmailJobData>(
    QUEUE_NAMES.EMAIL,
    processEmail,
    { connection, concurrency: 5 },
  );

  const loyaltyWorker = new Worker<LoyaltyJobData>(
    QUEUE_NAMES.LOYALTY,
    processLoyalty,
    { connection, concurrency: 3 },
  );

  const cleanupWorker = new Worker<CleanupJobData>(
    QUEUE_NAMES.CLEANUP,
    processCleanup,
    { connection, concurrency: 1 },
  );

  // ── DLQ on final failure ────────────────────────────────
  const addDLQHandler = (worker: Worker) => {
    worker.on('failed', async (job, error) => {
      if (job && job.attemptsMade >= (job.opts?.attempts ?? 3)) {
        await moveToDLQ(job, error);
      }
    });
  };

  addDLQHandler(emailWorker);
  addDLQHandler(loyaltyWorker);
  addDLQHandler(cleanupWorker);

  // ── Logging ─────────────────────────────────────────────
  const addLogging = (worker: Worker, name: string) => {
    worker.on('completed', (job) => {
      logger.info(`worker.${name}.completed`, { jobId: job?.id });
    });
    worker.on('failed', (job, error) => {
      logger.warn(`worker.${name}.failed`, {
        jobId: job?.id,
        error: error.message,
        attempt: job?.attemptsMade,
      });
    });
  };

  addLogging(emailWorker, 'email');
  addLogging(loyaltyWorker, 'loyalty');
  addLogging(cleanupWorker, 'cleanup');

  logger.info('workers.started', { queues: Object.values(QUEUE_NAMES) });

  const shutdown = async () => {
    logger.info('workers.shutting_down');
    await Promise.all([
      emailWorker.close(),
      loyaltyWorker.close(),
      cleanupWorker.close(),
    ]);
    logger.info('workers.stopped');
  };

  return { emailWorker, loyaltyWorker, cleanupWorker, shutdown };
}
