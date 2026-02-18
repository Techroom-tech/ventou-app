import { createContext, useContext, ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Product } from '@/types/shop';
import { supabase } from '@/integrations/supabase/client';
import { useShop } from '@/hooks/useShop';
import { useToast } from '@/hooks/use-toast';

interface ProductContextType {
  products: Product[];
  isLoading: boolean;
  addProduct: (product: Omit<Product, 'id' | 'created_at' | 'updated_at'>) => void;
  updateProduct: (id: string, updates: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  duplicateProduct: (id: string) => void;
  toggleVisibility: (id: string) => void;
}

const ProductContext = createContext<ProductContextType | undefined>(undefined);

export function ProductProvider({ children }: { children: ReactNode }) {
  const { shop } = useShop();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products', shop?.id],
    queryFn: async () => {
      if (!shop?.id) return [];
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('shop_id', shop.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Product[];
    },
    enabled: !!shop?.id,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['products', shop?.id] });

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
    <ProductContext.Provider value={{ products, isLoading, addProduct, updateProduct, deleteProduct, duplicateProduct, toggleVisibility }}>
      {children}
    </ProductContext.Provider>
  );
}

export function useProducts() {
  const ctx = useContext(ProductContext);
  if (!ctx) throw new Error('useProducts must be used within ProductProvider');
  return ctx;
}
