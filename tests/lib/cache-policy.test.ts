import { describe, it, expect } from 'vitest';
import {
  CACHE_POLICIES,
  getCachePolicy,
  getPoliciesByLayer,
  getPoliciesByTag,
  shouldInvalidate,
  validatePolicies,
  type CachePolicy,
} from '@/lib/cache-policy';
import {
  PRODUCTS_REVALIDATE_S,
  STORES_REVALIDATE_S,
  ORDERS_REVALIDATE_S,
  ADMIN_DASHBOARD_REVALIDATE_S,
} from '@/lib/cache-tags';

// ── Policy Registry ─────────────────────────────────────────

describe('CACHE_POLICIES registry', () => {
  it('has at least 8 policies defined', () => {
    expect(CACHE_POLICIES.length).toBeGreaterThanOrEqual(8);
  });

  it('all policies have unique resource names', () => {
    const names = CACHE_POLICIES.map((p) => p.resource);
    expect(new Set(names).size).toBe(names.length);
  });

  it('all policies have positive TTL', () => {
    for (const p of CACHE_POLICIES) {
      expect(p.ttlSeconds).toBeGreaterThan(0);
    }
  });

  it('SWR never exceeds TTL', () => {
    for (const p of CACHE_POLICIES) {
      expect(p.swrSeconds).toBeLessThanOrEqual(p.ttlSeconds);
    }
  });

  it('all policies have at least one cache layer', () => {
    for (const p of CACHE_POLICIES) {
      expect(p.layers.length).toBeGreaterThan(0);
    }
  });
});

// ── TTL Alignment with cache-tags.ts ────────────────────────

describe('TTL alignment with cache-tags.ts', () => {
  it('products TTL matches PRODUCTS_REVALIDATE_S', () => {
    const policy = getCachePolicy('Products list');
    expect(policy?.ttlSeconds).toBe(PRODUCTS_REVALIDATE_S);
  });

  it('stores TTL matches STORES_REVALIDATE_S', () => {
    const policy = getCachePolicy('Stores');
    expect(policy?.ttlSeconds).toBe(STORES_REVALIDATE_S);
  });

  it('user orders TTL matches ORDERS_REVALIDATE_S', () => {
    const policy = getCachePolicy('User orders');
    expect(policy?.ttlSeconds).toBe(ORDERS_REVALIDATE_S);
  });

  it('admin dashboard TTL matches ADMIN_DASHBOARD_REVALIDATE_S', () => {
    const policy = getCachePolicy('Admin dashboard');
    expect(policy?.ttlSeconds).toBe(ADMIN_DASHBOARD_REVALIDATE_S);
  });
});

// ── getCachePolicy ──────────────────────────────────────────

describe('getCachePolicy', () => {
  it('finds policy by exact name', () => {
    expect(getCachePolicy('Products list')).toBeDefined();
  });

  it('is case-insensitive', () => {
    expect(getCachePolicy('products list')).toBeDefined();
  });

  it('returns undefined for unknown resource', () => {
    expect(getCachePolicy('nonexistent')).toBeUndefined();
  });
});

// ── getPoliciesByLayer ──────────────────────────────────────

describe('getPoliciesByLayer', () => {
  it('finds nextjs-isr policies', () => {
    const policies = getPoliciesByLayer('nextjs-isr');
    expect(policies.length).toBeGreaterThan(0);
    expect(policies.every((p) => p.layers.includes('nextjs-isr'))).toBe(true);
  });

  it('finds in-memory policies', () => {
    const policies = getPoliciesByLayer('in-memory');
    expect(policies.length).toBeGreaterThanOrEqual(2);
  });

  it('finds browser policies', () => {
    const policies = getPoliciesByLayer('browser');
    expect(policies.length).toBeGreaterThanOrEqual(1);
  });
});

// ── getPoliciesByTag ────────────────────────────────────────

describe('getPoliciesByTag', () => {
  it('finds policies by products tag', () => {
    const policies = getPoliciesByTag('products');
    expect(policies.length).toBeGreaterThanOrEqual(1);
    expect(policies.some((p) => p.resource === 'Products list')).toBe(true);
  });

  it('finds policies by parameterized tag', () => {
    const policies = getPoliciesByTag('product:chocolate-dream');
    expect(policies.length).toBeGreaterThanOrEqual(1);
  });

  it('finds user-scoped order policies', () => {
    const policies = getPoliciesByTag('orders:user:abc-123');
    expect(policies.length).toBeGreaterThanOrEqual(1);
    expect(policies[0]!.userScoped).toBe(true);
  });

  it('returns empty for unknown tag', () => {
    expect(getPoliciesByTag('xyz-nonexistent')).toEqual([]);
  });
});

// ── shouldInvalidate ────────────────────────────────────────

describe('shouldInvalidate', () => {
  it('product update invalidates product caches', () => {
    const affected = shouldInvalidate('updates product');
    expect(affected.length).toBeGreaterThan(0);
  });

  it('order status change invalidates orders', () => {
    const affected = shouldInvalidate('order status');
    expect(affected.length).toBeGreaterThan(0);
  });

  it('deployment invalidates browser assets', () => {
    const affected = shouldInvalidate('deployment');
    expect(affected.some((p) => p.layers.includes('browser'))).toBe(true);
  });

  it('returns empty for unrelated event', () => {
    expect(shouldInvalidate('xyzunrelatednonsense')).toEqual([]);
  });
});

// ── validatePolicies ────────────────────────────────────────

describe('validatePolicies', () => {
  it('all current policies are valid', () => {
    const result = validatePolicies();
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });
});

// ── User-scoped policies ────────────────────────────────────

describe('User-scoped policies', () => {
  it('user orders is user-scoped', () => {
    const policy = getCachePolicy('User orders');
    expect(policy?.userScoped).toBe(true);
  });

  it('products is not user-scoped', () => {
    const policy = getCachePolicy('Products list');
    expect(policy?.userScoped).toBe(false);
  });
});
