import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface DashboardKPIs {
  revenueToday: number;
  ordersToday: number;
  productsSoldToday: number;
  avgOrderValue: number;
  revenueChange: number | null;
  ordersChange: number | null;
}

function pctChange(today: number, yesterday: number): number | null {
  if (yesterday === 0) return null;
  return Math.round(((today - yesterday) / yesterday) * 100);
}

export function useDashboardKPIs(shopId: string | undefined) {
  return useQuery({
    queryKey: ['dashboard-kpis', shopId],
    queryFn: async (): Promise<DashboardKPIs> => {
      if (!shopId) {
        return {
          revenueToday: 0,
          ordersToday: 0,
          productsSoldToday: 0,
          avgOrderValue: 0,
          revenueChange: null,
          ordersChange: null,
        };
      }

      const now = new Date();
      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);

      const yesterdayStart = new Date(todayStart);
      yesterdayStart.setDate(yesterdayStart.getDate() - 1);

      const todayEnd = new Date(todayStart);
      todayEnd.setHours(23, 59, 59, 999);

      // Fetch today's orders (non-cancelled)
      const { data: todayOrders, error: todayErr } = await supabase
        .from('orders')
        .select('total, items, status')
        .eq('shop_id', shopId)
        .neq('status', 'cancelled')
        .gte('created_at', todayStart.toISOString())
        .lte('created_at', todayEnd.toISOString());

      if (todayErr) throw todayErr;

      // Fetch yesterday's orders (non-cancelled)
      const { data: yesterdayOrders, error: yestErr } = await supabase
        .from('orders')
        .select('total, items, status')
        .eq('shop_id', shopId)
        .neq('status', 'cancelled')
        .gte('created_at', yesterdayStart.toISOString())
        .lt('created_at', todayStart.toISOString());

      if (yestErr) throw yestErr;

      // Compute today KPIs
      const revenueToday = (todayOrders ?? []).reduce((s, o) => s + (o.total ?? 0), 0);
      const ordersToday = (todayOrders ?? []).length;

      // Products sold = sum of quantities in items JSONB array
      const productsSoldToday = (todayOrders ?? []).reduce((sum, order) => {
        const items = order.items;
        if (!Array.isArray(items)) return sum;
        return sum + items.reduce((s: number, item: { quantity?: number }) => s + (item.quantity ?? 1), 0);
      }, 0);

      const avgOrderValue = ordersToday > 0 ? Math.round(revenueToday / ordersToday) : 0;

      // Compute yesterday KPIs for comparison
      const revenueYesterday = (yesterdayOrders ?? []).reduce((s, o) => s + (o.total ?? 0), 0);
      const ordersYesterday = (yesterdayOrders ?? []).length;

      return {
        revenueToday,
        ordersToday,
        productsSoldToday,
        avgOrderValue,
        revenueChange: pctChange(revenueToday, revenueYesterday),
        ordersChange: pctChange(ordersToday, ordersYesterday),
      };
    },
    enabled: !!shopId,
    staleTime: 60_000,
  });
}
