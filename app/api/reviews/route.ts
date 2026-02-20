/**
 * Reviews API.
 *
 * GET  /api/reviews?productId=xxx     — get approved reviews for a product
 * POST /api/reviews                   — submit a new review (auth required)
 */

import { NextResponse } from 'next/server';
import { createReview, getProductReviews } from '@/lib/reviews';
import { rateLimit, getClientIP } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';

export async function GET(req: Request): Promise<NextResponse> {
  const { searchParams } = new URL(req.url);
  const productId = searchParams.get('productId');

  if (!productId) {
    return NextResponse.json({ error: 'productId is required' }, { status: 400 });
  }

  const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 50);
  const offset = parseInt(searchParams.get('offset') || '0', 10);

  try {
    const { createClient: createServerClient } = await import('@/lib/supabase/server');
    const supabase = await createServerClient();
    const reviews = await getProductReviews(supabase, productId, limit, offset);

    return NextResponse.json(
      { reviews, count: reviews.length },
      { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' } },
    );
  } catch (err) {
    logger.error('api.reviews.get_error', {
      productId,
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function POST(req: Request): Promise<NextResponse> {
  try {
    const { createClient: createServerClient } = await import('@/lib/supabase/server');
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limit: 10 reviews per hour
    const ip = getClientIP(req);
    const rl = rateLimit(`reviews:${user.id}`, {
      maxRequests: 10,
      windowSizeSeconds: 3600,
    });

    if (!rl.success) {
      return NextResponse.json(
        { error: 'Too many reviews. Please try again later.' },
        { status: 429 },
      );
    }

    const body = await req.json();
    const { productId, rating, title, body: reviewBody } = body;

    // Validate
    if (!productId || typeof productId !== 'string') {
      return NextResponse.json({ error: 'productId is required' }, { status: 400 });
    }
    if (!rating || typeof rating !== 'number' || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'rating must be 1-5' }, { status: 400 });
    }

    const result = await createReview(supabase, {
      productId,
      userId: user.id,
      rating,
      title,
      body: reviewBody,
    });

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 409 });
    }

    return NextResponse.json({ review: result.review }, { status: 201 });
  } catch (err) {
    logger.error('api.reviews.post_error', {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
