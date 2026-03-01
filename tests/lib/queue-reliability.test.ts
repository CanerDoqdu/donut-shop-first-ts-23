import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  QUEUE_RETRY_POLICIES,
  getRetryPolicy,
  calculateDelay,
  isPoisonMessage,
  validateEmailJobData,
  validateLoyaltyJobData,
  classifyDLQEntry,
  isSafeToReplay,
  logPoisonQuarantine,
  type DLQEntry,
  type RetryPolicy,
} from '@/lib/queue-reliability';

// ── Mock logger ──────────────────────────────────────────────
vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

// ── Retry Policy Registry ────────────────────────────────────

describe('Queue Retry Policies', () => {
  it('defines policies for all three queues', () => {
    const queueNames = QUEUE_RETRY_POLICIES.map((p) => p.queueName);
    expect(queueNames).toContain('email-queue');
    expect(queueNames).toContain('loyalty-queue');
    expect(queueNames).toContain('cleanup-queue');
  });

  it('email queue has the most retries (5)', () => {
    const email = getRetryPolicy('email-queue');
    expect(email?.maxAttempts).toBe(5);
  });

  it('cleanup queue has fewest retries (2)', () => {
    const cleanup = getRetryPolicy('cleanup-queue');
    expect(cleanup?.maxAttempts).toBe(2);
  });

  it('returns undefined for unknown queue', () => {
    expect(getRetryPolicy('nonexistent-queue')).toBeUndefined();
  });

  it('all policies have positive initial delay', () => {
    for (const p of QUEUE_RETRY_POLICIES) {
      expect(p.initialDelayMs).toBeGreaterThan(0);
    }
  });

  it('max delay >= initial delay for all policies', () => {
    for (const p of QUEUE_RETRY_POLICIES) {
      expect(p.maxDelayMs).toBeGreaterThanOrEqual(p.initialDelayMs);
    }
  });
});

// ── Delay Calculation ────────────────────────────────────────

describe('calculateDelay', () => {
  it('exponential: doubles base on each attempt (factor 4)', () => {
    const policy: RetryPolicy = {
      queueName: 'test',
      maxAttempts: 5,
      backoffStrategy: 'exponential',
      initialDelayMs: 1000,
      maxDelayMs: 1_000_000,
      jitter: false,
    };
    expect(calculateDelay(policy, 1)).toBe(1_000);   // 1000 * 4^0
    expect(calculateDelay(policy, 2)).toBe(4_000);   // 1000 * 4^1
    expect(calculateDelay(policy, 3)).toBe(16_000);  // 1000 * 4^2
  });

  it('exponential: caps at maxDelayMs', () => {
    const policy: RetryPolicy = {
      queueName: 'test',
      maxAttempts: 10,
      backoffStrategy: 'exponential',
      initialDelayMs: 1000,
      maxDelayMs: 5_000,
      jitter: false,
    };
    expect(calculateDelay(policy, 5)).toBe(5_000);
  });

  it('linear: scales linearly with attempt', () => {
    const policy: RetryPolicy = {
      queueName: 'test',
      maxAttempts: 5,
      backoffStrategy: 'linear',
      initialDelayMs: 2_000,
      maxDelayMs: 100_000,
      jitter: false,
    };
    expect(calculateDelay(policy, 1)).toBe(2_000);
    expect(calculateDelay(policy, 3)).toBe(6_000);
  });

  it('fixed: returns same delay regardless of attempt', () => {
    const policy: RetryPolicy = {
      queueName: 'test',
      maxAttempts: 3,
      backoffStrategy: 'fixed',
      initialDelayMs: 5_000,
      maxDelayMs: 5_000,
      jitter: false,
    };
    expect(calculateDelay(policy, 1)).toBe(5_000);
    expect(calculateDelay(policy, 3)).toBe(5_000);
  });

  it('jitter: delay varies within ±20%', () => {
    const policy: RetryPolicy = {
      queueName: 'test',
      maxAttempts: 3,
      backoffStrategy: 'fixed',
      initialDelayMs: 10_000,
      maxDelayMs: 10_000,
      jitter: true,
    };
    // Run 100 times and check bounds
    const delays = Array.from({ length: 100 }, () => calculateDelay(policy, 1));
    const min = Math.min(...delays);
    const max = Math.max(...delays);
    expect(min).toBeGreaterThanOrEqual(8_000);
    expect(max).toBeLessThanOrEqual(12_000);
    // Should have some variance
    const unique = new Set(delays).size;
    expect(unique).toBeGreaterThan(1);
  });
});

// ── Poison Message Detection ─────────────────────────────────

describe('isPoisonMessage', () => {
  it('flags null data', () => {
    const result = isPoisonMessage(null);
    expect(result.isPoisoned).toBe(true);
    expect(result.reasons).toContain('Job data is null/undefined');
  });

  it('flags undefined data', () => {
    const result = isPoisonMessage(undefined);
    expect(result.isPoisoned).toBe(true);
  });

  it('flags non-object data', () => {
    const result = isPoisonMessage('just a string');
    expect(result.isPoisoned).toBe(true);
    expect(result.reasons[0]).toMatch(/expected object/);
  });

  it('accepts valid object data', () => {
    const result = isPoisonMessage({ to: 'a@b.com', subject: 'hi' });
    expect(result.isPoisoned).toBe(false);
    expect(result.reasons).toHaveLength(0);
  });

  it('flags oversized payloads (> 1MB)', () => {
    const bigData = { payload: 'x'.repeat(1_100_000) };
    const result = isPoisonMessage(bigData);
    expect(result.isPoisoned).toBe(true);
    expect(result.reasons[0]).toMatch(/exceeds 1MB/);
  });
});

// ── Email Job Validation ─────────────────────────────────────

describe('validateEmailJobData', () => {
  it('accepts valid email job', () => {
    const result = validateEmailJobData({
      to: 'user@example.com',
      type: 'order_confirmation',
      subject: 'Your order is confirmed',
    });
    expect(result.isPoisoned).toBe(false);
  });

  it('rejects missing "to"', () => {
    const result = validateEmailJobData({ type: 'test', subject: 'hi' });
    expect(result.isPoisoned).toBe(true);
    expect(result.reasons).toContain('Missing or invalid "to" field');
  });

  it('rejects invalid email format', () => {
    const result = validateEmailJobData({
      to: 'not-an-email',
      type: 'test',
      subject: 'hi',
    });
    expect(result.isPoisoned).toBe(true);
    expect(result.reasons[0]).toMatch(/Invalid email address/);
  });

  it('rejects missing "type"', () => {
    const result = validateEmailJobData({
      to: 'a@b.com',
      subject: 'hi',
    });
    expect(result.isPoisoned).toBe(true);
  });

  it('delegates to base check for null', () => {
    const result = validateEmailJobData(null);
    expect(result.isPoisoned).toBe(true);
    expect(result.reasons).toContain('Job data is null/undefined');
  });
});

// ── Loyalty Job Validation ───────────────────────────────────

describe('validateLoyaltyJobData', () => {
  it('accepts valid loyalty job', () => {
    const result = validateLoyaltyJobData({
      userId: 'usr_123',
      orderId: 'ord_456',
      points: 100,
    });
    expect(result.isPoisoned).toBe(false);
  });

  it('rejects missing userId', () => {
    const result = validateLoyaltyJobData({
      orderId: 'ord_456',
      points: 100,
    });
    expect(result.isPoisoned).toBe(true);
  });

  it('rejects negative points', () => {
    const result = validateLoyaltyJobData({
      userId: 'usr_123',
      orderId: 'ord_456',
      points: -10,
    });
    expect(result.isPoisoned).toBe(true);
    expect(result.reasons[0]).toMatch(/Invalid points/);
  });
});

// ── DLQ Classification ───────────────────────────────────────

describe('classifyDLQEntry', () => {
  function makeDLQEntry(overrides: Partial<DLQEntry> = {}): DLQEntry {
    return {
      originalQueue: 'email-queue',
      originalJobId: 'job-1',
      data: {},
      failedReason: 'Unknown error',
      attemptsMade: 3,
      failedAt: new Date().toISOString(),
      isPoisoned: false,
      poisonReasons: [],
      ...overrides,
    };
  }

  it('classifies poisoned entries as "poison"', () => {
    const entry = makeDLQEntry({ isPoisoned: true, poisonReasons: ['null data'] });
    expect(classifyDLQEntry(entry)).toBe('poison');
  });

  it('classifies ECONNREFUSED as "infra_failure"', () => {
    const entry = makeDLQEntry({ failedReason: 'connect ECONNREFUSED 127.0.0.1:5432' });
    expect(classifyDLQEntry(entry)).toBe('infra_failure');
  });

  it('classifies ETIMEDOUT as "infra_failure"', () => {
    const entry = makeDLQEntry({ failedReason: 'Request ETIMEDOUT after 30s' });
    expect(classifyDLQEntry(entry)).toBe('infra_failure');
  });

  it('classifies 503 as "infra_failure"', () => {
    const entry = makeDLQEntry({ failedReason: 'HTTP 503 Service Unavailable' });
    expect(classifyDLQEntry(entry)).toBe('infra_failure');
  });

  it('classifies 429 rate limit as "infra_failure"', () => {
    const entry = makeDLQEntry({ failedReason: 'HTTP 429 rate limit exceeded' });
    expect(classifyDLQEntry(entry)).toBe('infra_failure');
  });

  it('classifies unrecognized errors as "unknown"', () => {
    const entry = makeDLQEntry({ failedReason: 'TypeError: Cannot read property x' });
    expect(classifyDLQEntry(entry)).toBe('unknown');
  });
});

// ── Replay Safety ────────────────────────────────────────────

describe('isSafeToReplay', () => {
  function makeDLQEntry(overrides: Partial<DLQEntry> = {}): DLQEntry {
    return {
      originalQueue: 'email-queue',
      originalJobId: 'job-1',
      data: {},
      failedReason: 'Unknown error',
      attemptsMade: 3,
      failedAt: new Date().toISOString(),
      isPoisoned: false,
      poisonReasons: [],
      ...overrides,
    };
  }

  it('allows replay for infra_failure', () => {
    const entry = makeDLQEntry({ failedReason: 'ECONNREFUSED' });
    expect(isSafeToReplay(entry)).toBe(true);
  });

  it('blocks replay for poison', () => {
    const entry = makeDLQEntry({ isPoisoned: true });
    expect(isSafeToReplay(entry)).toBe(false);
  });

  it('blocks replay for unknown', () => {
    const entry = makeDLQEntry({ failedReason: 'TypeError: undefined is not a function' });
    expect(isSafeToReplay(entry)).toBe(false);
  });
});

// ── Logging ──────────────────────────────────────────────────

describe('logPoisonQuarantine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('logs error with structured fields', async () => {
    const { logger } = await import('@/lib/logger');

    logPoisonQuarantine('email-queue', 'job-42', ['Invalid email address']);

    expect(logger.error).toHaveBeenCalledWith(
      'queue.poison.quarantined',
      expect.objectContaining({
        queue: 'email-queue',
        jobId: 'job-42',
        reasons: ['Invalid email address'],
        action: expect.stringContaining('Manual review'),
      }),
    );
  });
});
