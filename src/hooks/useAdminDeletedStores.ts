import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAdminAuditLog } from './useAdminAuditLog';
import { toast } from '@/hooks/use-toast';

export function useAdminDeletedStores() {
  const { log } = useAdminAuditLog();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['admin-deleted-stores'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shops')
        .select('id, name, slug, owner_id, deleted_at, created_at')
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false });

      if (error) throw error;
      return data ?? [];
    },
  });

  const restoreMutation = useMutation({
    mutationFn: async (shopId: string) => {
      const { error } = await supabase
        .from('shops')
        .update({ deleted_at: null, is_active: true })
        .eq('id', shopId);
      if (error) throw error;
      await log({ action: 'restore_store', target_type: 'store', target_id: shopId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-deleted-stores'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stores'] });
      toast({ title: 'Boutique restaurée avec succès' });
    },
    onError: () => {
      toast({ title: 'Erreur lors de la restauration', variant: 'destructive' });
    },
  });

  const permanentDeleteMutation = useMutation({
    mutationFn: async (shopId: string) => {
      const { error } = await supabase
        .from('shops')
        .delete()
        .eq('id', shopId);
      if (error) throw error;
      await log({ action: 'permanent_delete_store', target_type: 'store', target_id: shopId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-deleted-stores'] });
      toast({ title: 'Boutique supprimée définitivement' });
    },
    onError: () => {
      toast({ title: 'Erreur lors de la suppression', variant: 'destructive' });
    },
  });

  return {
    stores: query.data ?? [],
    isLoading: query.isLoading,
    restore: restoreMutation.mutateAsync,
    permanentDelete: permanentDeleteMutation.mutateAsync,
    isRestoring: restoreMutation.isPending,
    isDeleting: permanentDeleteMutation.isPending,
  };
}
