import { useState } from 'react';
import { Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useProductReviews, useSubmitReview } from '@/hooks/useProductReviews';
import { useCountry } from '@/contexts/CountryContext';
import { format } from 'date-fns';

interface ProductReviewsProps {
  productId: string;
  shopId: string;
}

function StarRating({ rating, onRate, interactive = false, size = 'md' }: {
  rating: number;
  onRate?: (r: number) => void;
  interactive?: boolean;
  size?: 'sm' | 'md';
}) {
  const sizeClass = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <button
          key={i}
          type="button"
          disabled={!interactive}
          onClick={() => onRate?.(i)}
          className={interactive ? 'cursor-pointer hover:scale-110 transition-transform' : ''}
        >
          <Star
            className={`${sizeClass} ${i <= rating ? 'fill-amber-400 text-amber-400' : 'fill-muted text-muted-foreground/40'}`}
          />
        </button>
      ))}
    </div>
  );
}

export default function ProductReviews({ productId, shopId }: ProductReviewsProps) {
  const { data: reviews = [], isLoading } = useProductReviews(productId);
  const submitReview = useSubmitReview();
  const { country } = useCountry();

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [reviewText, setReviewText] = useState('');
  const [rating, setRating] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  const avgRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || rating === 0) return;

    await submitReview.mutateAsync({
      product_id: productId,
      shop_id: shopId,
      full_name: fullName.trim(),
      phone: phone.trim() || undefined,
      rating,
      review_text: reviewText.trim() || undefined,
      country: country.code.toLowerCase(),
    });

    setFullName('');
    setPhone('');
    setReviewText('');
    setRating(0);
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="flex items-center gap-3">
        <StarRating rating={Math.round(avgRating)} />
        <span className="text-sm text-muted-foreground">
          {avgRating > 0 ? avgRating.toFixed(1) : '—'} ({reviews.length} avis)
        </span>
      </div>

      {/* Reviews list */}
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Chargement...</p>
      ) : reviews.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucun avis pour le moment. Soyez le premier !</p>
      ) : (
        <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
          {reviews.map(review => (
            <div key={review.id} className="border rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {review.country && (
                    <img
                      src={`https://flagcdn.com/24x18/${review.country}.png`}
                      alt=""
                      className="w-5 h-3.5 rounded-sm object-cover"
                      loading="lazy"
                    />
                  )}
                  <span className="font-medium text-sm">{review.full_name}</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {review.created_at ? format(new Date(review.created_at), 'dd/MM/yyyy') : ''}
                </span>
              </div>
              <StarRating rating={review.rating} size="sm" />
              {review.review_text && (
                <p className="text-sm text-muted-foreground">{review.review_text}</p>
              )}
              {review.vendor_reply && (
                <div className="ml-4 mt-2 border-l-2 border-primary/30 pl-3 py-1">
                  <p className="text-xs font-semibold text-foreground mb-0.5">Réponse du vendeur</p>
                  <p className="text-sm text-muted-foreground">{review.vendor_reply}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Review form */}
      <form onSubmit={handleSubmit} className="border rounded-lg p-4 space-y-3">
        <h4 className="font-semibold text-sm">Laisser un avis</h4>

        {submitted && (
          <p className="text-sm text-primary font-medium">✓ Merci pour votre avis !</p>
        )}

        <div>
          <Label htmlFor="review-rating" className="text-sm">Note *</Label>
          <StarRating rating={rating} onRate={setRating} interactive />
        </div>

        <div>
          <Label htmlFor="review-name" className="text-sm">Nom complet *</Label>
          <Input
            id="review-name"
            value={fullName}
            onChange={e => setFullName(e.target.value)}
            placeholder="Votre nom"
            maxLength={100}
            required
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="review-phone" className="text-sm">Téléphone</Label>
          <Input
            id="review-phone"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="Optionnel"
            maxLength={30}
            type="tel"
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="review-text" className="text-sm">Votre avis</Label>
          <Textarea
            id="review-text"
            value={reviewText}
            onChange={e => setReviewText(e.target.value)}
            placeholder="Partagez votre expérience..."
            maxLength={1000}
            rows={3}
            className="mt-1"
          />
        </div>

        <Button
          type="submit"
          disabled={!fullName.trim() || rating === 0 || submitReview.isPending}
          className="w-full"
        >
          {submitReview.isPending ? 'Envoi...' : 'Publier mon avis'}
        </Button>
      </form>
    </div>
  );
}
