import { useQuery } from '@tanstack/react-query';
import { ShoppingBag, ShoppingCart } from 'lucide-react';
import { supabase, formatCurrency } from '@/integrations/supabase/client';
import { Product, Shop } from '@/types/shop';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCart } from './CartContext';

interface RelatedProductsProps {
  product: Product;
  shop: Shop;
  onProductClick: (product: Product) => void;
}

export default function RelatedProducts({ product, shop, onProductClick }: RelatedProductsProps) {
  const { addToCart } = useCart();

  const { data: related = [] } = useQuery({
    queryKey: ['related-products', product.id, shop.id],
    queryFn: async () => {
      // Try same category first
      let query = supabase
        .from('products')
        .select('*')
        .eq('shop_id', shop.id)
        .eq('is_active', true)
        .neq('id', product.id)
        .limit(4);

      if (product.category) {
        query = query.eq('category', product.category);
      }

      const { data } = await query.order('created_at', { ascending: false });

      // If not enough, fetch any from shop
      if (!data || data.length < 4) {
        const { data: fallback } = await supabase
          .from('products')
          .select('*')
          .eq('shop_id', shop.id)
          .eq('is_active', true)
          .neq('id', product.id)
          .limit(4)
          .order('created_at', { ascending: false });
        return (fallback ?? []) as Product[];
      }

      return (data ?? []) as Product[];
    },
    enabled: !!product.id && !!shop.id,
    staleTime: 60_000,
  });

  if (related.length === 0) return null;

  // Use semantic tokens instead of vendor colors for consistent UI

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-bold">Produits similaires</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {related.map(p => {
          const hasPromo = p.compare_at_price && p.compare_at_price > p.price;
          const discount = hasPromo
            ? Math.round(((p.compare_at_price! - p.price) / p.compare_at_price!) * 100)
            : 0;

          return (
            <div
              key={p.id}
              className="rounded-xl border bg-card overflow-hidden cursor-pointer group hover:shadow-lg transition-shadow"
              onClick={() => onProductClick(p)}
            >
              <div className="aspect-[4/3] bg-muted relative overflow-hidden">
                {p.image_url ? (
                  <img
                    src={p.image_url}
                    alt={p.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ShoppingBag className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
                {hasPromo && (
                  <Badge className="absolute top-2 left-2 bg-destructive text-destructive-foreground text-xs">
                    -{discount}%
                  </Badge>
                )}
              </div>
              <div className="p-3 space-y-1.5">
                <h3 className="text-sm font-medium line-clamp-2">{p.name}</h3>
                <div>
                  {hasPromo && (
                    <p className="text-xs text-muted-foreground line-through">
                      {formatCurrency(p.compare_at_price!, shop.currency)}
                    </p>
                  )}
                  <p className="text-sm font-semibold text-primary">
                    {formatCurrency(p.price, shop.currency)}
                  </p>
                </div>
                <Button
                  size="sm"
                  className="w-full gap-1 text-xs h-8"
                  onClick={e => {
                    e.stopPropagation();
                    addToCart(p);
                  }}
                >
                  <ShoppingCart className="h-3 w-3" />
                  Ajouter
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
