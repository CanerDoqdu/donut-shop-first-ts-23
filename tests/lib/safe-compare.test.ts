import { describe, it, expect } from 'vitest';
import { safeCompare } from '@/lib/safe-compare';

describe('safeCompare', () => {
  it('returns true for identical strings', () => {
    expect(safeCompare('secret123', 'secret123')).toBe(true);
  });

  it('returns false for different strings of equal length', () => {
    expect(safeCompare('secret123', 'secret456')).toBe(false);
  });

  it('returns false for different-length strings', () => {
    expect(safeCompare('short', 'a-much-longer-string')).toBe(false);
  });

  it('returns false when first argument is null', () => {
    expect(safeCompare(null, 'value')).toBe(false);
  });

  it('returns false when second argument is null', () => {
    expect(safeCompare('value', null)).toBe(false);
  });

  it('returns false when first argument is undefined', () => {
    expect(safeCompare(undefined, 'value')).toBe(false);
  });

  it('returns false when second argument is undefined', () => {
    expect(safeCompare('value', undefined)).toBe(false);
  });

  it('returns false when both arguments are null', () => {
    expect(safeCompare(null, null)).toBe(false);
  });

  it('returns false for empty string vs non-empty', () => {
    expect(safeCompare('', 'notempty')).toBe(false);
  });

  it('returns true for matching webhook signatures', () => {
    const sig = 'whsec_abc123def456';
    expect(safeCompare(sig, sig)).toBe(true);
  });
});
