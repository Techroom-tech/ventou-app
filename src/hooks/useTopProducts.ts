import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface TopProduct {
  name: string;
  units: number;
  revenue: number;
}

export function useTopProducts(shopId: string | undefined) {
  return useQuery({
    queryKey: ['top-products', shopId],
    queryFn: async (): Promise<TopProduct[]> => {
      if (!shopId) return [];

      const since = new Date();
      since.setDate(since.getDate() - 30);
      since.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from('orders')
        .select('items, total, status')
        .eq('shop_id', shopId)
        .in('status', ['delivered', 'confirmed'])
        .gte('created_at', since.toISOString());

      if (error) throw error;

      // Aggregate by product name from items JSONB array
      const map: Record<string, { units: number; revenue: number }> = {};

      for (const order of data ?? []) {
        const items = order.items;
        if (!Array.isArray(items)) continue;

        for (const item of items) {
          const name: string = item.name ?? 'Produit inconnu';
          const qty: number = item.quantity ?? 1;
          const price: number = item.unit_price ?? 0;

          if (!map[name]) map[name] = { units: 0, revenue: 0 };
          map[name].units += qty;
          map[name].revenue += qty * price;
        }
      }

      return Object.entries(map)
        .map(([name, val]) => ({ name, ...val }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 3);
    },
    enabled: !!shopId,
    staleTime: 300_000,
  });
}
