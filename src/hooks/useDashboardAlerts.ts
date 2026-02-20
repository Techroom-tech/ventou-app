import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface DashboardAlert {
  type: 'pending_stale' | 'out_of_stock';
  severity: 'warning' | 'critical';
  count: number;
  actionUrl: string;
}

export function useDashboardAlerts(shopId: string | undefined) {
  return useQuery({
    queryKey: ['dashboard-alerts', shopId],
    queryFn: async (): Promise<DashboardAlert[]> => {
      if (!shopId) return [];

      const twoHoursAgo = new Date(Date.now() - 2 * 3600_000).toISOString();

      const [stalePendingRes, outOfStockRes] = await Promise.all([
        supabase
          .from('orders')
          .select('id', { count: 'exact', head: true })
          .eq('shop_id', shopId)
          .eq('status', 'pending')
          .lt('created_at', twoHoursAgo),

        supabase
          .from('products')
          .select('id', { count: 'exact', head: true })
          .eq('shop_id', shopId)
          .eq('track_stock', true)
          .eq('stock_quantity', 0)
          .eq('is_active', true),
      ]);

      const alerts: DashboardAlert[] = [];

      const stalePendingCount = stalePendingRes.count ?? 0;
      if (stalePendingCount > 0) {
        alerts.push({
          type: 'pending_stale',
          severity: 'warning',
          count: stalePendingCount,
          actionUrl: '/dashboard/orders?status=pending',
        });
      }

      const outOfStockCount = outOfStockRes.count ?? 0;
      if (outOfStockCount > 0) {
        alerts.push({
          type: 'out_of_stock',
          severity: 'critical',
          count: outOfStockCount,
          actionUrl: '/dashboard/products',
        });
      }

      return alerts;
    },
    enabled: !!shopId,
    staleTime: 120_000,
  });
}
