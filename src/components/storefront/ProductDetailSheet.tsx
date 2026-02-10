import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Minus, Plus, ShoppingBag, ShoppingCart, MessageCircle } from 'lucide-react';
import { Product, Shop } from '@/types/shop';
import { formatCurrency } from '@/integrations/supabase/client';
import { useCart } from './CartContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/drawer';

interface ProductDetailSheetProps {
  product: Product | null;
  shop: Shop;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ProductDetailSheet({ product, shop, open, onOpenChange }: ProductDetailSheetProps) {
  const { t } = useTranslation();
  const { addToCart } = useCart();
  const [quantity, setQuantity] = useState(1);

  if (!product) return null;

  const hasPromo = product.compare_at_price && product.compare_at_price > product.price;
  const discountPercent = hasPromo
    ? Math.round(((product.compare_at_price! - product.price) / product.compare_at_price!) * 100)
    : 0;

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

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh]">
        <div className="overflow-y-auto">
          {/* Image */}
          <div className="aspect-square bg-muted relative">
            {product.image_url ? (
              <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <ShoppingBag className="h-16 w-16 text-muted-foreground" />
              </div>
            )}
            {hasPromo && (
              <Badge className="absolute top-3 left-3 bg-destructive text-destructive-foreground">
                {t('storefront.discount', { percent: discountPercent })}
              </Badge>
            )}
          </div>

          <DrawerHeader className="text-left">
            <DrawerTitle className="text-xl">{product.name}</DrawerTitle>
            <DrawerDescription className="sr-only">{product.name}</DrawerDescription>
            <div className="flex items-center gap-2 mt-1">
              {hasPromo && (
                <span className="text-muted-foreground line-through text-sm">
                  {formatCurrency(product.compare_at_price!, shop.currency)}
                </span>
              )}
              <span className="text-xl font-bold text-primary">
                {formatCurrency(product.price, shop.currency)}
              </span>
            </div>
            {product.description && (
              <p className="text-muted-foreground mt-3 text-sm leading-relaxed">{product.description}</p>
            )}
          </DrawerHeader>
        </div>

        <DrawerFooter>
          {/* Quantity selector */}
          <div className="flex items-center justify-center gap-4 mb-2">
            <span className="text-sm text-muted-foreground">{t('storefront.quantity')}</span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setQuantity(q => Math.max(1, q - 1))}>
                <Minus className="h-3 w-3" />
              </Button>
              <span className="w-8 text-center font-medium">{quantity}</span>
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setQuantity(q => q + 1)}>
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </div>

          <Button onClick={handleAddToCart} className="w-full gap-2">
            <ShoppingCart className="h-4 w-4" />
            {t('storefront.addToCart')}
          </Button>

          {shop.whatsapp && (
            <Button
              onClick={handleBuyNow}
              variant="outline"
              className="w-full gap-2"
            >
              <MessageCircle className="h-4 w-4" />
              {t('storefront.buyNow')}
            </Button>
          )}

          <DrawerClose asChild>
            <Button variant="ghost" className="w-full">{t('common.close')}</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
