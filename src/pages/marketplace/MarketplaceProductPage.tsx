import { useParams, Link, useSearchParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase, formatCurrency } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft, Star, Shield, Truck, MessageCircle,
  ShoppingCart, ShoppingBag, Minus, Plus, BadgeCheck, Store,
} from "lucide-react";
import { useState, useMemo, useCallback } from "react";
import ProductGallery from "@/components/storefront/ProductGallery";
import ProductReviews from "@/components/storefront/ProductReviews";
import ShareButtons from "@/components/storefront/ShareButtons";
import TipTapRenderer from "@/components/storefront/TipTapRenderer";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "sonner";
import type { Product, Shop } from "@/types/shop";

export default function MarketplaceProductPage() {
  const { productId } = useParams<{ productId: string }>();
  const isMobile = useIsMobile();
  const [quantity, setQuantity] = useState(1);

  // Fetch product + shop in parallel
  const { data, isLoading } = useQuery({
    queryKey: ["marketplace-product", productId],
    queryFn: async () => {
      const { data: product, error } = await supabase
        .from("products")
        .select("*")
        .eq("id", productId!)
        .eq("is_active", true)
        .single();
      if (error || !product) throw new Error("Produit introuvable");

      const [{ data: shop }, { data: images }, { data: reviews }, { data: variants }] = await Promise.all([
        supabase.from("shops").select("*").eq("id", product.shop_id).single(),
        supabase.from("product_images").select("image_url, position").eq("product_id", product.id).order("position"),
        supabase.from("product_reviews").select("rating").eq("product_id", product.id).eq("is_approved", true),
        supabase.from("product_variants").select("*").eq("product_id", product.id),
      ]);

      return {
        product: product as Product,
        shop: shop as Shop,
        images: (images ?? []).map((i: any) => i.image_url as string),
        reviews: reviews ?? [],
        variants: variants ?? [],
      };
    },
    enabled: !!productId,
    staleTime: 30_000,
  });

  const allImages = useMemo(() => {
    if (!data) return [];
    if (data.images.length > 0) return data.images;
    return data.product.image_url ? [data.product.image_url] : [];
  }, [data]);

  const variantGroups = useMemo(() => {
    if (!data) return {};
    const groups: Record<string, { name: string; value: string; price: number | null }[]> = {};
    for (const v of data.variants) {
      if (!groups[v.name]) groups[v.name] = [];
      groups[v.name].push({ name: v.name, value: v.value, price: v.price });
    }
    return groups;
  }, [data]);

  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Skeleton className="aspect-square rounded-xl" />
          <div className="space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-10 w-1/2" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <div className="h-16 w-16 mx-auto rounded-full bg-muted flex items-center justify-center mb-4">
          <Store className="h-7 w-7 text-muted-foreground" />
        </div>
        <h1 className="text-xl font-bold mb-2">Produit introuvable</h1>
        <p className="text-muted-foreground mb-6">Ce produit n'existe pas ou a été supprimé.</p>
        <Button asChild>
          <Link to="/marketplace">Retour au marketplace</Link>
        </Button>
      </div>
    );
  }

  const { product, shop, reviews } = data;
  const currency = shop?.currency ?? "XOF";
  const hasPromo = product.compare_at_price && product.compare_at_price > product.price;
  const discountPercent = hasPromo
    ? Math.round(((product.compare_at_price! - product.price) / product.compare_at_price!) * 100)
    : 0;
  const isOutOfStock = product.track_stock && product.stock_quantity === 0;
  const maxQty = product.track_stock ? product.stock_quantity : 99;
  const avgRating = reviews.length > 0
    ? reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / reviews.length
    : 0;

  const handleAddToCart = () => {
    toast.success("Produit ajouté ! Visitez la boutique pour commander.", {
      action: {
        label: "Voir la boutique",
        onClick: () => window.location.href = `/boutique/${shop.slug}`,
      },
    });
  };

  return (
    <div className="container mx-auto px-4 py-4 md:py-8">
      {/* Back */}
      <Link
        to="/marketplace"
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour au marketplace
      </Link>

      {/* Main layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-10">
        <ProductGallery images={allImages} productName={product.name} />

        <div className="space-y-5">
          <h1 className="text-2xl md:text-3xl font-bold leading-tight">{product.name}</h1>

          {/* Shop info */}
          {shop && (
            <Link
              to={`/boutique/${shop.slug}`}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
            >
              {shop.logo_url ? (
                <img src={shop.logo_url} alt="" className="h-6 w-6 rounded-full object-cover ring-1 ring-border" />
              ) : (
                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                  {shop.name.charAt(0)}
                </div>
              )}
              <span className="text-sm font-medium">{shop.name}</span>
              {shop.is_verified && <BadgeCheck className="h-4 w-4 text-primary" />}
            </Link>
          )}

          {/* Rating */}
          {reviews.length > 0 && (
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
                {avgRating.toFixed(1)} ({reviews.length} avis)
              </span>
            </div>
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

          {isOutOfStock && <Badge variant="secondary">Rupture de stock</Badge>}
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
              <Button variant="ghost" size="icon" className="h-10 w-10 rounded-none" onClick={() => setQuantity(q => Math.max(1, q - 1))}>
                <Minus className="h-4 w-4" />
              </Button>
              <span className="w-12 text-center font-semibold text-sm border-x">{quantity}</span>
              <Button variant="ghost" size="icon" className="h-10 w-10 rounded-none" onClick={() => setQuantity(q => Math.min(maxQty, q + 1))}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* CTA */}
          <div className={`flex gap-3 ${isMobile ? 'flex-col' : 'flex-row'}`}>
            <Button
              onClick={handleAddToCart}
              disabled={isOutOfStock}
              variant="outline"
              className="flex-1 gap-2 h-12 text-base font-semibold border-primary text-primary hover:bg-primary/10"
            >
              <ShoppingCart className="h-5 w-5" />
              Ajouter au panier
            </Button>
            <Button
              asChild
              className="flex-1 gap-2 h-12 text-base font-semibold bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Link to={`/boutique/${shop.slug}/p/${product.slug}`}>
                <ShoppingBag className="h-5 w-5" />
                Voir dans la boutique
              </Link>
            </Button>
          </div>

          {/* Trust */}
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Shield className="h-4 w-4 text-primary" /> Paiement sécurisé
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Truck className="h-4 w-4 text-primary" /> Paiement à la livraison
            </span>
            <span className="inline-flex items-center gap-1.5">
              <MessageCircle className="h-4 w-4 text-primary" /> Support WhatsApp
            </span>
          </div>

          <Separator />
          <ShareButtons url={window.location.href} title={product.name} />
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-10">
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
              <p className="text-muted-foreground text-sm italic">Aucune description disponible.</p>
            )}
          </TabsContent>
          <TabsContent value="reviews" className="mt-4">
            <ProductReviews productId={product.id} shopId={shop.id} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
