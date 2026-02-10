'use client';

import { useState, useEffect, useCallback, startTransition } from 'react';
import { Star, ThumbsUp, Send, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import type { Review } from '@/lib/supabase/database.types';

// StarRating component moved outside to avoid re-creation during render
interface StarRatingProps {
  value: number;
  interactive?: boolean;
  size?: 'sm' | 'md' | 'lg';
  hoverValue?: number;
  onRate?: (star: number) => void;
  onHover?: (star: number) => void;
  onLeave?: () => void;
}

function StarRating({ 
  value, 
  interactive = false, 
  size = 'md',
  hoverValue = 0,
  onRate,
  onHover,
  onLeave
}: StarRatingProps) {
  const sizeClasses = { sm: 'w-4 h-4', md: 'w-5 h-5', lg: 'w-6 h-6' };
  const displayValue = interactive ? (hoverValue || value) : value;

  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type={interactive ? 'button' : undefined}
          disabled={!interactive}
          onClick={() => interactive && onRate?.(star)}
          onMouseEnter={() => interactive && onHover?.(star)}
          onMouseLeave={() => interactive && onLeave?.()}
          className={interactive ? 'cursor-pointer' : 'cursor-default'}
        >
          <Star
            className={`${sizeClasses[size]} ${
              star <= displayValue
                ? 'fill-yellow-400 text-yellow-400'
                : 'fill-gray-200 text-gray-200'
            } transition-colors`}
          />
        </button>
      ))}
    </div>
  );
}

interface ProductReviewsProps {
  productId: string;
  locale: 'tr' | 'en';
  currentUserId?: string;
}

interface ReviewWithProfile extends Review {
  profiles?: {
    full_name: string | null;
    avatar_url: string | null;
  };
}

export default function ProductReviews({ productId, locale, currentUserId }: ProductReviewsProps) {
  const [reviews, setReviews] = useState<ReviewWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [avgRating, setAvgRating] = useState(0);
  const supabase = createClient();

  const t = {
    tr: {
      reviews: 'Değerlendirmeler',
      writeReview: 'Değerlendirme Yaz',
      noReviews: 'Henüz değerlendirme yok. İlk değerlendiren siz olun!',
      rating: 'Puan',
      title: 'Başlık',
      comment: 'Yorumunuz',
      submit: 'Gönder',
      helpful: 'Faydalı',
      verifiedPurchase: 'Doğrulanmış Alışveriş',
      cancel: 'İptal',
      thankYou: 'Değerlendirmeniz için teşekkürler!',
      loginRequired: 'Değerlendirme yapmak için giriş yapın',
      stars: 'yıldız',
      basedOn: 'değerlendirmeye göre',
    },
    en: {
      reviews: 'Reviews',
      writeReview: 'Write a Review',
      noReviews: 'No reviews yet. Be the first to review!',
      rating: 'Rating',
      title: 'Title',
      comment: 'Your Review',
      submit: 'Submit',
      helpful: 'Helpful',
      verifiedPurchase: 'Verified Purchase',
      cancel: 'Cancel',
      thankYou: 'Thank you for your review!',
      loginRequired: 'Login to write a review',
      stars: 'stars',
      basedOn: 'based on',
    },
  }[locale];

  const fetchReviews = useCallback(async () => {
    const { data, error } = await supabase
      .from('reviews')
      .select(`
        *,
        profiles:user_id (
          full_name,
          avatar_url
        )
      `)
      .eq('product_id', productId)
      .eq('is_approved', true)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setReviews(data);
      if (data.length > 0) {
        const avg = data.reduce((sum, r) => sum + r.rating, 0) / data.length;
        setAvgRating(Math.round(avg * 10) / 10);
      }
    }
    setLoading(false);
  }, [supabase, productId]);

  useEffect(() => {
    startTransition(() => {
      void fetchReviews();
    });
  }, [fetchReviews]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!currentUserId) return;

    setSubmitting(true);
    const { error } = await supabase.from('reviews').insert({
      product_id: productId,
      user_id: currentUserId,
      rating,
      title: title || null,
      comment: comment || null,
      is_approved: true, // Auto-approve for now
    });

    if (!error) {
      setShowForm(false);
      setRating(5);
      setTitle('');
      setComment('');
      fetchReviews();
    }
    setSubmitting(false);
  }

  async function handleHelpful(reviewId: string) {
    if (!currentUserId) return;

    // Check if already voted
    const { data: existing } = await supabase
      .from('review_helpful_votes')
      .select('id')
      .eq('review_id', reviewId)
      .eq('user_id', currentUserId)
      .single();

    if (existing) return;

    await supabase.from('review_helpful_votes').insert({
      review_id: reviewId,
      user_id: currentUserId,
    });

    // Update local state
    setReviews(reviews.map(r => 
      r.id === reviewId ? { ...r, helpful_count: r.helpful_count + 1 } : r
    ));
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/3" />
        <div className="h-24 bg-gray-200 rounded" />
        <div className="h-24 bg-gray-200 rounded" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">{t.reviews}</h2>
          {reviews.length > 0 && (
            <div className="flex items-center gap-2 mt-1">
              <StarRating value={avgRating} size="sm" />
              <span className="text-sm text-gray-600">
                {avgRating} ({reviews.length} {t.basedOn})
              </span>
            </div>
          )}
        </div>
        {currentUserId && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-amber-500 text-white rounded-lg font-medium hover:bg-amber-600 transition-colors"
          >
            {t.writeReview}
          </button>
        )}
      </div>

      {/* Review Form */}
      <AnimatePresence>
        {showForm && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleSubmit}
            className="bg-amber-50 rounded-xl p-6 space-y-4 overflow-hidden"
          >
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t.rating}</label>
              <StarRating 
                value={rating} 
                interactive 
                size="lg" 
                hoverValue={hoverRating}
                onRate={setRating}
                onHover={setHoverRating}
                onLeave={() => setHoverRating(0)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t.title}</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                placeholder={locale === 'tr' ? 'Kısa bir başlık' : 'A short title'}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t.comment}</label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={4}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
                placeholder={locale === 'tr' ? 'Deneyiminizi paylaşın...' : 'Share your experience...'}
              />
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-2 px-6 py-2 bg-amber-500 text-white rounded-lg font-medium hover:bg-amber-600 transition-colors disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                {t.submit}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-6 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                {t.cancel}
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Reviews List */}
      <div className="space-y-4">
        {reviews.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-xl">
            <Star className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">{t.noReviews}</p>
          </div>
        ) : (
          reviews.map((review, index) => (
            <motion.div
              key={review.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white rounded-xl border border-gray-100 p-5"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                    {review.profiles?.avatar_url ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img 
                        src={review.profiles.avatar_url} 
                        alt="" 
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <User className="w-5 h-5 text-amber-600" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">
                      {review.profiles?.full_name || (locale === 'tr' ? 'Anonim' : 'Anonymous')}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(review.created_at).toLocaleDateString(locale === 'tr' ? 'tr-TR' : 'en-US')}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <StarRating value={review.rating} size="sm" />
                  {review.is_verified_purchase && (
                    <span className="text-xs text-green-600 font-medium">{t.verifiedPurchase}</span>
                  )}
                </div>
              </div>

              {review.title && (
                <h4 className="font-semibold text-gray-800 mb-2">{review.title}</h4>
              )}
              
              {review.comment && (
                <p className="text-gray-600 mb-4">{review.comment}</p>
              )}

              {review.images && review.images.length > 0 && (
                <div className="flex gap-2 mb-4">
                  {review.images.map((img, i) => (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img 
                      key={i}
                      src={img}
                      alt=""
                      className="w-20 h-20 object-cover rounded-lg"
                    />
                  ))}
                </div>
              )}

              <button
                onClick={() => handleHelpful(review.id)}
                className="flex items-center gap-2 text-sm text-gray-500 hover:text-amber-600 transition-colors"
              >
                <ThumbsUp className="w-4 h-4" />
                {t.helpful} ({review.helpful_count})
              </button>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
