import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { PlatformStats } from '@/types/admin';

export function useAdminStats() {
  return useQuery({
    queryKey: ['admin-stats'],
    queryFn: async (): Promise<PlatformStats> => {
      const [vendors, subs, shops, products, reports] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('vendor_subscriptions').select('*'),
        supabase.from('shops').select('id', { count: 'exact', head: true }),
        supabase.from('products').select('id', { count: 'exact', head: true }),
        supabase.from('reports').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      ]);

      const subsData = subs.data ?? [];
      const now = new Date();
      const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      const activeSubscriptions = subsData.filter(
        (s: any) => s.status === 'active' || s.status === 'trial'
      ).length;

      const revenue = subsData
        .filter((s: any) => s.status === 'active')
        .length; // placeholder: count * plan price needs join

      const expiringSoon = subsData.filter((s: any) => {
        if (!s.trial_ends_at && !s.current_period_end) return false;
        const endDate = new Date(s.trial_ends_at || s.current_period_end);
        return endDate <= in7Days && endDate >= now;
      }).length;

      const vendorsOnTrial = subsData.filter((s: any) => s.status === 'trial').length;

      return {
        totalVendors: vendors.count ?? 0,
        activeSubscriptions,
        storesCount: shops.count ?? 0,
        productsCount: products.count ?? 0,
        pendingReports: reports.count ?? 0,
        subscriptionRevenue: revenue * 9900, // simplified
        expiringSoon,
        vendorsOnTrial,
      };
    },
    refetchInterval: 30000,
  });
}
