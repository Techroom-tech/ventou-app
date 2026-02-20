import { useState, useMemo, useEffect } from 'react';
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
import CheckoutDrawer from '@/components/storefront/CheckoutDrawer';
import ProductDetailSheet from '@/components/storefront/ProductDetailSheet';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { CountryProvider, useCountry } from '@/contexts/CountryContext';
import CountrySelector from '@/components/storefront/CountrySelector';

interface ShopStorefrontProps {
  slug: string;
}

/** Generate initials avatar from shop name */
function ShopAvatar({ name, color, size = 'md' }: { name: string; color: string; size?: 'sm' | 'md' | 'lg' }) {
  const initials = name
    .split(/\s+/)
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const sizeClasses = {
    sm: 'w-7 h-7 text-xs',
    md: 'w-9 h-9 text-sm',
    lg: 'w-20 h-20 text-2xl',
  };

  return (
    <div
      className={`${sizeClasses[size]} rounded-full flex items-center justify-center text-white font-bold shrink-0`}
      style={{ backgroundColor: color }}
    >
      {initials}
    </div>
  );
}

function StorefrontContent({ slug }: ShopStorefrontProps) {
  const { t } = useTranslation();
  const { addToCart } = useCart();
  const { country } = useCountry();
  const [searchQuery, setSearchQuery] = useState('');
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // ── postMessage listener for live preview mode ──
  useEffect(() => {
    if (!window.location.search.includes('preview=true')) return;
    const handler = (e: MessageEvent) => {
      if (e.data?.type !== 'VENTOU_THEME_UPDATE') return;
      const root = document.documentElement;
      const vars = e.data.vars as Record<string, string>;

      // Apply all CSS custom properties to :root
      Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v));

      // Card bg: apply to all elements with data-card-bg attribute
      if (vars['--color-card-bg']) {
        document.querySelectorAll<HTMLElement>('[data-card-bg]').forEach(el => {
          el.style.backgroundColor = vars['--color-card-bg'];
        });
      }

      // Dark mode: toggle 'dark' class on <html>
      if (vars['--dark-mode']) {
        if (vars['--dark-mode'] === 'dark') root.classList.add('dark');
        else root.classList.remove('dark');
      }

      // Global radius: override --radius var used by Tailwind rounded-* utilities
      if (vars['--global-radius']) root.style.setProperty('--radius', vars['--global-radius']);

      // Button CSS vars: propagate to [data-storefront-btn] elements
      if (vars['--color-btn-bg'] || vars['--color-btn-text'] || vars['--btn-radius'] || vars['--btn-shadow'] || vars['--btn-animation']) {
        document.querySelectorAll<HTMLElement>('[data-storefront-btn]').forEach(el => {
          if (vars['--color-btn-bg']) el.style.backgroundColor = vars['--color-btn-bg'];
          if (vars['--color-btn-text']) el.style.color = vars['--color-btn-text'];
          if (vars['--btn-radius']) el.style.borderRadius = vars['--btn-radius'];
          if (vars['--btn-shadow']) el.style.boxShadow = vars['--btn-shadow'];
          // Animation via CSS class swap
          el.classList.remove('btn-anim-pulse', 'btn-anim-shine');
          if (vars['--btn-animation'] === 'Pulse') el.classList.add('btn-anim-pulse');
          else if (vars['--btn-animation'] === 'Shine') el.classList.add('btn-anim-shine');
        });
      }

      // Typography: dynamically load Google Fonts and inject style override
      const hFont = vars['--heading-font'];
      const bFont = vars['--body-font'];
      [hFont, bFont].filter(Boolean).forEach(font => {
        if (!font || font === 'Inter') return;
        const id = `gf-sf-${font.replace(/\s+/g, '-')}`;
        if (!document.getElementById(id)) {
          const link = document.createElement('link');
          link.id = id;
          link.rel = 'stylesheet';
          link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(font)}:wght@400;500;600;700&display=swap`;
          document.head.appendChild(link);
        }
      });
      if (hFont || bFont) {
        let style = document.getElementById('ventou-font-overrides') as HTMLStyleElement | null;
        if (!style) {
          style = document.createElement('style');
          style.id = 'ventou-font-overrides';
          document.head.appendChild(style);
        }
        const resolvedH = hFont ?? root.style.getPropertyValue('--heading-font') ?? 'Inter';
        const resolvedB = bFont ?? root.style.getPropertyValue('--body-font') ?? 'Inter';
        style.textContent = `
          body { font-family: '${resolvedB}', sans-serif !important; }
          h1, h2, h3, h4, h5, h6 { font-family: '${resolvedH}', sans-serif !important; }
        `;
      }

      // Product grid columns: update elements with data-products-grid attribute
      if (vars['--products-grid-cols']) {
        document.querySelectorAll<HTMLElement>('[data-products-grid]').forEach(el => {
          el.style.gridTemplateColumns = vars['--products-grid-cols'];
        });
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  const { data: shop, isLoading: shopLoading, error: shopError } = useQuery({
    queryKey: ['storefront-shop', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shops')
        .select('*')
        .eq('slug', slug)
        .maybeSingle();
      if (error) throw error;
      return data as Shop | null;
    },
  });

  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ['storefront-products', shop?.id, shop?.products_sort_order],
    queryFn: async () => {
      let query = supabase
        .from('products')
        .select('*')
        .eq('shop_id', shop!.id)
        .eq('is_active', true);

      const sort = (shop as any).products_sort_order ?? 'recent';
      if (sort === 'alpha') query = query.order('name', { ascending: true });
      else if (sort === 'price_asc') query = query.order('price', { ascending: true });
      else if (sort === 'price_desc') query = query.order('price', { ascending: false });
      else query = query.order('created_at', { ascending: false }); // recent & best_seller fallback

      const { data, error } = await query;
      if (error) throw error;
      return data as Product[];
    },
    enabled: !!shop?.id,
  });

  // ── Apply dark mode + fonts on initial load based on shop settings ──
  useEffect(() => {
    if (!shop) return;
    // Dark mode
    if ((shop as any).dark_mode_enabled) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    // Fonts
    const hFont = (shop as any).heading_font ?? 'Inter';
    const bFont = (shop as any).body_font ?? 'Inter';
    [hFont, bFont].filter((f: string) => f && f !== 'Inter').forEach((font: string) => {
      const id = `gf-sf-${font.replace(/\s+/g, '-')}`;
      if (!document.getElementById(id)) {
        const link = document.createElement('link');
        link.id = id;
        link.rel = 'stylesheet';
        link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(font)}:wght@400;500;600;700&display=swap`;
        document.head.appendChild(link);
      }
    });
    let style = document.getElementById('ventou-font-overrides') as HTMLStyleElement | null;
    if (!style) {
      style = document.createElement('style');
      style.id = 'ventou-font-overrides';
      document.head.appendChild(style);
    }
    style.textContent = `
      body { font-family: '${bFont}', sans-serif !important; }
      h1, h2, h3, h4, h5, h6 { font-family: '${hFont}', sans-serif !important; }
    `;
    return () => { document.documentElement.classList.remove('dark'); };
  }, [shop]);

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
  const ctaBg = shop.button_color ?? primaryColor;
  const ctaText = shop.button_text_color ?? '#FFFFFF';
  const ctaRadius = shop.button_radius === 'Sharp' ? '4px' : shop.button_radius === 'Pill' ? '999px' : '8px';
  const ctaShadow = shop.button_shadow === 'Soft' ? '0 2px 8px rgba(0,0,0,0.15)' : shop.button_shadow === 'Elevated' ? '0 4px 16px rgba(0,0,0,0.25)' : 'none';
  const btnAnimClass = (shop as any).button_animation === 'Pulse' ? 'btn-anim-pulse' : (shop as any).button_animation === 'Shine' ? 'btn-anim-shine' : '';
  const displayMode = (shop as any).identity_display_mode ?? 'logo-name';
  const hasProducts = filteredProducts.length > 0;
  const isEmptyShop = !productsLoading && (!products || products.length === 0);

  const perRow = String((shop as any).products_per_row ?? '3');
  const gridCols = perRow === '1' ? '1fr' : perRow === '2' ? 'repeat(2, minmax(0,1fr))' : 'repeat(3, minmax(0,1fr))';

  const cardClass = (shop as any).product_card_style === 'Border minimal'
    ? 'rounded-xl border border-border/70 bg-card overflow-hidden cursor-pointer group transition-all duration-200'
    : (shop as any).product_card_style === 'Flat'
    ? 'rounded-xl bg-muted/40 overflow-hidden cursor-pointer group transition-all duration-200'
    : 'rounded-xl border bg-card overflow-hidden hover:shadow-lg cursor-pointer group transition-all duration-200'; // Soft shadow (default)

  const showLogo = displayMode === 'logo-only' || displayMode === 'logo-name';
  const showName = displayMode === 'name-only' || displayMode === 'logo-name';

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-card/95 backdrop-blur-sm border-b">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            {showLogo && (
              shop.logo_url ? (
                <div className="w-9 h-9 rounded-full bg-muted overflow-hidden shrink-0">
                  <img src={shop.logo_url} alt={shop.name} className="w-full h-full object-cover" />
                </div>
              ) : (
                <ShopAvatar name={shop.name} color={primaryColor} size="md" />
              )
            )}
            {showName && (
              <span className="font-bold text-lg truncate">{shop.name}</span>
            )}
          </div>

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

          <div className="flex items-center gap-2">
            <CountrySelector />
            <ThemeToggle />
            <Button variant="ghost" size="icon" className="relative" onClick={() => setCartOpen(true)}>
              <ShoppingCart className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

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

      {/* Banner */}
      <section className="w-full relative" style={{ backgroundColor: primaryColor }}>
        {shop.banner_url ? (
          <img src={shop.banner_url} alt="" className="w-full h-48 md:h-64 object-cover" />
        ) : (
          <div className="w-full h-32 md:h-48" />
        )}
      </section>

      {/* Shop Info — name + meta only, no duplicate logo */}
      <div className="max-w-6xl mx-auto w-full px-4">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 pt-4 pb-6 relative z-10">
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

        {/* Empty shop - Coming soon state */}
        {isEmptyShop ? (
          <div id="products-section" className="pb-12">
            <div className="text-center py-16 space-y-6">
              {shop.logo_url ? (
                <div className="w-24 h-24 rounded-full mx-auto overflow-hidden border-4 border-muted">
                  <img src={shop.logo_url} alt={shop.name} className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="flex justify-center">
                  <ShopAvatar name={shop.name} color={primaryColor} size="lg" />
                </div>
              )}
              <div className="space-y-2">
                <h2 className="text-xl font-bold">{shop.name}</h2>
                {shop.description && (
                  <p className="text-muted-foreground max-w-md mx-auto">{shop.description}</p>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {t('storefront.comingSoon')}
              </p>
            </div>
          </div>
        ) : (
          <>
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
                {hasProducts && (
                  <span className="text-sm font-normal text-muted-foreground">({filteredProducts.length})</span>
                )}
              </h2>

              {productsLoading ? (
                <div
                  data-products-grid
                  style={{ display: 'grid', gap: 16, gridTemplateColumns: gridCols }}
                >
                  {[...Array(6)].map((_, i) => (
                    <Skeleton key={i} className="h-72 rounded-lg" />
                  ))}
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="text-center py-16">
                  <ShoppingBag className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">{t('dashboard.products.noResults')}</p>
                </div>
              ) : (
                <div
                  data-products-grid
                  style={{ display: 'grid', gap: 16, gridTemplateColumns: gridCols }}
                >
                  {filteredProducts.map(product => {
                    const hasPromo = product.compare_at_price && product.compare_at_price > product.price;
                    const discountPercent = hasPromo
                      ? Math.round(((product.compare_at_price! - product.price) / product.compare_at_price!) * 100)
                      : 0;
                    const isOutOfStock = product.track_stock && product.stock_quantity === 0;
                    const isLowStock = product.track_stock && product.stock_quantity > 0 && product.stock_quantity <= 5;

                    return (
                      <div
                        key={product.id}
                        data-card-bg
                        className={cardClass}
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
                              -{discountPercent}%
                            </Badge>
                          )}
                          {isLowStock && (
                            <Badge className="absolute top-2 right-2 bg-destructive/80 text-destructive-foreground text-xs">
                              {t('storefront.stockLow', { count: product.stock_quantity })}
                            </Badge>
                          )}
                          {isOutOfStock && (
                            <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
                              <Badge variant="secondary">{t('storefront.outOfStock')}</Badge>
                            </div>
                          )}
                        </div>
                        <div className="p-4">
                          <h3 className="font-medium text-sm line-clamp-2 mb-2">{product.name}</h3>
                          <div className="flex items-center gap-2">
                            {hasPromo && (
                              <span className="text-xs text-muted-foreground line-through">
                                {formatCurrency(product.compare_at_price!, shop.currency ?? country.currency)}
                              </span>
                            )}
                            <span className="font-bold" style={{ color: primaryColor }}>
                              {formatCurrency(product.price, shop.currency ?? country.currency)}
                            </span>
                          </div>
                          <Button
                            data-storefront-btn
                            size="sm"
                            className={`w-full mt-3 gap-2 ${btnAnimClass}`}
                            disabled={isOutOfStock}
                            style={{
                              backgroundColor: isOutOfStock ? undefined : ctaBg,
                              color: isOutOfStock ? undefined : ctaText,
                              borderRadius: ctaRadius,
                              boxShadow: isOutOfStock ? undefined : ctaShadow,
                              width: (shop as any).button_width === 'Fit content' ? 'auto' : '100%',
                            }}
                            onClick={e => {
                              e.stopPropagation();
                              addToCart(product);
                            }}
                          >
                            <ShoppingCart className="h-3.5 w-3.5" />
                            {shop.cta_label || t('storefront.addToCart')}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <footer className="mt-auto border-t py-8">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              {shop.logo_url ? (
                <div className="w-7 h-7 rounded-full bg-muted overflow-hidden flex items-center justify-center">
                  <img src={shop.logo_url} alt={shop.name} className="w-full h-full object-cover" />
                </div>
              ) : (
                <ShopAvatar name={shop.name} color={primaryColor} size="sm" />
              )}
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

      <CartButton onClick={() => setCartOpen(true)} />

      <CartDrawer
        open={cartOpen}
        onOpenChange={setCartOpen}
        onCheckout={() => setCheckoutOpen(true)}
        currency={shop.currency}
        shopName={shop.name}
      />

      <CheckoutDrawer
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
        shop={shop}
      />

      <ErrorBoundary fallbackMessage="Impossible d'afficher ce produit">
        <ProductDetailSheet
          product={selectedProduct}
          shop={shop}
          open={detailOpen}
          onOpenChange={setDetailOpen}
        />
      </ErrorBoundary>
    </div>
  );
}

export default function ShopStorefront({ slug }: ShopStorefrontProps) {
  return (
    <CountryProvider>
      <CartProvider shopId={slug}>
        <StorefrontContent slug={slug} />
      </CartProvider>
    </CountryProvider>
  );
}
