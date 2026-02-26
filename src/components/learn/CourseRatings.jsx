import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, MessageSquare, Edit3, Send, User } from 'lucide-react';
import { db } from '@/api/supabaseClient';
import { useUser } from '@/components/context/UserContext';
import { useTheme } from '@/contexts/GlobalThemeContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';

function StarRating({ value, onChange, size = 'md', interactive = false }) {
  const [hovered, setHovered] = useState(0);
  const sizeClass = size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-7 h-7' : 'w-5 h-5';

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = interactive ? star <= (hovered || value) : star <= value;
        return (
          <Star
            key={star}
            className={`${sizeClass} transition-colors ${
              filled ? 'text-yellow-400 fill-yellow-400' : 'text-zinc-600'
            } ${interactive ? 'cursor-pointer hover:scale-110 transition-transform' : ''}`}
            onMouseEnter={() => interactive && setHovered(star)}
            onMouseLeave={() => interactive && setHovered(0)}
            onClick={() => interactive && onChange?.(star)}
          />
        );
      })}
    </div>
  );
}

function RatingBar({ stars, count, total, lt }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className={`w-4 text-right ${lt('text-slate-500', 'text-zinc-400')}`}>{stars}</span>
      <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
      <div className={`flex-1 h-2 rounded-full ${lt('bg-slate-200', 'bg-zinc-800')}`}>
        <motion.div
          className="h-full rounded-full bg-yellow-400"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, delay: (5 - stars) * 0.08 }}
        />
      </div>
      <span className={`w-8 text-right text-xs ${lt('text-slate-400', 'text-zinc-500')}`}>{count}</span>
    </div>
  );
}

export default function CourseRatings({ courseId, userId, compact = false }) {
  const { user } = useUser();
  const { lt } = useTheme();

  const [ratings, setRatings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedRating, setSelectedRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const effectiveUserId = userId || user?.id;

  const loadRatings = useCallback(async () => {
    if (!courseId) return;
    try {
      const data = await db.entities.CourseRating.filter(
        { course_id: courseId },
        { order: { column: 'created_date', ascending: false } }
      );
      setRatings(data || []);
    } catch (err) {
      console.warn('[CourseRatings] Load failed:', err.message);
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    loadRatings();
  }, [loadRatings]);

  const stats = useMemo(() => {
    if (!ratings.length) return { avg: 0, total: 0, dist: [0, 0, 0, 0, 0] };
    const dist = [0, 0, 0, 0, 0];
    let sum = 0;
    ratings.forEach((r) => {
      const val = Math.max(1, Math.min(5, r.rating));
      dist[val - 1]++;
      sum += val;
    });
    return { avg: sum / ratings.length, total: ratings.length, dist };
  }, [ratings]);

  const userReview = useMemo(
    () => ratings.find((r) => r.user_id === effectiveUserId),
    [ratings, effectiveUserId]
  );

  const openDialog = useCallback((editing = false) => {
    if (editing && userReview) {
      setSelectedRating(userReview.rating);
      setReviewText(userReview.review_text || '');
    } else {
      setSelectedRating(0);
      setReviewText('');
    }
    setDialogOpen(true);
  }, [userReview]);

  const handleSubmit = async () => {
    if (!selectedRating) {
      toast.error('Please select a star rating');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        course_id: courseId,
        user_id: effectiveUserId,
        rating: selectedRating,
        review_text: reviewText.trim() || null,
        created_date: new Date().toISOString(),
      };

      if (userReview) {
        await db.entities.CourseRating.update(userReview.id, payload);
        toast.success('Review updated');
      } else {
        await db.entities.CourseRating.create(payload);
        toast.success('Review submitted');
      }
      setDialogOpen(false);
      await loadRatings();
    } catch (err) {
      console.error('[CourseRatings] Submit failed:', err);
      toast.error('Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  // -- Compact mode: inline average + count --
  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex items-center gap-2"
      >
        <StarRating value={Math.round(stats.avg)} size="sm" />
        <span className={`text-sm font-medium ${lt('text-slate-600', 'text-zinc-300')}`}>
          {stats.avg > 0 ? stats.avg.toFixed(1) : '--'}
        </span>
        <span className={`text-xs ${lt('text-slate-400', 'text-zinc-500')}`}>
          ({stats.total} {stats.total === 1 ? 'review' : 'reviews'})
        </span>
      </motion.div>
    );
  }

  // -- Full mode --
  if (loading) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="space-y-4"
    >
      {/* Summary + Distribution */}
      <div className={`${lt(
        'bg-white border border-slate-200 shadow-sm',
        'bg-zinc-900/50 border border-zinc-800/60'
      )} rounded-xl p-5`}>
        <div className="flex flex-col sm:flex-row gap-6">
          {/* Average */}
          <div className="flex flex-col items-center justify-center gap-1 min-w-[120px]">
            <span className={`text-4xl font-bold ${lt('text-slate-800', 'text-white')}`}>
              {stats.avg > 0 ? stats.avg.toFixed(1) : '--'}
            </span>
            <StarRating value={Math.round(stats.avg)} size="md" />
            <span className={`text-xs mt-1 ${lt('text-slate-400', 'text-zinc-500')}`}>
              {stats.total} {stats.total === 1 ? 'rating' : 'ratings'}
            </span>
          </div>

          {/* Distribution */}
          <div className="flex-1 space-y-1.5">
            {[5, 4, 3, 2, 1].map((star) => (
              <RatingBar
                key={star}
                stars={star}
                count={stats.dist[star - 1]}
                total={stats.total}
                lt={lt}
              />
            ))}
          </div>
        </div>

        {/* Action */}
        <div className="mt-4 pt-4 border-t border-zinc-800/40 flex items-center justify-between">
          {userReview ? (
            <div className="flex items-center gap-3">
              <Badge className="bg-teal-500/15 text-teal-400 border-teal-500/30 text-xs">
                Your rating: {userReview.rating}/5
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                className={`text-xs ${lt('text-slate-500 hover:text-slate-700', 'text-zinc-400 hover:text-zinc-200')}`}
                onClick={() => openDialog(true)}
              >
                <Edit3 className="w-3.5 h-3.5 mr-1" />
                Edit
              </Button>
            </div>
          ) : (
            <Button
              size="sm"
              className="bg-teal-600 hover:bg-teal-500 text-white text-xs"
              onClick={() => openDialog(false)}
            >
              <Star className="w-3.5 h-3.5 mr-1.5" />
              Rate this course
            </Button>
          )}
          <div className="flex items-center gap-1.5">
            <MessageSquare className={`w-4 h-4 ${lt('text-slate-400', 'text-zinc-500')}`} />
            <span className={`text-xs ${lt('text-slate-400', 'text-zinc-500')}`}>
              {ratings.filter((r) => r.review_text).length} written reviews
            </span>
          </div>
        </div>
      </div>

      {/* Review List */}
      {ratings.length > 0 && (
        <div className="space-y-3">
          <h4 className={`text-sm font-semibold ${lt('text-slate-600', 'text-zinc-400')}`}>
            Recent Reviews
          </h4>
          <AnimatePresence>
            {ratings.slice(0, 6).map((review, idx) => (
              <motion.div
                key={review.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25, delay: idx * 0.05 }}
                className={`${lt(
                  'bg-white border border-slate-200 shadow-sm',
                  'bg-zinc-900/50 border border-zinc-800/60'
                )} rounded-xl p-4`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${lt(
                      'bg-slate-100 text-slate-400',
                      'bg-zinc-800 text-zinc-500'
                    )}`}>
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-medium ${lt('text-slate-700', 'text-zinc-200')}`}>
                          {review.user_id === effectiveUserId ? 'You' : 'Learner'}
                        </span>
                        {review.user_id === effectiveUserId && (
                          <Badge className="bg-teal-500/15 text-teal-400 border-teal-500/30 text-[10px] px-1.5 py-0">
                            yours
                          </Badge>
                        )}
                      </div>
                      <StarRating value={review.rating} size="sm" />
                    </div>
                  </div>
                  <span className={`text-xs ${lt('text-slate-400', 'text-zinc-500')} whitespace-nowrap`}>
                    {review.created_date
                      ? new Date(review.created_date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })
                      : ''}
                  </span>
                </div>
                {review.review_text && (
                  <p className={`mt-2.5 text-sm leading-relaxed ${lt('text-slate-600', 'text-zinc-400')}`}>
                    {review.review_text}
                  </p>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Submit / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className={`${lt(
          'bg-white border-slate-200',
          'bg-zinc-950 border-zinc-800'
        )} max-w-md`}>
          <DialogHeader>
            <DialogTitle className={lt('text-slate-800', 'text-white')}>
              {userReview ? 'Edit Your Review' : 'Rate This Course'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Star selector */}
            <div className="flex flex-col items-center gap-2">
              <p className={`text-sm ${lt('text-slate-500', 'text-zinc-400')}`}>
                How would you rate this course?
              </p>
              <StarRating
                value={selectedRating}
                onChange={setSelectedRating}
                size="lg"
                interactive
              />
              {selectedRating > 0 && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-xs text-yellow-400 font-medium"
                >
                  {['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent'][selectedRating]}
                </motion.span>
              )}
            </div>

            {/* Review text */}
            <div>
              <label className={`block text-sm mb-1.5 ${lt('text-slate-600', 'text-zinc-400')}`}>
                Review (optional)
              </label>
              <textarea
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                rows={4}
                maxLength={1000}
                placeholder="Share your thoughts about this course..."
                className={`w-full rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-teal-500/50 ${lt(
                  'bg-slate-50 border border-slate-200 text-slate-700 placeholder:text-slate-400',
                  'bg-zinc-900 border border-zinc-700 text-zinc-200 placeholder:text-zinc-600'
                )}`}
              />
              <div className={`text-right text-xs mt-1 ${lt('text-slate-400', 'text-zinc-600')}`}>
                {reviewText.length}/1000
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDialogOpen(false)}
              className={lt('text-slate-500', 'text-zinc-400')}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!selectedRating || submitting}
              onClick={handleSubmit}
              className="bg-teal-600 hover:bg-teal-500 text-white"
            >
              <Send className="w-3.5 h-3.5 mr-1.5" />
              {submitting ? 'Submitting...' : userReview ? 'Update' : 'Submit'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
