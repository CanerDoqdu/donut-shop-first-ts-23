/**
 * Refresh Token Rotation + Reuse Detection Tests.
 *
 * Tests:
 * - Family creation
 * - Normal token rotation
 * - Reuse detection (theft scenario)
 * - Family revocation
 * - Bulk user revocation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createTokenFamily,
  rotateToken,
  revokeFamily,
  revokeAllUserFamilies,
  getTokenFamily,
  hashToken,
} from '@/lib/token-rotation';

// ── Mocks ───────────────────────────────────────────────────

vi.mock('@/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// In-memory cache mock
const mockStore = new Map<string, unknown>();

vi.mock('@/lib/redis', () => ({
  cache: {
    get: vi.fn(async <T>(key: string): Promise<T | null> => {
      return (mockStore.get(key) as T) ?? null;
    }),
    set: vi.fn(async (key: string, value: unknown, _ttl?: number) => {
      mockStore.set(key, value);
    }),
    del: vi.fn(async (key: string) => {
      mockStore.delete(key);
    }),
  },
}));

beforeEach(() => {
  mockStore.clear();
  vi.clearAllMocks();
});

// ── Tests ───────────────────────────────────────────────────

describe('hashToken', () => {
  it('produces deterministic hash', () => {
    const h1 = hashToken('my-token-123');
    const h2 = hashToken('my-token-123');
    expect(h1).toBe(h2);
  });

  it('produces different hashes for different tokens', () => {
    const h1 = hashToken('token-a');
    const h2 = hashToken('token-b');
    expect(h1).not.toBe(h2);
  });

  it('has th_ prefix', () => {
    expect(hashToken('test')).toMatch(/^th_/);
  });
});

describe('createTokenFamily', () => {
  it('creates a family and returns familyId', async () => {
    const familyId = await createTokenFamily('user-1', 'refresh-token-xyz');
    expect(familyId).toBeTruthy();
    expect(familyId.length).toBeGreaterThan(0);

    const family = await getTokenFamily(familyId);
    expect(family).not.toBeNull();
    expect(family!.userId).toBe('user-1');
    expect(family!.currentTokenHash).toBe(hashToken('refresh-token-xyz'));
    expect(family!.usedTokenHashes).toEqual([]);
  });

  it('tracks family under user families list', async () => {
    const fid1 = await createTokenFamily('user-1', 'token-a');
    const fid2 = await createTokenFamily('user-1', 'token-b');

    // The mock cache.set stores keys directly (no prefix added by mock)
    const userFamilies = mockStore.get('user_families:user-1') as string[];
    expect(userFamilies).toContain(fid1);
    expect(userFamilies).toContain(fid2);
  });
});

describe('rotateToken', () => {
  it('rotates normally when current token matches', async () => {
    const familyId = await createTokenFamily('user-1', 'old-token');

    const result = await rotateToken(familyId, 'old-token', 'new-token');

    expect(result.success).toBe(true);
    expect(result.reuseDetected).toBeUndefined();

    const family = await getTokenFamily(familyId);
    expect(family!.currentTokenHash).toBe(hashToken('new-token'));
    expect(family!.usedTokenHashes).toContain(hashToken('old-token'));
  });

  it('detects reuse and revokes family', async () => {
    const familyId = await createTokenFamily('user-1', 'token-v1');

    // Normal rotation: v1 → v2
    await rotateToken(familyId, 'token-v1', 'token-v2');

    // Attacker tries to use v1 again (reuse!)
    const result = await rotateToken(familyId, 'token-v1', 'attacker-token');

    expect(result.success).toBe(false);
    expect(result.reuseDetected).toBe(true);
    expect(result.familyRevoked).toBe(true);

    // Family should be revoked
    const family = await getTokenFamily(familyId);
    expect(family).toBeNull();
  });

  it('rejects unknown token', async () => {
    const familyId = await createTokenFamily('user-1', 'real-token');

    const result = await rotateToken(familyId, 'random-unknown-token', 'new-token');

    expect(result.success).toBe(false);
    expect(result.reuseDetected).toBeUndefined();
  });

  it('returns failure for non-existent family', async () => {
    const result = await rotateToken('non-existent', 'token', 'new-token');
    expect(result.success).toBe(false);
  });
});

describe('revokeFamily', () => {
  it('removes family from cache and user list', async () => {
    const familyId = await createTokenFamily('user-1', 'token');

    await revokeFamily(familyId);

    const family = await getTokenFamily(familyId);
    expect(family).toBeNull();
  });
});

describe('revokeAllUserFamilies', () => {
  it('revokes all families for a user', async () => {
    const fid1 = await createTokenFamily('user-1', 'token-a');
    const fid2 = await createTokenFamily('user-1', 'token-b');

    const count = await revokeAllUserFamilies('user-1');
    expect(count).toBe(2);

    expect(await getTokenFamily(fid1)).toBeNull();
    expect(await getTokenFamily(fid2)).toBeNull();
  });

  it('returns 0 for user with no families', async () => {
    const count = await revokeAllUserFamilies('no-such-user');
    expect(count).toBe(0);
  });
});
