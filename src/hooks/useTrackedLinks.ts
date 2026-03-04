import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface TrackedLink {
  id: string;
  shop_id: string;
  name: string;
  target_url: string;
  source: string;
  ref_code: string;
  clicks: number;
  created_at: string | null;
  last_clicked_at: string | null;
}

export interface CreateTrackedLink {
  shop_id: string;
  name: string;
  target_url: string;
  source: string;
  ref_code: string;
}

export function useTrackedLinks(shopId: string | undefined) {
  return useQuery({
    queryKey: ['tracked_links', shopId],
    queryFn: async (): Promise<TrackedLink[]> => {
      if (!shopId) return [];
      const { data, error } = await supabase
        .from('tracked_links')
        .select('*')
        .eq('shop_id', shopId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as TrackedLink[];
    },
    enabled: !!shopId,
  });
}

export function useCreateTrackedLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: CreateTrackedLink) => {
      const { data, error } = await supabase.from('tracked_links').insert(p).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, v) => qc.invalidateQueries({ queryKey: ['tracked_links', v.shop_id] }),
  });
}

export function useDeleteTrackedLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, shop_id }: { id: string; shop_id: string }) => {
      const { error } = await supabase.from('tracked_links').delete().eq('id', id);
      if (error) throw error;
      return { shop_id };
    },
    onSuccess: (r) => qc.invalidateQueries({ queryKey: ['tracked_links', r.shop_id] }),
  });
}
