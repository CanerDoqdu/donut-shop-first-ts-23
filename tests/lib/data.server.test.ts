import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('server-only', () => ({}));

const sampleProducts = [
  { id: 'p1', name_en: 'One', price: 10, image_url: '/one.png' },
  { id: 'p2', name_en: 'Two', price: 20, image_url: '/two.png' },
];

let singleResult: { data: unknown; error: unknown } = { data: null, error: null };
let inResult: { data: unknown; error: unknown } = { data: null, error: null };

const mockSingle = vi.fn(async () => singleResult);
const mockIn = vi.fn(async () => inResult);
const mockFrom = vi.fn(() => ({
  select: vi.fn(() => ({
    eq: vi.fn(() => ({ single: mockSingle })),
    in: mockIn,
  })),
}));

const createClient = vi.fn(async () => ({ from: mockFrom }));

vi.mock('@/lib/supabase/server', () => ({ createClient }));
vi.mock('@/lib/data', () => ({ sampleProducts }));

describe('data.server', () => {
  beforeEach(() => {
    singleResult = { data: null, error: null };
    inResult = { data: null, error: null };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('returns product from database when available', async () => {
    const dbProduct = { id: 'p1', name_en: 'Db One', price: 11 };
    singleResult = { data: dbProduct, error: null };

    const { getProductById } = await import('@/lib/data.server');
    const result = await getProductById('p1');

    expect(result).toEqual(dbProduct);
  });

  it('falls back to sample data when db fails', async () => {
    singleResult = { data: null, error: { message: 'db error' } };

    const { getProductById } = await import('@/lib/data.server');
    const result = await getProductById('p2');

    expect(result?.id).toBe('p2');
  });

  it('returns map from database for getProductsByIds', async () => {
    inResult = { data: [{ id: 'p1', name_en: 'Db One' }], error: null };

    const { getProductsByIds } = await import('@/lib/data.server');
    const map = await getProductsByIds(['p1']);

    expect(map.get('p1')?.id).toBe('p1');
  });

  it('falls back to sample data map when db returns empty', async () => {
    inResult = { data: [], error: null };

    const { getProductsByIds } = await import('@/lib/data.server');
    const map = await getProductsByIds(['p1', 'p2']);

    expect(map.get('p1')?.id).toBe('p1');
    expect(map.get('p2')?.id).toBe('p2');
  });
});
