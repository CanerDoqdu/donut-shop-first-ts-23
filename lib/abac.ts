/**
 * ABAC (Attribute-Based Access Control) Policy Engine.
 *
 * Extends existing RBAC (admin_users table) with context-aware rules
 * based on resource ownership, user attributes, and request context.
 *
 * Policy rules are derived from update.md section 2-A.
 *
 * Resources & rules:
 *  - orders:     user sees own orders (order.user_id = auth.uid()), admin sees all
 *  - profiles:   user reads/updates own profile only (profile.id = auth.uid())
 *  - reviews:    everyone reads, user edits/deletes own only
 *  - cart:       session-scoped, user sees own cart
 *  - products:   everyone reads, admin CUD
 *  - stores:     everyone reads, admin manages
 *  - gift_cards: purchaser + admin sees
 *  - loyalty:    user sees own loyalty points
 *
 * Usage:
 *   import { evaluatePolicy, Action, Resource } from '@/lib/abac';
 *
 *   const decision = evaluatePolicy({
 *     action: 'read',
 *     resource: 'orders',
 *     subject: { userId: 'user-1', isAdmin: false },
 *     resourceOwnerId: 'user-1',
 *   });
 *   // { allowed: true, reason: 'owner' }
 */

import { logger } from './logger';

// ── Types ───────────────────────────────────────────────────

export type Action = 'read' | 'create' | 'update' | 'delete';

export type Resource =
  | 'orders'
  | 'profiles'
  | 'reviews'
  | 'cart'
  | 'products'
  | 'stores'
  | 'gift_cards'
  | 'loyalty';

export interface Subject {
  /** Authenticated user ID (null = anonymous). */
  userId: string | null;
  /** Whether the user has an admin_users record. */
  isAdmin: boolean;
}

export interface PolicyContext {
  action: Action;
  resource: Resource;
  subject: Subject;
  /**
   * The user ID that owns the resource being accessed.
   * Required for ownership-based rules.
   * For 'create' actions or public resources, can be null.
   */
  resourceOwnerId?: string | null;
}

export interface PolicyDecision {
  allowed: boolean;
  /** Machine-readable reason for the decision. */
  reason:
    | 'admin'
    | 'owner'
    | 'public_read'
    | 'anonymous_denied'
    | 'not_owner'
    | 'admin_only'
    | 'authenticated_required'
    | 'unknown_resource';
}

// ── Policy Rules ────────────────────────────────────────────

type PolicyRule = (ctx: PolicyContext) => PolicyDecision | null;

/** Admin bypass: admins can do everything. */
function adminBypass(ctx: PolicyContext): PolicyDecision | null {
  if (ctx.subject.isAdmin) {
    return { allowed: true, reason: 'admin' };
  }
  return null;
}

/** Require authentication. */
function requireAuth(ctx: PolicyContext): PolicyDecision | null {
  if (!ctx.subject.userId) {
    return { allowed: false, reason: 'anonymous_denied' };
  }
  return null;
}

/** Owner check: user can only access their own resources. */
function ownerOnly(ctx: PolicyContext): PolicyDecision {
  if (ctx.subject.userId && ctx.resourceOwnerId === ctx.subject.userId) {
    return { allowed: true, reason: 'owner' };
  }
  return { allowed: false, reason: 'not_owner' };
}

/** Public read: anyone can read. */
function publicRead(ctx: PolicyContext): PolicyDecision | null {
  if (ctx.action === 'read') {
    return { allowed: true, reason: 'public_read' };
  }
  return null;
}

/** Admin-only write: only admins can create/update/delete. */
function adminOnlyWrite(ctx: PolicyContext): PolicyDecision {
  if (ctx.subject.isAdmin) {
    return { allowed: true, reason: 'admin' };
  }
  return { allowed: false, reason: 'admin_only' };
}

// ── Resource Policy Map ─────────────────────────────────────

/**
 * Each resource maps to an ordered list of rules.
 * Rules are evaluated in order; the first non-null result wins.
 */
const RESOURCE_POLICIES: Record<Resource, PolicyRule[]> = {
  // orders: admin sees all, user sees own
  orders: [
    adminBypass,
    requireAuth,
    ownerOnly,
  ],

  // profiles: user reads/updates own only
  profiles: [
    adminBypass,
    requireAuth,
    ownerOnly,
  ],

  // reviews: everyone reads, user edits/deletes own
  reviews: [
    adminBypass,
    publicRead,
    requireAuth,
    ownerOnly,
  ],

  // cart: session-scoped, user sees own
  cart: [
    adminBypass,
    requireAuth,
    ownerOnly,
  ],

  // products: everyone reads, admin CUD
  products: [
    publicRead,
    adminOnlyWrite,
  ],

  // stores: everyone reads, admin manages
  stores: [
    publicRead,
    adminOnlyWrite,
  ],

  // gift_cards: purchaser + admin
  gift_cards: [
    adminBypass,
    requireAuth,
    ownerOnly,
  ],

  // loyalty: user sees own
  loyalty: [
    adminBypass,
    requireAuth,
    ownerOnly,
  ],
};

// ── Evaluator ───────────────────────────────────────────────

/**
 * Evaluate an ABAC policy for the given context.
 *
 * Returns a PolicyDecision with `allowed` boolean and a machine-readable `reason`.
 *
 * @example
 * ```ts
 * const decision = evaluatePolicy({
 *   action: 'read',
 *   resource: 'orders',
 *   subject: { userId: 'u1', isAdmin: false },
 *   resourceOwnerId: 'u1',
 * });
 * // { allowed: true, reason: 'owner' }
 * ```
 */
export function evaluatePolicy(ctx: PolicyContext): PolicyDecision {
  const rules = RESOURCE_POLICIES[ctx.resource];

  if (!rules) {
    logger.warn('abac.unknown_resource', {
      resource: ctx.resource,
      action: ctx.action,
      userId: ctx.subject.userId,
    });
    return { allowed: false, reason: 'unknown_resource' };
  }

  for (const rule of rules) {
    const decision = rule(ctx);
    if (decision !== null) {
      logger.debug('abac.decision', {
        resource: ctx.resource,
        action: ctx.action,
        userId: ctx.subject.userId,
        allowed: decision.allowed,
        reason: decision.reason,
      });
      return decision;
    }
  }

  // Default deny
  return { allowed: false, reason: 'anonymous_denied' };
}

// ── Middleware Helper ────────────────────────────────────────

/**
 * Higher-order function for API route handlers.
 * Checks ABAC policy and returns 403 if denied.
 *
 * @example
 * ```ts
 * import { requireAccess } from '@/lib/abac';
 *
 * // In your route handler:
 * const denied = requireAccess({
 *   action: 'read',
 *   resource: 'orders',
 *   subject: { userId: user.id, isAdmin },
 *   resourceOwnerId: order.user_id,
 * });
 * if (denied) return denied; // NextResponse 403
 * ```
 */
export function requireAccess(
  ctx: PolicyContext,
  requestId?: string,
): { status: 403; body: { code: string; message: string; requestId: string } } | null {
  const decision = evaluatePolicy(ctx);

  if (!decision.allowed) {
    logger.warn('abac.denied', {
      resource: ctx.resource,
      action: ctx.action,
      userId: ctx.subject.userId,
      reason: decision.reason,
      requestId,
    });
    return {
      status: 403,
      body: {
        code: 'E_AUTH_FORBIDDEN',
        message: `Access denied: ${decision.reason}`,
        requestId: requestId ?? '',
      },
    };
  }

  return null;
}
