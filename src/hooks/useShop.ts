import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Shop } from '@/types/shop';

export function useShop() {
  const { user } = useAuth();

  const { data: shop, isLoading, refetch } = useQuery({
    queryKey: ['shop', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('shops')
        .select('*')
        .eq('owner_id', user.id)
        .maybeSingle();

      if (error) throw error;
      return data as Shop | null;
    },
    enabled: !!user,
  });

  console.log('[useShop] user:', user?.id, 'isLoading:', isLoading, 'hasShop:', !!shop);

  return {
    shop: shop ?? null,
    isLoading,
    hasShop: !!shop,
    refetch,
  };
}
