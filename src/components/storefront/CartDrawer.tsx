import { useTranslation } from 'react-i18next';
import { Minus, Plus, Trash2, MessageCircle, ShoppingBag } from 'lucide-react';
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

interface CartDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  whatsapp: string | null;
  currency: CurrencyCode;
  shopName: string;
}

export default function CartDrawer({ open, onOpenChange, whatsapp, currency, shopName }: CartDrawerProps) {
  const { t } = useTranslation();
  const { items, updateQuantity, removeFromCart, clearCart, cartTotal } = useCart();

  const handleWhatsAppOrder = () => {
    if (!whatsapp) return;
    const itemLines = items
      .map(i => `- ${i.quantity}x ${i.product.name} (${formatCurrency(i.product.price * i.quantity, currency)})`)
      .join('\n');
    const total = formatCurrency(cartTotal, currency);
    const message = t('storefront.interestedMessage', {
      items: itemLines,
      total,
      interpolation: { escapeValue: false },
    });
    const phone = whatsapp.replace(/[^0-9+]/g, '');
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader>
          <DrawerTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5" />
            {t('storefront.cart')}
          </DrawerTitle>
          <DrawerDescription>{shopName}</DrawerDescription>
        </DrawerHeader>

        <div className="px-4 overflow-y-auto flex-1">
          {items.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingBag className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">{t('storefront.cartEmpty')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map(({ product, quantity }) => (
                <div key={product.id} className="flex items-center gap-3 rounded-lg border bg-card p-3">
                  <div className="w-14 h-14 rounded-md bg-muted overflow-hidden shrink-0">
                    {product.image_url ? (
                      <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ShoppingBag className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{product.name}</p>
                    <p className="text-sm font-bold text-primary">
                      {formatCurrency(product.price * quantity, currency)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => updateQuantity(product.id, quantity - 1)}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-6 text-center text-sm font-medium">{quantity}</span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => updateQuantity(product.id, quantity + 1)}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive"
                    onClick={() => removeFromCart(product.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {items.length > 0 && (
          <DrawerFooter>
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold">{t('storefront.total')}</span>
              <span className="text-lg font-bold text-primary">
                {formatCurrency(cartTotal, currency)}
              </span>
            </div>
            {whatsapp && (
              <Button
                onClick={handleWhatsAppOrder}
                className="w-full gap-2"
                style={{ backgroundColor: '#25D366' }}
              >
                <MessageCircle className="h-4 w-4" />
                {t('storefront.orderViaWhatsapp')}
              </Button>
            )}
            <Button variant="outline" onClick={clearCart} className="w-full">
              {t('storefront.clearCart')}
            </Button>
            <DrawerClose asChild>
              <Button variant="ghost" className="w-full">{t('common.close')}</Button>
            </DrawerClose>
          </DrawerFooter>
        )}
      </DrawerContent>
    </Drawer>
  );
}
