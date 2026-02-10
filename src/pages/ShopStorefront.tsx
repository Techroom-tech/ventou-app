import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Store, MessageCircle, ShoppingBag, Search, ShoppingCart, Menu, X } from 'lucide-react';
import { supabase, formatCurrency } from '@/integrations/supabase/client';
import { Shop, Product } from '@/types/shop';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from '@/components/ThemeToggle';
import { CartProvider, useCart } from '@/components/storefront/CartContext';
import CartButton from '@/components/storefront/CartButton';
import CartDrawer from '@/components/storefront/CartDrawer';
import ProductDetailSheet from '@/components/storefront/ProductDetailSheet';

interface ShopStorefrontProps {
  slug: string;
}

function StorefrontContent({ slug }: ShopStorefrontProps) {
  const { t } = useTranslation();
  const { addToCart } = useCart();
  const [searchQuery, setSearchQuery] = useState('');
  const [cartOpen, setCartOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    if (!searchQuery.trim()) return products;
    const q = searchQuery.toLowerCase();
    return products.filter(p => p.name.toLowerCase().includes(q));
  }, [products, searchQuery]);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    setMobileMenuOpen(false);
  };

  if (shopLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Skeleton className="w-full h-16" />
        <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-72 rounded-lg" />
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
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header / Navigation */}
      <header className="sticky top-0 z-30 bg-card/95 backdrop-blur-sm border-b">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          {/* Logo + Name */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-full bg-muted overflow-hidden shrink-0 flex items-center justify-center">
              {shop.logo_url ? (
                <img src={shop.logo_url} alt={shop.name} className="w-full h-full object-cover" />
              ) : (
                <Store className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
            <span className="font-bold text-lg truncate">{shop.name}</span>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-6">
            <button onClick={() => scrollTo('products-section')} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              {t('storefront.products')}
            </button>
            <button onClick={() => scrollTo('about-section')} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              {t('storefront.aboutShop')}
            </button>
            <button onClick={() => scrollTo('contact-section')} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              {t('storefront.contact')}
            </button>
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button
              variant="ghost"
              size="icon"
              className="relative"
              onClick={() => setCartOpen(true)}
            >
              <ShoppingCart className="h-5 w-5" />
            </Button>
            {/* Mobile menu toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Nav */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t bg-card px-4 py-3 space-y-2 animate-fade-in">
            <button onClick={() => scrollTo('products-section')} className="block w-full text-left text-sm font-medium py-2 text-muted-foreground hover:text-foreground">
              {t('storefront.products')}
            </button>
            <button onClick={() => scrollTo('about-section')} className="block w-full text-left text-sm font-medium py-2 text-muted-foreground hover:text-foreground">
              {t('storefront.aboutShop')}
            </button>
            <button onClick={() => scrollTo('contact-section')} className="block w-full text-left text-sm font-medium py-2 text-muted-foreground hover:text-foreground">
              {t('storefront.contact')}
            </button>
          </div>
        )}
      </header>

      {/* Hero / Banner */}
      <section className="w-full relative" style={{ backgroundColor: primaryColor }}>
        {shop.banner_url ? (
          <img src={shop.banner_url} alt="" className="w-full h-48 md:h-64 object-cover" />
        ) : (
          <div className="w-full h-32 md:h-48" />
        )}
      </section>

      {/* Shop Info */}
      <div className="max-w-6xl mx-auto w-full px-4">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 -mt-8 relative z-10 pb-6">
          <div className="flex items-end gap-4">
            <div className="w-20 h-20 rounded-xl border-4 border-background bg-card flex items-center justify-center overflow-hidden shadow-lg shrink-0">
              {shop.logo_url ? (
                <img src={shop.logo_url} alt={shop.name} className="w-full h-full object-cover" />
              ) : (
                <Store className="h-8 w-8 text-muted-foreground" />
              )}
            </div>
            <div className="pb-1">
              <h1 className="text-xl md:text-2xl font-bold">{shop.name}</h1>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                {shop.category && (
                  <Badge variant="secondary" className="text-xs">
                    {t(`createShop.categories.${shop.category}`, shop.category)}
                  </Badge>
                )}
                {shop.city && shop.country && (
                  <span className="text-xs text-muted-foreground">{shop.city}, {shop.country}</span>
                )}
              </div>
            </div>
          </div>
          {shop.whatsapp && (
            <a
              href={`https://wa.me/${shop.whatsapp.replace(/[^0-9+]/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              id="contact-section"
            >
              <Button className="gap-2 text-white" style={{ backgroundColor: '#25D366' }}>
                <MessageCircle className="h-4 w-4" />
                {t('storefront.contact')}
              </Button>
            </a>
          )}
        </div>

        {/* About */}
        {shop.description && (
          <div id="about-section" className="pb-6">
            <p className="text-muted-foreground max-w-2xl">{shop.description}</p>
          </div>
        )}

        {/* Search */}
        <div id="products-section" className="pb-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('storefront.search')}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Products Grid */}
        <div className="pb-12">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <ShoppingBag className="h-5 w-5" />
            {t('storefront.products')}
            {filteredProducts.length > 0 && (
              <span className="text-sm font-normal text-muted-foreground">({filteredProducts.length})</span>
            )}
          </h2>

          {productsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-72 rounded-lg" />
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-16">
              <ShoppingBag className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">
                {searchQuery ? t('dashboard.products.noResults') : t('storefront.noProducts')}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProducts.map(product => {
                const hasPromo = product.compare_at_price && product.compare_at_price > product.price;
                const discountPercent = hasPromo
                  ? Math.round(((product.compare_at_price! - product.price) / product.compare_at_price!) * 100)
                  : 0;

                return (
                  <div
                    key={product.id}
                    className="rounded-xl border bg-card overflow-hidden hover:shadow-lg transition-all duration-200 cursor-pointer group"
                    onClick={() => {
                      setSelectedProduct(product);
                      setDetailOpen(true);
                    }}
                  >
                    <div className="aspect-[4/3] bg-muted relative overflow-hidden">
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ShoppingBag className="h-10 w-10 text-muted-foreground" />
                        </div>
                      )}
                      {hasPromo && (
                        <Badge className="absolute top-2 left-2 bg-destructive text-destructive-foreground text-xs">
                          {t('storefront.discount', { percent: discountPercent })}
                        </Badge>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="font-medium text-sm line-clamp-2 mb-2">{product.name}</h3>
                      <div className="flex items-center gap-2">
                        {hasPromo && (
                          <span className="text-xs text-muted-foreground line-through">
                            {formatCurrency(product.compare_at_price!, shop.currency)}
                          </span>
                        )}
                        <span className="font-bold" style={{ color: primaryColor }}>
                          {formatCurrency(product.price, shop.currency)}
                        </span>
                      </div>
                      <Button
                        size="sm"
                        className="w-full mt-3 gap-2"
                        onClick={e => {
                          e.stopPropagation();
                          addToCart(product);
                        }}
                      >
                        <ShoppingCart className="h-3.5 w-3.5" />
                        {t('storefront.addToCart')}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-auto border-t py-8">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-muted overflow-hidden flex items-center justify-center">
                {shop.logo_url ? (
                  <img src={shop.logo_url} alt={shop.name} className="w-full h-full object-cover" />
                ) : (
                  <Store className="h-3.5 w-3.5 text-muted-foreground" />
                )}
              </div>
              <span className="text-sm font-medium">{shop.name}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} {shop.name}. {t('storefront.allRights')}
            </p>
            <p className="text-xs text-muted-foreground">
              {t('storefront.poweredBy')}{' '}
              <a href="https://ventou.shop" className="font-semibold hover:underline" style={{ color: primaryColor }}>
                Ventou
              </a>
            </p>
          </div>
        </div>
      </footer>

      {/* Cart Button + Drawers */}
      <CartButton onClick={() => setCartOpen(true)} />
      <CartDrawer
        open={cartOpen}
        onOpenChange={setCartOpen}
        whatsapp={shop.whatsapp}
        currency={shop.currency}
        shopName={shop.name}
      />
      <ProductDetailSheet
        product={selectedProduct}
        shop={shop}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </div>
  );
}

export default function ShopStorefront({ slug }: ShopStorefrontProps) {
  return (
    <CartProvider>
      <StorefrontContent slug={slug} />
    </CartProvider>
  );
}
