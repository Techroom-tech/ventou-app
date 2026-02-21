import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Shop } from '@/types/shop';
import { useState, useCallback } from 'react';

const SELECTED_SHOP_KEY = 'ventou_selected_shop';

export function useShop() {
  const { user } = useAuth();

  const { data: shops, isLoading, refetch } = useQuery({
    queryKey: ['shops', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('shops')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return (data ?? []) as Shop[];
    },
    enabled: !!user,
  });

  const allShops = shops ?? [];

  // Selected shop logic
  const storedId = typeof window !== 'undefined' ? localStorage.getItem(SELECTED_SHOP_KEY) : null;
  const selectedShop = allShops.find(s => s.id === storedId) ?? allShops[0] ?? null;

  const selectShop = useCallback((shopId: string) => {
    localStorage.setItem(SELECTED_SHOP_KEY, shopId);
  }, []);

  return {
    shop: selectedShop,
    shops: allShops,
    isLoading,
    hasShop: allShops.length > 0,
    refetch,
    selectShop,
  };
}
