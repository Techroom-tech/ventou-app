import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { MessageCircle, Truck, CheckCircle2, MapPin, X, Loader2 } from 'lucide-react';
import { Shop } from '@/types/shop';
import { supabase, formatCurrency } from '@/integrations/supabase/client';
import { useCart } from './CartContext';
import { useDeliverySettings } from '@/hooks/useDeliverySettings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
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

const checkoutSchema = z.object({
  customer_name: z.string().trim().min(2, 'Nom requis (min 2 caractères)').max(100),
  phone: z.string().trim().min(6, 'Téléphone requis').max(20),
  city: z.string().trim().min(2, 'Ville requise').max(100),
  quartier: z.string().trim().max(100).optional(),
  notes: z.string().trim().max(500).optional(),
  location_url: z
    .string()
    .trim()
    .max(500)
    .optional()
    .refine(val => !val || val.startsWith('http') || val.length === 0, {
      message: 'URL invalide',
    }),
  payment_method: z.enum(['cod', 'whatsapp']),
});

type CheckoutForm = z.infer<typeof checkoutSchema>;

interface CheckoutDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shop: Shop;
}

function OrderSummary({ shop, deliveryFee }: { shop: Shop; deliveryFee: number }) {
  const { t } = useTranslation();
  const { items, cartTotal } = useCart();
  const grandTotal = cartTotal + deliveryFee;

  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-sm">{t('storefront.orderSummary')}</h3>
      <div className="space-y-2">
        {items.map(({ product, quantity }) => (
          <div key={product.id} className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-md bg-muted overflow-hidden shrink-0">
              {product.image_url && (
                <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{product.name}</p>
              <p className="text-xs text-muted-foreground">x{quantity}</p>
            </div>
            <p className="text-xs font-semibold shrink-0">
              {formatCurrency(product.price * quantity, shop.currency)}
            </p>
          </div>
        ))}
      </div>
      <Separator />
      {/* Subtotal */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{t('storefront.subtotal')}</span>
        <span>{formatCurrency(cartTotal, shop.currency)}</span>
      </div>
      {/* Delivery fee line */}
      {deliveryFee > 0 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{t('storefront.deliveryFee')}</span>
          <span>{formatCurrency(deliveryFee, shop.currency)}</span>
        </div>
      )}
      <Separator />
      {/* Grand total */}
      <div className="flex items-center justify-between">
        <span className="font-bold">{t('storefront.total')}</span>
        <span className="text-lg font-bold text-primary">
          {formatCurrency(grandTotal, shop.currency)}
        </span>
      </div>
    </div>
  );
}

function CheckoutForm({
  shop,
  onSuccess,
  allowCod,
  allowWhatsapp,
  deliveryFee,
}: {
  shop: Shop;
  onSuccess: () => void;
  allowCod: boolean;
  allowWhatsapp: boolean;
  deliveryFee: number;
}) {
  const { t } = useTranslation();
  const { items, cartTotal, clearCart } = useCart();
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [locating, setLocating] = useState(false);

  const defaultPayment = allowCod ? 'cod' : 'whatsapp';

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CheckoutForm>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: { payment_method: defaultPayment },
  });

  const paymentMethod = watch('payment_method');

  // Geolocation helper
  const handleGetLocation = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const mapsUrl = `https://maps.google.com/?q=${latitude},${longitude}`;
        setValue('location_url', mapsUrl);
        setLocating(false);
      },
      (err) => {
        console.warn('[CheckoutDrawer] Geolocation error:', err.message);
        setLocating(false);
      },
      { timeout: 10000 }
    );
  };

  const onSubmit = async (data: CheckoutForm) => {
    if (items.length === 0) return;
    setSubmitting(true);
    try {
      const orderItems = items.map(i => ({
        product_id: i.product.id,
        name: i.product.name,
        quantity: i.quantity,
        unit_price: i.product.price,
      }));

      const subtotal = items.reduce((sum, i) => sum + i.product.price * i.quantity, 0);
      const grandTotal = subtotal + deliveryFee;

      const orderPayload = {
        shop_id: shop.id,
        customer_name: data.customer_name.trim(),
        customer_phone: data.phone.trim(),
        phone: data.phone.trim(),
        city: data.city.trim(),
        quartier: data.quartier?.trim() || null,
        notes: data.notes?.trim() || null,
        location_url: data.location_url?.trim() || null,
        items: orderItems,
        subtotal,
        delivery_fee: deliveryFee,
        total: grandTotal,
        status: 'pending',
        payment_method: data.payment_method,
      };

      const { error } = await supabase.from('orders').insert(orderPayload);
      if (error) throw error;

      if (data.payment_method === 'whatsapp' && shop.whatsapp) {
        const itemLines = items
          .map(i => `- ${i.quantity}x ${i.product.name} (${formatCurrency(i.product.price * i.quantity, shop.currency)})`)
          .join('\n');
        const address = [data.city, data.quartier].filter(Boolean).join(', ');
        let message = `Bonjour ! Je souhaite commander :\n${itemLines}\nSous-total : ${formatCurrency(subtotal, shop.currency)}`;
        if (deliveryFee > 0) message += `\nFrais de livraison : ${formatCurrency(deliveryFee, shop.currency)}`;
        message += `\nTotal : ${formatCurrency(grandTotal, shop.currency)}\nNom : ${data.customer_name}\nTél : ${data.phone}\nAdresse : ${address}`;
        if (data.notes) message += `\nNotes : ${data.notes}`;
        if (data.location_url) message += `\nLocalisation : ${data.location_url}`;
        message += '\nMerci !';
        const phone = shop.whatsapp.replace(/[^0-9+]/g, '');
        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
      }

      clearCart();
      setSuccess(true);
      setTimeout(() => { setSuccess(false); onSuccess(); }, 3000);
    } catch (err) {
      console.error('[CheckoutDrawer] Checkout error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
        <CheckCircle2 className="h-16 w-16 text-primary" />
        <h3 className="text-xl font-bold">{t('storefront.orderSuccess')}</h3>
        <p className="text-muted-foreground max-w-xs">{t('storefront.orderSuccessDescription')}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Customer info */}
      <div className="space-y-3">
        <div>
          <Label htmlFor="customer_name">{t('storefront.customerName')} *</Label>
          <Input
            id="customer_name"
            {...register('customer_name')}
            placeholder="Ex: Fatou Diallo"
            className="mt-1"
          />
          {errors.customer_name && (
            <p className="text-xs text-destructive mt-1">{errors.customer_name.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="phone">{t('storefront.phone')} *</Label>
          <Input
            id="phone"
            {...register('phone')}
            placeholder="+225 07 00 00 00 00"
            type="tel"
            className="mt-1"
          />
          {errors.phone && (
            <p className="text-xs text-destructive mt-1">{errors.phone.message}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="city">{t('storefront.city')} *</Label>
            <Input
              id="city"
              {...register('city')}
              placeholder="Abidjan"
              className="mt-1"
            />
            {errors.city && (
              <p className="text-xs text-destructive mt-1">{errors.city.message}</p>
            )}
          </div>
          <div>
            <Label htmlFor="quartier">{t('storefront.quartier')}</Label>
            <Input
              id="quartier"
              {...register('quartier')}
              placeholder="Plateau"
              className="mt-1"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="notes">{t('storefront.notes')}</Label>
          <Input
            id="notes"
            {...register('notes')}
            placeholder="Instructions spéciales..."
            className="mt-1"
          />
        </div>

        {/* Location URL with geolocation button */}
        <div>
          <Label htmlFor="location_url" className="flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" />
            {t('storefront.locationUrl')}
          </Label>
          <div className="flex gap-2 mt-1">
            <Input
              id="location_url"
              {...register('location_url')}
              placeholder="https://maps.google.com/..."
              className="flex-1"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleGetLocation}
              disabled={locating}
              className="shrink-0 px-3"
              title="Utiliser ma position actuelle"
            >
              {locating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <span className="text-sm">📍</span>
              )}
            </Button>
          </div>
          {errors.location_url && (
            <p className="text-xs text-destructive mt-1">{errors.location_url.message}</p>
          )}
        </div>
      </div>

      <Separator />

      {/* Payment method */}
      <div className="space-y-2">
        <Label>{t('storefront.paymentMethod')}</Label>
        <div className="grid grid-cols-1 gap-2">
          {allowCod && (
            <button
              type="button"
              onClick={() => setValue('payment_method', 'cod')}
              className={`flex items-center gap-3 rounded-xl border p-3 transition-colors text-left ${
                paymentMethod === 'cod'
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-muted-foreground'
              }`}
            >
              <Truck className={`h-5 w-5 shrink-0 ${paymentMethod === 'cod' ? 'text-primary' : 'text-muted-foreground'}`} />
              <span className="text-sm font-medium">{t('storefront.cod')}</span>
            </button>
          )}
          {allowWhatsapp && shop.whatsapp && (
            <button
              type="button"
              onClick={() => setValue('payment_method', 'whatsapp')}
              className={`flex items-center gap-3 rounded-xl border p-3 transition-colors text-left ${
                paymentMethod === 'whatsapp'
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-muted-foreground'
              }`}
            >
              <MessageCircle className={`h-5 w-5 shrink-0 ${paymentMethod === 'whatsapp' ? 'text-primary' : 'text-muted-foreground'}`} />
              <span className="text-sm font-medium">{t('storefront.orderViaWhatsapp')}</span>
            </button>
          )}
        </div>
        {errors.payment_method && (
          <p className="text-xs text-destructive mt-1">{errors.payment_method.message}</p>
        )}
      </div>

      <Button type="submit" disabled={submitting || items.length === 0} className="w-full h-11">
        {submitting ? t('storefront.submitting') : t('storefront.confirmOrder')}
      </Button>
    </form>
  );
}

export default function CheckoutDrawer({ open, onOpenChange, shop }: CheckoutDrawerProps) {
  const { t } = useTranslation();
  const isMobile = useIsMobile();

  // Fetch delivery settings — falls back to defaults gracefully
  const { data: delivery } = useDeliverySettings(shop.id);

  // Merge delivery_settings with shop flags (OR logic for backward compat)
  const allowCod = (delivery?.allow_cod ?? true) || shop.enable_cod;
  const allowWhatsapp = (delivery?.allow_whatsapp ?? false) || (!!shop.whatsapp && shop.enable_whatsapp_order);
  const deliveryFee = delivery?.has_delivery_fee ? (delivery?.delivery_fee ?? 0) : 0;

  const handleSuccess = () => onOpenChange(false);

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[95vh] flex flex-col">
          <DrawerHeader className="flex items-center justify-between border-b pb-3">
            <DrawerTitle className="text-lg">{t('storefront.checkoutTitle')}</DrawerTitle>
            <DrawerDescription className="sr-only">Checkout form</DrawerDescription>
            <DrawerClose asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            </DrawerClose>
          </DrawerHeader>
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            <OrderSummary shop={shop} deliveryFee={deliveryFee} />
            <Separator />
            <CheckoutForm
              shop={shop}
              onSuccess={handleSuccess}
              allowCod={allowCod}
              allowWhatsapp={allowWhatsapp}
              deliveryFee={deliveryFee}
            />
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  // Desktop: right sheet, 2 columns
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl p-0 overflow-y-auto">
        <SheetHeader className="sr-only">
          <SheetTitle>{t('storefront.checkoutTitle')}</SheetTitle>
          <SheetDescription>Checkout form</SheetDescription>
        </SheetHeader>
        <div className="grid grid-cols-5 h-full min-h-screen">
          {/* Left: form (3 cols) */}
          <div className="col-span-3 p-6 overflow-y-auto border-r">
            <h2 className="text-xl font-bold mb-4">{t('storefront.checkoutTitle')}</h2>
            <CheckoutForm
              shop={shop}
              onSuccess={handleSuccess}
              allowCod={allowCod}
              allowWhatsapp={allowWhatsapp}
              deliveryFee={deliveryFee}
            />
          </div>

          {/* Right: order summary sticky (2 cols) */}
          <div className="col-span-2 p-6 bg-muted/30">
            <div className="sticky top-6">
              <OrderSummary shop={shop} deliveryFee={deliveryFee} />
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
