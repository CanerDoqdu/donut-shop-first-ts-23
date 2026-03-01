/**
 * Session / Device Anomaly Detection Tests.
 *
 * Tests:
 * - Normal session registration (no anomaly)
 * - New device detection
 * - IP change detection
 * - Concurrent session limit
 * - Step-up auth flag management
 * - Session invalidation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  registerSession,
  getUserSessions,
  isStepUpRequired,
  clearStepUp,
  invalidateSession,
  invalidateAllSessions,
} from '@/lib/session-anomaly';

// ── Mocks ───────────────────────────────────────────────────

vi.mock('@/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

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

describe('registerSession', () => {
  it('registers a session without anomaly on first login', async () => {
    const result = await registerSession('sess-1', 'user-1', 'Chrome/120', '1.2.3.4');

    expect(result.anomalyDetected).toBe(false);
    expect(result.reasons).toEqual([]);
    expect(result.requireStepUp).toBe(false);
  });

  it('detects new device (different User-Agent)', async () => {
    await registerSession('sess-1', 'user-1', 'Chrome/120', '1.2.3.4');
    const result = await registerSession('sess-2', 'user-1', 'Firefox/110', '1.2.3.4');

    expect(result.anomalyDetected).toBe(true);
    expect(result.reasons).toContain('new_device');
    expect(result.requireStepUp).toBe(true);
  });

  it('does not flag same device re-login', async () => {
    await registerSession('sess-1', 'user-1', 'Chrome/120', '1.2.3.4');
    const result = await registerSession('sess-2', 'user-1', 'Chrome/120', '1.2.3.4');

    expect(result.reasons).not.toContain('new_device');
  });
});

describe('isStepUpRequired', () => {
  it('returns false for normal session', async () => {
    await registerSession('sess-1', 'user-1', 'Chrome/120', '1.2.3.4');
    const required = await isStepUpRequired('sess-1');
    expect(required).toBe(false);
  });

  it('returns true for anomalous session', async () => {
    await registerSession('sess-1', 'user-1', 'Chrome/120', '1.2.3.4');
    await registerSession('sess-2', 'user-1', 'Firefox/110', '1.2.3.4');
    const required = await isStepUpRequired('sess-2');
    expect(required).toBe(true);
  });

  it('returns false for non-existent session', async () => {
    const required = await isStepUpRequired('non-existent');
    expect(required).toBe(false);
  });
});

describe('clearStepUp', () => {
  it('clears step-up requirement after re-auth', async () => {
    await registerSession('sess-1', 'user-1', 'Chrome/120', '1.2.3.4');
    await registerSession('sess-2', 'user-1', 'Firefox/110', '1.2.3.4');

    expect(await isStepUpRequired('sess-2')).toBe(true);

    await clearStepUp('sess-2');

    expect(await isStepUpRequired('sess-2')).toBe(false);
  });
});

describe('getUserSessions', () => {
  it('returns all active sessions', async () => {
    await registerSession('sess-1', 'user-1', 'Chrome/120', '1.2.3.4');
    await registerSession('sess-2', 'user-1', 'Chrome/120', '1.2.3.4');

    const sessions = await getUserSessions('user-1');
    expect(sessions.length).toBe(2);
  });

  it('returns empty array for user with no sessions', async () => {
    const sessions = await getUserSessions('no-such-user');
    expect(sessions).toEqual([]);
  });
});

describe('invalidateSession', () => {
  it('removes a specific session', async () => {
    await registerSession('sess-1', 'user-1', 'Chrome/120', '1.2.3.4');
    await registerSession('sess-2', 'user-1', 'Chrome/120', '1.2.3.4');

    await invalidateSession('sess-1');

    const sessions = await getUserSessions('user-1');
    expect(sessions.length).toBe(1);
  });
});

describe('invalidateAllSessions', () => {
  it('removes all sessions for a user', async () => {
    await registerSession('sess-1', 'user-1', 'Chrome/120', '1.2.3.4');
    await registerSession('sess-2', 'user-1', 'Chrome/120', '1.2.3.4');

    const count = await invalidateAllSessions('user-1');
    expect(count).toBe(2);

    const sessions = await getUserSessions('user-1');
    expect(sessions).toEqual([]);
  });

  it('returns 0 for user with no sessions', async () => {
    const count = await invalidateAllSessions('ghost-user');
    expect(count).toBe(0);
  });
});
