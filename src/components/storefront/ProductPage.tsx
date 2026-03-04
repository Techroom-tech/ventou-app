/**
 * ProductPage — Full-page, conversion-optimized product page.
 * Desktop: 2-column layout (gallery left, info right).
 * Mobile: stacked with sticky buy bar.
 */
import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Minus, Plus, ShoppingCart, ShoppingBag, ArrowLeft, Star,
} from 'lucide-react';
import { supabase, formatCurrency } from '@/integrations/supabase/client';
import { Product, Shop } from '@/types/shop';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCart } from './CartContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { useCountry } from '@/contexts/CountryContext';
import ProductGallery from './ProductGallery';
import ProductSEO from './ProductSEO';
import ProductReviews from './ProductReviews';
import RelatedProducts from './RelatedProducts';
import ShareButtons from './ShareButtons';
import TipTapRenderer from './TipTapRenderer';
import { trackViewContent, trackAddToCart } from '@/hooks/useStorefrontTracking';

interface ProductPageProps {
  product: Product;
  shop: Shop;
  onBack: () => void;
  onProductClick: (product: Product) => void;
}

export default function ProductPage({ product, shop, onBack, onProductClick }: ProductPageProps) {
  const { addToCart } = useCart();
  const { country } = useCountry();
  const isMobile = useIsMobile();
  const [quantity, setQuantity] = useState(1);
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});

  const currency = shop.currency ?? country.currency;
  const primaryColor = shop.primary_color || '#1E3A5F';
  const ctaBg = shop.button_color ?? primaryColor;
  const ctaText = shop.button_text_color ?? '#FFFFFF';
  const ctaRadius = shop.button_radius === 'Sharp' ? '4px' : shop.button_radius === 'Pill' ? '999px' : '8px';

  // Fetch product images
  const { data: productImages = [] } = useQuery({
    queryKey: ['product-images', product.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('product_images')
        .select('*')
        .eq('product_id', product.id)
        .order('position', { ascending: true });
      return (data ?? []).map((img: any) => img.image_url as string);
    },
    staleTime: 60_000,
  });

  // Fetch variants
  const { data: variants = [] } = useQuery({
    queryKey: ['product-variants', product.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('product_variants')
        .select('*')
        .eq('product_id', product.id);
      return data ?? [];
    },
    staleTime: 60_000,
  });

  // Group variants by name
  const variantGroups = useMemo(() => {
    const groups: Record<string, { name: string; value: string; price: number | null }[]> = {};
    for (const v of variants) {
      if (!groups[v.name]) groups[v.name] = [];
      groups[v.name].push({ name: v.name, value: v.value, price: v.price });
    }
    return groups;
  }, [variants]);

  // Build images array: product_images first, fallback to main image_url
  const allImages = useMemo(() => {
    if (productImages.length > 0) return productImages;
    return product.image_url ? [product.image_url] : [];
  }, [productImages, product.image_url]);

  // Fetch reviews count for star display
  const { data: reviews = [] } = useQuery({
    queryKey: ['product-reviews', product.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('product_reviews')
        .select('rating')
        .eq('product_id', product.id)
        .eq('is_approved', true);
      return data ?? [];
    },
    staleTime: 60_000,
  });

  const avgRating = reviews.length > 0
    ? reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / reviews.length
    : 0;

  // Track ViewContent on mount
  useEffect(() => {
    trackViewContent({
      content_name: product.name,
      content_id: product.id,
      value: product.price,
      currency,
    });
    // Campaign tracking
    import('@/lib/campaignTracking').then(({ trackCampaignEvent }) => {
      trackCampaignEvent(shop.id, 'view_product', { product_id: product.id });
    });
  }, [product.id]);

  // Preload main image
  useEffect(() => {
    if (allImages[0]) {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = allImages[0];
      document.head.appendChild(link);
      return () => { link.remove(); };
    }
  }, [allImages[0]]);

  const hasPromo = product.compare_at_price && product.compare_at_price > product.price;
  const discountPercent = hasPromo
    ? Math.round(((product.compare_at_price! - product.price) / product.compare_at_price!) * 100)
    : 0;
  const isOutOfStock = product.track_stock && product.stock_quantity === 0;

  const handleAddToCart = () => {
    addToCart(product, quantity);
    trackAddToCart({
      content_name: product.name,
      content_id: product.id,
      value: product.price * quantity,
      currency,
      num_items: quantity,
    });
    import('@/lib/campaignTracking').then(({ trackCampaignEvent }) => {
      trackCampaignEvent(shop.id, 'add_to_cart', { product_id: product.id });
    });
    setQuantity(1);
  };

  return (
    <>
      <ProductSEO product={product} shop={shop} mainImage={allImages[0] || null} />

      <div className="max-w-6xl mx-auto px-4 py-4 md:py-8">
        {/* Back button */}
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour
        </button>

        {/* Main layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-10">
          {/* Gallery */}
          <ProductGallery images={allImages} productName={product.name} />

          {/* Product Info */}
          <div className="space-y-5">
            {/* Title */}
            <h1 className="text-2xl md:text-3xl font-bold leading-tight">{product.name}</h1>

            {/* Rating */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map(i => (
                  <Star
                    key={i}
                    className={`w-4 h-4 ${i <= Math.round(avgRating) ? 'fill-amber-400 text-amber-400' : 'fill-muted text-muted-foreground/40'}`}
                  />
                ))}
              </div>
              <span className="text-sm text-muted-foreground">
                {avgRating > 0 ? avgRating.toFixed(1) : '—'} ({reviews.length} avis)
              </span>
            </div>

            {/* Price */}
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-bold" style={{ color: primaryColor }}>
                {formatCurrency(product.price, currency)}
              </span>
              {hasPromo && (
                <>
                  <span className="text-lg text-muted-foreground line-through">
                    {formatCurrency(product.compare_at_price!, currency)}
                  </span>
                  <Badge className="bg-destructive text-destructive-foreground">
                    -{discountPercent}%
                  </Badge>
                </>
              )}
            </div>

            {/* Stock status */}
            {isOutOfStock && (
              <Badge variant="secondary">Rupture de stock</Badge>
            )}
            {product.track_stock && product.stock_quantity > 0 && product.stock_quantity <= 5 && (
              <Badge variant="outline" className="border-destructive text-destructive">
                Plus que {product.stock_quantity} en stock
              </Badge>
            )}

            {/* Variants */}
            {Object.keys(variantGroups).length > 0 && (
              <div className="space-y-3">
                {Object.entries(variantGroups).map(([groupName, values]) => (
                  <div key={groupName}>
                    <span className="text-sm font-medium text-muted-foreground mb-1.5 block">{groupName}</span>
                    <div className="flex flex-wrap gap-2">
                      {values.map(v => (
                        <button
                          key={v.value}
                          onClick={() => setSelectedVariants(prev => ({ ...prev, [groupName]: v.value }))}
                          className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
                            selectedVariants[groupName] === v.value
                              ? 'border-primary bg-primary/10 text-primary'
                              : 'border-border hover:border-muted-foreground'
                          }`}
                        >
                          {v.value}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Quantity */}
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-muted-foreground">Quantité</span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9"
                  onClick={() => setQuantity(q => Math.max(1, q - 1))}
                >
                  <Minus className="h-3.5 w-3.5" />
                </Button>
                <span className="w-10 text-center font-semibold">{quantity}</span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9"
                  onClick={() => setQuantity(q => q + 1)}
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {/* Buy CTA */}
            <Button
              onClick={handleAddToCart}
              disabled={isOutOfStock}
              className="w-full gap-2 h-12 text-base font-semibold"
              style={{
                backgroundColor: isOutOfStock ? undefined : ctaBg,
                color: isOutOfStock ? undefined : ctaText,
                borderRadius: ctaRadius,
              }}
            >
              <ShoppingCart className="h-5 w-5" />
              {shop.cta_label || 'Acheter maintenant'} — {formatCurrency(product.price * quantity, currency)}
            </Button>

            {/* Share */}
            <ShareButtons url={window.location.href} title={product.name} />
          </div>
        </div>

        {/* Tabs: Details & Reviews */}
        <div className="mt-10">
          <Tabs defaultValue="details">
            <TabsList>
              <TabsTrigger value="details">Détails produit</TabsTrigger>
              <TabsTrigger value="reviews">Avis clients ({reviews.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="details" className="mt-4">
              <TipTapRenderer
                content={product.description_json || product.description}
                className="prose prose-sm max-w-none text-foreground"
              />
              {!product.description_json && !product.description && (
                <p className="text-muted-foreground text-sm italic">
                  Aucune description disponible.
                </p>
              )}
            </TabsContent>
            <TabsContent value="reviews" className="mt-4">
              <ProductReviews productId={product.id} shopId={shop.id} />
            </TabsContent>
          </Tabs>
        </div>

        {/* Related Products */}
        <div className="mt-10">
          <RelatedProducts product={product} shop={shop} onProductClick={onProductClick} />
        </div>
      </div>

      {/* Sticky mobile buy bar */}
      {isMobile && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-card border-t px-4 py-3 pb-safe">
          <div className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-lg font-bold truncate" style={{ color: primaryColor }}>
                {formatCurrency(product.price * quantity, currency)}
              </p>
            </div>
            <Button
              onClick={handleAddToCart}
              disabled={isOutOfStock}
              className="gap-2 h-11 px-6"
              style={{
                backgroundColor: isOutOfStock ? undefined : ctaBg,
                color: isOutOfStock ? undefined : ctaText,
                borderRadius: ctaRadius,
              }}
            >
              <ShoppingCart className="h-4 w-4" />
              {shop.cta_label || 'Acheter'}
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
