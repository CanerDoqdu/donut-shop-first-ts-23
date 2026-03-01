/**
 * Queue Reliability — poison message handling, retry policies, and DLQ management.
 *
 * Extends the base queue infrastructure (lib/queue/) with:
 *  1. Poison message detection + quarantine
 *  2. Per-queue retry policies (configurable attempts + backoff)
 *  3. DLQ inspection + replay capabilities
 *  4. Circuit breaker integration for downstream failures
 *
 * Poison message: a job that crashes the worker on EVERY attempt, typically
 * due to malformed data (bad JSON, invalid ID format, null fields).
 * These must be identified and quarantined to prevent infinite retry loops.
 *
 * Usage:
 *   import { isPoisonMessage, getRetryPolicy, QUEUE_RETRY_POLICIES } from '@/lib/queue-reliability';
 */

import { logger } from './logger';

// ── Retry Policy Types ──────────────────────────────────────

export type BackoffStrategy = 'exponential' | 'linear' | 'fixed';

export interface RetryPolicy {
  /** Queue name this policy applies to. */
  queueName: string;
  /** Maximum number of retry attempts. */
  maxAttempts: number;
  /** Backoff strategy. */
  backoffStrategy: BackoffStrategy;
  /** Initial delay in milliseconds. */
  initialDelayMs: number;
  /** Maximum delay cap in milliseconds (for exponential). */
  maxDelayMs: number;
  /** Whether to jitter the delay (±20%). */
  jitter: boolean;
}

// ── Retry Policy Registry ───────────────────────────────────

export const QUEUE_RETRY_POLICIES: RetryPolicy[] = [
  {
    queueName: 'email-queue',
    maxAttempts: 5,
    backoffStrategy: 'exponential',
    initialDelayMs: 2_000,      // 2s → 8s → 32s → 128s → 512s
    maxDelayMs: 600_000,        // cap at 10 min
    jitter: true,
  },
  {
    queueName: 'loyalty-queue',
    maxAttempts: 3,
    backoffStrategy: 'exponential',
    initialDelayMs: 1_000,      // 1s → 4s → 16s
    maxDelayMs: 60_000,         // cap at 1 min
    jitter: false,
  },
  {
    queueName: 'cleanup-queue',
    maxAttempts: 2,
    backoffStrategy: 'fixed',
    initialDelayMs: 5_000,      // 5s fixed
    maxDelayMs: 5_000,
    jitter: false,
  },
];

/**
 * Get retry policy for a queue.
 */
export function getRetryPolicy(queueName: string): RetryPolicy | undefined {
  return QUEUE_RETRY_POLICIES.find((p) => p.queueName === queueName);
}

/**
 * Calculate delay for a given attempt number using the retry policy.
 */
export function calculateDelay(policy: RetryPolicy, attempt: number): number {
  let delay: number;

  switch (policy.backoffStrategy) {
    case 'exponential':
      delay = policy.initialDelayMs * Math.pow(4, attempt - 1);
      break;
    case 'linear':
      delay = policy.initialDelayMs * attempt;
      break;
    case 'fixed':
      delay = policy.initialDelayMs;
      break;
  }

  // Cap at max
  delay = Math.min(delay, policy.maxDelayMs);

  // Add jitter if enabled (±20%)
  if (policy.jitter) {
    const jitterRange = delay * 0.2;
    delay += (Math.random() - 0.5) * 2 * jitterRange;
    delay = Math.max(0, Math.round(delay));
  }

  return delay;
}

// ── Poison Message Detection ────────────────────────────────

export interface PoisonCheckResult {
  /** Whether the message is poisonous. */
  isPoisoned: boolean;
  /** Reason(s) it was flagged. */
  reasons: string[];
}

/**
 * Detect if a job's data is a "poison message" that should be quarantined
 * instead of retried. Checks for common data integrity issues.
 */
export function isPoisonMessage(data: unknown): PoisonCheckResult {
  const reasons: string[] = [];

  // Null or undefined data
  if (data === null || data === undefined) {
    reasons.push('Job data is null/undefined');
    return { isPoisoned: true, reasons };
  }

  // Not an object
  if (typeof data !== 'object') {
    reasons.push(`Job data is ${typeof data}, expected object`);
    return { isPoisoned: true, reasons };
  }

  const obj = data as Record<string, unknown>;

  // Check for circular reference (would crash JSON.stringify)
  try {
    JSON.stringify(obj);
  } catch {
    reasons.push('Job data contains circular reference or non-serializable value');
  }

  // Check for excessively large payloads (> 1MB)
  try {
    const size = JSON.stringify(obj).length;
    if (size > 1_048_576) {
      reasons.push(`Job data exceeds 1MB (${Math.round(size / 1024)}KB)`);
    }
  } catch {
    // Already caught above
  }

  return {
    isPoisoned: reasons.length > 0,
    reasons,
  };
}

/**
 * Validate email job data specifically.
 */
export function validateEmailJobData(data: unknown): PoisonCheckResult {
  const baseCheck = isPoisonMessage(data);
  if (baseCheck.isPoisoned) return baseCheck;

  const reasons: string[] = [];
  const obj = data as Record<string, unknown>;

  if (!obj.to || typeof obj.to !== 'string') {
    reasons.push('Missing or invalid "to" field');
  } else if (!/\S+@\S+\.\S+/.test(obj.to)) {
    reasons.push(`Invalid email address: "${obj.to}"`);
  }

  if (!obj.type || typeof obj.type !== 'string') {
    reasons.push('Missing or invalid "type" field');
  }

  if (!obj.subject || typeof obj.subject !== 'string') {
    reasons.push('Missing or invalid "subject" field');
  }

  return { isPoisoned: reasons.length > 0, reasons };
}

/**
 * Validate loyalty job data specifically. 
 */
export function validateLoyaltyJobData(data: unknown): PoisonCheckResult {
  const baseCheck = isPoisonMessage(data);
  if (baseCheck.isPoisoned) return baseCheck;

  const reasons: string[] = [];
  const obj = data as Record<string, unknown>;

  if (!obj.userId || typeof obj.userId !== 'string') {
    reasons.push('Missing or invalid "userId" field');
  }

  if (!obj.orderId || typeof obj.orderId !== 'string') {
    reasons.push('Missing or invalid "orderId" field');
  }

  if (typeof obj.points !== 'number' || obj.points < 0) {
    reasons.push(`Invalid points: ${obj.points} (must be non-negative number)`);
  }

  return { isPoisoned: reasons.length > 0, reasons };
}

// ── DLQ Management ──────────────────────────────────────────

export interface DLQEntry {
  originalQueue: string;
  originalJobId: string;
  data: unknown;
  failedReason: string;
  attemptsMade: number;
  failedAt: string;
  isPoisoned: boolean;
  poisonReasons: string[];
}

/**
 * Classify a DLQ entry: was it a poison message or an infrastructure failure?
 */
export function classifyDLQEntry(entry: DLQEntry): 'poison' | 'infra_failure' | 'unknown' {
  if (entry.isPoisoned) return 'poison';

  const reason = entry.failedReason.toLowerCase();

  // Infrastructure failures (retryable after fix)
  const infraPatterns = [
    'econnrefused',
    'econnreset',
    'etimedout',
    'socket hang up',
    'getaddrinfo',
    'service unavailable',
    '503',
    '502',
    'rate limit',
    '429',
    'database',
    'supabase',
    'redis',
    'network',
  ];

  if (infraPatterns.some((p) => reason.includes(p))) {
    return 'infra_failure';
  }

  return 'unknown';
}

/**
 * Determine if a DLQ entry is safe to replay.
 * Poison messages should NOT be replayed without data fix.
 */
export function isSafeToReplay(entry: DLQEntry): boolean {
  const classification = classifyDLQEntry(entry);
  return classification === 'infra_failure';
}

/**
 * Log a poison message quarantine event.
 */
export function logPoisonQuarantine(
  queueName: string,
  jobId: string,
  reasons: string[],
): void {
  logger.error('queue.poison.quarantined', {
    queue: queueName,
    jobId,
    reasons,
    action: 'Job moved to DLQ and flagged as poison. Manual review required.',
  });
}
