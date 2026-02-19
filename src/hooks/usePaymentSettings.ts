import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PaymentSettings {
  id?: string;
  shop_id: string;
  cod_enabled: boolean;
  whatsapp_enabled: boolean;
  whatsapp_number: string | null;
}

const DEFAULTS: Omit<PaymentSettings, 'shop_id'> = {
  cod_enabled: true,
  whatsapp_enabled: false,
  whatsapp_number: null,
};

export function usePaymentSettings(shopId: string | undefined) {
  return useQuery({
    queryKey: ['payment_settings', shopId],
    queryFn: async (): Promise<PaymentSettings> => {
      if (!shopId) return { shop_id: '', ...DEFAULTS };
      const { data, error } = await supabase
        .from('payment_settings')
        .select('*')
        .eq('shop_id', shopId)
        .maybeSingle();
      if (error) return { shop_id: shopId, ...DEFAULTS };
      if (!data) return { shop_id: shopId, ...DEFAULTS };
      return {
        id: data.id,
        shop_id: data.shop_id,
        cod_enabled: data.cod_enabled ?? true,
        whatsapp_enabled: data.whatsapp_enabled ?? false,
        whatsapp_number: data.whatsapp_number ?? null,
      };
    },
    enabled: !!shopId,
    staleTime: 60_000,
  });
}

export function useUpdatePaymentSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (settings: PaymentSettings) => {
      const { data, error } = await supabase
        .from('payment_settings')
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
      queryClient.invalidateQueries({ queryKey: ['payment_settings', variables.shop_id] });
    },
  });
}
