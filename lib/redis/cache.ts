/**
 * Redis-backed cache layer with TTL and JSON serialization.
 *
 * Features:
 * - Typed get/set with automatic JSON (de)serialization
 * - Configurable TTL per key
 * - Namespace prefixes to avoid collisions
 * - Graceful fallback: returns null when Redis is unavailable
 * - Cache invalidation via delete or pattern-based flush
 *
 * Usage:
 *   import { cache } from '@/lib/redis/cache';
 *   const products = await cache.get<Product[]>('products:all');
 *   if (!products) {
 *     const fresh = await fetchProducts();
 *     await cache.set('products:all', fresh, 3600); // 1 hour TTL
 *   }
 */

import { getRedis } from './client';
import { logger } from '@/lib/logger';

const CACHE_PREFIX = 'donut:cache:';

export interface CacheOptions {
  /** TTL in seconds. Default: 300 (5 minutes) */
  ttl?: number;
}

async function get<T>(key: string): Promise<T | null> {
  const redis = getRedis();
  if (!redis) return null;

  try {
    const raw = await redis.get<T>(`${CACHE_PREFIX}${key}`);
    if (raw === null || raw === undefined) return null;
    logger.info('cache.hit', { key });
    return raw;
  } catch (err) {
    logger.warn('cache.get_error', {
      key,
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

async function set<T>(key: string, value: T, ttlSeconds = 300): Promise<void> {
  const redis = getRedis();
  if (!redis) return;

  try {
    await redis.set(`${CACHE_PREFIX}${key}`, value, { ex: ttlSeconds });
    logger.info('cache.set', { key, ttl: ttlSeconds });
  } catch (err) {
    logger.warn('cache.set_error', {
      key,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

async function del(key: string): Promise<void> {
  const redis = getRedis();
  if (!redis) return;

  try {
    await redis.del(`${CACHE_PREFIX}${key}`);
    logger.info('cache.del', { key });
  } catch (err) {
    logger.warn('cache.del_error', {
      key,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

/**
 * Get-or-set pattern: fetch from cache, or compute and store.
 *
 * @param key   Cache key
 * @param fn    Async function to compute value on cache miss
 * @param ttl   TTL in seconds (default 300)
 */
async function getOrSet<T>(
  key: string,
  fn: () => Promise<T>,
  ttl = 300,
): Promise<T> {
  const cached = await get<T>(key);
  if (cached !== null) return cached;

  const fresh = await fn();
  await set(key, fresh, ttl);
  return fresh;
}

/**
 * Invalidate all keys matching a prefix.
 * Useful for cache busting (e.g., when admin updates products).
 *
 * Note: Upstash scan is eventually consistent — acceptable for cache invalidation.
 */
async function invalidatePrefix(prefix: string): Promise<number> {
  const redis = getRedis();
  if (!redis) return 0;

  try {
    let cursor: string | number = 0;
    let deleted = 0;
    const pattern = `${CACHE_PREFIX}${prefix}*`;

    do {
      const result: [string | number, string[]] = await redis.scan(cursor, { match: pattern, count: 100 }) as [string | number, string[]];
      cursor = result[0];
      const keys: string[] = result[1];
      if (keys.length > 0) {
        await Promise.all(keys.map((k: string) => redis.del(k)));
        deleted += keys.length;
      }
    } while (cursor !== 0);

    logger.info('cache.invalidate_prefix', { prefix, deleted });
    return deleted;
  } catch (err) {
    logger.warn('cache.invalidate_error', {
      prefix,
      error: err instanceof Error ? err.message : String(err),
    });
    return 0;
  }
}

// ─── Pre-defined TTLs ──────────────────────────────────────

export const CACHE_TTL = {
  /** Product catalog: 1 hour */
  PRODUCTS: 3600,
  /** Single product: 30 minutes */
  PRODUCT: 1800,
  /** Promo validation: 5 minutes */
  PROMO: 300,
  /** Store locations: 24 hours */
  STORES: 86400,
  /** Search results: 10 minutes */
  SEARCH: 600,
} as const;

export const cache = {
  get,
  set,
  del,
  getOrSet,
  invalidatePrefix,
} as const;
