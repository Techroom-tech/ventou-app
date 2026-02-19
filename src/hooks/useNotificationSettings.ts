import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface NotificationSettings {
  id?: string;
  shop_id: string;
  email_orders: boolean;
  email_cancel: boolean;
  telegram_bot: string | null;
}

const DEFAULTS: Omit<NotificationSettings, 'shop_id'> = {
  email_orders: true,
  email_cancel: true,
  telegram_bot: null,
};

export function useNotificationSettings(shopId: string | undefined) {
  return useQuery({
    queryKey: ['notification_settings', shopId],
    queryFn: async (): Promise<NotificationSettings> => {
      if (!shopId) return { shop_id: '', ...DEFAULTS };
      const { data, error } = await supabase
        .from('notification_settings')
        .select('*')
        .eq('shop_id', shopId)
        .maybeSingle();
      if (error) return { shop_id: shopId, ...DEFAULTS };
      if (!data) return { shop_id: shopId, ...DEFAULTS };
      return {
        id: data.id,
        shop_id: data.shop_id,
        email_orders: data.email_orders ?? true,
        email_cancel: data.email_cancel ?? true,
        telegram_bot: data.telegram_bot ?? null,
      };
    },
    enabled: !!shopId,
    staleTime: 60_000,
  });
}

export function useUpdateNotificationSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (settings: NotificationSettings) => {
      const { data, error } = await supabase
        .from('notification_settings')
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
      queryClient.invalidateQueries({ queryKey: ['notification_settings', variables.shop_id] });
    },
  });
}
