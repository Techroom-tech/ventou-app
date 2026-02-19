import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface DiscountCode {
  id: string;
  shop_id: string;
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  expires_at: string | null;
  usage_limit: number | null;
  used_count: number;
  is_active: boolean;
  created_at: string;
}

export interface CreateDiscountCode {
  shop_id: string;
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  expires_at?: string | null;
  usage_limit?: number | null;
}

export function useDiscountCodes(shopId: string | undefined) {
  return useQuery({
    queryKey: ['discount_codes', shopId],
    queryFn: async (): Promise<DiscountCode[]> => {
      if (!shopId) return [];
      const { data, error } = await supabase
        .from('discount_codes')
        .select('*')
        .eq('shop_id', shopId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as DiscountCode[];
    },
    enabled: !!shopId,
  });
}

export function useCreateDiscountCode() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateDiscountCode) => {
      const { data, error } = await supabase
        .from('discount_codes')
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['discount_codes', variables.shop_id] });
    },
  });
}

export function useToggleDiscountCode() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, shop_id, is_active }: { id: string; shop_id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('discount_codes')
        .update({ is_active })
        .eq('id', id);
      if (error) throw error;
      return { shop_id };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['discount_codes', result.shop_id] });
    },
  });
}

export function useDeleteDiscountCode() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, shop_id }: { id: string; shop_id: string }) => {
      const { error } = await supabase
        .from('discount_codes')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return { shop_id };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['discount_codes', result.shop_id] });
    },
  });
}
