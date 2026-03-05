/**
 * Admin Review Moderation API.
 *
 * GET   /api/admin/reviews           — get moderation queue (pending + flagged)
 * PATCH /api/admin/reviews           — moderate a review (approve/reject/flag)
 */

import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { moderateReview, getModerationQueue } from '@/lib/reviews';
import type { ReviewStatus } from '@/lib/reviews';
import { logger } from '@/lib/logger';
import { env } from '@/lib/env';
import { apiErrorResponse, getRequestId } from '@/lib/api-error';
import { E_AUTH_SESSION_MISSING, E_INTERNAL, E_VALIDATION_FAILED } from '@/lib/error-codes';
import { withVersionHeader } from '@/lib/api-handler';
import { validateOrigin } from '@/lib/security';

async function getAdminUser() {
  const { createClient: createServerClient } = await import('@/lib/supabase/server');
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Check admin role
  const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  const { data: adminMembership } = await admin
    .from('admin_users')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!adminMembership) return null;
  return { userId: user.id, admin };
}

export async function GET(req: Request): Promise<NextResponse> {
  const requestId = getRequestId(req);
  const adminCtx = await getAdminUser();
  if (!adminCtx) {
    return withVersionHeader(apiErrorResponse(E_AUTH_SESSION_MISSING, 'Unauthorized', 401, requestId));
  }

  try {
    const reviews = await getModerationQueue(adminCtx.admin);
    return withVersionHeader(NextResponse.json({ reviews, count: reviews.length }, { headers: { 'x-request-id': requestId } }));
  } catch (err) {
    logger.error('api.admin_reviews.get_error', {
      error: err instanceof Error ? err.message : String(err),
    });
    return withVersionHeader(apiErrorResponse(E_INTERNAL, 'Internal error', 500, requestId));
  }
}

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  const requestId = getRequestId(req);
  const csrfError = validateOrigin(req);
  if (csrfError) {
    return withVersionHeader(csrfError);
  }

  const adminCtx = await getAdminUser();
  if (!adminCtx) {
    return withVersionHeader(apiErrorResponse(E_AUTH_SESSION_MISSING, 'Unauthorized', 401, requestId));
  }

  try {
    const body = await req.json();
    const { reviewId, status, reason } = body as {
      reviewId: string;
      status: ReviewStatus;
      reason?: string;
    };

    if (!reviewId || !status) {
      return withVersionHeader(apiErrorResponse(
        E_VALIDATION_FAILED,
        'reviewId and status are required',
        400,
        requestId,
      ));
    }

    if (!['approved', 'rejected', 'flagged'].includes(status)) {
      return withVersionHeader(apiErrorResponse(
        E_VALIDATION_FAILED,
        'status must be approved, rejected, or flagged',
        400,
        requestId,
      ));
    }

    const result = await moderateReview(
      adminCtx.admin,
      reviewId,
      status,
      adminCtx.userId,
      reason,
    );

    if (!result.success) {
      return withVersionHeader(apiErrorResponse(
        E_VALIDATION_FAILED,
        result.error ?? 'Review moderation failed',
        422,
        requestId,
      ));
    }

    return withVersionHeader(NextResponse.json(
      { success: true, reviewId, newStatus: status },
      { headers: { 'x-request-id': requestId } },
    ));
  } catch (err) {
    logger.error('api.admin_reviews.patch_error', {
      error: err instanceof Error ? err.message : String(err),
    });
    return withVersionHeader(apiErrorResponse(E_INTERNAL, 'Internal error', 500, requestId));
  }
}
