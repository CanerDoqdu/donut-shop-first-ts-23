import { describe, it, expect } from 'vitest';
import { getProductById, getProductsByIds, sampleProducts } from '@/lib/data';

describe('getProductById', () => {
  it('returns product for valid id', () => {
    const product = getProductById('1');
    expect(product).toBeDefined();
    expect(product!.id).toBe('1');
    expect(product!.slug).toBe('strawberry-glazed');
  });

  it('returns undefined for invalid id', () => {
    expect(getProductById('nonexistent')).toBeUndefined();
  });

  it('returns undefined for empty string', () => {
    expect(getProductById('')).toBeUndefined();
  });
});

describe('getProductsByIds', () => {
  it('returns map with matching products', () => {
    const map = getProductsByIds(['1', '2']);
    expect(map.size).toBe(2);
    expect(map.get('1')!.slug).toBe('strawberry-glazed');
    expect(map.get('2')!.slug).toBe('chocolate-dream');
  });

  it('ignores non-existent ids', () => {
    const map = getProductsByIds(['1', 'fake', '999']);
    expect(map.size).toBe(1);
    expect(map.has('1')).toBe(true);
    expect(map.has('fake')).toBe(false);
  });

  it('returns empty map for empty array', () => {
    const map = getProductsByIds([]);
    expect(map.size).toBe(0);
  });

  it('returns all products when all ids match', () => {
    const allIds = sampleProducts.map(p => p.id);
    const map = getProductsByIds(allIds);
    expect(map.size).toBe(sampleProducts.length);
  });
});

describe('sampleProducts data integrity', () => {
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
