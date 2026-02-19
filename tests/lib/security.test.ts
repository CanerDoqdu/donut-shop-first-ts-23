import { describe, it, expect } from 'vitest';
import { sanitizeString, sanitizePayload, isValidEmail, clampNumber } from '@/lib/security';

// ─── sanitizeString ────────────────────────────────────────────

describe('sanitizeString', () => {
  it('strips HTML tags', () => {
    expect(sanitizeString('<script>alert("xss")</script>Hello')).toBe('alert("xss")Hello');
  });

  it('strips HTML entities', () => {
    expect(sanitizeString('Hello&amp;World')).toBe('HelloWorld');
  });

  it('trims whitespace', () => {
    expect(sanitizeString('  hello  ')).toBe('hello');
  });

  it('handles combined HTML + whitespace', () => {
    expect(sanitizeString('  <b>bold</b> text  ')).toBe('bold text');
  });

  it('returns empty string for empty input', () => {
    expect(sanitizeString('')).toBe('');
  });

  it('leaves plain text unchanged', () => {
    expect(sanitizeString('Donut Shop')).toBe('Donut Shop');
  });
});

// ─── sanitizePayload ───────────────────────────────────────────

describe('sanitizePayload', () => {
  it('sanitizes all string values in object', () => {
    const result = sanitizePayload({
      name: '  <b>John</b>  ',
      email: '<script>x</script>john@test.com',
      age: 25,
    });
    expect(result.name).toBe('John');
    expect(result.email).toBe('xjohn@test.com');
    expect(result.age).toBe(25); // non-string untouched
  });

  it('handles empty object', () => {
    expect(sanitizePayload({})).toEqual({});
  });

  it('preserves null and undefined values', () => {
    const result = sanitizePayload({ a: null, b: undefined, c: 'ok' } as Record<string, unknown>);
    expect(result.a).toBeNull();
    expect(result.b).toBeUndefined();
    expect(result.c).toBe('ok');
  });
});

// ─── isValidEmail ──────────────────────────────────────────────

describe('isValidEmail', () => {
  it('accepts valid emails', () => {
    expect(isValidEmail('user@example.com')).toBe(true);
    expect(isValidEmail('name+tag@domain.co')).toBe(true);
    expect(isValidEmail('test@sub.domain.org')).toBe(true);
  });

  it('rejects emails without @', () => {
    expect(isValidEmail('userexample.com')).toBe(false);
  });

  it('rejects emails without domain', () => {
    expect(isValidEmail('user@')).toBe(false);
  });

  it('rejects emails with spaces', () => {
    expect(isValidEmail('user @example.com')).toBe(false);
  });

  it('rejects empty string', () => {
    expect(isValidEmail('')).toBe(false);
  });

  it('rejects emails without TLD', () => {
    expect(isValidEmail('user@domain')).toBe(false);
  });
});

// ─── clampNumber ───────────────────────────────────────────────

describe('clampNumber', () => {
  it('returns value when within range', () => {
    expect(clampNumber(5, 1, 10)).toBe(5);
  });

  it('clamps to min when value is below', () => {
    expect(clampNumber(-5, 0, 100)).toBe(0);
  });

  it('clamps to max when value is above', () => {
    expect(clampNumber(200, 0, 100)).toBe(100);
  });

  it('handles min === max', () => {
    expect(clampNumber(50, 10, 10)).toBe(10);
  });

  it('handles negative ranges', () => {
    expect(clampNumber(0, -10, -1)).toBe(-1);
  });
});
