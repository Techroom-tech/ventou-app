/**
 * ProductPage — Full-page, conversion-optimized product page (Shopify-level).
 * Desktop: 2-column layout (gallery left, info right).
 * Tablet: stacked layout.
 * Mobile: stacked with sticky buy bar.
 */
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Minus, Plus, ShoppingCart, ShoppingBag, ArrowLeft, Star,
  Shield, Truck, MessageCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase, formatCurrency } from '@/integrations/supabase/client';
import { Product, Shop } from '@/types/shop';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
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
  onBuyNow?: () => void;
}

export default function ProductPage({ product, shop, onBack, onProductClick, onBuyNow }: ProductPageProps) {
  const { addToCart } = useCart();
  const { country } = useCountry();
  const isMobile = useIsMobile();
  const [quantity, setQuantity] = useState(1);
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});
  const reviewsRef = useRef<HTMLDivElement>(null);

  const currency = shop.currency ?? country.currency;

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

  // Build images array
  const allImages = useMemo(() => {
    if (productImages.length > 0) return productImages;
    return product.image_url ? [product.image_url] : [];
  }, [productImages, product.image_url]);

  // Fetch reviews
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

  // Track ViewContent
  useEffect(() => {
    trackViewContent({
      content_name: product.name,
      content_id: product.id,
      value: product.price,
      currency,
    });
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
  const maxQty = product.track_stock ? product.stock_quantity : 99;

  const handleAddToCart = useCallback(() => {
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
    toast.success('Produit ajouté au panier');
    setQuantity(1);
  }, [product, quantity, currency, shop.id, addToCart]);

  const handleBuyNow = useCallback(() => {
    addToCart(product, quantity);
    trackAddToCart({
      content_name: product.name,
      content_id: product.id,
      value: product.price * quantity,
      currency,
      num_items: quantity,
    });
    onBuyNow?.();
  }, [product, quantity, currency, addToCart, onBuyNow]);

  const scrollToReviews = useCallback(() => {
    reviewsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

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

            {/* Rating — click scrolls to reviews */}
            {reviews.length > 0 && (
              <button onClick={scrollToReviews} className="flex items-center gap-2 group">
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map(i => (
                    <Star
                      key={i}
                      className={`w-4 h-4 ${i <= Math.round(avgRating) ? 'fill-amber-400 text-amber-400' : 'fill-muted text-muted-foreground/40'}`}
                    />
                  ))}
                </div>
                <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                  {avgRating.toFixed(1)} ({reviews.length} avis)
                </span>
              </button>
            )}

            {/* Price */}
            <div className="flex items-baseline gap-3 flex-wrap">
              <span className="text-3xl font-bold text-primary">
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

            <Separator />

            {/* Variants */}
            {Object.keys(variantGroups).length > 0 && (
              <div className="space-y-4">
                {Object.entries(variantGroups).map(([groupName, values]) => (
                  <div key={groupName}>
                    <span className="text-sm font-semibold mb-2 block">{groupName}</span>
                    <div className="flex flex-wrap gap-2">
                      {values.map(v => (
                        <button
                          key={v.value}
                          onClick={() => setSelectedVariants(prev => ({ ...prev, [groupName]: v.value }))}
                          className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                            selectedVariants[groupName] === v.value
                              ? 'border-primary bg-primary/10 text-primary shadow-sm'
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
              <span className="text-sm font-semibold">Quantité</span>
              <div className="flex items-center border rounded-lg overflow-hidden">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 rounded-none"
                  onClick={() => setQuantity(q => Math.max(1, q - 1))}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="w-12 text-center font-semibold text-sm border-x">{quantity}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 rounded-none"
                  onClick={() => setQuantity(q => Math.min(maxQty, q + 1))}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className={`flex gap-3 ${isMobile ? 'flex-col' : 'flex-row'}`}>
              {/* Add to cart */}
              <Button
                onClick={handleAddToCart}
                disabled={isOutOfStock}
                variant="outline"
                className="flex-1 gap-2 h-12 text-base font-semibold border-primary text-primary hover:bg-primary/10"
              >
                <ShoppingCart className="h-5 w-5" />
                Ajouter au panier
              </Button>

              {/* Buy now */}
              <Button
                onClick={handleBuyNow}
                disabled={isOutOfStock}
                className="flex-1 gap-2 h-12 text-base font-semibold bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <ShoppingBag className="h-5 w-5" />
                {shop.cta_label || 'Commander maintenant'} — {formatCurrency(product.price * quantity, currency)}
              </Button>
            </div>

            {/* Trust indicators */}
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Shield className="h-4 w-4 text-primary" />
                Paiement sécurisé
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Truck className="h-4 w-4 text-primary" />
                Paiement à la livraison
              </span>
              <span className="inline-flex items-center gap-1.5">
                <MessageCircle className="h-4 w-4 text-primary" />
                Support WhatsApp
              </span>
            </div>

            <Separator />

            {/* Share */}
            <ShareButtons url={window.location.href} title={product.name} />
          </div>
        </div>

        {/* Tabs: Details & Reviews */}
        <div className="mt-10" ref={reviewsRef}>
          <Tabs defaultValue="details">
            <TabsList className="w-full justify-start">
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
              <p className="text-lg font-bold truncate text-primary">
                {formatCurrency(product.price * quantity, currency)}
              </p>
            </div>
            <Button
              onClick={handleBuyNow}
              disabled={isOutOfStock}
              className="gap-2 h-11 px-6 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <ShoppingBag className="h-4 w-4" />
              {shop.cta_label || 'Commander'}
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
