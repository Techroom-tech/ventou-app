import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface TrackingSettings {
  id?: string;
  shop_id: string;
  facebook_pixel: string | null;
  tiktok_pixel: string | null;
  gtm_id: string | null;
  custom_scripts: string | null;
}

const DEFAULTS: Omit<TrackingSettings, 'shop_id'> = {
  facebook_pixel: null,
  tiktok_pixel: null,
  gtm_id: null,
  custom_scripts: null,
};

export function useTrackingSettings(shopId: string | undefined) {
  return useQuery({
    queryKey: ['tracking_settings', shopId],
    queryFn: async (): Promise<TrackingSettings> => {
      if (!shopId) return { shop_id: '', ...DEFAULTS };
      const { data, error } = await supabase
        .from('tracking_settings')
        .select('*')
        .eq('shop_id', shopId)
        .maybeSingle();
      if (error) return { shop_id: shopId, ...DEFAULTS };
      if (!data) return { shop_id: shopId, ...DEFAULTS };
      return {
        id: data.id,
        shop_id: data.shop_id,
        facebook_pixel: data.facebook_pixel ?? null,
        tiktok_pixel: data.tiktok_pixel ?? null,
        gtm_id: data.gtm_id ?? null,
        custom_scripts: data.custom_scripts ?? null,
      };
    },
    enabled: !!shopId,
    staleTime: 60_000,
  });
}

export function useUpdateTrackingSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (settings: TrackingSettings) => {
      const { data, error } = await supabase
        .from('tracking_settings')
        .upsert(
          { ...settings, updated_at: new Date().toISOString() },
          { onConflict: 'shop_id' }
        )
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tracking_settings', variables.shop_id] });
    },
  });
}
