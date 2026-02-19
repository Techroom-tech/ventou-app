import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Order, OrderStatus, ORDER_TRANSITIONS } from '@/types/shop';

const PAGE_SIZE = 20;

interface UseOrdersOptions {
  shopId: string | undefined;
  status?: OrderStatus | 'all';
  search?: string;
  page?: number;
}

export function useOrders({ shopId, status, search, page = 0 }: UseOrdersOptions) {
  return useQuery({
    queryKey: ['orders', shopId, status, search, page],
    queryFn: async () => {
      if (!shopId) return { orders: [], total: 0 };

      let query = supabase
        .from('orders')
        .select('*', { count: 'exact' })
        .eq('shop_id', shopId)
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

      if (status && status !== 'all') {
        query = query.eq('status', status);
      }

      if (search && search.trim()) {
        const term = search.trim();
        query = query.or(
          `customer_name.ilike.%${term}%,phone.ilike.%${term}%`
        );
      }

      const { data, error, count } = await query;
      if (error) {
        console.error('[useOrders] Supabase error:', error);
        throw error;
      }
      return { orders: (data ?? []) as Order[], total: count ?? 0 };
    },
    enabled: !!shopId,
    staleTime: 30_000,
  });
}

export function useOrderCounts(shopId: string | undefined) {
  return useQuery({
    queryKey: ['order-counts', shopId],
    queryFn: async () => {
      if (!shopId) return {} as Record<string, number>;

      const { data, error } = await supabase
        .from('orders')
        .select('status')
        .eq('shop_id', shopId);

      if (error) throw error;

      const counts: Record<string, number> = { all: data?.length ?? 0 };
      for (const row of data ?? []) {
        counts[row.status] = (counts[row.status] ?? 0) + 1;
      }
      return counts;
    },
    enabled: !!shopId,
    staleTime: 30_000,
  });
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      orderId,
      shopId,
      currentStatus,
      newStatus,
    }: {
      orderId: string;
      shopId: string;
      currentStatus: OrderStatus;
      newStatus: OrderStatus;
    }) => {
      const allowed = ORDER_TRANSITIONS[currentStatus];
      if (!allowed.includes(newStatus)) {
        throw new Error(`Transition invalide: ${currentStatus} → ${newStatus}`);
      }

      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId)
        .eq('shop_id', shopId); // security: never touch other shops

      if (error) throw error;
    },
    onSuccess: (_data, { shopId }) => {
      queryClient.invalidateQueries({ queryKey: ['orders', shopId] });
      queryClient.invalidateQueries({ queryKey: ['order-counts', shopId] });
    },
  });
}

// Count repeat customers (placed >1 order in this shop)
export function useRepeatCustomers(shopId: string | undefined) {
  return useQuery({
    queryKey: ['repeat-customers', shopId],
    queryFn: async () => {
      if (!shopId) return new Set<string>();

      const { data, error } = await supabase
        .from('orders')
        .select('customer_name, phone')
        .eq('shop_id', shopId);

      if (error) throw error;

      const phoneCounts: Record<string, number> = {};
      for (const row of data ?? []) {
        const key = row.phone ?? row.customer_name;
        phoneCounts[key] = (phoneCounts[key] ?? 0) + 1;
      }

      return new Set(
        Object.entries(phoneCounts)
          .filter(([, count]) => count > 1)
          .map(([key]) => key)
      );
    },
    enabled: !!shopId,
    staleTime: 60_000,
  });
}
