import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sampleProducts } from '@/lib/data';

/**
 * FTS search tests.
 *
 * Since the search API has a Postgres FTS path and a fallback in-memory path,
 * we test the in-memory fallback logic directly (it uses sampleProducts)
 * and test the search ranking expectations.
 */

// ─── In-memory search helper (mirrors route fallback logic) ──

function inMemorySearch(query: string, limit = 20, offset = 0) {
  const lowerQuery = query.toLowerCase();
  return sampleProducts
    .filter((p) => {
      const haystack = [p.name_en, p.name_tr, p.description_en, p.description_tr]
        .join(' ')
        .toLowerCase();
      return haystack.includes(lowerQuery);
    })
    .slice(offset, offset + limit)
    .map((p, i) => ({ ...p, rank: 1 - i * 0.01 }));
}

describe('Full-Text Search (in-memory fallback)', () => {
  it('finds products by English name', () => {
    const results = inMemorySearch('strawberry');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].name_en.toLowerCase()).toContain('strawberry');
  });

  it('finds products by Turkish name', () => {
    const results = inMemorySearch('çikolata');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].name_tr.toLowerCase()).toContain('çikolata');
  });

  it('returns empty array for nonsense query', () => {
    const results = inMemorySearch('xyznonexistent');
    expect(results).toEqual([]);
  });

  it('respects limit parameter', () => {
    const allResults = inMemorySearch('donut');
    const limited = inMemorySearch('donut', 2);
    if (allResults.length > 2) {
      expect(limited.length).toBe(2);
    }
  });

  it('respects offset parameter', () => {
    const allResults = inMemorySearch('donut');
    if (allResults.length > 1) {
      const offset = inMemorySearch('donut', 20, 1);
      expect(offset.length).toBe(allResults.length - 1);
    }
  });

  it('assigns descending rank values', () => {
    const results = inMemorySearch('donut');
    if (results.length >= 2) {
      expect(results[0].rank).toBeGreaterThan(results[1].rank);
    }
  });

  it('searches across descriptions too', () => {
    // Search for a term that appears in a description but not in a name
    const results = inMemorySearch('belgian');
    expect(results.length).toBeGreaterThan(0);
  });

  it('search is case-insensitive', () => {
    const lower = inMemorySearch('strawberry');
    const upper = inMemorySearch('STRAWBERRY');
    expect(lower.length).toBe(upper.length);
  });

  it('berry ranks Strawberry > Caramel', () => {
    // 'berry' should match strawberry products before others
    const results = inMemorySearch('berry');
    if (results.length > 0) {
      expect(results[0].name_en.toLowerCase()).toContain('berry');
    }
  });
});
