import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Store, MessageCircle, ShoppingBag } from 'lucide-react';
import { supabase, formatCurrency } from '@/integrations/supabase/client';
import { Shop, Product } from '@/types/shop';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

interface ShopStorefrontProps {
  slug: string;
}

export default function ShopStorefront({ slug }: ShopStorefrontProps) {
  const { t } = useTranslation();

  const { data: shop, isLoading: shopLoading, error: shopError } = useQuery({
    queryKey: ['storefront-shop', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shops')
        .select('*')
        .eq('slug', slug)
        .eq('is_active', true)
        .maybeSingle();
      if (error) throw error;
      return data as Shop | null;
    },
  });

  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ['storefront-products', shop?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('shop_id', shop!.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Product[];
    },
    enabled: !!shop?.id,
  });

  if (shopLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Skeleton className="w-full h-48" />
        <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-64 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!shop || shopError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Store className="h-16 w-16 mx-auto text-muted-foreground" />
          <h1 className="text-2xl font-bold">{t('storefront.notFound')}</h1>
          <p className="text-muted-foreground">{t('storefront.notFoundDescription')}</p>
          <Button variant="outline" onClick={() => window.location.href = 'https://ventou.shop'}>
            {t('common.back')}
          </Button>
        </div>
      </div>
    );
  }

  const primaryColor = shop.primary_color || '#1E3A5F';

  return (
    <div className="min-h-screen bg-background">
      {/* Banner */}
      <div className="w-full h-48 md:h-64 relative" style={{ backgroundColor: primaryColor }}>
        {shop.banner_url && (
          <img src={shop.banner_url} alt="" className="w-full h-full object-cover" />
        )}
        {/* Logo overlay */}
        <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 md:left-8 md:translate-x-0">
          <div className="w-20 h-20 rounded-full border-4 border-background bg-card flex items-center justify-center overflow-hidden shadow-lg">
            {shop.logo_url ? (
              <img src={shop.logo_url} alt={shop.name} className="w-full h-full object-cover" />
            ) : (
              <Store className="h-8 w-8 text-muted-foreground" />
            )}
          </div>
        </div>
      </div>

      {/* Shop info */}
      <div className="max-w-6xl mx-auto px-4">
        <div className="pt-14 md:pt-16 pb-6 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">{shop.name}</h1>
            {shop.category && (
              <span
                className="inline-block mt-1 text-xs px-3 py-1 rounded-full text-white"
                style={{ backgroundColor: primaryColor }}
              >
                {t(`createShop.categories.${shop.category}`, shop.category)}
              </span>
            )}
            {shop.description && (
              <p className="mt-2 text-muted-foreground max-w-xl">{shop.description}</p>
            )}
            {shop.city && shop.country && (
              <p className="mt-1 text-sm text-muted-foreground">{shop.city}, {shop.country}</p>
            )}
          </div>
          {shop.whatsapp && (
            <a
              href={`https://wa.me/${shop.whatsapp.replace(/[^0-9+]/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button
                className="gap-2 text-white"
                style={{ backgroundColor: '#25D366' }}
              >
                <MessageCircle className="h-4 w-4" />
                {t('storefront.contact')}
              </Button>
            </a>
          )}
        </div>

        {/* Products */}
        <div className="pb-12">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <ShoppingBag className="h-5 w-5" />
            {t('storefront.products')}
          </h2>

          {productsLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-64 rounded-lg" />
              ))}
            </div>
          ) : !products || products.length === 0 ? (
            <div className="text-center py-16">
              <ShoppingBag className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">{t('storefront.noProducts')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {products.map((product) => (
                <div key={product.id} className="rounded-lg border bg-card overflow-hidden hover:shadow-md transition-shadow">
                  <div className="aspect-square bg-muted">
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ShoppingBag className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <h3 className="font-medium text-sm line-clamp-2">{product.name}</h3>
                    <p className="mt-1 font-bold" style={{ color: primaryColor }}>
                      {formatCurrency(product.price, shop.currency)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        <p>
          {t('storefront.poweredBy')}{' '}
          <a href="https://ventou.shop" className="font-semibold hover:underline" style={{ color: primaryColor }}>
            Ventou
          </a>
        </p>
      </footer>
    </div>
  );
}
