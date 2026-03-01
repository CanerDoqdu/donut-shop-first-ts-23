/**
 * Reviews API.
 *
 * GET  /api/reviews?productId=xxx     — get approved reviews for a product
 * POST /api/reviews                   — submit a new review (auth required)
 */

import { NextResponse } from 'next/server';
import { createReview, getProductReviews } from '@/lib/reviews';
import { rateLimit } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';
import { apiErrorResponse, getRequestId } from '@/lib/api-error';
import { E_AUTH_SESSION_MISSING, E_INTERNAL, E_RATE_LIMITED, E_VALIDATION_FAILED } from '@/lib/error-codes';
import { withVersionHeader } from '@/lib/api-handler';

export async function GET(req: Request): Promise<NextResponse> {
  const requestId = getRequestId(req);
  const { searchParams } = new URL(req.url);
  const productId = searchParams.get('productId');

  if (!productId) {
    return withVersionHeader(apiErrorResponse(E_VALIDATION_FAILED, 'productId is required', 400, requestId));
  }

  const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 50);
  const offset = parseInt(searchParams.get('offset') || '0', 10);

  try {
    const { createClient: createServerClient } = await import('@/lib/supabase/server');
    const supabase = await createServerClient();
    const reviews = await getProductReviews(supabase, productId, limit, offset);

    return withVersionHeader(NextResponse.json(
      { reviews, count: reviews.length },
      { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120', 'x-request-id': requestId } },
    ));
  } catch (err) {
    logger.error('api.reviews.get_error', {
      productId,
      error: err instanceof Error ? err.message : String(err),
    });
    return withVersionHeader(apiErrorResponse(E_INTERNAL, 'Internal error', 500, requestId));
  }
}

export async function POST(req: Request): Promise<NextResponse> {
  const requestId = getRequestId(req);
  try {
    const { createClient: createServerClient } = await import('@/lib/supabase/server');
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return withVersionHeader(apiErrorResponse(E_AUTH_SESSION_MISSING, 'Unauthorized', 401, requestId));
    }

    // Rate limit: 10 reviews per hour
    const rl = rateLimit(`reviews:${user.id}`, {
      maxRequests: 10,
      windowSizeSeconds: 3600,
    });

    if (!rl.success) {
      return withVersionHeader(apiErrorResponse(
        E_RATE_LIMITED,
        'Too many reviews. Please try again later.',
        429,
        requestId,
      ));
    }

    const body = await req.json();
    const { productId, rating, title, body: reviewBody } = body;

    // Validate
    if (!productId || typeof productId !== 'string') {
      return withVersionHeader(apiErrorResponse(E_VALIDATION_FAILED, 'productId is required', 400, requestId));
    }
    if (!rating || typeof rating !== 'number' || rating < 1 || rating > 5) {
      return withVersionHeader(apiErrorResponse(E_VALIDATION_FAILED, 'rating must be 1-5', 400, requestId));
    }

    const result = await createReview(supabase, {
      productId,
      userId: user.id,
      rating,
      title,
      body: reviewBody,
    });

    if (result.error) {
      return withVersionHeader(apiErrorResponse(E_VALIDATION_FAILED, result.error, 409, requestId));
    }

    return withVersionHeader(NextResponse.json({ review: result.review }, { status: 201, headers: { 'x-request-id': requestId } }));
  } catch (err) {
    logger.error('api.reviews.post_error', {
      error: err instanceof Error ? err.message : String(err),
    });
    return withVersionHeader(apiErrorResponse(E_INTERNAL, 'Internal error', 500, requestId));
  }
}
