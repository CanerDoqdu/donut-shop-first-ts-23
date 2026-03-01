/**
 * Cache Observability: Hit/Miss + Eviction Metrics.
 *
 * Tracks cache performance with structured metrics:
 * - Hit rate / miss rate per cache key prefix
 * - Eviction counts
 * - Latency for cache operations
 * - Stale serve counts (when fallback to stale is used)
 *
 * Design decision: In-memory counters with periodic log flush.
 * No external metrics system needed — structured logs feed dashboards.
 *
 * Alternative considered: StatsD/Prometheus client.
 * Rejected: adds infrastructure dependency. Log-based metrics via
 * existing logger are sufficient for observability at this scale.
 *
 * Usage:
 *   import { cacheMetrics } from '@/lib/cache-observability';
 *
 *   cacheMetrics.recordHit('products');
 *   cacheMetrics.recordMiss('products');
 *   const summary = cacheMetrics.getSummary();
 */

import { logger } from './logger';

// ── Types ───────────────────────────────────────────────────

export interface CacheKeyMetrics {
  hits: number;
  misses: number;
  evictions: number;
  staleServes: number;
  totalLatencyMs: number;
  operationCount: number;
}

export interface CacheMetricsSummary {
  /** Per-prefix metrics. */
  keys: Record<string, CacheKeyMetrics>;
  /** Global hit rate (0-1). */
  globalHitRate: number;
  /** Global miss rate (0-1). */
  globalMissRate: number;
  /** Total operations across all keys. */
  totalOperations: number;
  /** Average latency in ms. */
  avgLatencyMs: number;
}

// ── Core Class ──────────────────────────────────────────────

export class CacheObserver {
  private metrics = new Map<string, CacheKeyMetrics>();

  private getOrCreate(keyPrefix: string): CacheKeyMetrics {
    let m = this.metrics.get(keyPrefix);
    if (!m) {
      m = {
        hits: 0,
        misses: 0,
        evictions: 0,
        staleServes: 0,
        totalLatencyMs: 0,
        operationCount: 0,
      };
      this.metrics.set(keyPrefix, m);
    }
    return m;
  }

  /** Extract prefix from cache key (e.g., "products:all" → "products"). */
  private extractPrefix(key: string): string {
    const colonIndex = key.indexOf(':');
    return colonIndex > 0 ? key.substring(0, colonIndex) : key;
  }

  // ── Recording Methods ───────────────────────────────────

  /** Record a cache hit. */
  recordHit(key: string, latencyMs?: number): void {
    const prefix = this.extractPrefix(key);
    const m = this.getOrCreate(prefix);
    m.hits++;
    m.operationCount++;
    if (latencyMs !== undefined) {
      m.totalLatencyMs += latencyMs;
    }

    logger.debug('cache.metric.hit', { keyPrefix: prefix, latencyMs });
  }

  /** Record a cache miss. */
  recordMiss(key: string, latencyMs?: number): void {
    const prefix = this.extractPrefix(key);
    const m = this.getOrCreate(prefix);
    m.misses++;
    m.operationCount++;
    if (latencyMs !== undefined) {
      m.totalLatencyMs += latencyMs;
    }

    logger.debug('cache.metric.miss', { keyPrefix: prefix, latencyMs });
  }

  /** Record a cache eviction (manual delete or TTL expiry). */
  recordEviction(key: string): void {
    const prefix = this.extractPrefix(key);
    const m = this.getOrCreate(prefix);
    m.evictions++;

    logger.debug('cache.metric.eviction', { keyPrefix: prefix });
  }

  /** Record serving stale data (fallback when refresh fails). */
  recordStaleServe(key: string): void {
    const prefix = this.extractPrefix(key);
    const m = this.getOrCreate(prefix);
    m.staleServes++;

    logger.debug('cache.metric.stale_serve', { keyPrefix: prefix });
  }

  // ── Query Methods ───────────────────────────────────────

  /** Get metrics for a specific key prefix. */
  getKeyMetrics(keyPrefix: string): CacheKeyMetrics | null {
    return this.metrics.get(keyPrefix) ?? null;
  }

  /** Get hit rate for a specific key prefix (0-1). */
  getHitRate(keyPrefix: string): number {
    const m = this.metrics.get(keyPrefix);
    if (!m || m.hits + m.misses === 0) return 0;
    return m.hits / (m.hits + m.misses);
  }

  /** Get full summary of all cache metrics. */
  getSummary(): CacheMetricsSummary {
    let totalHits = 0;
    let totalMisses = 0;
    let totalOps = 0;
    let totalLatency = 0;

    const keys: Record<string, CacheKeyMetrics> = {};

    for (const [prefix, m] of this.metrics) {
      keys[prefix] = { ...m };
      totalHits += m.hits;
      totalMisses += m.misses;
      totalOps += m.operationCount;
      totalLatency += m.totalLatencyMs;
    }

    const totalAccess = totalHits + totalMisses;

    return {
      keys,
      globalHitRate: totalAccess > 0 ? totalHits / totalAccess : 0,
      globalMissRate: totalAccess > 0 ? totalMisses / totalAccess : 0,
      totalOperations: totalOps,
      avgLatencyMs: totalOps > 0 ? totalLatency / totalOps : 0,
    };
  }

  /** Flush metrics summary to structured log. */
  flush(): void {
    const summary = this.getSummary();

    logger.metric('cache.hit_rate', summary.globalHitRate, {
      totalOperations: summary.totalOperations,
      avgLatencyMs: summary.avgLatencyMs,
    });

    for (const [prefix, m] of Object.entries(summary.keys)) {
      const total = m.hits + m.misses;
      const hitRate = total > 0 ? m.hits / total : 0;

      logger.metric(`cache.${prefix}.hit_rate`, hitRate, {
        hits: m.hits,
        misses: m.misses,
        evictions: m.evictions,
        staleServes: m.staleServes,
      });
    }
  }

  /** Reset all metrics (for testing or periodic reset). */
  reset(): void {
    this.metrics.clear();
  }
}

// ── Singleton ───────────────────────────────────────────────

export const cacheMetrics = new CacheObserver();
