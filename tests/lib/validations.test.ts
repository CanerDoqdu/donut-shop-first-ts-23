import { describe, it, expect } from 'vitest';
import {
  checkoutSchema,
  giftCardCheckoutSchema,
  emailSendSchema,
  giftCardEmailSchema,
  signInSchema,
  signUpSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  updateProfileSchema,
  parseBody,
} from '@/lib/validations';

// ─── parseBody helper ───────────────────────────────────────

describe('parseBody', () => {
  it('returns data on valid input', () => {
    const result = parseBody(signInSchema, {
      email: 'test@example.com',
      password: 'secret',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe('test@example.com');
    }
  });

  it('returns error string on invalid input', () => {
    const result = parseBody(signInSchema, { email: 'bad', password: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('Invalid email');
    }
  });
});

// ─── checkoutSchema ─────────────────────────────────────────

describe('checkoutSchema', () => {
  const valid = {
    items: [{ id: '550e8400-e29b-41d4-a716-446655440000', quantity: 2 }],
    customerEmail: 'a@b.com',
    customerName: 'Test',
    locale: 'tr' as const,
  };

  it('accepts valid checkout payload', () => {
    expect(checkoutSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects empty items array', () => {
    expect(checkoutSchema.safeParse({ ...valid, items: [] }).success).toBe(false);
  });

  it('rejects invalid email', () => {
    expect(checkoutSchema.safeParse({ ...valid, customerEmail: 'nope' }).success).toBe(false);
  });

  it('rejects non-uuid product id', () => {
    const bad = { ...valid, items: [{ id: 'abc', quantity: 1 }] };
    expect(checkoutSchema.safeParse(bad).success).toBe(false);
  });

  it('rejects quantity < 1', () => {
    const bad = { ...valid, items: [{ id: '550e8400-e29b-41d4-a716-446655440000', quantity: 0 }] };
    expect(checkoutSchema.safeParse(bad).success).toBe(false);
  });

  it('defaults locale to en', () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { locale: _l, ...noLocale } = valid;
    const result = checkoutSchema.safeParse(noLocale);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.locale).toBe('en');
  });
});

// ─── giftCardCheckoutSchema ─────────────────────────────────

describe('giftCardCheckoutSchema', () => {
  const valid = {
    amount: 100,
    senderName: 'Alice',
    senderEmail: 'alice@test.com',
    recipientName: 'Bob',
    recipientEmail: 'bob@test.com',
  };

  it('accepts valid gift card checkout', () => {
    expect(giftCardCheckoutSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects amount below 10', () => {
    expect(giftCardCheckoutSchema.safeParse({ ...valid, amount: 5 }).success).toBe(false);
  });

  it('rejects amount above 5000', () => {
    expect(giftCardCheckoutSchema.safeParse({ ...valid, amount: 6000 }).success).toBe(false);
  });

  it('rejects missing sender email', () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { senderEmail: _e, ...bad } = valid;
    expect(giftCardCheckoutSchema.safeParse(bad).success).toBe(false);
  });
});

// ─── emailSendSchema ────────────────────────────────────────

describe('emailSendSchema', () => {
  it('accepts valid email send payload', () => {
    const result = emailSendSchema.safeParse({
      type: 'order_confirmation',
      to: 'user@test.com',
    });
    expect(result.success).toBe(true);
  });

  it('rejects unknown email type', () => {
    const result = emailSendSchema.safeParse({
      type: 'fake_type',
      to: 'user@test.com',
    });
    expect(result.success).toBe(false);
  });
});

// ─── giftCardEmailSchema ────────────────────────────────────

describe('giftCardEmailSchema', () => {
  it('accepts valid gift card email', () => {
    const result = giftCardEmailSchema.safeParse({
      giftCard: {
        recipient_email: 'bob@test.com',
        recipient_name: 'Bob',
        sender_name: 'Alice',
        code: 'GC-ABC123',
        initial_balance: 200,
      },
    });
    expect(result.success).toBe(true);
  });

  it('rejects negative balance', () => {
    const result = giftCardEmailSchema.safeParse({
      giftCard: {
        recipient_email: 'bob@test.com',
        recipient_name: 'Bob',
        sender_name: 'Alice',
        code: 'GC-ABC123',
        initial_balance: -50,
      },
    });
    expect(result.success).toBe(false);
  });
});

// ─── signInSchema ───────────────────────────────────────────

describe('signInSchema', () => {
  it('accepts valid credentials', () => {
    expect(signInSchema.safeParse({ email: 'a@b.com', password: 'x' }).success).toBe(true);
  });

  it('trims and lowercases email', () => {
    const result = signInSchema.safeParse({ email: '  A@B.COM  ', password: 'x' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.email).toBe('a@b.com');
  });

  it('rejects empty password', () => {
    expect(signInSchema.safeParse({ email: 'a@b.com', password: '' }).success).toBe(false);
  });
});

// ─── signUpSchema ───────────────────────────────────────────

describe('signUpSchema', () => {
  const valid = {
    email: 'new@test.com',
    password: 'StrongPass1',
    fullName: 'Test User',
  };

  it('accepts valid signup', () => {
    expect(signUpSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects short password', () => {
    expect(signUpSchema.safeParse({ ...valid, password: 'Ab1' }).success).toBe(false);
  });

  it('rejects password without uppercase', () => {
    expect(signUpSchema.safeParse({ ...valid, password: 'nouppercase1' }).success).toBe(false);
  });

  it('rejects password without number', () => {
    expect(signUpSchema.safeParse({ ...valid, password: 'NoNumberHere' }).success).toBe(false);
  });

  it('rejects password without lowercase', () => {
    expect(signUpSchema.safeParse({ ...valid, password: 'NOLOWERCASE1' }).success).toBe(false);
  });
});

// ─── forgotPasswordSchema ───────────────────────────────────

describe('forgotPasswordSchema', () => {
  it('accepts valid email', () => {
    expect(forgotPasswordSchema.safeParse({ email: 'a@b.com' }).success).toBe(true);
  });

  it('rejects invalid email', () => {
    expect(forgotPasswordSchema.safeParse({ email: 'nope' }).success).toBe(false);
  });
});

// ─── resetPasswordSchema ────────────────────────────────────

describe('resetPasswordSchema', () => {
  it('accepts strong password', () => {
    expect(resetPasswordSchema.safeParse({ password: 'NewPass1x' }).success).toBe(true);
  });

  it('rejects weak password', () => {
    expect(resetPasswordSchema.safeParse({ password: '123' }).success).toBe(false);
  });
});

// ─── updateProfileSchema ────────────────────────────────────

describe('updateProfileSchema', () => {
  it('accepts valid profile update', () => {
    const result = updateProfileSchema.safeParse({
      fullName: 'Alice',
      phone: '+905551234567',
      address: 'Kadikoy, Istanbul',
    });
    expect(result.success).toBe(true);
  });

  it('defaults empty fields', () => {
    const result = updateProfileSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.fullName).toBe('');
      expect(result.data.phone).toBe('');
    }
  });
});
