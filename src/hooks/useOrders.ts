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
  return useQuery({
    queryKey: ['orders', shopId, status, search, page, includeArchived],
    queryFn: async () => {
      if (!shopId) return { orders: [], total: 0 };

      let query = supabase
        .from('orders')
        .select('*', { count: 'exact' })
        .eq('shop_id', shopId)
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

      // Hide archived orders by default unless explicitly requested
      if (!includeArchived) {
        query = query.eq('is_archived', false);
      }

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
        .select('status, is_archived')
        .eq('shop_id', shopId)
        .eq('is_archived', false);

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

      // Update the order status — use .select() so we can detect 0-row updates
      const { data: updatedRows, error: updateError } = await supabase
        .from('orders')
        .update({
          status: newStatus,
          ...(newStatus === 'archived' ? { is_archived: true } : {}),
        })
        .eq('id', orderId)
        .eq('shop_id', shopId)
        .select('id, status');

      if (updateError) {
        console.error('[useUpdateOrderStatus] update error:', updateError);
        throw updateError;
      }

      // Guard: if 0 rows were updated the RLS blocked the write
      if (!updatedRows || updatedRows.length === 0) {
        throw new Error(
          'Mise à jour impossible. Vérifiez vos permissions dans Supabase (politique RLS owner_update_orders).'
        );
      }

      console.log('[useUpdateOrderStatus] success:', updatedRows[0]);

      // Insert status log (best-effort, don't block on failure)
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
      // Invalidate all relevant caches
      queryClient.invalidateQueries({ queryKey: ['orders', shopId] });
      queryClient.invalidateQueries({ queryKey: ['order-counts', shopId] });
      queryClient.invalidateQueries({ queryKey: ['order-detail', orderId] });
      queryClient.invalidateQueries({ queryKey: ['order-timeline', orderId] });
    },
    onError: (error) => {
      console.error('[useUpdateOrderStatus] mutation error:', error);
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
    },
    onError: (error) => {
      console.error('[useCreateOrder] error:', error);
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
