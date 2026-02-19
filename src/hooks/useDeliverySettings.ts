import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface DeliverySettings {
  id?: string;
  shop_id: string;
  allow_cod: boolean;
  allow_whatsapp: boolean;
  has_delivery_fee: boolean;
  delivery_fee: number;
}

const DEFAULT_SETTINGS: Omit<DeliverySettings, 'shop_id'> = {
  allow_cod: true,
  allow_whatsapp: false,
  has_delivery_fee: false,
  delivery_fee: 0,
};

/**
 * Fetch delivery settings for a shop.
 * Public — storefront can read (RLS allows anon SELECT).
 * Returns sensible defaults if no row exists yet.
 */
export function useDeliverySettings(shopId: string | undefined) {
  return useQuery({
    queryKey: ['delivery_settings', shopId],
    queryFn: async (): Promise<DeliverySettings> => {
      if (!shopId) return { shop_id: '', ...DEFAULT_SETTINGS };

      const { data, error } = await supabase
        .from('delivery_settings')
        .select('*')
        .eq('shop_id', shopId)
        .maybeSingle();

      if (error) {
        console.error('[useDeliverySettings] Fetch error:', error);
        // Return defaults instead of throwing — don't break checkout on missing table
        return { shop_id: shopId, ...DEFAULT_SETTINGS };
      }

      if (!data) {
        return { shop_id: shopId, ...DEFAULT_SETTINGS };
      }

      return {
        id: data.id,
        shop_id: data.shop_id,
        allow_cod: data.allow_cod ?? true,
        allow_whatsapp: data.allow_whatsapp ?? false,
        has_delivery_fee: data.has_delivery_fee ?? false,
        delivery_fee: Number(data.delivery_fee ?? 0),
      };
    },
    enabled: true, // Always enabled — returns defaults when shopId is undefined
    staleTime: 60_000, // 1 minute
  });
}

/**
 * Upsert delivery settings for the authenticated vendor's shop.
 * Uses onConflict: 'shop_id' to insert-or-update in one call.
 */
export function useUpdateDeliverySettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (settings: DeliverySettings) => {
      const payload = {
        shop_id: settings.shop_id,
        allow_cod: settings.allow_cod,
        allow_whatsapp: settings.allow_whatsapp,
        has_delivery_fee: settings.has_delivery_fee,
        delivery_fee: settings.delivery_fee,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('delivery_settings')
        .upsert(payload, { onConflict: 'shop_id' })
        .select()
        .single();

      if (error) {
        console.error('[useUpdateDeliverySettings] Upsert error:', error);
        throw error;
      }

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['delivery_settings', variables.shop_id] });
    },
  });
}
