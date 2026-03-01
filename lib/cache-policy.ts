/**
 * Cache Policy — TTL, invalidation rules, and staleness configuration.
 *
 * Centralizes all cache behaviour so that:
 *  1. TTLs are documented and testable
 *  2. Invalidation triggers are explicit
 *  3. Cache layers are enumerated (Next.js ISR, Upstash, in-memory)
 *
 * Works WITH `cache-tags.ts` (tag definitions) — this module adds
 * the policy layer: when to cache, how long, and when to bust.
 *
 * Usage:
 *   import { CACHE_POLICIES, getCachePolicy, shouldInvalidate } from '@/lib/cache-policy';
 */

// ── Types ───────────────────────────────────────────────────

export type CacheLayer = 'nextjs-isr' | 'upstash-redis' | 'in-memory' | 'browser';

export interface CachePolicy {
  /** Human-readable resource name. */
  resource: string;
  /** Which cache layer(s) apply. */
  layers: CacheLayer[];
  /** Time-to-live in seconds. */
  ttlSeconds: number;
  /** Stale-while-revalidate window in seconds (0 = no SWR). */
  swrSeconds: number;
  /** Which tag(s) trigger invalidation. */
  invalidationTags: string[];
  /** Events that trigger invalidation. */
  invalidationTriggers: string[];
  /** Whether this resource is user-scoped (requires auth context). */
  userScoped: boolean;
  /** Additional notes. */
  notes: string;
}

// ── Policy Registry ─────────────────────────────────────────

export const CACHE_POLICIES: CachePolicy[] = [
  {
    resource: 'Products list',
    layers: ['nextjs-isr', 'upstash-redis'],
    ttlSeconds: 300,     // 5 minutes
    swrSeconds: 60,      // serve stale for 1 min while revalidating
    invalidationTags: ['products'],
    invalidationTriggers: [
      'Admin creates product',
      'Admin updates product',
      'Admin deletes product',
      'Stock level changes',
    ],
    userScoped: false,
    notes: 'Products change rarely. Tag-invalidated on admin edits.',
  },
  {
    resource: 'Single product',
    layers: ['nextjs-isr'],
    ttlSeconds: 300,     // 5 minutes
    swrSeconds: 60,
    invalidationTags: ['product:<slug>'],
    invalidationTriggers: [
      'Admin updates this product',
      'Review posted for this product',
    ],
    userScoped: false,
    notes: 'Individual product cache uses slug-based tags.',
  },
  {
    resource: 'Stores',
    layers: ['nextjs-isr', 'upstash-redis'],
    ttlSeconds: 600,     // 10 minutes
    swrSeconds: 120,
    invalidationTags: ['stores'],
    invalidationTriggers: [
      'Store added',
      'Store updated',
      'Store deactivated',
    ],
    userScoped: false,
    notes: 'Stores change very rarely. Longest TTL.',
  },
  {
    resource: 'User orders',
    layers: ['nextjs-isr'],
    ttlSeconds: 60,      // 1 minute
    swrSeconds: 30,
    invalidationTags: ['orders:user:<id>'],
    invalidationTriggers: [
      'Order created',
      'Order status changed (webhook)',
      'Order cancelled',
    ],
    userScoped: true,
    notes: 'Frequent changes. Short TTL + tag invalidation on webhook.',
  },
  {
    resource: 'Admin dashboard',
    layers: ['nextjs-isr'],
    ttlSeconds: 120,     // 2 minutes
    swrSeconds: 60,
    invalidationTags: ['admin:dashboard'],
    invalidationTriggers: [
      'Order paid/cancelled',
      'Product stock change',
      'New review posted',
    ],
    userScoped: false,
    notes: 'Aggregated metrics. Tag-invalidated on order/product changes.',
  },
  {
    resource: 'Reviews',
    layers: ['nextjs-isr'],
    ttlSeconds: 180,     // 3 minutes
    swrSeconds: 60,
    invalidationTags: ['product:<slug>'],
    invalidationTriggers: [
      'New review posted',
      'Review approved/rejected by admin',
    ],
    userScoped: false,
    notes: 'Piggybacked on product tag for simplicity.',
  },
  {
    resource: 'API rate limit counters',
    layers: ['in-memory'],
    ttlSeconds: 60,      // 1 minute window
    swrSeconds: 0,
    invalidationTags: [],
    invalidationTriggers: ['Auto-cleanup every 5 minutes'],
    userScoped: false,
    notes: 'In-memory token bucket. No external cache.',
  },
  {
    resource: 'Metrics (sliding window)',
    layers: ['in-memory'],
    ttlSeconds: 300,     // 5 minute window
    swrSeconds: 0,
    invalidationTags: [],
    invalidationTriggers: ['Window slides automatically'],
    userScoped: false,
    notes: 'MetricsCollector uses sliding window with max entries cap.',
  },
  {
    resource: 'Browser static assets',
    layers: ['browser'],
    ttlSeconds: 31536000, // 1 year (Next.js hashed assets)
    swrSeconds: 0,
    invalidationTags: [],
    invalidationTriggers: ['New deployment generates new hashes'],
    userScoped: false,
    notes: 'Next.js immutable hashed filenames. Safe for long cache.',
  },
];

// ── Lookup Functions ────────────────────────────────────────

/**
 * Get cache policy for a given resource name.
 */
export function getCachePolicy(resource: string): CachePolicy | undefined {
  return CACHE_POLICIES.find(
    (p) => p.resource.toLowerCase() === resource.toLowerCase(),
  );
}

/**
 * Get all policies for a specific cache layer.
 */
export function getPoliciesByLayer(layer: CacheLayer): CachePolicy[] {
  return CACHE_POLICIES.filter((p) => p.layers.includes(layer));
}

/**
 * Get all policies that would be invalidated by a specific tag.
 */
export function getPoliciesByTag(tag: string): CachePolicy[] {
  return CACHE_POLICIES.filter((p) =>
    p.invalidationTags.some((t) => {
      // Handle parameterized tags like "product:<slug>"
      const pattern = t.replace(/<[^>]+>/g, '.*');
      return new RegExp(`^${pattern}$`).test(tag);
    }),
  );
}

/**
 * Check if a given event should trigger cache invalidation.
 * Returns the policies affected.
 */
export function shouldInvalidate(event: string): CachePolicy[] {
  const lower = event.toLowerCase();
  return CACHE_POLICIES.filter((p) =>
    p.invalidationTriggers.some((t) => t.toLowerCase().includes(lower)),
  );
}

/**
 * Validate that all policies have reasonable TTLs (positive integers).
 */
export function validatePolicies(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  for (const policy of CACHE_POLICIES) {
    if (policy.ttlSeconds <= 0) {
      errors.push(`${policy.resource}: TTL must be positive (got ${policy.ttlSeconds})`);
    }
    if (policy.swrSeconds < 0) {
      errors.push(`${policy.resource}: SWR must be non-negative (got ${policy.swrSeconds})`);
    }
    if (policy.swrSeconds > policy.ttlSeconds) {
      errors.push(`${policy.resource}: SWR (${policy.swrSeconds}s) exceeds TTL (${policy.ttlSeconds}s)`);
    }
    if (policy.layers.length === 0) {
      errors.push(`${policy.resource}: Must specify at least one cache layer`);
    }
  }

  return { valid: errors.length === 0, errors };
}
