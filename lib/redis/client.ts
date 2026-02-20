/**
 * Upstash Redis client (serverless-compatible).
 *
 * Uses HTTP-based REST API so it works in Vercel Edge/Serverless
 * without long-lived TCP connections.
 *
 * Required env vars:
 *   UPSTASH_REDIS_REST_URL
 *   UPSTASH_REDIS_REST_TOKEN
 *
 * Falls back to a no-op stub in development when env vars are missing,
 * so the app still works locally without Redis.
 */

import { Redis } from '@upstash/redis';
import { logger } from '@/lib/logger';

let _redis: Redis | null = null;

export function getRedis(): Redis | null {
  if (_redis) return _redis;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    logger.warn('redis.missing_env', {
      message: 'UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN not set — Redis disabled',
    });
    return null;
  }

  _redis = new Redis({ url, token });
  return _redis;
}

/**
 * Check if Redis is available.
 * Useful for feature flags and graceful degradation.
 */
export function isRedisAvailable(): boolean {
  return getRedis() !== null;
}
