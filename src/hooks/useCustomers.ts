import { useState, useCallback } from 'react';
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
}

function computeBadge(delivered: number, cancelled: number, total: number): CustomerBadge {
  if (delivered >= 3) return 'loyal';
  if (cancelled >= 2) return 'at_risk';
  if (total === 1) return 'new';
  return null;
}

const PAGE_SIZE = 20;

export function useCustomers(shopId: string | undefined) {
  const [search, setSearchRaw] = useState('');
  const [page, setPage] = useState(1);

  const debouncedSearch = useCallback((value: string) => {
    setSearchRaw(value);
    setPage(1);
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ['customers-stats', shopId, search, page],
    queryFn: async () => {
      if (!shopId) return { customers: [] as Customer[], totalCount: 0 };

      const { data: rows, error } = await supabase.rpc('get_customer_stats', {
        _shop_id: shopId,
        _search: search.trim(),
        _page_size: PAGE_SIZE,
        _page_offset: (page - 1) * PAGE_SIZE,
      });

      if (error) throw error;

      const customers: Customer[] = (rows ?? []).map((r: any) => ({
        phone: r.phone,
        name: r.name ?? '',
        city: r.city ?? '',
        quartier: r.quartier ?? null,
        totalOrders: Number(r.total_orders),
        delivered: Number(r.delivered),
        cancelled: Number(r.cancelled),
        totalAmount: Number(r.total_amount),
        firstOrderDate: r.first_order_date ?? '',
        badge: computeBadge(Number(r.delivered), Number(r.cancelled), Number(r.total_orders)),
      }));

      const totalCount = rows?.[0]?.total_count ? Number(rows[0].total_count) : 0;
      return { customers, totalCount };
    },
    enabled: !!shopId,
  });

  const customers = data?.customers ?? [];
  const totalCount = data?.totalCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return {
    customers,
    totalCount,
    totalPages,
    page,
    setPage,
    search,
    setSearch: debouncedSearch,
    isLoading,
    allCustomers: customers,
  };
}
