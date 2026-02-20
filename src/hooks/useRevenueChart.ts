import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface DailyRevenue {
  date: string;
  revenue: number;
  orders: number;
}

export function useRevenueChart(shopId: string | undefined, days = 7) {
  return useQuery({
    queryKey: ['revenue-chart', shopId, days],
    queryFn: async (): Promise<DailyRevenue[]> => {
      if (!shopId) return [];

      const since = new Date();
      since.setDate(since.getDate() - days + 1);
      since.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from('orders')
        .select('created_at, total, status')
        .eq('shop_id', shopId)
        .neq('status', 'cancelled')
        .gte('created_at', since.toISOString())
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Build a map of date → { revenue, orders }
      const map: Record<string, { revenue: number; orders: number }> = {};

      // Pre-fill all days with 0
      for (let i = 0; i < days; i++) {
        const d = new Date(since);
        d.setDate(d.getDate() + i);
        const key = d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
        map[key] = { revenue: 0, orders: 0 };
      }

      for (const row of data ?? []) {
        const key = new Date(row.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
        if (map[key]) {
          map[key].revenue += (row.total ?? 0);
          map[key].orders += 1;
        }
      }

      return Object.entries(map).map(([date, val]) => ({ date, ...val }));
    },
    enabled: !!shopId,
    staleTime: 60_000,
  });
}
