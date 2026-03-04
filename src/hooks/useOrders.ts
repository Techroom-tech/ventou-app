import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Order, OrderStatus, ORDER_TRANSITIONS } from '@/types/shop';

const PAGE_SIZE = 20;

interface UseOrdersOptions {
  shopId: string | undefined;
  status?: OrderStatus | 'all';
  search?: string;
  page?: number;
  includeArchived?: boolean;
}

export function useOrders({ shopId, status, search, page = 0, includeArchived = false }: UseOrdersOptions) {
  const queryClient = useQueryClient();

  const result = useQuery({
    queryKey: ['orders', shopId, status, search, page, includeArchived],
    queryFn: async () => {
      if (!shopId) return { orders: [], total: 0 };

      let query = supabase
        .from('orders')
        .select('*', { count: 'exact' })
        .eq('shop_id', shopId)
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

      if (!includeArchived) {
        query = query.eq('is_archived', false);
      }

      if (status && status !== 'all') {
        query = query.eq('status', status);
      }

      if (search && search.trim()) {
        const term = search.trim();
        query = query.or(
          `customer_name.ilike.%${term}%,phone.ilike.%${term}%,id.ilike.%${term}%`
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
    gcTime: 5 * 60_000,
  });

  // Prefetch next page
  const total = result.data?.total ?? 0;
  const hasNextPage = (page + 1) * PAGE_SIZE < total;

  if (shopId && hasNextPage) {
    const nextPage = page + 1;
    queryClient.prefetchQuery({
      queryKey: ['orders', shopId, status, search, nextPage, includeArchived],
      queryFn: async () => {
        let query = supabase
          .from('orders')
          .select('*', { count: 'exact' })
          .eq('shop_id', shopId)
          .order('created_at', { ascending: false })
          .range(nextPage * PAGE_SIZE, nextPage * PAGE_SIZE + PAGE_SIZE - 1);
        if (!includeArchived) query = query.eq('is_archived', false);
        if (status && status !== 'all') query = query.eq('status', status);
        if (search?.trim()) query = query.or(`customer_name.ilike.%${search.trim()}%,phone.ilike.%${search.trim()}%,id.ilike.%${search.trim()}%`);
        const { data, error, count } = await query;
        if (error) throw error;
        return { orders: (data ?? []) as Order[], total: count ?? 0 };
      },
      staleTime: 30_000,
    });
  }

  return result;
}

export function useOrderCounts(shopId: string | undefined) {
  return useQuery({
    queryKey: ['order-counts', shopId],
    queryFn: async () => {
      if (!shopId) return {} as Record<string, number>;

      const [allRes, pendingRes, confirmedRes, deliveredRes, cancelledRes] = await Promise.all([
        supabase.from('orders').select('id', { count: 'exact', head: true }).eq('shop_id', shopId).eq('is_archived', false),
        supabase.from('orders').select('id', { count: 'exact', head: true }).eq('shop_id', shopId).eq('status', 'pending').eq('is_archived', false),
        supabase.from('orders').select('id', { count: 'exact', head: true }).eq('shop_id', shopId).eq('status', 'confirmed').eq('is_archived', false),
        supabase.from('orders').select('id', { count: 'exact', head: true }).eq('shop_id', shopId).eq('status', 'delivered').eq('is_archived', false),
        supabase.from('orders').select('id', { count: 'exact', head: true }).eq('shop_id', shopId).eq('status', 'cancelled').eq('is_archived', false),
      ]);

      return {
        all: allRes.count ?? 0,
        pending: pendingRes.count ?? 0,
        confirmed: confirmedRes.count ?? 0,
        delivered: deliveredRes.count ?? 0,
        cancelled: cancelledRes.count ?? 0,
      } as Record<string, number>;
    },
    enabled: !!shopId,
    staleTime: 30_000,
  });
}

// Count orders created today
export function useOrdersToday(shopId: string | undefined) {
  return useQuery({
    queryKey: ['orders-today', shopId],
    queryFn: async () => {
      if (!shopId) return 0;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { count, error } = await supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('shop_id', shopId)
        .gte('created_at', today.toISOString());

      if (error) throw error;
      return count ?? 0;
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

      const { data: updatedRows, error: updateError } = await supabase
        .from('orders')
        .update({
          status: newStatus,
        })
        .eq('id', orderId)
        .eq('shop_id', shopId)
        .select('id, status');

      if (updateError) {
        console.error('[useUpdateOrderStatus] update error:', updateError);
        throw updateError;
      }

      if (!updatedRows || updatedRows.length === 0) {
        throw new Error(
          'Mise à jour impossible. Vérifiez vos permissions dans Supabase (politique RLS owner_update_orders).'
        );
      }

      // Insert status log (best-effort)
      try {
        const { data: { user } } = await supabase.auth.getUser();
        await supabase.from('order_status_logs').insert({
          order_id: orderId,
          old_status: currentStatus,
          new_status: newStatus,
          changed_by: user?.id ?? null,
        });
      } catch (logErr) {
        console.warn('[useUpdateOrderStatus] log insert failed (non-blocking):', logErr);
      }

      return updatedRows[0];
    },
    onSuccess: (_data, { shopId, orderId }) => {
      queryClient.invalidateQueries({ queryKey: ['orders', shopId] });
      queryClient.invalidateQueries({ queryKey: ['order-counts', shopId] });
      queryClient.invalidateQueries({ queryKey: ['orders-today', shopId] });
      queryClient.invalidateQueries({ queryKey: ['order-detail', orderId] });
    },
    onError: (error) => {
      console.error('[useUpdateOrderStatus] mutation error:', error);
    },
  });
}

// Batch update multiple orders' status
export function useBatchUpdateOrderStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      orderIds,
      shopId,
      newStatus,
    }: {
      orderIds: string[];
      shopId: string;
      newStatus: OrderStatus;
    }) => {
      const results = await Promise.allSettled(
        orderIds.map(async (orderId) => {
          const { data, error } = await supabase
            .from('orders')
            .update({
              status: newStatus,
            })
            .eq('id', orderId)
            .eq('shop_id', shopId)
            .select('id');

          if (error) throw error;
          return data;
        })
      );

      const succeeded = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;
      return { succeeded, failed, total: orderIds.length };
    },
    onSuccess: (_data, { shopId }) => {
      queryClient.invalidateQueries({ queryKey: ['orders', shopId] });
      queryClient.invalidateQueries({ queryKey: ['order-counts', shopId] });
      queryClient.invalidateQueries({ queryKey: ['orders-today', shopId] });
    },
  });
}

// Fetch status change timeline for a specific order
export function useOrderTimeline(orderId: string | undefined) {
  return useQuery({
    queryKey: ['order-timeline', orderId],
    queryFn: async () => {
      if (!orderId) return [];

      const { data, error } = await supabase
        .from('order_status_logs')
        .select('*')
        .eq('order_id', orderId)
        .order('changed_at', { ascending: true });

      if (error) {
        console.error('[useOrderTimeline] error:', error);
        throw error;
      }
      return data ?? [];
    },
    enabled: !!orderId,
    staleTime: 10_000,
  });
}

// Update seller internal note on an order
export function useUpdateSellerNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      orderId,
      shopId,
      note,
    }: {
      orderId: string;
      shopId: string;
      note: string;
    }) => {
      const { error } = await supabase
        .from('orders')
        .update({ seller_note: note })
        .eq('id', orderId)
        .eq('shop_id', shopId);

      if (error) {
        console.error('[useUpdateSellerNote] error:', error);
        throw error;
      }
    },
    onSuccess: (_data, { shopId }) => {
      queryClient.invalidateQueries({ queryKey: ['orders', shopId] });
    },
  });
}

// Create a manual order (vendor-side)
export function useCreateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      shopId,
      customer_name,
      phone,
      city,
      quartier,
      notes,
      items,
      subtotal,
      delivery_fee,
      total,
      payment_method,
    }: {
      shopId: string;
      customer_name: string;
      phone: string;
      city: string;
      quartier?: string;
      notes?: string;
      items: { name: string; quantity: number; unit_price: number }[];
      subtotal: number;
      delivery_fee: number;
      total: number;
      payment_method: 'cod' | 'whatsapp';
    }) => {
      const { data, error } = await supabase
        .from('orders')
        .insert({
          shop_id: shopId,
          customer_name,
          customer_phone: phone,
          phone,
          city,
          quartier: quartier ?? null,
          notes: notes ?? null,
          items,
          subtotal,
          delivery_fee,
          total,
          payment_method,
          status: 'pending',
          is_archived: false,
        })
        .select('id')
        .single();

      if (error) {
        console.error('[useCreateOrder] insert error:', error);
        throw error;
      }
      return data;
    },
    onSuccess: (_data, { shopId }) => {
      queryClient.invalidateQueries({ queryKey: ['orders', shopId] });
      queryClient.invalidateQueries({ queryKey: ['order-counts', shopId] });
      queryClient.invalidateQueries({ queryKey: ['orders-today', shopId] });
    },
    onError: (error) => {
      console.error('[useCreateOrder] error:', error);
    },
  });
}

// Delete cancelled orders
export function useDeleteOrders() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      orderIds,
      shopId,
    }: {
      orderIds: string[];
      shopId: string;
    }) => {
      const results = await Promise.allSettled(
        orderIds.map(async (orderId) => {
          const { error } = await supabase
            .from('orders')
            .delete()
            .eq('id', orderId)
            .eq('shop_id', shopId)
            .eq('status', 'cancelled');

          if (error) throw error;
        })
      );

      const succeeded = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;
      return { succeeded, failed, total: orderIds.length };
    },
    onSuccess: (_data, { shopId }) => {
      queryClient.invalidateQueries({ queryKey: ['orders', shopId] });
      queryClient.invalidateQueries({ queryKey: ['order-counts', shopId] });
      queryClient.invalidateQueries({ queryKey: ['orders-today', shopId] });
    },
  });
}

// Count repeat customers using server-side aggregation
export function useRepeatCustomerCount(shopId: string | undefined) {
  return useQuery({
    queryKey: ['repeat-customer-count', shopId],
    queryFn: async () => {
      if (!shopId) return 0;
      const { data, error } = await supabase.rpc('get_repeat_customer_count', { _shop_id: shopId });
      if (error) throw error;
      return (data as number) ?? 0;
    },
    enabled: !!shopId,
    staleTime: 60_000,
  });
}
