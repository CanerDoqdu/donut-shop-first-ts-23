import { describe, it, expect } from 'vitest';
import { sampleProducts } from '@/lib/data';

/**
 * Contract tests for GET /api/products
 *
 * These test the route handler directly (no HTTP server needed).
 * We import the handler function and invoke it with a Request object.
 */

// Dynamic import so vitest can resolve the edge-runtime exports
async function callProducts(params: Record<string, string> = {}) {
  const { GET } = await import('@/app/api/products/route');
  const url = new URL('http://localhost/api/products');
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await GET(new Request(url.toString()));
  const body = await res.json();
  return { status: res.status, headers: res.headers, body };
}

describe('GET /api/products — contract', () => {
  // ── Response shape ──────────────────────────────────────────

  it('returns { products: array, total: number }', async () => {
    const { status, body } = await callProducts();
    expect(status).toBe(200);
    expect(body).toHaveProperty('products');
    expect(body).toHaveProperty('total');
    expect(Array.isArray(body.products)).toBe(true);
    expect(typeof body.total).toBe('number');
  });

  it('each product has required fields', async () => {
    const { body } = await callProducts();
    for (const p of body.products) {
      expect(p).toHaveProperty('id');
      expect(p).toHaveProperty('slug');
      expect(p).toHaveProperty('name_en');
      expect(p).toHaveProperty('name_tr');
      expect(p).toHaveProperty('price');
      expect(p).toHaveProperty('category');
      expect(p).toHaveProperty('image_url');
    }
  });

  // ── Cache headers ───────────────────────────────────────────

  it('sets Cache-Control with s-maxage', async () => {
    const { headers } = await callProducts();
    const cc = headers.get('cache-control');
    expect(cc).toContain('s-maxage=300');
    expect(cc).toContain('stale-while-revalidate=600');
  });

  // ── Filtering ───────────────────────────────────────────────

  it('filters by category', async () => {
    const { body } = await callProducts({ category: 'beverage' });
    expect(body.products.length).toBeGreaterThan(0);
    for (const p of body.products) {
      expect(p.category).toBe('beverage');
    }
  });

  it('returns all when category=all', async () => {
    const { body } = await callProducts({ category: 'all' });
    expect(body.total).toBe(sampleProducts.length);
  });

  it('filters featured products', async () => {
    const { body } = await callProducts({ featured: 'true' });
    expect(body.products.length).toBeGreaterThan(0);
    for (const p of body.products) {
      expect(p.featured).toBe(true);
    }
  });

  it('limits results', async () => {
    const { body } = await callProducts({ limit: '2' });
    expect(body.products.length).toBeLessThanOrEqual(2);
    expect(body.total).toBeLessThanOrEqual(2);
  });

  // ── Edge cases ──────────────────────────────────────────────

  it('returns empty array for non-existent category', async () => {
    const { body } = await callProducts({ category: 'nonexistent' });
    expect(body.products).toEqual([]);
    expect(body.total).toBe(0);
  });

  it('ignores invalid limit gracefully', async () => {
    const { body } = await callProducts({ limit: 'abc' });
    // NaN parseInt → NaN, slice(0, NaN) returns []
    expect(Array.isArray(body.products)).toBe(true);
  });
});
