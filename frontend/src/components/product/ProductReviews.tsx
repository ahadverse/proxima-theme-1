'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { Star } from 'lucide-react';
import { toast } from 'sonner';
import { apiGet, apiMutate } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/Button';

interface Review {
  _id: string;
  customer?: { name?: string };
  isVerifiedPurchase?: boolean;
  rating: number;
  title?: string;
  comment: string;
  createdAt: string;
}

function StarRow({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'lg' }) {
  return (
    <span className={cn('flex text-amber-400', size === 'lg' ? 'text-lg' : 'text-sm')}>
      {'★'.repeat(rating)}
      <span className="text-white/15">{'★'.repeat(5 - rating)}</span>
    </span>
  );
}

export function ProductReviews({ productId }: { productId: string }) {
  const user = useAuthStore((s) => s.user);
  const status = useAuthStore((s) => s.status);
  const fetchMe = useAuthStore((s) => s.fetchMe);
  const [reviews, setReviews] = useState<Review[] | null>(null);
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    apiGet<Review[]>(`/products/${productId}/reviews`).then((data) => setReviews(data ?? []));
  }, [productId]);

  useEffect(() => {
    if (status === 'idle') void fetchMe();
  }, [status, fetchMe]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    const result = await apiMutate<Review>(`/products/${productId}/reviews`, 'POST', {
      rating,
      title: title || undefined,
      comment,
    });
    setIsSubmitting(false);

    if (result.ok) {
      // A new review is held for moderation, so it isn't added to the list yet.
      setTitle('');
      setComment('');
      setRating(5);
      setSubmitted(true);
      toast.success('Thanks for your review!');
    } else {
      toast.error(result.message || 'Could not submit your review');
    }
  }

  return (
    <div className="rounded-xl border border-white/10 bg-brand-surface-dark p-5">
      <h2 className="mb-4 text-lg font-bold text-white">Customer Reviews</h2>

      {reviews === null ? (
        <p className="text-sm text-brand-text-muted">Loading reviews…</p>
      ) : reviews.length === 0 ? (
        <p className="mb-5 text-sm text-brand-text-muted">No reviews yet — be the first to review this product.</p>
      ) : (
        <div className="mb-5 space-y-4 divide-y divide-white/10">
          {reviews.map((r) => (
            <div key={r._id} className="pt-4 first:pt-0">
              <div className="mb-1 flex items-center gap-2">
                <StarRow rating={r.rating} />
                <span className="text-sm font-semibold text-white">{r.customer?.name ?? 'Customer'}</span>
                {r.isVerifiedPurchase && (
                  <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-300">
                    Verified purchase
                  </span>
                )}
              </div>
              {r.title && <p className="text-sm font-medium text-brand-text-on-dark">{r.title}</p>}
              <p className="text-sm text-brand-text-muted">{r.comment}</p>
              <p className="mt-1 text-xs text-brand-text-muted">{new Date(r.createdAt).toLocaleDateString()}</p>
            </div>
          ))}
        </div>
      )}

      {user && submitted ? (
        <p role="status" className="border-t border-white/10 pt-4 text-sm text-brand-text-on-dark">
          Thank you! Your review has been received and will appear here once our team has approved it.
        </p>
      ) : user ? (
        <form onSubmit={handleSubmit} className="space-y-3 border-t border-white/10 pt-4">
          <p className="text-sm font-semibold text-brand-text-on-dark">Write a review</p>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setRating(n)}
                aria-label={`${n} star${n === 1 ? '' : 's'}`}
                aria-pressed={n === rating}
                className="text-amber-400"
              >
                <Star className={cn('h-5 w-5', n <= rating && 'fill-amber-400')} />
              </button>
            ))}
          </div>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            aria-label="Review title"
            placeholder="Review title (optional)"
            className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-brand-text-muted focus:border-brand-accent focus:outline-none"
          />
          <textarea
            required
            aria-label="Your review"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Share your experience with this product"
            rows={3}
            className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-brand-text-muted focus:border-brand-accent focus:outline-none"
          />
          <Button type="submit" isLoading={isSubmitting} size="sm">
            Submit Review
          </Button>
        </form>
      ) : (
        <p className="border-t border-white/10 pt-4 text-sm text-brand-text-muted">
          <Link href="/login" className="font-semibold text-brand-accent hover:underline">
            Log in
          </Link>{' '}
          to leave a review.
        </p>
      )}
    </div>
  );
}
