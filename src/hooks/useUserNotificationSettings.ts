import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

export interface UserNotifSettings {
  user_id: string;
  order_emails: boolean;
  subscription_alerts: boolean;
  marketing_updates: boolean;
  admin_alerts: boolean;
}

export function useUserNotificationSettings() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['user-notification-settings', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_notification_settings')
        .select('*')
        .eq('user_id', user!.id)
        .maybeSingle();
      if (error) throw error;
      return data as UserNotifSettings | null;
    },
  });

  const upsert = useMutation({
    mutationFn: async (settings: Partial<UserNotifSettings>) => {
      const { error } = await supabase
        .from('user_notification_settings')
        .upsert({ user_id: user!.id, ...settings }, { onConflict: 'user_id' });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['user-notification-settings'] });
      toast.success('Préférences mises à jour');
    },
    onError: (e: any) => toast.error(e.message),
  });

  return { ...query, upsert };
}
