import { describe, it, expect } from 'vitest';
import { promoCodeSchema } from '@/lib/validations';

// ─── promoCodeSchema ────────────────────────────────────────

describe('promoCodeSchema', () => {
  const valid = { code: 'WELCOME10', orderTotal: 100 };

  it('accepts valid promo input', () => {
    expect(promoCodeSchema.safeParse(valid).success).toBe(true);
  });

  it('trims and accepts lowercase code', () => {
    const result = promoCodeSchema.safeParse({ code: '  welcome10  ', orderTotal: 50 });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.code).toBe('welcome10');
  });

  it('rejects empty code', () => {
    const result = promoCodeSchema.safeParse({ code: '', orderTotal: 100 });
    expect(result.success).toBe(false);
  });

  it('rejects code with special characters', () => {
    const result = promoCodeSchema.safeParse({ code: 'CODE!@#', orderTotal: 100 });
    expect(result.success).toBe(false);
  });

  it('rejects code longer than 50 chars', () => {
    const result = promoCodeSchema.safeParse({ code: 'A'.repeat(51), orderTotal: 100 });
    expect(result.success).toBe(false);
  });

  it('rejects zero order total', () => {
    const result = promoCodeSchema.safeParse({ code: 'CODE', orderTotal: 0 });
    expect(result.success).toBe(false);
  });

  it('rejects negative order total', () => {
    const result = promoCodeSchema.safeParse({ code: 'CODE', orderTotal: -10 });
    expect(result.success).toBe(false);
  });

  it('accepts hyphens and underscores in code', () => {
    const result = promoCodeSchema.safeParse({ code: 'MY-CODE_2024', orderTotal: 50 });
    expect(result.success).toBe(true);
  });
});

// ─── checkoutSchema with promoCode ──────────────────────────

import { checkoutSchema } from '@/lib/validations';

describe('checkoutSchema promoCode field', () => {
  const validCheckout = {
    items: [{ id: '550e8400-e29b-41d4-a716-446655440000', quantity: 2 }],
    customerEmail: 'a@b.com',
    customerName: 'Test',
    locale: 'en' as const,
  };

  it('accepts checkout without promoCode', () => {
    const result = checkoutSchema.safeParse(validCheckout);
    expect(result.success).toBe(true);
  });

  it('accepts checkout with valid promoCode', () => {
    const result = checkoutSchema.safeParse({ ...validCheckout, promoCode: 'WELCOME10' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.promoCode).toBe('WELCOME10');
  });

  it('accepts checkout with empty promoCode (optional)', () => {
    const result = checkoutSchema.safeParse({ ...validCheckout, promoCode: '' });
    expect(result.success).toBe(true);
  });

  it('trims promoCode whitespace', () => {
    const result = checkoutSchema.safeParse({ ...validCheckout, promoCode: '  CODE  ' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.promoCode).toBe('CODE');
  });
});
