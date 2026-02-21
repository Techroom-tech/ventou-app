import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAdminAuditLog } from './useAdminAuditLog';

export function useAdminSubscriptions() {
  const { log } = useAdminAuditLog();

  const plansQuery = useQuery({
    queryKey: ['admin-plans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .order('price_monthly', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const subsQuery = useQuery({
    queryKey: ['admin-subscriptions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vendor_subscriptions')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const changePlan = async (userId: string, planId: string) => {
    await supabase
      .from('vendor_subscriptions')
      .update({ plan_id: planId, updated_at: new Date().toISOString() })
      .eq('user_id', userId);
    await log({ action: 'change_plan', target_type: 'vendor', target_id: userId, details: { plan_id: planId } });
    subsQuery.refetch();
  };

  const cancelSubscription = async (userId: string) => {
    await supabase
      .from('vendor_subscriptions')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('user_id', userId);
    await log({ action: 'cancel_subscription', target_type: 'vendor', target_id: userId });
    subsQuery.refetch();
  };

  const resetTrial = async (userId: string) => {
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 7);
    await supabase
      .from('vendor_subscriptions')
      .update({ status: 'trial', trial_ends_at: trialEnd.toISOString(), updated_at: new Date().toISOString() })
      .eq('user_id', userId);
    await log({ action: 'reset_trial', target_type: 'vendor', target_id: userId });
    subsQuery.refetch();
  };

  return {
    plans: plansQuery.data ?? [],
    subscriptions: subsQuery.data ?? [],
    isLoading: plansQuery.isLoading || subsQuery.isLoading,
    changePlan,
    cancelSubscription,
    resetTrial,
  };
}
