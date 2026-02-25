import { describe, it, expect } from 'vitest';
import { getProductByIdSync, getProductsByIdsSync, sampleProducts } from '@/lib/data';

// Stable UUIDs matching lib/data.ts seed data
const ID_1 = 'a1b2c3d4-0001-4000-8000-000000000001'; // strawberry-glazed
const ID_2 = 'a1b2c3d4-0002-4000-8000-000000000002'; // chocolate-dream

describe('getProductByIdSync', () => {
  it('returns product for valid id', () => {
    const product = getProductByIdSync(ID_1);
    expect(product).toBeDefined();
    expect(product!.id).toBe(ID_1);
    expect(product!.slug).toBe('strawberry-glazed');
  });

  it('returns undefined for invalid id', () => {
    expect(getProductByIdSync('nonexistent')).toBeUndefined();
  });

  it('returns undefined for empty string', () => {
    expect(getProductByIdSync('')).toBeUndefined();
  });
});

describe('getProductsByIdsSync', () => {
  it('returns map with matching products', () => {
    const map = getProductsByIdsSync([ID_1, ID_2]);
    expect(map.size).toBe(2);
    expect(map.get(ID_1)!.slug).toBe('strawberry-glazed');
    expect(map.get(ID_2)!.slug).toBe('chocolate-dream');
  });

  it('ignores non-existent ids', () => {
    const map = getProductsByIdsSync([ID_1, 'fake', '00000000-0000-0000-0000-000000000000']);
    expect(map.size).toBe(1);
    expect(map.has(ID_1)).toBe(true);
    expect(map.has('fake')).toBe(false);
  });

  it('returns empty map for empty array', () => {
    const map = getProductsByIdsSync([]);
    expect(map.size).toBe(0);
  });

  it('returns all products when all ids match', () => {
    const allIds = sampleProducts.map(p => p.id);
    const map = getProductsByIdsSync(allIds);
    expect(map.size).toBe(sampleProducts.length);
  });
});

describe('sampleProducts data integrity', () => {
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  it('all products have required fields', () => {
    for (const p of sampleProducts) {
      expect(p.id).toBeTruthy();
      expect(p.slug).toBeTruthy();
      expect(p.name_en).toBeTruthy();
      expect(p.name_tr).toBeTruthy();
      expect(p.price).toBeGreaterThan(0);
      expect(p.stock).toBeGreaterThanOrEqual(0);
      expect(p.image_url).toBeTruthy();
      expect(p.category).toBeTruthy();
    }
  });

  it('all product ids are valid UUIDs', () => {
    for (const p of sampleProducts) {
      expect(p.id).toMatch(UUID_RE);
    }
  });

  it('all product ids are unique', () => {
    const ids = sampleProducts.map(p => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('all product slugs are unique', () => {
    const slugs = sampleProducts.map(p => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('prices are positive numbers', () => {
    for (const p of sampleProducts) {
      expect(typeof p.price).toBe('number');
      expect(p.price).toBeGreaterThan(0);
    }
  });
});
