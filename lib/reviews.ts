/**
 * Review Moderation State Machine.
 *
 * Valid transitions:
 *   pending  → approved | rejected | flagged
 *   flagged  → approved | rejected
 *   approved → (no transitions — final)
 *   rejected → (no transitions — final)
 *
 * Enforces transition rules at the application layer.
 * DB trigger auto-flags suspicious reviews on INSERT.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';

export type ReviewStatus = 'pending' | 'approved' | 'rejected' | 'flagged';

export interface Review {
  id: string;
  product_id: string;
  user_id: string;
  rating: number;
  title: string | null;
  body: string | null;
  status: ReviewStatus;
  flag_reason: string | null;
  moderated_by: string | null;
  moderated_at: string | null;
  created_at: string;
  updated_at: string;
}

// ─── State Machine ──────────────────────────────────────────

const VALID_TRANSITIONS: Record<ReviewStatus, ReviewStatus[]> = {
  pending: ['approved', 'rejected', 'flagged'],
  flagged: ['approved', 'rejected'],
  approved: [],
  rejected: [],
};

/**
 * Check if a status transition is valid.
 */
export function isValidTransition(
  from: ReviewStatus,
  to: ReviewStatus,
): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Get all valid next states from the current state.
 */
export function getValidTransitions(status: ReviewStatus): ReviewStatus[] {
  return VALID_TRANSITIONS[status] ?? [];
}

// ─── Review Operations ──────────────────────────────────────

export interface CreateReviewInput {
  productId: string;
  userId: string;
  rating: number;
  title?: string;
  body?: string;
}

/**
 * Create a new review (starts as pending, may be auto-flagged by DB trigger).
 */
export async function createReview(
  client: SupabaseClient,
  input: CreateReviewInput,
): Promise<{ review: Review | null; error: string | null }> {
  const { data, error } = await client
    .from('reviews')
    .insert({
      product_id: input.productId,
      user_id: input.userId,
      rating: input.rating,
      title: input.title || null,
      body: input.body || null,
      status: 'pending',
    })
    .select()
    .single();

  if (error) {
    // Unique constraint violation → already reviewed
    if (error.code === '23505') {
      return { review: null, error: 'You have already reviewed this product' };
    }
    logger.warn('review.create_failed', { productId: input.productId, error: error.message });
    return { review: null, error: error.message };
  }

  return { review: data as Review, error: null };
}

/**
 * Moderate a review: transition its status.
 * Only admin users should call this.
 */
export async function moderateReview(
  admin: SupabaseClient,
  reviewId: string,
  newStatus: ReviewStatus,
  moderatorId: string,
  reason?: string,
): Promise<{ success: boolean; error: string | null }> {
  // Fetch current review
  const { data: review, error: fetchError } = await admin
    .from('reviews')
    .select('id, status')
    .eq('id', reviewId)
    .single();

  if (fetchError || !review) {
    return { success: false, error: 'Review not found' };
  }

  const currentStatus = review.status as ReviewStatus;

  // Validate transition
  if (!isValidTransition(currentStatus, newStatus)) {
    return {
      success: false,
      error: `Invalid transition: ${currentStatus} → ${newStatus}. Valid: ${getValidTransitions(currentStatus).join(', ') || 'none (final state)'}`,
    };
  }

  // Apply transition
  const { error: updateError } = await admin
    .from('reviews')
    .update({
      status: newStatus,
      moderated_by: moderatorId,
      moderated_at: new Date().toISOString(),
      flag_reason: reason || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', reviewId);

  if (updateError) {
    logger.warn('review.moderate_failed', { reviewId, error: updateError.message });
    return { success: false, error: updateError.message };
  }

  logger.info('review.moderated', {
    reviewId,
    from: currentStatus,
    to: newStatus,
    moderatorId,
  });

  return { success: true, error: null };
}

/**
 * Get approved reviews for a product (public-facing).
 */
export async function getProductReviews(
  client: SupabaseClient,
  productId: string,
  limit = 20,
  offset = 0,
): Promise<Review[]> {
  const { data } = await client
    .from('reviews')
    .select('*')
    .eq('product_id', productId)
    .eq('status', 'approved')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  return (data as Review[]) || [];
}

/**
 * Get reviews pending moderation (admin queue).
 */
export async function getModerationQueue(
  admin: SupabaseClient,
  limit = 50,
): Promise<Review[]> {
  const { data } = await admin
    .from('reviews')
    .select('*')
    .in('status', ['pending', 'flagged'])
    .order('created_at', { ascending: true })
    .limit(limit);

  return (data as Review[]) || [];
}
