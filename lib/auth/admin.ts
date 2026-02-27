import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { cache } from '@/lib/redis';

export type AdminRole = 'super_admin' | 'admin' | 'manager' | 'staff';

interface AdminInfo {
  userId: string;
  role: AdminRole;
  permissions: Record<string, boolean>;
}

/**
 * Check whether the given user ID has an admin_users record.
 * Returns the role + permissions when the user is an admin, `null` otherwise.
 * Results are cached in Redis for 5 minutes to avoid per-request DB queries.
 */
export async function getAdminInfo(userId: string): Promise<AdminInfo | null> {
  const cacheKey = `admin:${userId}`;

  // Try Redis cache first
  const cached = await cache.get<AdminInfo | 'not-admin'>(cacheKey);
  if (cached === 'not-admin') return null;
  if (cached) return cached;

  const supabase = await createClient();

  const { data, error } = await supabase
    .from('admin_users')
    .select('role, permissions')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    logger.error('admin_users lookup failed', { userId, error: error.message });
    return null;
  }

  if (!data) {
    // Cache negative results too (5 min TTL)
    await cache.set(cacheKey, 'not-admin', 300);
    return null;
  }

  const info: AdminInfo = {
    userId,
    role: data.role as AdminRole,
    permissions: (data.permissions ?? {}) as Record<string, boolean>,
  };

  // Cache positive result (5 min TTL)
  await cache.set(cacheKey, info, 300);
  return info;
}

/**
 * Convenience boolean: is the current session user an admin?
 */
export async function isAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const info = await getAdminInfo(user.id);
  return info !== null;
}

/**
 * Guard for API route handlers.
 * Returns the AdminInfo when the caller is an admin, or a 401/403 NextResponse.
 *
 * Usage:
 * ```ts
 * const result = await requireAdmin();
 * if (result instanceof NextResponse) return result;
 * const admin = result; // AdminInfo
 * ```
 */
export async function requireAdmin(): Promise<AdminInfo | NextResponse> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    logger.warn('requireAdmin: unauthenticated request');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const info = await getAdminInfo(user.id);

  if (!info) {
    logger.warn('requireAdmin: non-admin user attempted admin action', {
      userId: user.id,
      email: user.email,
    });
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return info;
}
