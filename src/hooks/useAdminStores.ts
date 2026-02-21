import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAdminAuditLog } from './useAdminAuditLog';

export function useAdminStores() {
  const { log } = useAdminAuditLog();

  const query = useQuery({
    queryKey: ['admin-stores'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shops')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data ?? []).map((s: any) => ({
        id: s.id,
        name: s.name,
        slug: s.slug,
        owner_id: s.owner_id,
        is_active: s.is_active,
        is_suspended: s.is_suspended ?? false,
        suspended_reason: s.suspended_reason ?? null,
        product_count: 0,
        order_count: 0,
        report_count: 0,
        created_at: s.created_at,
      }));
    },
  });

  const suspendStore = async (shopId: string) => {
    await supabase
      .from('shops')
      .update({ is_suspended: true, suspended_reason: 'Suspended by admin' })
      .eq('id', shopId);
    await log({ action: 'suspend_store', target_type: 'store', target_id: shopId });
    query.refetch();
  };

  const reactivateStore = async (shopId: string) => {
    await supabase
      .from('shops')
      .update({ is_suspended: false, suspended_reason: null })
      .eq('id', shopId);
    await log({ action: 'reactivate_store', target_type: 'store', target_id: shopId });
    query.refetch();
  };

  return {
    stores: query.data ?? [],
    isLoading: query.isLoading,
    refetch: query.refetch,
    suspendStore,
    reactivateStore,
  };
}
