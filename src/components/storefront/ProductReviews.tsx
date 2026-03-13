import { useState } from 'react';
import { Star, MessageSquare, CheckCircle2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useProductReviews, useSubmitReview } from '@/hooks/useProductReviews';
import { useCountry } from '@/contexts/CountryContext';
import { cn } from '@/lib/utils';

interface ProductReviewsProps {
  productId: string;
  shopId: string;
}

const RATING_LABELS = ['', 'Mauvais', 'Passable', 'Bien', 'Très bien', 'Excellent'];

const AVATAR_COLORS = [
  'bg-rose-500', 'bg-amber-500', 'bg-emerald-500',
  'bg-sky-500', 'bg-violet-500', 'bg-fuchsia-500',
  'bg-teal-500', 'bg-orange-500',
];

function hashCode(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function getInitials(name: string) {
  return name.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "À l'instant";
  if (mins < 60) return `il y a ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `il y a ${days}j`;
  const months = Math.floor(days / 30);
  if (months < 12) return `il y a ${months} mois`;
  return `il y a ${Math.floor(months / 12)} an(s)`;
}

function StarRating({ rating, onRate, interactive = false, size = 'md', hovered }: {
  rating: number;
  onRate?: (r: number) => void;
  interactive?: boolean;
  size?: 'sm' | 'md' | 'lg';
  hovered?: number;
}) {
  const sizeClass = size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-7 h-7' : 'w-5 h-5';
  const display = hovered !== undefined && hovered > 0 ? hovered : rating;

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <button
          key={i}
          type="button"
          disabled={!interactive}
          onClick={() => onRate?.(i)}
          className={cn(
            'transition-transform',
            interactive && 'cursor-pointer hover:scale-125'
          )}
        >
          <Star
            className={cn(
              sizeClass,
              'transition-colors',
              i <= display
                ? 'fill-amber-400 text-amber-400'
                : 'fill-muted text-muted-foreground/30'
            )}
          />
        </button>
      ))}
    </div>
  );
}

function ReviewAvatar({ name }: { name: string }) {
  const bg = AVATAR_COLORS[hashCode(name) % AVATAR_COLORS.length];
  return (
    <div className={cn('w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm shrink-0', bg)}>
      {getInitials(name)}
    </div>
  );
}

export default function ProductReviews({ productId, shopId }: ProductReviewsProps) {
  const { data: reviews = [], isLoading } = useProductReviews(productId);
  const submitReview = useSubmitReview();
  const { country } = useCountry();

  const [fullName, setFullName] = useState('');
  const [reviewText, setReviewText] = useState('');
  const [rating, setRating] = useState(0);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  const avgRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0;

  // Distribution
  const dist = [0, 0, 0, 0, 0];
  reviews.forEach(r => { if (r.rating >= 1 && r.rating <= 5) dist[r.rating - 1]++; });
  const maxDist = Math.max(...dist, 1);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || rating === 0) return;

    await submitReview.mutateAsync({
      product_id: productId,
      shop_id: shopId,
      full_name: fullName.trim(),
      rating,
      review_text: reviewText.trim() || undefined,
      country: country.code.toLowerCase(),
    });

    setFullName('');
    setReviewText('');
    setRating(0);
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 4000);
  };

  return (
    <div className="space-y-8">
      {/* ── Summary with distribution ── */}
      <div className="rounded-xl border bg-card p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row gap-6 sm:gap-10 items-center sm:items-start">
          {/* Left: global score */}
          <div className="flex flex-col items-center text-center shrink-0">
            <span className="text-5xl font-bold text-foreground leading-none">
              {avgRating > 0 ? avgRating.toFixed(1) : '—'}
            </span>
            <StarRating rating={Math.round(avgRating)} size="md" />
            <span className="text-sm text-muted-foreground mt-1">
              {reviews.length} avis
            </span>
          </div>

          {/* Right: distribution bars */}
          <div className="flex-1 w-full space-y-1.5">
            {[5, 4, 3, 2, 1].map(star => {
              const count = dist[star - 1];
              const pct = reviews.length > 0 ? Math.round((count / reviews.length) * 100) : 0;
              return (
                <div key={star} className="flex items-center gap-2 text-sm">
                  <span className="w-5 text-right font-medium text-muted-foreground">{star}</span>
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 shrink-0" />
                  <div className="flex-1">
                    <Progress value={pct} className="h-2.5 [&>div]:bg-amber-400" />
                  </div>
                  <span className="w-9 text-right text-muted-foreground text-xs">{pct}%</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Reviews list ── */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {[1, 2].map(i => (
            <div key={i} className="h-32 rounded-xl border bg-card animate-pulse" />
          ))}
        </div>
      ) : reviews.length === 0 ? (
        /* Empty state */
        <div className="flex flex-col items-center py-12 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
            <MessageSquare className="w-7 h-7 text-muted-foreground" />
          </div>
          <div>
            <p className="font-semibold text-foreground">Aucun avis pour le moment</p>
            <p className="text-sm text-muted-foreground mt-1">Soyez le premier à donner votre avis !</p>
          </div>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map(i => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  setRating(i);
                  document.getElementById('review-form')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="cursor-pointer hover:scale-125 transition-transform"
              >
                <Star className="w-8 h-8 fill-muted text-muted-foreground/30 hover:fill-amber-400 hover:text-amber-400 transition-colors" />
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className={cn(
          'grid gap-4',
          reviews.length > 4 ? 'sm:grid-cols-2' : 'grid-cols-1'
        )}>
          {reviews.map(review => (
            <div
              key={review.id}
              className="rounded-xl border bg-card p-4 space-y-3 shadow-sm hover:shadow-md transition-shadow"
            >
              {/* Header */}
              <div className="flex items-start gap-3">
                <ReviewAvatar name={review.full_name} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm text-foreground truncate">
                      {review.full_name}
                    </span>
                    {review.country && (
                      <img
                        src={`https://flagcdn.com/20x15/${review.country}.png`}
                        alt=""
                        className="w-5 h-3.5 rounded-[2px] object-cover"
                        loading="lazy"
                      />
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <StarRating rating={review.rating} size="sm" />
                    <span className="text-xs text-muted-foreground">
                      {review.created_at ? timeAgo(review.created_at) : ''}
                    </span>
                  </div>
                </div>
              </div>

              {/* Body */}
              {review.review_text && (
                <p className="text-sm text-muted-foreground leading-relaxed">{review.review_text}</p>
              )}

              {/* Vendor reply */}
              {review.vendor_reply && (
                <div className="rounded-lg bg-muted/50 p-3 space-y-1">
                  <div className="flex items-center gap-1.5">
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Vendeur</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{review.vendor_reply}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Review form ── */}
      <form
        id="review-form"
        onSubmit={handleSubmit}
        className="rounded-xl border bg-card p-5 sm:p-6 space-y-5"
      >
        <h4 className="font-semibold text-base text-foreground">Laisser un avis</h4>

        {submitted ? (
          <div className="flex flex-col items-center py-8 space-y-3 animate-in fade-in zoom-in-95">
            <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            </div>
            <p className="font-semibold text-foreground">Merci pour votre avis !</p>
            <p className="text-sm text-muted-foreground">Il sera visible après validation.</p>
          </div>
        ) : (
          <>
            {/* Stars */}
            <div className="space-y-1.5">
              <Label className="text-sm">Votre note *</Label>
              <div
                className="flex items-center gap-1"
                onMouseLeave={() => setHoveredStar(0)}
              >
                {[1, 2, 3, 4, 5].map(i => (
                  <button
                    key={i}
                    type="button"
                    onMouseEnter={() => setHoveredStar(i)}
                    onClick={() => setRating(i)}
                    className="cursor-pointer hover:scale-110 transition-transform p-0.5"
                  >
                    <Star
                      className={cn(
                        'w-8 h-8 sm:w-7 sm:h-7 transition-colors',
                        i <= (hoveredStar || rating)
                          ? 'fill-amber-400 text-amber-400'
                          : 'fill-muted text-muted-foreground/30'
                      )}
                    />
                  </button>
                ))}
                {(hoveredStar > 0 || rating > 0) && (
                  <span className="ml-2 text-sm text-muted-foreground font-medium">
                    {RATING_LABELS[hoveredStar || rating]}
                  </span>
                )}
              </div>
            </div>

            {/* Name */}
            <div className="space-y-1.5">
              <Label htmlFor="review-name" className="text-sm">Votre nom *</Label>
              <Input
                id="review-name"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="Ex: Jean Dupont"
                maxLength={100}
                required
              />
            </div>

            {/* Text */}
            <div className="space-y-1.5">
              <Label htmlFor="review-text" className="text-sm">Votre avis</Label>
              <Textarea
                id="review-text"
                value={reviewText}
                onChange={e => setReviewText(e.target.value)}
                placeholder="Partagez votre expérience avec ce produit..."
                maxLength={1000}
                rows={3}
              />
            </div>

            <Button
              type="submit"
              disabled={!fullName.trim() || rating === 0 || submitReview.isPending}
              className="w-full gap-2"
            >
              <Send className="w-4 h-4" />
              {submitReview.isPending ? 'Envoi...' : 'Publier mon avis'}
            </Button>
          </>
        )}
      </form>
    </div>
  );
}
