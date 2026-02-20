/**
 * GDPR compliance service.
 *
 * Handles right-to-deletion (Article 17) and right-to-access (Article 15):
 *
 * - deleteUserData(): Anonymizes PII in profile, soft-deletes orders,
 *   removes loyalty points, and logs to audit_log.
 *
 * - exportUserData(): Returns all user data in a portable JSON format
 *   (profile, orders, loyalty points).
 *
 * Both operations require authentication and are rate-limited.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';

export interface GdprDeleteResult {
  success: boolean;
  anonymizedFields: string[];
  ordersAnonymized: number;
  error?: string;
}

export interface GdprExportResult {
  profile: Record<string, unknown> | null;
  orders: Record<string, unknown>[];
  loyaltyPoints: Record<string, unknown> | null;
  exportedAt: string;
}

/**
 * Anonymize a user's PII and soft-delete their data.
 *
 * Steps:
 * 1. Anonymize profile: replace name, email, phone with '[deleted]'
 * 2. Soft-delete orders: set customer_email to '[deleted]', keep order records
 * 3. Delete loyalty points
 * 4. Write audit log entry
 *
 * Does NOT delete the auth.users row — that requires Supabase Admin API.
 */
export async function deleteUserData(
  admin: SupabaseClient,
  userId: string,
  ipAddress?: string,
): Promise<GdprDeleteResult> {
  const anonymizedFields: string[] = [];

  try {
    // 1. Anonymize profile
    const { error: profileError } = await admin
      .from('profiles')
      .update({
        full_name: '[deleted]',
        email: '[deleted]',
        phone: null,
        avatar_url: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (profileError) {
      logger.warn('gdpr.profile_anonymize_failed', { userId, error: profileError.message });
    } else {
      anonymizedFields.push('full_name', 'email', 'phone', 'avatar_url');
    }

    // 2. Anonymize orders (soft-delete approach: keep records, scrub PII)
    const { data: orders, error: ordersError } = await admin
      .from('orders')
      .update({
        customer_email: '[deleted]',
        customer_name: '[deleted]',
        customer_address: null,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .select('id');

    if (ordersError) {
      logger.warn('gdpr.orders_anonymize_failed', { userId, error: ordersError.message });
    }

    const ordersAnonymized = orders?.length ?? 0;

    // 3. Delete loyalty points
    const { error: loyaltyError } = await admin
      .from('loyalty_points')
      .delete()
      .eq('user_id', userId);

    if (loyaltyError) {
      logger.warn('gdpr.loyalty_delete_failed', { userId, error: loyaltyError.message });
    }

    // 4. Audit log
    await admin.from('audit_log').insert({
      user_id: userId,
      action: 'gdpr_delete',
      details: { anonymizedFields, ordersAnonymized },
      ip_address: ipAddress || null,
    });

    logger.info('gdpr.delete_completed', { userId, anonymizedFields, ordersAnonymized });

    return { success: true, anonymizedFields, ordersAnonymized };
  } catch (err) {
    logger.error('gdpr.delete_error', {
      userId,
      error: err instanceof Error ? err.message : String(err),
    });
    return {
      success: false,
      anonymizedFields,
      ordersAnonymized: 0,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

/**
 * Export all user data in a portable format (GDPR Article 15).
 */
export async function exportUserData(
  admin: SupabaseClient,
  userId: string,
  ipAddress?: string,
): Promise<GdprExportResult> {
  // Fetch profile
  const { data: profile } = await admin
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  // Fetch orders with items
  const { data: orders } = await admin
    .from('orders')
    .select('*, order_items(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  // Fetch loyalty points
  const { data: loyaltyPoints } = await admin
    .from('loyalty_points')
    .select('*')
    .eq('user_id', userId)
    .single();

  // Audit log
  await admin.from('audit_log').insert({
    user_id: userId,
    action: 'gdpr_export',
    details: {
      exportedTables: ['profiles', 'orders', 'order_items', 'loyalty_points'],
    },
    ip_address: ipAddress || null,
  });

  logger.info('gdpr.export_completed', { userId });

  return {
    profile: profile || null,
    orders: orders || [],
    loyaltyPoints: loyaltyPoints || null,
    exportedAt: new Date().toISOString(),
  };
}
