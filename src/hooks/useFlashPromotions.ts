import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface FlashPromotion {
  id: string;
  shop_id: string;
  product_id: string;
  discount_type: string;
  discount_value: number;
  starts_at: string;
  ends_at: string;
  show_badge: boolean;
  show_countdown: boolean;
  featured: boolean;
  is_active: boolean;
  created_at: string | null;
}

export interface CreateFlashPromotion {
  shop_id: string;
  product_id: string;
  discount_type: string;
  discount_value: number;
  starts_at: string;
  ends_at: string;
  show_badge?: boolean;
  show_countdown?: boolean;
  featured?: boolean;
}

export function useFlashPromotions(shopId: string | undefined) {
  return useQuery({
    queryKey: ['flash_promotions', shopId],
    queryFn: async (): Promise<FlashPromotion[]> => {
      if (!shopId) return [];
      const { data, error } = await supabase
        .from('flash_promotions')
        .select('*')
        .eq('shop_id', shopId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as FlashPromotion[];
    },
    enabled: !!shopId,
  });
}

export function useCreateFlashPromotion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: CreateFlashPromotion) => {
      const { data, error } = await supabase.from('flash_promotions').insert(p).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, v) => qc.invalidateQueries({ queryKey: ['flash_promotions', v.shop_id] }),
  });
}

export function useToggleFlashPromotion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, shop_id, is_active }: { id: string; shop_id: string; is_active: boolean }) => {
      const { error } = await supabase.from('flash_promotions').update({ is_active }).eq('id', id);
      if (error) throw error;
      return { shop_id };
    },
    onSuccess: (r) => qc.invalidateQueries({ queryKey: ['flash_promotions', r.shop_id] }),
  });
}

export function useDeleteFlashPromotion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, shop_id }: { id: string; shop_id: string }) => {
      const { error } = await supabase.from('flash_promotions').delete().eq('id', id);
      if (error) throw error;
      return { shop_id };
    },
    onSuccess: (r) => qc.invalidateQueries({ queryKey: ['flash_promotions', r.shop_id] }),
  });
}
