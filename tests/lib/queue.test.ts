import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mock bullmq ────────────────────────────────────────────

const mockAdd = vi.fn().mockResolvedValue({ id: 'job-123' });

vi.mock('bullmq', () => {
  const add = (...args: unknown[]) => mockAdd(...args);
  return {
    Queue: class {
      add = add;
      getJobCounts = vi.fn();
      close = vi.fn();
    },
    Worker: class {
      on = vi.fn();
      close = vi.fn().mockResolvedValue(undefined);
    },
  };
});

// Mock connection
vi.stubEnv('REDIS_URL', 'redis://localhost:6379');

import {
  enqueueEmail,
  enqueueLoyaltyPoints,
  enqueueCleanup,
  QUEUE_NAMES,
  DEFAULT_JOB_OPTIONS,
  DLQ_NAME,
} from '@/lib/queue';

describe('BullMQ Queues', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Queue Names', () => {
    it('defines expected queue names', () => {
      expect(QUEUE_NAMES.EMAIL).toBe('email-queue');
      expect(QUEUE_NAMES.LOYALTY).toBe('loyalty-queue');
      expect(QUEUE_NAMES.CLEANUP).toBe('cleanup-queue');
    });

    it('has a DLQ name', () => {
      expect(DLQ_NAME).toBe('dead-letter-queue');
    });
  });

  describe('Default Job Options', () => {
    it('has 3 retry attempts', () => {
      expect(DEFAULT_JOB_OPTIONS.attempts).toBe(3);
    });

    it('uses exponential backoff starting at 1s', () => {
      expect(DEFAULT_JOB_OPTIONS.backoff.type).toBe('exponential');
      expect(DEFAULT_JOB_OPTIONS.backoff.delay).toBe(1000);
    });

    it('keeps failed jobs for DLQ inspection', () => {
      expect(DEFAULT_JOB_OPTIONS.removeOnFail).toBe(false);
    });
  });

  describe('enqueueEmail', () => {
    it('enqueues an email job with priority', async () => {
      const jobId = await enqueueEmail({
        type: 'order_confirmation',
        to: 'user@example.com',
        subject: 'Order Confirmed!',
        templateData: { orderId: 'ord-1', total: 24.99 },
      });

      expect(jobId).toBe('job-123');
      expect(mockAdd).toHaveBeenCalledWith(
        'email:order_confirmation',
        expect.objectContaining({ to: 'user@example.com', type: 'order_confirmation' }),
        expect.objectContaining({ priority: 5 }),
      );
    });

    it('gives password_reset emails higher priority', async () => {
      await enqueueEmail({
        type: 'password_reset',
        to: 'user@example.com',
        subject: 'Reset Password',
        templateData: { resetUrl: 'https://...' },
      });

      expect(mockAdd).toHaveBeenCalledWith(
        'email:password_reset',
        expect.anything(),
        expect.objectContaining({ priority: 1 }),
      );
    });
  });

  describe('enqueueLoyaltyPoints', () => {
    it('enqueues a loyalty points job', async () => {
      const jobId = await enqueueLoyaltyPoints({
        userId: 'user-1',
        orderId: 'ord-1',
        orderTotal: 49.99,
        points: 50,
      });

      expect(jobId).toBe('job-123');
      expect(mockAdd).toHaveBeenCalledWith(
        'loyalty:award',
        expect.objectContaining({ userId: 'user-1', points: 50 }),
      );
    });
  });

  describe('enqueueCleanup', () => {
    it('enqueues a cleanup job with singleton ID', async () => {
      const jobId = await enqueueCleanup(30);

      expect(jobId).toBe('job-123');
      expect(mockAdd).toHaveBeenCalledWith(
        'cleanup:reservations',
        { maxAgeMinutes: 30 },
        expect.objectContaining({ jobId: 'cleanup-reservations-singleton' }),
      );
    });

    it('defaults to 30 minutes max age', async () => {
      await enqueueCleanup();

      expect(mockAdd).toHaveBeenCalledWith(
        'cleanup:reservations',
        { maxAgeMinutes: 30 },
        expect.anything(),
      );
    });
  });
});
