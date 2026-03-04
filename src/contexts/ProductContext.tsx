import { createContext, useContext, ReactNode, useState, useCallback, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Product } from '@/types/shop';
import { supabase } from '@/integrations/supabase/client';
import { useShop } from '@/hooks/useShop';
import { useToast } from '@/hooks/use-toast';
import { invalidateStorefrontCache } from '@/lib/invalidateStorefrontCache';

const PAGE_SIZE = 20;

interface ProductContextType {
  products: Product[];
  isLoading: boolean;
  addProduct: (product: Omit<Product, 'id' | 'created_at' | 'updated_at'>) => void;
  updateProduct: (id: string, updates: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  duplicateProduct: (id: string) => void;
  toggleVisibility: (id: string) => void;
  // Pagination
  page: number;
  setPage: (p: number) => void;
  totalCount: number;
  totalPages: number;
  // Filters
  search: string;
  setSearch: (s: string) => void;
  statusFilter: string;
  setStatusFilter: (s: string) => void;
}

const ProductContext = createContext<ProductContextType | undefined>(undefined);

export function ProductProvider({ children }: { children: ReactNode }) {
  const { shop } = useShop();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [page, setPageRaw] = useState(0);
  const [search, setSearchRaw] = useState('');
  const [statusFilter, setStatusFilterRaw] = useState('all');

  const setSearch = useCallback((s: string) => {
    setSearchRaw(s);
    setPageRaw(0);
  }, []);

  const setStatusFilter = useCallback((s: string) => {
    setStatusFilterRaw(s);
    setPageRaw(0);
  }, []);

  const setPage = useCallback((p: number) => setPageRaw(p), []);

  const { data, isLoading } = useQuery({
    queryKey: ['products', shop?.id, page, search, statusFilter],
    queryFn: async () => {
      if (!shop?.id) return { products: [] as Product[], total: 0 };

      let query = supabase
        .from('products')
        .select('*', { count: 'exact' })
        .eq('shop_id', shop.id)
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

      if (search.trim()) {
        query = query.ilike('name', `%${search.trim()}%`);
      }

      if (statusFilter === 'active') {
        query = query.eq('is_active', true);
      } else if (statusFilter === 'draft') {
        query = query.eq('is_active', false);
      }

      const { data: rows, error, count } = await query;
      if (error) throw error;
      return { products: (rows ?? []) as Product[], total: count ?? 0 };
    },
    enabled: !!shop?.id,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  });

  // Prefetch next page
  const totalForPrefetch = data?.total ?? 0;
  const hasNextPage = (page + 1) * PAGE_SIZE < totalForPrefetch;
  
  useEffect(() => {
    if (!shop?.id || !hasNextPage) return;
    const nextPage = page + 1;
    queryClient.prefetchQuery({
      queryKey: ['products', shop.id, nextPage, search, statusFilter],
      queryFn: async () => {
        let query = supabase
          .from('products')
          .select('*', { count: 'exact' })
          .eq('shop_id', shop.id)
          .order('created_at', { ascending: false })
          .range(nextPage * PAGE_SIZE, nextPage * PAGE_SIZE + PAGE_SIZE - 1);
        if (search.trim()) query = query.ilike('name', `%${search.trim()}%`);
        if (statusFilter === 'active') query = query.eq('is_active', true);
        else if (statusFilter === 'draft') query = query.eq('is_active', false);
        const { data: rows, error, count } = await query;
        if (error) throw error;
        return { products: (rows ?? []) as Product[], total: count ?? 0 };
      },
      staleTime: 60_000,
    });
  }, [shop?.id, page, search, statusFilter, hasNextPage, queryClient]);

  const products = data?.products ?? [];
  const totalCount = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['products', shop?.id] });
    if (shop?.id) invalidateStorefrontCache(shop.id, shop.slug);
  };

  const addProduct = async (product: Omit<Product, 'id' | 'created_at' | 'updated_at'>) => {
    if (!shop?.id) return;
    const { error } = await supabase.from('products').insert({ ...product, shop_id: shop.id });
    if (error) {
      toast({ title: 'Erreur', description: 'Impossible d\'ajouter le produit.', variant: 'destructive' });
    } else {
      invalidate();
    }
  };

  const updateProduct = async (id: string, updates: Partial<Product>) => {
    const { error } = await supabase
      .from('products')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) {
      toast({ title: 'Erreur', description: 'Impossible de modifier le produit.', variant: 'destructive' });
    } else {
      invalidate();
    }
  };

  const deleteProduct = async (id: string) => {
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) {
      toast({ title: 'Erreur', description: 'Impossible de supprimer le produit.', variant: 'destructive' });
    } else {
      invalidate();
    }
  };

  const duplicateProduct = async (id: string) => {
    const original = products.find((p) => p.id === id);
    if (!original || !shop?.id) return;
    const { id: _id, created_at: _ca, updated_at: _ua, ...rest } = original;
    const { error } = await supabase.from('products').insert({
      ...rest,
      shop_id: shop.id,
      name: `${original.name} (copie)`,
      slug: `${original.slug}-copie-${Date.now()}`,
      is_active: false,
      status: 'draft',
    });
    if (error) {
      toast({ title: 'Erreur', description: 'Impossible de dupliquer le produit.', variant: 'destructive' });
    } else {
      invalidate();
    }
  };

  const toggleVisibility = async (id: string) => {
    const product = products.find((p) => p.id === id);
    if (!product) return;
    const { error } = await supabase
      .from('products')
      .update({ is_active: !product.is_active, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) {
      toast({ title: 'Erreur', description: 'Impossible de modifier la visibilité.', variant: 'destructive' });
    } else {
      invalidate();
    }
  };

  return (
    <ProductContext.Provider value={{
      products, isLoading, addProduct, updateProduct, deleteProduct, duplicateProduct, toggleVisibility,
      page, setPage, totalCount, totalPages,
      search, setSearch, statusFilter, setStatusFilter,
    }}>
      {children}
    </ProductContext.Provider>
  );
}

export function useProducts() {
  const ctx = useContext(ProductContext);
  if (!ctx) throw new Error('useProducts must be used within ProductProvider');
  return ctx;
}
