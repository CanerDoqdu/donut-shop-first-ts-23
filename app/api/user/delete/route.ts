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

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { deleteUserData } from '@/lib/gdpr';
import { rateLimit, getClientIP } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';
import { env } from '@/lib/env';
import { apiErrorResponse, getRequestId } from '@/lib/api-error';
import { E_AUTH_SESSION_MISSING, E_INTERNAL, E_RATE_LIMITED } from '@/lib/error-codes';
import { validateOrigin } from '@/lib/security';

export async function POST(req: NextRequest): Promise<NextResponse> {
  const requestId = getRequestId(req);

  // CSRF: verify request origin (prevents cross-site mutation)
  const csrfError = validateOrigin(req);
  if (csrfError) return csrfError;
  try {
    // Create user-scoped client to verify auth
    const { createClient: createServerClient } = await import('@/lib/supabase/server');
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return apiErrorResponse(E_AUTH_SESSION_MISSING, 'Unauthorized', 401, requestId);
    }

    // Rate limit: 1 per day
    const ip = getClientIP(req);
    const rl = rateLimit(`gdpr-delete:${user.id}`, {
      maxRequests: 1,
      windowSizeSeconds: 86400, // 24 hours
    });

    if (!rl.success) {
      return apiErrorResponse(
        E_RATE_LIMITED,
        'Rate limit exceeded. You can only request deletion once per day.',
        429,
        requestId,
        { headers: { 'Retry-After': '86400' } },
      );
    }

    // Use admin client for data operations
    const admin = createClient(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.SUPABASE_SERVICE_ROLE_KEY,
    );

    const result = await deleteUserData(admin, user.id, ip || undefined);

    if (!result.success) {
      return apiErrorResponse(
        E_INTERNAL,
        'Deletion partially failed',
        500,
        requestId,
        { details: { ...result } },
      );
    }

    return NextResponse.json({
      message: 'Your data has been anonymized',
      anonymizedFields: result.anonymizedFields,
      ordersAnonymized: result.ordersAnonymized,
    }, { headers: { 'x-request-id': requestId } });
  } catch (err) {
    logger.error('api.gdpr_delete.error', {
      error: err instanceof Error ? err.message : String(err),
    });
    return apiErrorResponse(E_INTERNAL, 'Internal error', 500, requestId);
  }
}
