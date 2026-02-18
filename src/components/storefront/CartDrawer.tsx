import { useTranslation } from 'react-i18next';
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight } from 'lucide-react';
import { useCart } from './CartContext';
import { formatCurrency, type CurrencyCode } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
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
import { Separator } from '@/components/ui/separator';

interface CartDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCheckout: () => void;
  currency: CurrencyCode;
  shopName: string;
}

function CartItemRow({
  product,
  quantity,
  currency,
  onUpdateQuantity,
  onRemove,
}: {
  product: { id: string; name: string; price: number; compare_at_price: number | null; image_url: string | null };
  quantity: number;
  currency: CurrencyCode;
  onUpdateQuantity: (qty: number) => void;
  onRemove: () => void;
}) {
  const hasPromo = product.compare_at_price && product.compare_at_price > product.price;

  return (
    <div className="flex items-center gap-3 rounded-xl border bg-card p-3">
      <div className="w-16 h-16 rounded-lg bg-muted overflow-hidden shrink-0">
        {product.image_url ? (
          <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ShoppingBag className="h-5 w-5 text-muted-foreground" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{product.name}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <p className="text-sm font-bold text-primary">
            {formatCurrency(product.price * quantity, currency)}
          </p>
          {hasPromo && (
            <p className="text-xs text-muted-foreground line-through">
              {formatCurrency(product.compare_at_price! * quantity, currency)}
            </p>
          )}
        </div>
      </div>
      <div className="flex flex-col items-end gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-destructive hover:text-destructive"
          onClick={onRemove}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7"
            onClick={() => onUpdateQuantity(quantity - 1)}
          >
            <Minus className="h-3 w-3" />
          </Button>
          <span className="w-6 text-center text-sm font-medium">{quantity}</span>
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7"
            onClick={() => onUpdateQuantity(quantity + 1)}
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function CartBody({
  currency,
  shopName,
  onCheckout,
  onClose,
}: Pick<CartDrawerProps, 'currency' | 'shopName' | 'onCheckout'> & { onClose: () => void }) {
  const { t } = useTranslation();
  const { items, updateQuantity, removeFromCart, clearCart, cartTotal } = useCart();

  return (
    <>
      {/* Header */}
      <div className="flex items-center gap-2 px-4 pt-4 pb-2">
        <ShoppingBag className="h-5 w-5" />
        <h2 className="font-semibold text-base">{t('storefront.cart')}</h2>
        <span className="text-sm text-muted-foreground">— {shopName}</span>
      </div>
      <Separator />

      {/* Items */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {items.length === 0 ? (
          <div className="text-center py-16">
            <ShoppingBag className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">{t('storefront.cartEmpty')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map(({ product, quantity }) => (
              <CartItemRow
                key={product.id}
                product={product}
                quantity={quantity}
                currency={currency}
                onUpdateQuantity={qty => updateQuantity(product.id, qty)}
                onRemove={() => removeFromCart(product.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {items.length > 0 && (
        <>
          <Separator />
          <div className="px-4 py-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold">{t('storefront.total')}</span>
              <span className="text-xl font-bold text-primary">
                {formatCurrency(cartTotal, currency)}
              </span>
            </div>
            <Button onClick={onCheckout} className="w-full gap-2 h-11">
              {t('storefront.checkout')}
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={clearCart} className="w-full">
              {t('storefront.clearCart')}
            </Button>
          </div>
        </>
      )}
    </>
  );
}

export default function CartDrawer({ open, onOpenChange, onCheckout, currency, shopName }: CartDrawerProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[85vh] flex flex-col">
          <DrawerHeader className="sr-only">
            <DrawerTitle>Cart</DrawerTitle>
            <DrawerDescription>Shopping cart</DrawerDescription>
          </DrawerHeader>
          <CartBody
            currency={currency}
            shopName={shopName}
            onCheckout={() => { onOpenChange(false); onCheckout(); }}
            onClose={() => onOpenChange(false)}
          />
          <DrawerFooter className="pt-0">
            <DrawerClose asChild>
              <Button variant="ghost" className="w-full">Fermer</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="sr-only">
          <SheetTitle>Cart</SheetTitle>
          <SheetDescription>Shopping cart</SheetDescription>
        </SheetHeader>
        <CartBody
          currency={currency}
          shopName={shopName}
          onCheckout={() => { onOpenChange(false); onCheckout(); }}
          onClose={() => onOpenChange(false)}
        />
      </SheetContent>
    </Sheet>
  );
}
