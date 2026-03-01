/**
 * ABAC Policy Engine Tests.
 *
 * Tests all resource policies defined in update.md section 2-A:
 * - orders, profiles, reviews, cart, products, stores, gift_cards, loyalty
 *
 * Coverage: ownership, admin bypass, public read, anonymous denial, admin-only write.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  evaluatePolicy,
  requireAccess,
  type PolicyContext,
  type Subject,
} from '@/lib/abac';

// Mock logger to avoid console noise in tests
vi.mock('@/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// ── Helpers ─────────────────────────────────────────────────

const adminSubject: Subject = { userId: 'admin-1', isAdmin: true };
const userSubject: Subject = { userId: 'user-1', isAdmin: false };
const otherUser: Subject = { userId: 'user-2', isAdmin: false };
const anonSubject: Subject = { userId: null, isAdmin: false };

function ctx(
  overrides: Partial<PolicyContext> & Pick<PolicyContext, 'resource' | 'action'>,
): PolicyContext {
  return {
    subject: userSubject,
    resourceOwnerId: 'user-1',
    ...overrides,
  };
}

// ── Orders ──────────────────────────────────────────────────

describe('ABAC: orders', () => {
  it('admin can read all orders', () => {
    const result = evaluatePolicy(
      ctx({ resource: 'orders', action: 'read', subject: adminSubject, resourceOwnerId: 'user-1' }),
    );
    expect(result).toEqual({ allowed: true, reason: 'admin' });
  });

  it('user can read own orders', () => {
    const result = evaluatePolicy(
      ctx({ resource: 'orders', action: 'read', subject: userSubject, resourceOwnerId: 'user-1' }),
    );
    expect(result).toEqual({ allowed: true, reason: 'owner' });
  });

  it('user cannot read other user orders', () => {
    const result = evaluatePolicy(
      ctx({ resource: 'orders', action: 'read', subject: otherUser, resourceOwnerId: 'user-1' }),
    );
    expect(result).toEqual({ allowed: false, reason: 'not_owner' });
  });

  it('anonymous cannot read orders', () => {
    const result = evaluatePolicy(
      ctx({ resource: 'orders', action: 'read', subject: anonSubject }),
    );
    expect(result).toEqual({ allowed: false, reason: 'anonymous_denied' });
  });
});

// ── Profiles ────────────────────────────────────────────────

describe('ABAC: profiles', () => {
  it('user can read own profile', () => {
    const result = evaluatePolicy(
      ctx({ resource: 'profiles', action: 'read', subject: userSubject, resourceOwnerId: 'user-1' }),
    );
    expect(result).toEqual({ allowed: true, reason: 'owner' });
  });

  it('user can update own profile', () => {
    const result = evaluatePolicy(
      ctx({ resource: 'profiles', action: 'update', subject: userSubject, resourceOwnerId: 'user-1' }),
    );
    expect(result).toEqual({ allowed: true, reason: 'owner' });
  });

  it('user cannot read another profile', () => {
    const result = evaluatePolicy(
      ctx({ resource: 'profiles', action: 'read', subject: otherUser, resourceOwnerId: 'user-1' }),
    );
    expect(result).toEqual({ allowed: false, reason: 'not_owner' });
  });

  it('admin can read any profile', () => {
    const result = evaluatePolicy(
      ctx({ resource: 'profiles', action: 'read', subject: adminSubject, resourceOwnerId: 'user-1' }),
    );
    expect(result).toEqual({ allowed: true, reason: 'admin' });
  });
});

// ── Reviews ─────────────────────────────────────────────────

describe('ABAC: reviews', () => {
  it('anyone can read reviews (public)', () => {
    const result = evaluatePolicy(
      ctx({ resource: 'reviews', action: 'read', subject: anonSubject }),
    );
    expect(result).toEqual({ allowed: true, reason: 'public_read' });
  });

  it('user can delete own review', () => {
    const result = evaluatePolicy(
      ctx({ resource: 'reviews', action: 'delete', subject: userSubject, resourceOwnerId: 'user-1' }),
    );
    expect(result).toEqual({ allowed: true, reason: 'owner' });
  });

  it('user cannot delete other user review', () => {
    const result = evaluatePolicy(
      ctx({ resource: 'reviews', action: 'delete', subject: otherUser, resourceOwnerId: 'user-1' }),
    );
    expect(result).toEqual({ allowed: false, reason: 'not_owner' });
  });

  it('admin can delete any review', () => {
    const result = evaluatePolicy(
      ctx({ resource: 'reviews', action: 'delete', subject: adminSubject, resourceOwnerId: 'user-1' }),
    );
    expect(result).toEqual({ allowed: true, reason: 'admin' });
  });
});

// ── Cart ────────────────────────────────────────────────────

describe('ABAC: cart', () => {
  it('user can read own cart', () => {
    const result = evaluatePolicy(
      ctx({ resource: 'cart', action: 'read', subject: userSubject, resourceOwnerId: 'user-1' }),
    );
    expect(result).toEqual({ allowed: true, reason: 'owner' });
  });

  it('user cannot read another cart', () => {
    const result = evaluatePolicy(
      ctx({ resource: 'cart', action: 'read', subject: otherUser, resourceOwnerId: 'user-1' }),
    );
    expect(result).toEqual({ allowed: false, reason: 'not_owner' });
  });

  it('anonymous cannot access cart', () => {
    const result = evaluatePolicy(
      ctx({ resource: 'cart', action: 'read', subject: anonSubject }),
    );
    expect(result).toEqual({ allowed: false, reason: 'anonymous_denied' });
  });
});

// ── Products ────────────────────────────────────────────────

describe('ABAC: products', () => {
  it('anyone can read products', () => {
    const result = evaluatePolicy(
      ctx({ resource: 'products', action: 'read', subject: anonSubject }),
    );
    expect(result).toEqual({ allowed: true, reason: 'public_read' });
  });

  it('admin can create products', () => {
    const result = evaluatePolicy(
      ctx({ resource: 'products', action: 'create', subject: adminSubject }),
    );
    expect(result).toEqual({ allowed: true, reason: 'admin' });
  });

  it('non-admin cannot create products', () => {
    const result = evaluatePolicy(
      ctx({ resource: 'products', action: 'create', subject: userSubject }),
    );
    expect(result).toEqual({ allowed: false, reason: 'admin_only' });
  });

  it('non-admin cannot delete products', () => {
    const result = evaluatePolicy(
      ctx({ resource: 'products', action: 'delete', subject: userSubject }),
    );
    expect(result).toEqual({ allowed: false, reason: 'admin_only' });
  });
});

// ── Stores ──────────────────────────────────────────────────

describe('ABAC: stores', () => {
  it('anyone can read stores', () => {
    const result = evaluatePolicy(
      ctx({ resource: 'stores', action: 'read', subject: anonSubject }),
    );
    expect(result).toEqual({ allowed: true, reason: 'public_read' });
  });

  it('admin can update stores', () => {
    const result = evaluatePolicy(
      ctx({ resource: 'stores', action: 'update', subject: adminSubject }),
    );
    expect(result).toEqual({ allowed: true, reason: 'admin' });
  });

  it('non-admin cannot manage stores', () => {
    const result = evaluatePolicy(
      ctx({ resource: 'stores', action: 'update', subject: userSubject }),
    );
    expect(result).toEqual({ allowed: false, reason: 'admin_only' });
  });
});

// ── Gift Cards ──────────────────────────────────────────────

describe('ABAC: gift_cards', () => {
  it('purchaser can read own gift card', () => {
    const result = evaluatePolicy(
      ctx({ resource: 'gift_cards', action: 'read', subject: userSubject, resourceOwnerId: 'user-1' }),
    );
    expect(result).toEqual({ allowed: true, reason: 'owner' });
  });

  it('admin can read any gift card', () => {
    const result = evaluatePolicy(
      ctx({ resource: 'gift_cards', action: 'read', subject: adminSubject, resourceOwnerId: 'user-1' }),
    );
    expect(result).toEqual({ allowed: true, reason: 'admin' });
  });

  it('other user cannot read gift card', () => {
    const result = evaluatePolicy(
      ctx({ resource: 'gift_cards', action: 'read', subject: otherUser, resourceOwnerId: 'user-1' }),
    );
    expect(result).toEqual({ allowed: false, reason: 'not_owner' });
  });
});

// ── Loyalty ─────────────────────────────────────────────────

describe('ABAC: loyalty', () => {
  it('user can read own loyalty points', () => {
    const result = evaluatePolicy(
      ctx({ resource: 'loyalty', action: 'read', subject: userSubject, resourceOwnerId: 'user-1' }),
    );
    expect(result).toEqual({ allowed: true, reason: 'owner' });
  });

  it('other user cannot read loyalty points', () => {
    const result = evaluatePolicy(
      ctx({ resource: 'loyalty', action: 'read', subject: otherUser, resourceOwnerId: 'user-1' }),
    );
    expect(result).toEqual({ allowed: false, reason: 'not_owner' });
  });

  it('admin can read any loyalty points', () => {
    const result = evaluatePolicy(
      ctx({ resource: 'loyalty', action: 'read', subject: adminSubject, resourceOwnerId: 'user-1' }),
    );
    expect(result).toEqual({ allowed: true, reason: 'admin' });
  });
});

// ── requireAccess helper ────────────────────────────────────

describe('requireAccess', () => {
  it('returns null when access is allowed', () => {
    const result = requireAccess(
      ctx({ resource: 'orders', action: 'read', subject: userSubject, resourceOwnerId: 'user-1' }),
      'req-1',
    );
    expect(result).toBeNull();
  });

  it('returns NextResponse 403 when access is denied', async () => {
    const result = requireAccess(
      ctx({ resource: 'orders', action: 'read', subject: otherUser, resourceOwnerId: 'user-1' }),
      'req-2',
    );
    expect(result).not.toBeNull();
    expect(result!.status).toBe(403);
    const body = await result!.json();
    expect(body).toEqual({
      code: 'E_AUTH_FORBIDDEN',
      message: 'Access denied: not_owner',
      requestId: 'req-2',
    });
  });

  it('handles missing requestId', async () => {
    const result = requireAccess(
      ctx({ resource: 'orders', action: 'read', subject: anonSubject }),
    );
    expect(result).not.toBeNull();
    const body = await result!.json();
    expect(body.requestId).toBe('');
  });
});

// ── Edge Cases ──────────────────────────────────────────────

describe('ABAC: edge cases', () => {
  it('unknown resource returns denied', () => {
    const result = evaluatePolicy({
      action: 'read',
      resource: 'unknown_thing' as never,
      subject: userSubject,
    });
    expect(result).toEqual({ allowed: false, reason: 'unknown_resource' });
  });
});
