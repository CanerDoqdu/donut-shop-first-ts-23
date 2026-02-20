/**
 * GDPR Delete Endpoint.
 *
 * POST /api/user/delete
 *
 * Anonymizes all PII for the authenticated user.
 * Rate limited to 1 request per day per user.
 *
 * Requires: authenticated session
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { deleteUserData } from '@/lib/gdpr';
import { rateLimit, getClientIP } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';
import { env } from '@/lib/env';

export async function POST(req: Request): Promise<NextResponse> {
  try {
    // Create user-scoped client to verify auth
    const { createClient: createServerClient } = await import('@/lib/supabase/server');
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limit: 1 per day
    const ip = getClientIP(req);
    const rl = rateLimit(`gdpr-delete:${user.id}`, {
      maxRequests: 1,
      windowSizeSeconds: 86400, // 24 hours
    });

    if (!rl.success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. You can only request deletion once per day.' },
        { status: 429, headers: { 'Retry-After': '86400' } },
      );
    }

    // Use admin client for data operations
    const admin = createClient(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.SUPABASE_SERVICE_ROLE_KEY,
    );

    const result = await deleteUserData(admin, user.id, ip || undefined);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Deletion partially failed', details: result },
        { status: 500 },
      );
    }

    return NextResponse.json({
      message: 'Your data has been anonymized',
      anonymizedFields: result.anonymizedFields,
      ordersAnonymized: result.ordersAnonymized,
    });
  } catch (err) {
    logger.error('api.gdpr_delete.error', {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
