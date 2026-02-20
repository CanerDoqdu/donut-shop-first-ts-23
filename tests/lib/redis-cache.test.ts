import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mock the Redis client directly ────────────────────────

const mockGet = vi.fn();
const mockSet = vi.fn();
const mockDel = vi.fn();
const mockScan = vi.fn();

const fakeRedis = {
  get: mockGet,
  set: mockSet,
  del: mockDel,
  scan: mockScan,
};

vi.mock('@/lib/redis/client', () => ({
  getRedis: () => fakeRedis,
  isRedisAvailable: () => true,
}));

import { cache, CACHE_TTL } from '@/lib/redis/cache';

describe('Redis Cache', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('get', () => {
    it('returns cached value on hit', async () => {
      mockGet.mockResolvedValueOnce({ id: 'p1', name: 'Donut' });

      const result = await cache.get('products:all');
      expect(result).toEqual({ id: 'p1', name: 'Donut' });
    });

    it('returns null on cache miss', async () => {
      mockGet.mockResolvedValueOnce(null);

      const result = await cache.get('products:nonexistent');
      expect(result).toBeNull();
    });

    it('returns null on Redis error (graceful degradation)', async () => {
      mockGet.mockRejectedValueOnce(new Error('Connection refused'));

      const result = await cache.get('products:all');
      expect(result).toBeNull();
    });
  });

  describe('set', () => {
    it('sets value with TTL', async () => {
      mockSet.mockResolvedValueOnce('OK');

      await cache.set('products:all', { data: true }, 3600);
      expect(mockSet).toHaveBeenCalledWith(
        'donut:cache:products:all',
        { data: true },
        { ex: 3600 },
      );
    });

    it('does not throw on set error', async () => {
      mockSet.mockRejectedValueOnce(new Error('Write failed'));

      await expect(cache.set('key', 'val')).resolves.not.toThrow();
    });
  });

  describe('del', () => {
    it('deletes a cache key', async () => {
      mockDel.mockResolvedValueOnce(1);

      await cache.del('products:all');
      expect(mockDel).toHaveBeenCalledWith('donut:cache:products:all');
    });
  });

  describe('getOrSet', () => {
    it('returns cached value without calling fn', async () => {
      mockGet.mockResolvedValueOnce('cached-data');
      const fn = vi.fn().mockResolvedValue('fresh-data');

      const result = await cache.getOrSet('key', fn, 300);
      expect(result).toBe('cached-data');
      expect(fn).not.toHaveBeenCalled();
    });

    it('calls fn and caches result on miss', async () => {
      mockGet.mockResolvedValueOnce(null);
      mockSet.mockResolvedValueOnce('OK');
      const fn = vi.fn().mockResolvedValue('fresh-data');

      const result = await cache.getOrSet('key', fn, 300);
      expect(result).toBe('fresh-data');
      expect(fn).toHaveBeenCalledOnce();
      expect(mockSet).toHaveBeenCalled();
    });
  });

  describe('invalidatePrefix', () => {
    it('deletes all keys matching prefix', async () => {
      mockScan.mockResolvedValueOnce([0, ['donut:cache:products:1', 'donut:cache:products:2']]);
      mockDel.mockResolvedValue(1);

      const count = await cache.invalidatePrefix('products:');
      expect(count).toBe(2);
    });

    it('handles empty scan result', async () => {
      mockScan.mockResolvedValueOnce([0, []]);

      const count = await cache.invalidatePrefix('nonexistent:');
      expect(count).toBe(0);
    });
  });

  describe('CACHE_TTL constants', () => {
    it('has reasonable TTL values', () => {
      expect(CACHE_TTL.PRODUCTS).toBe(3600);     // 1 hour
      expect(CACHE_TTL.PRODUCT).toBe(1800);      // 30 min
      expect(CACHE_TTL.PROMO).toBe(300);          // 5 min
      expect(CACHE_TTL.STORES).toBe(86400);       // 24 hours
      expect(CACHE_TTL.SEARCH).toBe(600);         // 10 min
    });
  });
});
