/**
 * Admin Review Moderation API.
 *
 * GET   /api/admin/reviews           — get moderation queue (pending + flagged)
 * PATCH /api/admin/reviews           — moderate a review (approve/reject/flag)
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { moderateReview, getModerationQueue } from '@/lib/reviews';
import type { ReviewStatus } from '@/lib/reviews';
import { logger } from '@/lib/logger';
import { env } from '@/lib/env';

async function getAdminUser() {
  const { createClient: createServerClient } = await import('@/lib/supabase/server');
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Check admin role
  const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  const { data: profile } = await admin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') return null;
  return { userId: user.id, admin };
}

export async function GET(): Promise<NextResponse> {
  const adminCtx = await getAdminUser();
  if (!adminCtx) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const reviews = await getModerationQueue(adminCtx.admin);
    return NextResponse.json({ reviews, count: reviews.length });
  } catch (err) {
    logger.error('api.admin_reviews.get_error', {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function PATCH(req: Request): Promise<NextResponse> {
  const adminCtx = await getAdminUser();
  if (!adminCtx) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { reviewId, status, reason } = body as {
      reviewId: string;
      status: ReviewStatus;
      reason?: string;
    };

    if (!reviewId || !status) {
      return NextResponse.json(
        { error: 'reviewId and status are required' },
        { status: 400 },
      );
    }

    if (!['approved', 'rejected', 'flagged'].includes(status)) {
      return NextResponse.json(
        { error: 'status must be approved, rejected, or flagged' },
        { status: 400 },
      );
    }

    const result = await moderateReview(
      adminCtx.admin,
      reviewId,
      status,
      adminCtx.userId,
      reason,
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 422 });
    }

    return NextResponse.json({ success: true, reviewId, newStatus: status });
  } catch (err) {
    logger.error('api.admin_reviews.patch_error', {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
