import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface VendorReview {
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
  product_name?: string;
}

export function useVendorReviews(shopId: string | undefined) {
  return useQuery({
    queryKey: ['vendor-reviews', shopId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_reviews')
        .select('*, products!inner(name)')
        .eq('shop_id', shopId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r: any) => ({
        ...r,
        product_name: r.products?.name ?? 'Produit supprimé',
      })) as VendorReview[];
    },
    enabled: !!shopId,
  });
}

export function useToggleReviewApproval() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ reviewId, approved }: { reviewId: string; approved: boolean }) => {
      const { error } = await supabase
        .from('product_reviews')
        .update({ is_approved: approved })
        .eq('id', reviewId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vendor-reviews'] });
    },
  });
}

export function useDeleteReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (reviewId: string) => {
      const { error } = await supabase
        .from('product_reviews')
        .delete()
        .eq('id', reviewId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vendor-reviews'] });
    },
  });
}
