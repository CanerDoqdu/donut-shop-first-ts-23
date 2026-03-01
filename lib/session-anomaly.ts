/**
 * Session / Device Anomaly Detection + Step-Up Auth.
 *
 * Detects suspicious session behaviour and triggers step-up authentication
 * when anomalies are found.
 *
 * Anomaly signals:
 * - New device fingerprint (User-Agent change)
 * - Rapid geographic change (impossible travel)
 * - Concurrent sessions exceeding threshold
 * - Unusual access time patterns
 *
 * Step-up auth: When an anomaly is detected, the system flags the session
 * as requiring re-authentication before sensitive operations (checkout,
 * profile changes, order viewing).
 *
 * Design decision: Lightweight in-process detection using Redis session
 * metadata. No external ML service — overkill for e-commerce CV project.
 *
 * Alternative considered: Third-party fraud detection API.
 * Rejected: adds external dependency + cost, not needed for this scale.
 */

import { logger } from './logger';
import { cache } from './redis';

// ── Types ───────────────────────────────────────────────────

export interface SessionMeta {
  userId: string;
  userAgent: string;
  ip: string;
  createdAt: string;
  lastActiveAt: string;
  /** Whether step-up auth is required for this session. */
  stepUpRequired: boolean;
  /** Anomaly reasons that triggered step-up. */
  anomalyReasons: AnomalyReason[];
}

export type AnomalyReason =
  | 'new_device'
  | 'ip_change'
  | 'concurrent_sessions_exceeded'
  | 'rapid_succession';

export interface AnomalyCheckResult {
  anomalyDetected: boolean;
  reasons: AnomalyReason[];
  requireStepUp: boolean;
}

// ── Configuration ───────────────────────────────────────────

/** Session metadata TTL: 24 hours. */
const SESSION_TTL_SECONDS = 24 * 60 * 60;

/** Maximum concurrent sessions per user before flagging. */
const MAX_CONCURRENT_SESSIONS = 5;

/** Minimum time between sessions from different IPs to not flag (minutes). */
const MIN_IP_CHANGE_MINUTES = 5;

/** Redis key prefixes. */
const SESSION_PREFIX = 'session:';
const USER_SESSIONS_PREFIX = 'user_sessions:';

// ── Helpers ─────────────────────────────────────────────────

function sessionKey(sessionId: string): string {
  return `${SESSION_PREFIX}${sessionId}`;
}

function userSessionsKey(userId: string): string {
  return `${USER_SESSIONS_PREFIX}${userId}`;
}

// ── Core Functions ──────────────────────────────────────────

/**
 * Register a new session and check for anomalies.
 *
 * Called on login or session refresh. Returns anomaly check result.
 */
export async function registerSession(
  sessionId: string,
  userId: string,
  userAgent: string,
  ip: string,
): Promise<AnomalyCheckResult> {
  const now = new Date().toISOString();
  const reasons: AnomalyReason[] = [];

  // Get existing sessions for this user
  const existingSessions = await getUserSessions(userId);

  // Check 1: New device (different User-Agent)
  const knownAgents = existingSessions.map((s) => s.userAgent);
  if (knownAgents.length > 0 && !knownAgents.includes(userAgent)) {
    reasons.push('new_device');
  }

  // Check 2: IP change with rapid access
  const recentSessions = existingSessions.filter((s) => {
    const lastActive = new Date(s.lastActiveAt).getTime();
    const minutesAgo = (Date.now() - lastActive) / (1000 * 60);
    return minutesAgo < MIN_IP_CHANGE_MINUTES;
  });

  const recentIPs = recentSessions.map((s) => s.ip);
  if (recentIPs.length > 0 && !recentIPs.includes(ip)) {
    reasons.push('ip_change');
  }

  // Check 3: Concurrent sessions exceeded
  if (existingSessions.length >= MAX_CONCURRENT_SESSIONS) {
    reasons.push('concurrent_sessions_exceeded');
  }

  // Check 4: Rapid session creation
  const veryRecent = existingSessions.filter((s) => {
    const created = new Date(s.createdAt).getTime();
    return Date.now() - created < 60_000; // within last minute
  });
  if (veryRecent.length >= 3) {
    reasons.push('rapid_succession');
  }

  const requireStepUp = reasons.length > 0;

  // Store session metadata
  const meta: SessionMeta = {
    userId,
    userAgent,
    ip,
    createdAt: now,
    lastActiveAt: now,
    stepUpRequired: requireStepUp,
    anomalyReasons: reasons,
  };

  await cache.set(sessionKey(sessionId), meta, SESSION_TTL_SECONDS);

  // Update user sessions index
  const currentIds = await cache.get<string[]>(userSessionsKey(userId)) ?? [];
  if (!currentIds.includes(sessionId)) {
    currentIds.push(sessionId);
    await cache.set(userSessionsKey(userId), currentIds, SESSION_TTL_SECONDS);
  }

  if (requireStepUp) {
    logger.warn('session_anomaly.detected', {
      sessionId,
      userId,
      reasons,
      ip,
      userAgent,
    });
  } else {
    logger.info('session.registered', { sessionId, userId });
  }

  return {
    anomalyDetected: reasons.length > 0,
    reasons,
    requireStepUp,
  };
}

/**
 * Get all active sessions for a user.
 */
export async function getUserSessions(userId: string): Promise<SessionMeta[]> {
  const sessionIds = (await cache.get<string[]>(userSessionsKey(userId))) ?? [];
  const sessions: SessionMeta[] = [];

  for (const sid of sessionIds) {
    const meta = await cache.get<SessionMeta>(sessionKey(sid));
    if (meta) {
      sessions.push(meta);
    }
  }

  return sessions;
}

/**
 * Check if a session requires step-up authentication.
 */
export async function isStepUpRequired(sessionId: string): Promise<boolean> {
  const meta = await cache.get<SessionMeta>(sessionKey(sessionId));
  return meta?.stepUpRequired ?? false;
}

/**
 * Clear step-up requirement after user re-authenticates.
 */
export async function clearStepUp(sessionId: string): Promise<void> {
  const meta = await cache.get<SessionMeta>(sessionKey(sessionId));
  if (meta) {
    meta.stepUpRequired = false;
    meta.anomalyReasons = [];
    await cache.set(sessionKey(sessionId), meta, SESSION_TTL_SECONDS);
    logger.info('session.step_up_cleared', { sessionId, userId: meta.userId });
  }
}

/**
 * Invalidate a specific session.
 */
export async function invalidateSession(sessionId: string): Promise<void> {
  const meta = await cache.get<SessionMeta>(sessionKey(sessionId));
  if (meta) {
    const userIds = (await cache.get<string[]>(userSessionsKey(meta.userId))) ?? [];
    const filtered = userIds.filter((id) => id !== sessionId);
    if (filtered.length > 0) {
      await cache.set(userSessionsKey(meta.userId), filtered, SESSION_TTL_SECONDS);
    } else {
      await cache.del(userSessionsKey(meta.userId));
    }
  }
  await cache.del(sessionKey(sessionId));
  logger.info('session.invalidated', { sessionId });
}

/**
 * Invalidate all sessions for a user (e.g., on password change).
 */
export async function invalidateAllSessions(userId: string): Promise<number> {
  const sessionIds = (await cache.get<string[]>(userSessionsKey(userId))) ?? [];

  for (const sid of sessionIds) {
    await cache.del(sessionKey(sid));
  }

  await cache.del(userSessionsKey(userId));

  logger.info('session.all_invalidated', { userId, count: sessionIds.length });
  return sessionIds.length;
}
