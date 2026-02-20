/**
 * Email logging service.
 *
 * Records every transactional email to the `email_logs` table
 * for audit, debugging, and delivery tracking.
 *
 * Usage:
 *   import { logEmail } from '@/lib/email-log';
 *   await logEmail(admin, { to, subject, template, resendId, metadata });
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';

export interface EmailLogEntry {
  to: string;
  subject: string;
  template: string;
  status?: 'sent' | 'delivered' | 'bounced' | 'failed';
  resendId?: string | null;
  metadata?: Record<string, unknown>;
  error?: string | null;
}

/**
 * Write an email log entry to the database.
 * Non-blocking — catches and logs errors instead of throwing.
 */
export async function logEmail(
  admin: SupabaseClient,
  entry: EmailLogEntry,
): Promise<void> {
  try {
    const { error } = await admin.from('email_logs').insert({
      to_address: entry.to,
      subject: entry.subject,
      template: entry.template,
      status: entry.status || 'sent',
      resend_id: entry.resendId || null,
      metadata: entry.metadata || {},
      error: entry.error || null,
    });

    if (error) {
      // Don't throw — email sending should not fail because logging failed
      logger.warn('email_log.insert_failed', { error: error.message, template: entry.template });
    }
  } catch (err) {
    logger.warn('email_log.unexpected_error', {
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

/**
 * Update an email log entry status (e.g. when Resend fires a webhook).
 */
export async function updateEmailLogStatus(
  admin: SupabaseClient,
  resendId: string,
  status: 'delivered' | 'bounced' | 'failed',
  error?: string,
): Promise<void> {
  try {
    await admin
      .from('email_logs')
      .update({ status, error: error || null })
      .eq('resend_id', resendId);
  } catch (err) {
    logger.warn('email_log.update_failed', {
      resendId,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
