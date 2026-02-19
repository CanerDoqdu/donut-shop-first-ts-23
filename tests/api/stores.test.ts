import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Contract tests for GET /api/stores
 *
 * The route calls Supabase then falls back to demo data.
 * We mock the Supabase module so the route always uses the demo fallback,
 * letting us test the contract without a real database.
 */

// Mock getSupabasePublicEnv so createClient() in the route gets dummy values
vi.mock('@/lib/supabase/env', () => ({
  getSupabasePublicEnv: () => ({
    url: 'https://fake.supabase.co',
    anonKey: 'fake-key',
  }),
}));

// Mock @supabase/supabase-js so no real HTTP calls are made.
// The query chain returns an error, forcing the demo-data fallback.
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          order: () => ({
            eq: () =>
              Promise.resolve({ data: null, error: new Error('mock') }),
          }),
        }),
      }),
    }),
  }),
}));

async function callStores(params: Record<string, string> = {}) {
  const { GET } = await import('@/app/api/stores/route');
  const url = new URL('http://localhost/api/stores');
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await GET(new Request(url.toString()));
  const body = await res.json();
  return { status: res.status, headers: res.headers, body };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/stores — contract', () => {
  // ── Response shape ──────────────────────────────────────────

  it('returns { stores: array, total: number }', async () => {
    const { status, body } = await callStores();
    expect(status).toBe(200);
    expect(body).toHaveProperty('stores');
    expect(body).toHaveProperty('total');
    expect(Array.isArray(body.stores)).toBe(true);
    expect(typeof body.total).toBe('number');
  });

  it('each store has required fields', async () => {
    const { body } = await callStores();
    for (const s of body.stores) {
      expect(s).toHaveProperty('id');
      expect(s).toHaveProperty('name');
      expect(s).toHaveProperty('slug');
      expect(s).toHaveProperty('address');
      expect(s).toHaveProperty('city');
      expect(s).toHaveProperty('latitude');
      expect(s).toHaveProperty('longitude');
      expect(s).toHaveProperty('is_active');
    }
  });

  // ── Cache headers ───────────────────────────────────────────

  it('sets Cache-Control with s-maxage=600', async () => {
    const { headers } = await callStores();
    const cc = headers.get('cache-control');
    expect(cc).toContain('s-maxage=600');
    expect(cc).toContain('stale-while-revalidate=1200');
  });

  // ── Locale-based demo data ─────────────────────────────────

  it('returns Turkish demo stores by default', async () => {
    const { body } = await callStores();
    expect(body.stores.length).toBeGreaterThan(0);
    // Turkish stores have İstanbul or Ankara
    const cities = body.stores.map((s: { city: string }) => s.city);
    expect(cities.some((c: string) => c === 'İstanbul' || c === 'Ankara')).toBe(true);
  });

  it('returns English demo stores for locale=en', async () => {
    const { body } = await callStores({ locale: 'en' });
    expect(body.stores.length).toBeGreaterThan(0);
    const cities = body.stores.map((s: { city: string }) => s.city);
    expect(cities.some((c: string) => c === 'New York' || c === 'London')).toBe(true);
  });

  // ── City filter ─────────────────────────────────────────────

  it('filters by city', async () => {
    const { body } = await callStores({ city: 'İstanbul' });
    for (const s of body.stores) {
      expect(s.city).toBe('İstanbul');
    }
  });

  it('returns empty for non-existent city', async () => {
    const { body } = await callStores({ city: 'Nonexistent' });
    expect(body.stores).toEqual([]);
    expect(body.total).toBe(0);
  });
});
