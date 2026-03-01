/**
 * Refresh Token Rotation + Reuse Detection.
 *
 * Implements secure token management on top of Supabase Auth:
 * - Token family tracking: each refresh creates a new family entry
 * - Rotation: old refresh tokens are invalidated on use
 * - Reuse detection: if a rotated-out token is used again, the entire
 *   family is revoked (indicates token theft)
 *
 * Storage: Redis-based with TTL matching refresh token lifetime.
 *
 * Design decision: We use Redis rather than DB because:
 * - Token families are ephemeral (TTL-based cleanup)
 * - High read frequency (every refresh request)
 * - No need for SQL joins or complex queries
 *
 * Alternative considered: DB table with cron cleanup.
 * Rejected: adds migration complexity and slower per-request lookups.
 */

import { logger } from './logger';
import { cache } from './redis';

// ── Types ───────────────────────────────────────────────────

export interface TokenFamily {
  /** Family ID (UUID). */
  familyId: string;
  /** User ID that owns this family. */
  userId: string;
  /** The current valid refresh token hash. */
  currentTokenHash: string;
  /** Previously used token hashes in this family (for reuse detection). */
  usedTokenHashes: string[];
  /** ISO timestamp of family creation. */
  createdAt: string;
  /** ISO timestamp of last rotation. */
  lastRotatedAt: string;
}

export interface RotationResult {
  success: boolean;
  reuseDetected?: boolean;
  familyRevoked?: boolean;
  familyId?: string;
}

// ── Configuration ───────────────────────────────────────────

/** Refresh token family TTL: 7 days (matches typical Supabase refresh token lifetime). */
const FAMILY_TTL_SECONDS = 7 * 24 * 60 * 60;

/** Redis key prefix for token families. */
const FAMILY_PREFIX = 'token_family:';

/** Redis key prefix for user → families index. */
const USER_FAMILIES_PREFIX = 'user_families:';

// ── Helpers ─────────────────────────────────────────────────

/**
 * Simple hash for token comparison (not cryptographic storage — tokens
 * are already opaque JWTs; we just need equality checks).
 */
export function hashToken(token: string): string {
  // Use a simple hash for comparison purposes
  let hash = 0;
  for (let i = 0; i < token.length; i++) {
    const char = token.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return `th_${Math.abs(hash).toString(36)}`;
}

function familyKey(familyId: string): string {
  return `${FAMILY_PREFIX}${familyId}`;
}

function userFamiliesKey(userId: string): string {
  return `${USER_FAMILIES_PREFIX}${userId}`;
}

// ── Core Functions ──────────────────────────────────────────

/**
 * Create a new token family when a user logs in.
 * Called after successful authentication.
 */
export async function createTokenFamily(
  userId: string,
  refreshToken: string,
): Promise<string> {
  const familyId = crypto.randomUUID();
  const tokenHash = hashToken(refreshToken);
  const now = new Date().toISOString();

  const family: TokenFamily = {
    familyId,
    userId,
    currentTokenHash: tokenHash,
    usedTokenHashes: [],
    createdAt: now,
    lastRotatedAt: now,
  };

  await cache.set(familyKey(familyId), family, FAMILY_TTL_SECONDS);

  // Track user's families for bulk revocation
  const userFamilies = (await cache.get<string[]>(userFamiliesKey(userId))) ?? [];
  userFamilies.push(familyId);
  await cache.set(userFamiliesKey(userId), userFamilies, FAMILY_TTL_SECONDS);

  logger.info('token_rotation.family_created', { familyId, userId });
  return familyId;
}

/**
 * Rotate a refresh token.
 * Validates the old token, issues tracking for the new one,
 * and detects reuse of already-rotated tokens.
 */
export async function rotateToken(
  familyId: string,
  oldRefreshToken: string,
  newRefreshToken: string,
): Promise<RotationResult> {
  const family = await cache.get<TokenFamily>(familyKey(familyId));

  if (!family) {
    logger.warn('token_rotation.family_not_found', { familyId });
    return { success: false, familyId };
  }

  const oldHash = hashToken(oldRefreshToken);

  // Check if the old token is the current valid token
  if (family.currentTokenHash === oldHash) {
    // Normal rotation — old token becomes used
    const newHash = hashToken(newRefreshToken);
    family.usedTokenHashes.push(oldHash);
    family.currentTokenHash = newHash;
    family.lastRotatedAt = new Date().toISOString();

    await cache.set(familyKey(familyId), family, FAMILY_TTL_SECONDS);

    logger.info('token_rotation.rotated', {
      familyId,
      userId: family.userId,
    });

    return { success: true, familyId };
  }

  // Check if the old token was already used (reuse detection!)
  if (family.usedTokenHashes.includes(oldHash)) {
    logger.error('token_rotation.reuse_detected', {
      familyId,
      userId: family.userId,
      message: 'Possible token theft — revoking entire family',
    });

    // Revoke the entire family
    await revokeFamily(familyId);

    return {
      success: false,
      reuseDetected: true,
      familyRevoked: true,
      familyId,
    };
  }

  // Token doesn't belong to this family
  logger.warn('token_rotation.unknown_token', { familyId });
  return { success: false, familyId };
}

/**
 * Revoke an entire token family.
 * Called when reuse is detected or user explicitly logs out.
 */
export async function revokeFamily(familyId: string): Promise<void> {
  const family = await cache.get<TokenFamily>(familyKey(familyId));

  if (family) {
    // Remove from user's family list
    const userFamilies = (await cache.get<string[]>(userFamiliesKey(family.userId))) ?? [];
    const filtered = userFamilies.filter((id) => id !== familyId);
    if (filtered.length > 0) {
      await cache.set(userFamiliesKey(family.userId), filtered, FAMILY_TTL_SECONDS);
    } else {
      await cache.del(userFamiliesKey(family.userId));
    }
  }

  await cache.del(familyKey(familyId));
  logger.info('token_rotation.family_revoked', { familyId });
}

/**
 * Revoke all token families for a user.
 * Called when password is changed or account is compromised.
 */
export async function revokeAllUserFamilies(userId: string): Promise<number> {
  const userFamilies = (await cache.get<string[]>(userFamiliesKey(userId))) ?? [];

  for (const fid of userFamilies) {
    await cache.del(familyKey(fid));
  }

  await cache.del(userFamiliesKey(userId));

  logger.info('token_rotation.all_families_revoked', {
    userId,
    count: userFamilies.length,
  });

  return userFamilies.length;
}

/**
 * Get token family info (for monitoring/debugging).
 */
export async function getTokenFamily(familyId: string): Promise<TokenFamily | null> {
  return cache.get<TokenFamily>(familyKey(familyId));
}
