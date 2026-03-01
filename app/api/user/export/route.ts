/**
 * GDPR Export Endpoint.
 *
 * POST /api/user/export
 *
 * Returns all user data as a JSON download.
 * Rate limited to 3 requests per day per user.
 *
 * Requires: authenticated session
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { exportUserData } from '@/lib/gdpr';
import { rateLimit, getClientIP } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';
import { env } from '@/lib/env';
import { apiErrorResponse, getRequestId } from '@/lib/api-error';
import { E_AUTH_SESSION_MISSING, E_INTERNAL, E_RATE_LIMITED } from '@/lib/error-codes';

export async function POST(req: Request): Promise<NextResponse> {
  const requestId = getRequestId(req);
  try {
    const { createClient: createServerClient } = await import('@/lib/supabase/server');
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return apiErrorResponse(E_AUTH_SESSION_MISSING, 'Unauthorized', 401, requestId);
    }

    // Rate limit: 3 per day
    const ip = getClientIP(req);
    const rl = rateLimit(`gdpr-export:${user.id}`, {
      maxRequests: 3,
      windowSizeSeconds: 86400,
    });

    if (!rl.success) {
      return apiErrorResponse(
        E_RATE_LIMITED,
        'Rate limit exceeded. Max 3 exports per day.',
        429,
        requestId,
        { headers: { 'Retry-After': '86400' } },
      );
    }

    const admin = createClient(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.SUPABASE_SERVICE_ROLE_KEY,
    );

    const data = await exportUserData(admin, user.id, ip || undefined);

    return new NextResponse(JSON.stringify(data, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="user-data-export-${new Date().toISOString().slice(0, 10)}.json"`,
      },
    });
  } catch (err) {
    logger.error('api.gdpr_export.error', {
      error: err instanceof Error ? err.message : String(err),
    });
    return apiErrorResponse(E_INTERNAL, 'Internal error', 500, requestId);
  }
}
