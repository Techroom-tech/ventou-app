import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAdminAuditLog } from './useAdminAuditLog';

export function useAdminVendors() {
  const { log } = useAdminAuditLog();

  const query = useQuery({
    queryKey: ['admin-vendors'],
    queryFn: async () => {
      // Get all profiles (vendors)
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, avatar_url, created_at')
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!profiles) return [];

      // Get subscriptions, shops, counts in parallel
      const userIds = profiles.map((p: any) => p.id);

      const [subsRes, shopsRes] = await Promise.all([
        supabase.from('vendor_subscriptions').select('*').in('user_id', userIds),
        supabase.from('shops').select('id, owner_id').in('owner_id', userIds),
      ]);

      const subsMap = new Map((subsRes.data ?? []).map((s: any) => [s.user_id, s]));
      const shopsByOwner = new Map<string, any[]>();
      (shopsRes.data ?? []).forEach((s: any) => {
        const arr = shopsByOwner.get(s.owner_id) || [];
        arr.push(s);
        shopsByOwner.set(s.owner_id, arr);
      });

      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      return profiles.map((p: any) => {
        const sub = subsMap.get(p.id);
        const stores = shopsByOwner.get(p.id) ?? [];
        return {
          id: p.id,
          email: '', // profiles don't have email, will show name
          first_name: p.first_name,
          last_name: p.last_name,
          avatar_url: p.avatar_url,
          created_at: p.created_at,
          plan_id: sub?.plan_id ?? 'free',
          subscription_status: sub?.status ?? 'none',
          trial_ends_at: sub?.trial_ends_at ?? null,
          stores_count: stores.length,
          products_count: 0,
          orders_count: 0,
          report_count_6m: 0,
          risk_score: ('low' as 'low' | 'medium' | 'high'),
        };
      });
    },
  });

  const suspendVendor = async (userId: string) => {
    // Suspend all shops belonging to vendor
    const { data: shops } = await supabase.from('shops').select('id').eq('owner_id', userId);
    if (shops?.length) {
      await supabase
        .from('shops')
        .update({ is_suspended: true, suspended_reason: 'Vendor suspended by admin' })
        .eq('owner_id', userId);
    }
    await log({ action: 'suspend_vendor', target_type: 'vendor', target_id: userId });
    query.refetch();
  };

  const reactivateVendor = async (userId: string) => {
    await supabase
      .from('shops')
      .update({ is_suspended: false, suspended_reason: null })
      .eq('owner_id', userId);
    await log({ action: 'reactivate_vendor', target_type: 'vendor', target_id: userId });
    query.refetch();
  };

  const changePlan = async (userId: string, planId: string) => {
    await supabase
      .from('vendor_subscriptions')
      .update({ plan_id: planId, updated_at: new Date().toISOString() })
      .eq('user_id', userId);
    await log({ action: 'change_plan', target_type: 'vendor', target_id: userId, details: { plan_id: planId } });
    query.refetch();
  };

  const resetTrial = async (userId: string) => {
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 7);
    await supabase
      .from('vendor_subscriptions')
      .update({ status: 'trial', trial_ends_at: trialEnd.toISOString(), updated_at: new Date().toISOString() })
      .eq('user_id', userId);
    await log({ action: 'reset_trial', target_type: 'vendor', target_id: userId });
    query.refetch();
  };

  return {
    vendors: query.data ?? [],
    isLoading: query.isLoading,
    refetch: query.refetch,
    suspendVendor,
    reactivateVendor,
    changePlan,
    resetTrial,
  };
}
