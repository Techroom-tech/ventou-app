import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { subDays, getDay, getHours } from 'date-fns';

export type HourlyGrid = number[][]; // 7 days × 24 hours

const DAY_LABELS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

export function useHourlyAnalytics(shopId: string | undefined, days: number = 30) {
  return useQuery({
    queryKey: ['hourly_analytics', shopId, days],
    queryFn: async (): Promise<{ grid: HourlyGrid; maxVal: number; dayLabels: string[] }> => {
      const grid: HourlyGrid = Array.from({ length: 7 }, () => Array(24).fill(0));
      if (!shopId) return { grid, maxVal: 0, dayLabels: DAY_LABELS };

      const since = subDays(new Date(), days).toISOString();
      const { data, error } = await supabase
        .from('orders')
        .select('created_at')
        .eq('shop_id', shopId)
        .gte('created_at', since);
      if (error) throw error;

      let maxVal = 0;
      for (const o of data ?? []) {
        if (!o.created_at) continue;
        const d = new Date(o.created_at);
        const day = getDay(d);
        const hour = getHours(d);
        grid[day][hour] += 1;
        if (grid[day][hour] > maxVal) maxVal = grid[day][hour];
      }
      return { grid, maxVal, dayLabels: DAY_LABELS };
    },
    enabled: !!shopId,
  });
}
