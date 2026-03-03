import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { subDays } from 'date-fns';

export interface ProductStat {
  productName: string;
  totalOrders: number;
  delivered: number;
  cancelled: number;
  revenue: number;
}

export function useProductAnalytics(shopId: string | undefined, days: number = 30) {
  return useQuery({
    queryKey: ['product_analytics', shopId, days],
    queryFn: async (): Promise<ProductStat[]> => {
      if (!shopId) return [];
      const since = subDays(new Date(), days).toISOString();
      const { data, error } = await supabase
        .from('orders')
        .select('items, status')
        .eq('shop_id', shopId)
        .gte('created_at', since);
      if (error) throw error;

      const map = new Map<string, ProductStat>();
      for (const order of data ?? []) {
        const items = order.items as any[];
        if (!Array.isArray(items)) continue;
        for (const item of items) {
          const name = item.name || item.product_name || 'Inconnu';
          const price = Number(item.price) || 0;
          const qty = Number(item.quantity) || 1;
          const existing = map.get(name) || { productName: name, totalOrders: 0, delivered: 0, cancelled: 0, revenue: 0 };
          existing.totalOrders += 1;
          if (order.status === 'delivered') { existing.delivered += 1; existing.revenue += price * qty; }
          if (order.status === 'cancelled') existing.cancelled += 1;
          map.set(name, existing);
        }
      }
      return Array.from(map.values()).sort((a, b) => b.totalOrders - a.totalOrders);
    },
    enabled: !!shopId,
  });
}
