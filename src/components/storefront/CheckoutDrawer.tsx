/**
 * CheckoutDrawer V6 — Smart checkout with:
 * - Centered modal on desktop (max-w-3xl, 2-col)
 * - Bottom sheet (90vh) on mobile with internal scroll + sticky CTA
 * - Auto phone prefix from CountryContext
 * - Clean WhatsApp message (no encoding artifacts)
 * - COD + WhatsApp logic (no online payment)
 * - Null guards throughout
 */
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { Truck, CheckCircle2, MapPin, X, Loader2, ShoppingBag } from 'lucide-react';
import WhatsAppIcon from '@/components/ui/WhatsAppIcon';
import { Shop } from '@/types/shop';
import { supabase, formatCurrency } from '@/integrations/supabase/client';
import { useCart } from './CartContext';
import { useDeliverySettings } from '@/hooks/useDeliverySettings';
import { useCountry } from '@/contexts/CountryContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/drawer';
import { useIsMobile } from '@/hooks/use-mobile';

// ─── Schema ───────────────────────────────────────────────────────────────────

const checkoutSchema = z.object({
  customer_name: z.string().trim().min(2, 'Nom requis (min 2 caractères)').max(100),
  phone: z.string().trim().min(6, 'Téléphone requis').max(30),
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

// ─── Props ────────────────────────────────────────────────────────────────────

interface CheckoutDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shop: Shop;
}

// ─── Order Summary ─────────────────────────────────────────────────────────────

function OrderSummary({ shop, deliveryFee }: { shop: Shop; deliveryFee: number }) {
  const { t } = useTranslation();
  const { items, cartTotal } = useCart();
  const { country } = useCountry();
  const currency = shop.currency ?? country.currency;
  const grandTotal = cartTotal + deliveryFee;

  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-sm">{t('storefront.orderSummary')}</h3>
      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
        {items.length === 0 ? (
          <div className="flex flex-col items-center py-6 text-muted-foreground gap-2">
            <ShoppingBag className="h-8 w-8" />
            <p className="text-xs">{t('storefront.cartEmpty')}</p>
          </div>
        ) : (
          items.map(({ product, quantity }) => (
            <div key={product.id} className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-md bg-muted overflow-hidden shrink-0">
                {product.image_url && (
                  <img
                    src={product.image_url}
                    alt={product.name ?? ''}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{product.name ?? '—'}</p>
                <p className="text-xs text-muted-foreground">×{quantity}</p>
              </div>
              <p className="text-xs font-semibold shrink-0">
                {formatCurrency((product.price ?? 0) * quantity, currency)}
              </p>
            </div>
          ))
        )}
      </div>
      <Separator />
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{t('storefront.subtotal')}</span>
        <span>{formatCurrency(cartTotal, currency)}</span>
      </div>
      {deliveryFee > 0 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{t('storefront.deliveryFee')}</span>
          <span>{formatCurrency(deliveryFee, currency)}</span>
        </div>
      )}
      <Separator />
      <div className="flex items-center justify-between">
        <span className="font-bold">{t('storefront.total')}</span>
        <span className="text-lg font-bold text-primary">
          {formatCurrency(grandTotal, currency)}
        </span>
      </div>
    </div>
  );
}

// ─── WhatsApp message builder (clean, no encoding artifacts) ───────────────────

function buildWhatsAppMessage({
  items,
  customerName,
  phone,
  city,
  quartier,
  notes,
  locationUrl,
  subtotal,
  deliveryFee,
  grandTotal,
  currency,
  country,
}: {
  items: { product: { name?: string | null; price?: number | null }; quantity: number }[];
  customerName: string;
  phone: string;
  city: string;
  quartier?: string;
  notes?: string;
  locationUrl?: string;
  subtotal: number;
  deliveryFee: number;
  grandTotal: number;
  currency: string;
  country: string;
}): string {
  const lines: string[] = [
    '🛒 Nouvelle commande Ventou',
    '',
    '📦 Articles :',
    ...items.map(i =>
      `  • ${i.quantity}x ${i.product?.name ?? 'Produit'} — ${formatCurrency((i.product?.price ?? 0) * i.quantity, currency as any)}`
    ),
    '',
    `💰 Sous-total : ${formatCurrency(subtotal, currency as any)}`,
  ];

  if (deliveryFee > 0) {
    lines.push(`🚚 Livraison : ${formatCurrency(deliveryFee, currency as any)}`);
  }

  lines.push(`✅ Total : ${formatCurrency(grandTotal, currency as any)}`);
  lines.push('');
  lines.push('👤 Client :');
  lines.push(`  Nom : ${customerName}`);
  lines.push(`  Tél : ${phone}`);
  lines.push(`  Pays : ${country}`);
  lines.push(`  Ville : ${city}${quartier ? `, ${quartier}` : ''}`);

  if (notes) lines.push(`  Notes : ${notes}`);
  if (locationUrl) lines.push(`  📍 Position : ${locationUrl}`);

  lines.push('');
  lines.push('Merci ! 🙏');

  return lines.join('\n');
}

// ─── Form ──────────────────────────────────────────────────────────────────────

function CheckoutFormContent({
  shop,
  onSuccess,
  allowCod,
  allowWhatsapp,
  deliveryFee,
  stickySubmit,
}: {
  shop: Shop;
  onSuccess: () => void;
  allowCod: boolean;
  allowWhatsapp: boolean;
  deliveryFee: number;
  /** On mobile the submit button is rendered outside the form (sticky bar) */
  stickySubmit?: boolean;
}) {
  const { t } = useTranslation();
  const { items, cartTotal, clearCart } = useCart();
  const { country } = useCountry();
  const currency = shop.currency ?? country.currency;

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [locating, setLocating] = useState(false);

  const defaultPayment: 'cod' | 'whatsapp' = allowCod ? 'cod' : 'whatsapp';

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CheckoutForm>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      payment_method: defaultPayment,
      phone: country.phonePrefix + ' ',
    },
  });

  const paymentMethod = watch('payment_method');

  // ── Geolocation ─────────────────────────────────────────────────────────────
  const handleGetLocation = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude, longitude } = pos.coords;
        setValue('location_url', `https://maps.google.com/?q=${latitude},${longitude}`);
        setLocating(false);
      },
      err => {
        console.warn('[CheckoutDrawer] Geolocation:', err.message);
        setLocating(false);
      },
      { timeout: 10000 }
    );
  };

  // ── Submit ───────────────────────────────────────────────────────────────────
  const onSubmit = async (data: CheckoutForm) => {
    if (items.length === 0) return;
    if (shop.is_suspended) {
      console.warn('[CheckoutDrawer] Shop is suspended, blocking order.');
      return;
    }
    setSubmitting(true);
    try {
      const orderItems = items.map(i => ({
        product_id: i.product.id,
        name: i.product.name ?? '',
        quantity: i.quantity,
        unit_price: i.product.price ?? 0,
      }));

      const subtotal = items.reduce(
        (sum, i) => sum + (i.product.price ?? 0) * i.quantity,
        0
      );
      const grandTotal = subtotal + deliveryFee;

      const { data: insertedOrder, error } = await supabase.from('orders').insert({
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
      }).select('id').single();

      if (error) throw error;

      // WhatsApp redirect
      if (data.payment_method === 'whatsapp' && shop.whatsapp) {
        const msg = buildWhatsAppMessage({
          items,
          customerName: data.customer_name.trim(),
          phone: data.phone.trim(),
          city: data.city.trim(),
          quartier: data.quartier?.trim(),
          notes: data.notes?.trim(),
          locationUrl: data.location_url?.trim(),
          subtotal,
          deliveryFee,
          grandTotal,
          currency,
          country: country.name,
        });
        const phoneClean = shop.whatsapp.replace(/[^0-9+]/g, '');
        window.open(`https://wa.me/${phoneClean}?text=${encodeURIComponent(msg)}`, '_blank');
      }

      // Fire tracking Purchase event
      if (typeof window !== 'undefined' && window.VentouTracker) {
        window.VentouTracker.trackPurchase({
          value: grandTotal,
          currency,
          content_ids: items.map(i => i.product.id),
          shop_id: shop.id,
          user_email: undefined,
          user_phone: data.phone.trim(),
        });
      }

      // Fire campaign purchase event
      import('@/lib/campaignTracking').then(({ trackCampaignEvent }) => {
        trackCampaignEvent(shop.id, 'purchase', { revenue: grandTotal });
      });

      // Fire-and-forget: notify vendor by email
      supabase.functions.invoke('notify-order', {
        body: { order_id: undefined, shop_id: shop.id },
      }).catch(() => {});
      // Note: we don't have order_id from insert response, we pass shop_id
      // The edge function will find the latest pending order

      clearCart();
      setSuccess(true);
      setTimeout(() => { setSuccess(false); onSuccess(); }, 3000);
    } catch (err) {
      console.error('[CheckoutDrawer] error:', err);
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
    <form id="checkout-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Customer info */}
      <div className="space-y-3">
        {/* Name */}
        <div>
          <Label htmlFor="customer_name">{t('storefront.customerName')} *</Label>
          <Input
            id="customer_name"
            {...register('customer_name')}
            placeholder="Ex: Fatou Diallo"
            className="mt-1"
            autoComplete="name"
          />
          {errors.customer_name && (
            <p className="text-xs text-destructive mt-1">{errors.customer_name.message}</p>
          )}
        </div>

        {/* Phone — prefixed with country code */}
        <div>
          <Label htmlFor="phone">
            {t('storefront.phone')} *{' '}
            <span className="text-xs text-muted-foreground font-normal">
              {country.flag} {country.phonePrefix}
            </span>
          </Label>
          <Input
            id="phone"
            {...register('phone')}
            placeholder={`${country.phonePrefix} 07 00 00 00 00`}
            type="tel"
            className="mt-1"
            autoComplete="tel"
          />
          {errors.phone && (
            <p className="text-xs text-destructive mt-1">{errors.phone.message}</p>
          )}
        </div>

        {/* City + Quartier */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="city">{t('storefront.city')} *</Label>
            <Input
              id="city"
              {...register('city')}
              placeholder="Abidjan"
              className="mt-1"
              autoComplete="address-level2"
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

        {/* Notes */}
        <div>
          <Label htmlFor="notes">{t('storefront.notes')}</Label>
          <Input
            id="notes"
            {...register('notes')}
            placeholder="Instructions spéciales..."
            className="mt-1"
          />
        </div>

        {/* Location URL + Geolocation button */}
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
        <div className="space-y-2">
          {allowCod && (
            <button
              type="button"
              onClick={() => setValue('payment_method', 'cod')}
              className={`w-full flex items-center gap-3 rounded-xl border p-3 transition-colors text-left ${
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
              className={`w-full flex items-center gap-3 rounded-xl border p-3 transition-colors text-left ${
                paymentMethod === 'whatsapp'
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-muted-foreground'
              }`}
            >
              <WhatsAppIcon size={20} className={`shrink-0 ${paymentMethod === 'whatsapp' ? 'text-primary' : 'text-muted-foreground'}`} />
              <span className="text-sm font-medium">{t('storefront.orderViaWhatsapp')}</span>
            </button>
          )}
        </div>
        {errors.payment_method && (
          <p className="text-xs text-destructive mt-1">{errors.payment_method.message}</p>
        )}
      </div>

      {/* Inline submit (desktop / non-sticky) */}
      {!stickySubmit && (
        <Button
          type="submit"
          form="checkout-form"
          disabled={submitting || items.length === 0}
          className="w-full h-11"
        >
          {submitting ? t('storefront.submitting') : t('storefront.confirmOrder')}
        </Button>
      )}
    </form>
  );
}

// ─── Root component ─────────────────────────────────────────────────────────────

export default function CheckoutDrawer({ open, onOpenChange, shop }: CheckoutDrawerProps) {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const { items } = useCart();

  const { data: delivery } = useDeliverySettings(shop?.id);

  // Track checkout_started when drawer opens
  useEffect(() => {
    if (open && shop?.id) {
      import('@/lib/campaignTracking').then(({ trackCampaignEvent }) => {
        trackCampaignEvent(shop.id, 'checkout_started');
      });
    }
  }, [open, shop?.id]);

  // OR-logic for backward compat with legacy shop flags
  const allowCod = (delivery?.allow_cod ?? true) || (shop?.enable_cod ?? false);
  const allowWhatsapp =
    (delivery?.allow_whatsapp ?? false) ||
    (!!(shop?.whatsapp) && (shop?.enable_whatsapp_order ?? false));
  const deliveryFee = delivery?.has_delivery_fee ? (delivery?.delivery_fee ?? 0) : 0;

  const handleSuccess = () => onOpenChange(false);

  // ── MOBILE: Bottom sheet 90vh ───────────────────────────────────────────────
  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="h-[90vh] flex flex-col">
          <DrawerHeader className="flex items-center justify-between border-b pb-3 shrink-0">
            <DrawerTitle className="text-lg">{t('storefront.checkoutTitle')}</DrawerTitle>
            <DrawerDescription className="sr-only">Formulaire de commande</DrawerDescription>
          </DrawerHeader>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 pb-20">
            <OrderSummary shop={shop} deliveryFee={deliveryFee} />
            <Separator />
            <CheckoutFormContent
              shop={shop}
              onSuccess={handleSuccess}
              allowCod={allowCod}
              allowWhatsapp={allowWhatsapp}
              deliveryFee={deliveryFee}
              stickySubmit
            />
          </div>

          {/* Sticky CTA at bottom */}
          <div className="shrink-0 px-4 pb-6 pt-3 border-t bg-background">
            <Button
              type="submit"
              form="checkout-form"
              disabled={items.length === 0}
              className="w-full h-12 text-base font-semibold"
            >
              {t('storefront.confirmOrder')}
            </Button>
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  // ── DESKTOP: Centered modal 2-col ───────────────────────────────────────────
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden rounded-2xl">
        <DialogTitle className="sr-only">{t('storefront.checkoutTitle')}</DialogTitle>
        <DialogDescription className="sr-only">Formulaire de commande</DialogDescription>

        <div className="grid grid-cols-5 max-h-[85vh]">
          {/* Left: form (3 cols) */}
          <div className="col-span-3 overflow-y-auto p-6 border-r">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">{t('storefront.checkoutTitle')}</h2>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => onOpenChange(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <CheckoutFormContent
              shop={shop}
              onSuccess={handleSuccess}
              allowCod={allowCod}
              allowWhatsapp={allowWhatsapp}
              deliveryFee={deliveryFee}
            />
          </div>

          {/* Right: sticky order summary (2 cols) */}
          <div className="col-span-2 bg-muted/30 overflow-y-auto p-6">
            <div className="sticky top-0">
              <OrderSummary shop={shop} deliveryFee={deliveryFee} />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
