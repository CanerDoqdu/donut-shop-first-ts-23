import { z } from 'zod';

// ─── Reusable primitives ────────────────────────────────────

const email = z.string().trim().toLowerCase().email('Invalid email address').max(254);
const locale = z.enum(['tr', 'en']).default('en');
const nonEmptyString = z.string().trim().min(1, 'This field is required').max(500);
const sanitizedString = z.string().trim().max(500).default('');

// ─── Checkout ───────────────────────────────────────────────

const checkoutItem = z.object({
  id: z.string().uuid('Invalid product ID'),
  quantity: z.number().int().min(1).max(100),
  variantId: z.string().uuid('Invalid variant ID').optional(),
});

export const checkoutSchema = z.object({
  items: z.array(checkoutItem).min(1, 'Cart cannot be empty').max(50),
  customerEmail: email,
  customerName: nonEmptyString,
  customerAddress: sanitizedString,
  locale,
  cartTimestamp: z.number().int().positive().optional(),
  promoCode: z.string().trim().max(50).optional(),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;

// ─── Gift Card Checkout ─────────────────────────────────────

export const giftCardCheckoutSchema = z.object({
  amount: z.number().min(10, 'Minimum 10 TL').max(5000, 'Maximum 5000 TL'),
  senderName: nonEmptyString,
  senderEmail: email,
  recipientName: nonEmptyString,
  recipientEmail: email,
  message: sanitizedString,
  locale,
});

export type GiftCardCheckoutInput = z.infer<typeof giftCardCheckoutSchema>;

// ─── Email Send ─────────────────────────────────────────────

export const emailSendSchema = z.object({
  type: z.enum([
    'order_confirmation',
    'order_shipped',
    'order_delivered',
    'subscription_reminder',
    'loyalty_points_earned',
    'referral_success',
  ]),
  to: email,
  data: z.record(z.string(), z.unknown()).default({}),
  locale,
});

export type EmailSendInput = z.infer<typeof emailSendSchema>;

// ─── Gift Card Email ────────────────────────────────────────

export const giftCardEmailSchema = z.object({
  giftCard: z.object({
    recipient_email: email,
    recipient_name: nonEmptyString,
    sender_name: nonEmptyString,
    code: z.string().min(1),
    initial_balance: z.number().positive(),
    message: sanitizedString,
  }),
  locale,
});

export type GiftCardEmailInput = z.infer<typeof giftCardEmailSchema>;

// ─── Promo Code Validation ──────────────────────────────────

export const promoCodeSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, 'Promo code is required')
    .max(50, 'Promo code too long')
    .regex(/^[A-Za-z0-9_-]+$/, 'Invalid promo code format'),
  orderTotal: z.number().positive('Order total must be positive'),
});

export type PromoCodeInput = z.infer<typeof promoCodeSchema>;

// ─── Auth: Sign In ──────────────────────────────────────────

export const signInSchema = z.object({
  email,
  password: z.string().min(1, 'Password is required').max(128),
  locale,
});

// ─── Auth: Sign Up ──────────────────────────────────────────

export const signUpSchema = z.object({
  email,
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128)
    .regex(/[A-Z]/, 'Password must contain an uppercase letter')
    .regex(/[a-z]/, 'Password must contain a lowercase letter')
    .regex(/[0-9]/, 'Password must contain a number'),
  fullName: nonEmptyString,
  locale,
});

// ─── Auth: Forgot Password ─────────────────────────────────

export const forgotPasswordSchema = z.object({
  email,
  locale,
});

// ─── Auth: Reset Password ───────────────────────────────────

export const resetPasswordSchema = z.object({
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128)
    .regex(/[A-Z]/, 'Password must contain an uppercase letter')
    .regex(/[a-z]/, 'Password must contain a lowercase letter')
    .regex(/[0-9]/, 'Password must contain a number'),
  locale,
});

// ─── Auth: Update Profile ───────────────────────────────────

export const updateProfileSchema = z.object({
  fullName: sanitizedString,
  phone: z.string().trim().max(20).default(''),
  address: sanitizedString,
});

// ─── Helper ─────────────────────────────────────────────────

/**
 * Parse and validate request body with a Zod schema.
 * Returns { success: true, data } or { success: false, error }.
 */
export function parseBody<T>(schema: z.ZodSchema<T>, body: unknown) {
  const result = schema.safeParse(body);
  if (result.success) {
    return { success: true as const, data: result.data };
  }
  const message = result.error.issues.map((i) => i.message).join(', ');
  return { success: false as const, error: message };
}
