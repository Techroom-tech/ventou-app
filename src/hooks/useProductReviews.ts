import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ProductReview {
  id: string;
  product_id: string;
  shop_id: string;
  full_name: string;
  phone: string | null;
  rating: number;
  review_text: string | null;
  country: string | null;
  is_approved: boolean;
  created_at: string;
  vendor_reply: string | null;
  vendor_reply_at: string | null;
}

export function useProductReviews(productId: string | undefined) {
  return useQuery({
    queryKey: ['product-reviews', productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_reviews')
        .select('*')
        .eq('product_id', productId!)
        .eq('is_approved', true)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as ProductReview[];
    },
    enabled: !!productId,
    staleTime: 60_000,
  });
}

export function useSubmitReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (review: {
      product_id: string;
      shop_id: string;
      full_name: string;
      phone?: string;
      rating: number;
      review_text?: string;
      country?: string;
    }) => {
      const { error } = await supabase.from('product_reviews').insert({
        product_id: review.product_id,
        shop_id: review.shop_id,
        full_name: review.full_name,
        phone: review.phone || null,
        rating: review.rating,
        review_text: review.review_text || null,
        country: review.country || null,
      });
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['product-reviews', variables.product_id] });
    },
  });
}
