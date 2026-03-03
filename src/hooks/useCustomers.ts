import { useMemo, useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type CustomerBadge = 'loyal' | 'new' | 'at_risk' | null;

export interface Customer {
  phone: string;
  name: string;
  city: string;
  quartier: string | null;
  totalOrders: number;
  delivered: number;
  cancelled: number;
  totalAmount: number;
  firstOrderDate: string;
  badge: CustomerBadge;
  orders: CustomerOrder[];
}

export interface CustomerOrder {
  id: string;
  created_at: string;
  total: number;
  status: string;
}

function computeBadge(delivered: number, cancelled: number, total: number): CustomerBadge {
  if (delivered >= 3) return 'loyal';
  if (cancelled >= 2) return 'at_risk';
  if (total === 1) return 'new';
  return null;
}

export function useCustomers(shopId: string | undefined) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  const { data: rawOrders, isLoading } = useQuery({
    queryKey: ['customers-orders', shopId],
    queryFn: async () => {
      if (!shopId) return [];
      const { data, error } = await supabase
        .from('orders')
        .select('id, customer_name, phone, city, quartier, status, total, created_at')
        .eq('shop_id', shopId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!shopId,
  });

  const allCustomers = useMemo(() => {
    if (!rawOrders?.length) return [];
    const map = new Map<string, Customer>();

    for (const o of rawOrders) {
      const phone = o.phone;
      if (!phone) continue;
      const existing = map.get(phone);
      const order: CustomerOrder = {
        id: o.id,
        created_at: o.created_at ?? '',
        total: o.total,
        status: o.status,
      };

      if (existing) {
        existing.totalOrders++;
        if (o.status === 'delivered') existing.delivered++;
        if (o.status === 'cancelled') existing.cancelled++;
        existing.totalAmount += o.total;
        if (o.created_at && o.created_at < existing.firstOrderDate) {
          existing.firstOrderDate = o.created_at;
        }
        // Use most recent name
        existing.orders.push(order);
      } else {
        map.set(phone, {
          phone,
          name: o.customer_name,
          city: o.city,
          quartier: o.quartier ?? null,
          totalOrders: 1,
          delivered: o.status === 'delivered' ? 1 : 0,
          cancelled: o.status === 'cancelled' ? 1 : 0,
          totalAmount: o.total,
          firstOrderDate: o.created_at ?? '',
          badge: null,
          orders: [order],
        });
      }
    }

    const customers = Array.from(map.values());
    for (const c of customers) {
      c.badge = computeBadge(c.delivered, c.cancelled, c.totalOrders);
      c.orders.sort((a, b) => b.created_at.localeCompare(a.created_at));
    }

    // Sort by total orders desc
    customers.sort((a, b) => b.totalOrders - a.totalOrders);
    return customers;
  }, [rawOrders]);

  const filtered = useMemo(() => {
    if (!search.trim()) return allCustomers;
    const q = search.toLowerCase();
    return allCustomers.filter(
      (c) => c.name.toLowerCase().includes(q) || c.phone.includes(q)
    );
  }, [allCustomers, search]);

  const totalCount = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const paginated = useMemo(
    () => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filtered, page]
  );

  const debouncedSearch = useCallback((value: string) => {
    setSearch(value);
    setPage(1);
  }, []);

  return {
    customers: paginated,
    totalCount,
    totalPages,
    page,
    setPage,
    search,
    setSearch: debouncedSearch,
    isLoading,
    allCustomers,
  };
}
