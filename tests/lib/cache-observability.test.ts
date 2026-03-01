/**
 * Cache Observability Tests.
 *
 * Tests:
 * - Hit/miss recording and rates
 * - Eviction tracking
 * - Stale serve tracking
 * - Summary computation
 * - Key prefix extraction
 * - Flush to logger
 * - Reset
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CacheObserver } from '@/lib/cache-observability';

vi.mock('@/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    metric: vi.fn(),
  },
}));

let observer: CacheObserver;

beforeEach(() => {
  observer = new CacheObserver();
});

describe('CacheObserver', () => {
  describe('recordHit / recordMiss', () => {
    it('tracks hits and misses per prefix', () => {
      observer.recordHit('products:all');
      observer.recordHit('products:featured');
      observer.recordMiss('products:new');

      const m = observer.getKeyMetrics('products');
      expect(m).not.toBeNull();
      expect(m!.hits).toBe(2);
      expect(m!.misses).toBe(1);
    });

    it('tracks latency', () => {
      observer.recordHit('admin:user1', 5);
      observer.recordHit('admin:user2', 10);

      const m = observer.getKeyMetrics('admin');
      expect(m!.totalLatencyMs).toBe(15);
      expect(m!.operationCount).toBe(2);
    });
  });

  describe('getHitRate', () => {
    it('returns correct hit rate', () => {
      observer.recordHit('products:a');
      observer.recordHit('products:b');
      observer.recordHit('products:c');
      observer.recordMiss('products:d');

      expect(observer.getHitRate('products')).toBe(0.75);
    });

    it('returns 0 for unknown prefix', () => {
      expect(observer.getHitRate('nonexistent')).toBe(0);
    });
  });

  describe('recordEviction', () => {
    it('tracks evictions', () => {
      observer.recordEviction('products:stale');
      observer.recordEviction('products:old');

      const m = observer.getKeyMetrics('products');
      expect(m!.evictions).toBe(2);
    });
  });

  describe('recordStaleServe', () => {
    it('tracks stale serves', () => {
      observer.recordStaleServe('products:fallback');

      const m = observer.getKeyMetrics('products');
      expect(m!.staleServes).toBe(1);
    });
  });

  describe('getSummary', () => {
    it('computes global metrics', () => {
      observer.recordHit('products:a', 5);
      observer.recordMiss('products:b', 10);
      observer.recordHit('admin:user1', 3);

      const summary = observer.getSummary();
      expect(summary.globalHitRate).toBeCloseTo(2 / 3);
      expect(summary.globalMissRate).toBeCloseTo(1 / 3);
      expect(summary.totalOperations).toBe(3);
      expect(summary.avgLatencyMs).toBe(6);
    });

    it('returns zeros when empty', () => {
      const summary = observer.getSummary();
      expect(summary.globalHitRate).toBe(0);
      expect(summary.globalMissRate).toBe(0);
      expect(summary.totalOperations).toBe(0);
    });
  });

  describe('flush', () => {
    it('logs metrics via logger.metric', async () => {
      const { logger } = await import('@/lib/logger');

      observer.recordHit('products:a');
      observer.recordMiss('products:b');
      observer.flush();

      expect(logger.metric).toHaveBeenCalledWith(
        'cache.hit_rate',
        0.5,
        expect.objectContaining({ totalOperations: 2 }),
      );
    });
  });

  describe('reset', () => {
    it('clears all metrics', () => {
      observer.recordHit('products:a');
      observer.recordMiss('admin:b');

      observer.reset();

      const summary = observer.getSummary();
      expect(summary.totalOperations).toBe(0);
      expect(Object.keys(summary.keys)).toHaveLength(0);
    });
  });

  describe('prefix extraction', () => {
    it('extracts prefix before colon', () => {
      observer.recordHit('products:all');
      expect(observer.getKeyMetrics('products')).not.toBeNull();
    });

    it('uses full key when no colon', () => {
      observer.recordHit('standalone');
      expect(observer.getKeyMetrics('standalone')).not.toBeNull();
    });
  });
});
