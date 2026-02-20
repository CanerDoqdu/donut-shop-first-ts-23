/**
 * Redis-backed sliding window rate limiter.
 *
 * Uses a sorted set per identifier to implement a precise sliding window.
 * Each request adds a timestamped entry; expired entries are pruned on check.
 *
 * Falls back to the in-memory rate limiter when Redis is unavailable.
 *
 * Algorithm:
 * 1. ZREMRANGEBYSCORE to remove entries older than the window
 * 2. ZCARD to count remaining entries
 * 3. If under limit → ZADD new entry + EXPIRE
 * 4. Return success/remaining/reset
 *
 * This is atomic per-request (not per-pipeline) but good enough
 * for our use case. For strict atomicity, use a Lua script.
 */

import { getRedis } from './client';
import { rateLimit as inMemoryRateLimit } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';

const RATE_LIMIT_PREFIX = 'donut:rl:';

export interface RateLimitOptions {
  /** Max requests per window */
  maxRequests?: number;
  /** Window size in seconds */
  windowSizeSeconds?: number;
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  reset: number;
}

/**
 * Rate limit using Redis sliding window, with in-memory fallback.
 */
export async function redisRateLimit(
  identifier: string,
  options: RateLimitOptions = {},
): Promise<RateLimitResult> {
  const redis = getRedis();

  // Fallback to in-memory if Redis is not available
  if (!redis) {
    return inMemoryRateLimit(identifier, options);
  }

  const { maxRequests = 10, windowSizeSeconds = 60 } = options;
  const now = Date.now();
  const windowMs = windowSizeSeconds * 1000;
  const windowStart = now - windowMs;
  const key = `${RATE_LIMIT_PREFIX}${identifier}`;

  try {
    // 1. Remove expired entries
    await redis.zremrangebyscore(key, 0, windowStart);

    // 2. Count current entries in window
    const count = await redis.zcard(key);

    if (count >= maxRequests) {
      // Get the oldest entry to compute reset time
      const oldest = await redis.zrange<number[]>(key, 0, 0, { withScores: true });
      const resetAt = oldest.length >= 2
        ? (oldest[1] as number) + windowMs
        : now + windowMs;

      return {
        success: false,
        remaining: 0,
        reset: resetAt,
      };
    }

    // 3. Add new entry with current timestamp as score
    const member = `${now}:${Math.random().toString(36).slice(2, 8)}`;
    await redis.zadd(key, { score: now, member });

    // 4. Set expiry on the key to auto-cleanup
    await redis.expire(key, windowSizeSeconds + 1);

    return {
      success: true,
      remaining: maxRequests - count - 1,
      reset: now + windowMs,
    };
  } catch (err) {
    // If Redis fails, fall back to in-memory
    logger.warn('redis_rate_limit.fallback', {
      identifier,
      error: err instanceof Error ? err.message : String(err),
    });
    return inMemoryRateLimit(identifier, options);
  }
}
