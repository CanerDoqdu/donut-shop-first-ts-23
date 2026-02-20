import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mock the Redis client directly ────────────────────────

const mockZremrangebyscore = vi.fn();
const mockZcard = vi.fn();
const mockZadd = vi.fn();
const mockZrange = vi.fn();
const mockExpire = vi.fn();

const fakeRedis = {
  zremrangebyscore: mockZremrangebyscore,
  zcard: mockZcard,
  zadd: mockZadd,
  zrange: mockZrange,
  expire: mockExpire,
};

vi.mock('@/lib/redis/client', () => ({
  getRedis: () => fakeRedis,
  isRedisAvailable: () => true,
}));

import { redisRateLimit } from '@/lib/redis/rate-limit';

describe('Redis Rate Limiter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockZremrangebyscore.mockResolvedValue(0);
    mockZadd.mockResolvedValue(1);
    mockExpire.mockResolvedValue(1);
  });

  it('allows requests under the limit', async () => {
    mockZcard.mockResolvedValue(3);

    const result = await redisRateLimit('user:1', { maxRequests: 10, windowSizeSeconds: 60 });
    expect(result.success).toBe(true);
    expect(result.remaining).toBe(6); // 10 - 3 - 1
  });

  it('blocks requests at the limit', async () => {
    mockZcard.mockResolvedValue(10);
    mockZrange.mockResolvedValue([]);

    const result = await redisRateLimit('user:1', { maxRequests: 10, windowSizeSeconds: 60 });
    expect(result.success).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('adds entry with current timestamp on success', async () => {
    mockZcard.mockResolvedValue(0);

    await redisRateLimit('user:1', { maxRequests: 10 });
    expect(mockZadd).toHaveBeenCalled();
  });

  it('sets expiry on the rate limit key', async () => {
    mockZcard.mockResolvedValue(0);

    await redisRateLimit('user:1', { maxRequests: 10, windowSizeSeconds: 60 });
    expect(mockExpire).toHaveBeenCalledWith(expect.stringContaining('donut:rl:'), 61);
  });

  it('prunes expired entries first', async () => {
    mockZcard.mockResolvedValue(0);

    await redisRateLimit('user:1', { maxRequests: 10, windowSizeSeconds: 60 });
    expect(mockZremrangebyscore).toHaveBeenCalled();
  });

  it('falls back to in-memory on Redis error', async () => {
    mockZremrangebyscore.mockRejectedValue(new Error('Connection lost'));

    const result = await redisRateLimit('fallback-user', { maxRequests: 100, windowSizeSeconds: 60 });
    // Should still return a result from in-memory fallback
    expect(result).toHaveProperty('success');
    expect(result).toHaveProperty('remaining');
    expect(result).toHaveProperty('reset');
  });

  it('uses default options when none provided', async () => {
    mockZcard.mockResolvedValue(0);

    const result = await redisRateLimit('user:default');
    expect(result.success).toBe(true);
    // Default: 10 max requests, 60s window → remaining = 10 - 0 - 1 = 9
    expect(result.remaining).toBe(9);
  });
});
