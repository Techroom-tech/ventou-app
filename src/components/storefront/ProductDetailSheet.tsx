import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Minus, Plus, ShoppingBag, ShoppingCart, MessageCircle, X,
  Truck, Star,
} from 'lucide-react';
import { Product, Shop } from '@/types/shop';
import { formatCurrency } from '@/integrations/supabase/client';
import { useCart } from './CartContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/drawer';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';

/** Recursively extract plain text from a TipTap/ProseMirror JSON node */
function extractTextFromTipTap(node: Record<string, unknown>): string {
  if (!node || typeof node !== 'object') return '';
  if (node.type === 'text') return typeof node.text === 'string' ? node.text : '';
  if (!node.content || !Array.isArray(node.content)) return '';
  return (node.content as Record<string, unknown>[])
    .map(extractTextFromTipTap)
    .filter(Boolean)
    .join(' ');
}

/** Safely resolve description to a displayable string */
function resolveDescription(product: Product): string | null {
  // Priority 1: description_json (TipTap JSON object)
  if (product.description_json && typeof product.description_json === 'object') {
    try {
      const text = extractTextFromTipTap(product.description_json).trim();
      if (text) return text;
    } catch {
      // fall through
    }
  }
  // Priority 2: description as plain string
  if (typeof product.description === 'string' && product.description.trim()) {
    return product.description.trim();
  }
  // Priority 3: description as TipTap object (jsonb returned as object)
  if (product.description && typeof product.description === 'object') {
    try {
      const text = extractTextFromTipTap(product.description as Record<string, unknown>).trim();
      if (text) return text;
    } catch {
      // fall through
    }
  }
  return null;
}

interface ProductDetailSheetProps {
  product: Product | null;
  shop: Shop;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function QuantitySelector({
  quantity,
  onDecrease,
  onIncrease,
}: {
  quantity: number;
  onDecrease: () => void;
  onIncrease: () => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={onDecrease}>
        <Minus className="h-3.5 w-3.5" />
      </Button>
      <span className="w-10 text-center font-semibold text-base">{quantity}</span>
      <Button variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={onIncrease}>
        <Plus className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

function ProductImages({ product }: { product: Product }) {
  // Only main image for now (future: multi-image gallery from product_images)
  return (
    <div className="relative overflow-hidden bg-muted aspect-square group">
      {product.image_url ? (
        <img
          src={product.image_url}
          alt={product.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <ShoppingBag className="h-16 w-16 text-muted-foreground" />
        </div>
      )}
    </div>
  );
}

function ProductInfo({
  product,
  shop,
  quantity,
  onDecrease,
  onIncrease,
  onAddToCart,
  onBuyNow,
  showBuyNow,
  compact,
}: {
  product: Product;
  shop: Shop;
  quantity: number;
  onDecrease: () => void;
  onIncrease: () => void;
  onAddToCart: () => void;
  onBuyNow: () => void;
  showBuyNow: boolean;
  compact?: boolean;
}) {
  const { t } = useTranslation();
  const hasPromo = product.compare_at_price && product.compare_at_price > product.price;
  const discountPercent = hasPromo
    ? Math.round(((product.compare_at_price! - product.price) / product.compare_at_price!) * 100)
    : 0;
  const isOutOfStock = product.track_stock && product.stock_quantity === 0;
  const isLowStock = product.track_stock && product.stock_quantity > 0 && product.stock_quantity <= 5;

  return (
    <div className="flex flex-col gap-4">
      {/* Name + badges */}
      <div>
        <h2 className={`font-bold leading-tight ${compact ? 'text-lg' : 'text-2xl'}`}>{product.name}</h2>
        <div className="flex flex-wrap gap-2 mt-2">
          {hasPromo && (
            <Badge className="bg-destructive text-destructive-foreground">
              -{discountPercent}%
            </Badge>
          )}
          {isOutOfStock && (
            <Badge variant="secondary">{t('storefront.outOfStock')}</Badge>
          )}
          {isLowStock && (
            <Badge variant="outline" className="border-destructive text-destructive">
              {t('storefront.stockLow', { count: product.stock_quantity })}
            </Badge>
          )}
        </div>
      </div>

      {/* Price */}
      <div className="flex items-baseline gap-3">
        <span className="text-2xl font-bold text-primary">
          {formatCurrency(product.price, shop.currency)}
        </span>
        {hasPromo && (
          <span className="text-muted-foreground line-through text-base">
            {formatCurrency(product.compare_at_price!, shop.currency)}
          </span>
        )}
      </div>

      {/* Tabs: Details / Shipping / Reviews */}
      <Tabs defaultValue="details">
        <TabsList className="w-full">
          <TabsTrigger value="details" className="flex-1">{t('storefront.tabs.details')}</TabsTrigger>
          <TabsTrigger value="shipping" className="flex-1">{t('storefront.tabs.shipping')}</TabsTrigger>
          <TabsTrigger value="reviews" className="flex-1">{t('storefront.tabs.reviews')}</TabsTrigger>
        </TabsList>
        <TabsContent value="details" className="mt-3">
          {(() => {
            const desc = resolveDescription(product);
            return desc ? (
              <p className="text-muted-foreground text-sm leading-relaxed">{desc}</p>
            ) : (
              <p className="text-muted-foreground text-sm italic">{t('storefront.noDescription')}</p>
            );
          })()}
          {product.category && (
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs text-muted-foreground">{product.category}</span>
            </div>
          )}
        </TabsContent>
        <TabsContent value="shipping" className="mt-3">
          <div className="flex gap-3 p-3 rounded-lg bg-muted/50">
            <Truck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div className="text-sm space-y-1">
              <p className="font-medium">{t('storefront.shipping.info')}</p>
              <p className="text-muted-foreground">{t('storefront.shipping.contact')}</p>
            </div>
          </div>
        </TabsContent>
        <TabsContent value="reviews" className="mt-3">
          <div className="flex gap-3 p-3 rounded-lg bg-muted/50">
            <Star className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground">Aucun avis pour le moment.</p>
          </div>
        </TabsContent>
      </Tabs>

      {/* Qty + CTA */}
      {!compact && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-muted-foreground">{t('storefront.quantity')}</span>
            <QuantitySelector quantity={quantity} onDecrease={onDecrease} onIncrease={onIncrease} />
          </div>
          <Button
            onClick={onAddToCart}
            className="w-full gap-2 h-11"
            disabled={isOutOfStock}
          >
            <ShoppingCart className="h-4 w-4" />
            {t('storefront.addToCart')}
          </Button>
          {showBuyNow && (
            <Button
              onClick={onBuyNow}
              variant="outline"
              className="w-full gap-2 h-11"
            >
              <MessageCircle className="h-4 w-4" />
              {t('storefront.buyNow')}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export default function ProductDetailSheet({ product, shop, open, onOpenChange }: ProductDetailSheetProps) {
  const { t } = useTranslation();
  const { addToCart } = useCart();
  const [quantity, setQuantity] = useState(1);
  const isMobile = useIsMobile();

  if (!product) return null;

  const isOutOfStock = product.track_stock && product.stock_quantity === 0;

  const handleAddToCart = () => {
    addToCart(product, quantity);
    setQuantity(1);
    onOpenChange(false);
  };

  const handleBuyNow = () => {
    if (!shop.whatsapp) return;
    const message = t('storefront.interestedMessage', {
      items: `- ${quantity}x ${product.name} (${formatCurrency(product.price * quantity, shop.currency)})`,
      total: formatCurrency(product.price * quantity, shop.currency),
      interpolation: { escapeValue: false },
    });
    const phone = shop.whatsapp.replace(/[^0-9+]/g, '');
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const commonProps = {
    product,
    shop,
    quantity,
    onDecrease: () => setQuantity(q => Math.max(1, q - 1)),
    onIncrease: () => setQuantity(q => q + 1),
    onAddToCart: handleAddToCart,
    onBuyNow: handleBuyNow,
    showBuyNow: !!(shop.whatsapp),
  };

  // ─── Mobile / Tablet: bottom Drawer ────────────────────────────────────────
  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[95vh] flex flex-col">
          {/* Image */}
          <div className="aspect-[4/3] relative shrink-0">
            <ProductImages product={product} />
            <DrawerClose className="absolute top-3 right-3 z-10 bg-background/80 backdrop-blur-sm rounded-full p-1.5 shadow">
              <X className="h-4 w-4" />
            </DrawerClose>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto px-4 pt-2 pb-4">
            <DrawerHeader className="px-0 pt-2">
              <DrawerTitle className="text-xl font-bold text-left">{product.name}</DrawerTitle>
              <DrawerDescription className="sr-only">{product.name}</DrawerDescription>
            </DrawerHeader>
            <ProductInfo {...commonProps} compact />
          </div>

          {/* Sticky bottom bar */}
          <DrawerFooter className="border-t bg-card pt-3 pb-safe">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs text-muted-foreground">{t('storefront.quantity')}</p>
                <QuantitySelector
                  quantity={quantity}
                  onDecrease={() => setQuantity(q => Math.max(1, q - 1))}
                  onIncrease={() => setQuantity(q => q + 1)}
                />
              </div>
              <div className="flex-1 space-y-2">
                <Button
                  onClick={handleAddToCart}
                  className="w-full gap-2"
                  disabled={isOutOfStock}
                >
                  <ShoppingCart className="h-4 w-4" />
                  {formatCurrency(product.price * quantity, shop.currency)}
                </Button>
                {shop.whatsapp && (
                  <Button onClick={handleBuyNow} variant="outline" className="w-full gap-2">
                    <MessageCircle className="h-4 w-4" />
                    {t('storefront.buyNow')}
                  </Button>
                )}
              </div>
            </div>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  // ─── Desktop: right Sheet, 2 columns ───────────────────────────────────────
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-3xl p-0 overflow-y-auto"
      >
        <SheetHeader className="sr-only">
          <SheetTitle>{product.name}</SheetTitle>
          <SheetDescription>{product.name}</SheetDescription>
        </SheetHeader>
        <div className="grid grid-cols-2 h-full min-h-screen">
          {/* Left: image gallery */}
          <div className="sticky top-0 h-screen overflow-hidden">
            <ProductImages product={product} />
          </div>

          {/* Right: product info */}
          <div className="p-6 flex flex-col gap-6 overflow-y-auto">
            <ProductInfo {...commonProps} />

            {/* Desktop qty + CTA at bottom */}
            <div className="mt-auto pt-4 border-t space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{t('storefront.quantity')}</span>
                <QuantitySelector
                  quantity={quantity}
                  onDecrease={() => setQuantity(q => Math.max(1, q - 1))}
                  onIncrease={() => setQuantity(q => q + 1)}
                />
              </div>
              <Button
                onClick={handleAddToCart}
                className="w-full gap-2 h-11"
                disabled={isOutOfStock}
              >
                <ShoppingCart className="h-4 w-4" />
                {t('storefront.addToCart')} — {formatCurrency(product.price * quantity, shop.currency)}
              </Button>
              {shop.whatsapp && (
                <Button onClick={handleBuyNow} variant="outline" className="w-full gap-2 h-11">
                  <MessageCircle className="h-4 w-4" />
                  {t('storefront.buyNow')}
                </Button>
              )}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
