import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { formatDistanceToNow, addDays, differenceInHours } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Phone, MapPin, ExternalLink, MessageCircle, Printer,
  Package, Clock, ChevronRight, Timer,
} from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { OrderStatusBadge } from './OrderStatusBadge';
import { useUpdateOrderStatus } from '@/hooks/useOrders';
import { formatCurrency } from '@/integrations/supabase/client';
import { Order, OrderStatus, ORDER_TRANSITIONS } from '@/types/shop';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// --- Estimated delivery countdown ---
function DeliveryCountdown({ estimatedDate }: { estimatedDate: Date }) {
  const [hoursLeft, setHoursLeft] = useState(differenceInHours(estimatedDate, new Date()));

  useEffect(() => {
    const timer = setInterval(() => {
      setHoursLeft(differenceInHours(estimatedDate, new Date()));
    }, 60_000);
    return () => clearInterval(timer);
  }, [estimatedDate]);

  if (hoursLeft <= 0) return (
    <Badge variant="outline" className="text-[hsl(142,76%,30%)] border-[hsl(142,76%,36%)]/30 bg-[hsl(142,76%,36%)]/10">
      <Timer className="h-3 w-3 mr-1" /> Livraison imminente
    </Badge>
  );

  const days = Math.floor(hoursLeft / 24);
  const hours = hoursLeft % 24;
  return (
    <Badge variant="outline" className="text-[hsl(260,60%,45%)] border-[hsl(260,60%,55%)]/30 bg-[hsl(260,60%,55%)]/10">
      <Timer className="h-3 w-3 mr-1" />
      {days > 0 ? `${days}j ` : ''}{hours}h restantes
    </Badge>
  );
}

// --- Print receipt ---
function printReceipt(order: Order, currencyCode: string) {
  const items = (Array.isArray(order.items) ? order.items : []) as Record<string, unknown>[];
  const total = order.total_amount ?? order.total ?? 0;
  const phone = order.phone ?? order.customer_phone ?? '';
  const date = new Date(order.created_at).toLocaleDateString('fr-FR');
  const orderNum = order.order_number ?? order.id.slice(0, 8).toUpperCase();

  const html = `
    <html><head><title>Reçu commande ${orderNum}</title>
    <style>
      body { font-family: monospace; font-size: 13px; max-width: 300px; margin: 0 auto; padding: 16px; }
      h1 { font-size: 16px; text-align: center; margin: 0 0 4px; }
      .center { text-align: center; }
      .row { display: flex; justify-content: space-between; margin: 4px 0; }
      hr { border-top: 1px dashed #000; }
      .bold { font-weight: bold; }
      .total { font-size: 15px; }
    </style></head><body>
    <h1>VENTOU</h1>
    <p class="center">Reçu de commande</p>
    <hr/>
    <div class="row"><span>N° commande</span><span class="bold">${orderNum}</span></div>
    <div class="row"><span>Date</span><span>${date}</span></div>
    <div class="row"><span>Client</span><span>${order.customer_name}</span></div>
    ${phone ? `<div class="row"><span>Téléphone</span><span>${phone}</span></div>` : ''}
    ${order.city ? `<div class="row"><span>Ville</span><span>${order.city}</span></div>` : ''}
    <hr/>
    <p class="bold">Articles :</p>
    ${items.map((item: Record<string, unknown>) => `
      <div class="row">
        <span>${(item.name as string) ?? 'Produit'} x${item.quantity}</span>
        <span>${formatCurrency((item.unit_price as number) * (item.quantity as number), currencyCode as 'XOF')}</span>
      </div>
    `).join('')}
    <hr/>
    <div class="row total"><span class="bold">TOTAL</span><span class="bold">${formatCurrency(total, currencyCode as 'XOF')}</span></div>
    <div class="row"><span>Paiement</span><span>${order.payment_method ?? 'N/A'}</span></div>
    <hr/>
    <p class="center">Merci pour votre commande !</p>
    <p class="center">Propulsé par Ventou</p>
    </body></html>
  `;

  const win = window.open('', '_blank', 'width=400,height=600');
  if (win) {
    win.document.write(html);
    win.document.close();
    win.focus();
    win.print();
    win.close();
  }
}

// --- Action button label map ---
const ACTION_LABELS: Record<OrderStatus, string> = {
  pending:   'Confirmer la commande',
  confirmed: 'Passer en préparation',
  preparing: 'Marquer expédiée',
  shipping:  'Marquer livrée',
  delivered: '',
  cancelled: '',
};

const ACTION_NEXT: Record<OrderStatus, OrderStatus | null> = {
  pending:   'confirmed',
  confirmed: 'preparing',
  preparing: 'shipping',
  shipping:  'delivered',
  delivered: null,
  cancelled: null,
};

interface OrderDetailPanelProps {
  order: Order | null;
  shopId: string;
  currencyCode: string;
  isOpen: boolean;
  onClose: () => void;
  isRepeatCustomer?: boolean;
}

export function OrderDetailPanel({
  order, shopId, currencyCode, isOpen, onClose, isRepeatCustomer
}: OrderDetailPanelProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'fr' ? fr : undefined;
  const updateStatus = useUpdateOrderStatus();
  const [estimatedDays, setEstimatedDays] = useState(2);
  const dateInputRef = useRef<HTMLInputElement>(null);

  if (!order) return null;

  const phone = order.phone ?? order.customer_phone ?? '';
  const total = order.total_amount ?? order.total ?? 0;
  const items = (Array.isArray(order.items) ? order.items : []) as Record<string, unknown>[];
  const nextStatus = ACTION_NEXT[order.status];
  const canCancel = ORDER_TRANSITIONS[order.status].includes('cancelled');
  const orderNum = order.order_number ?? `#${order.id.slice(0, 8).toUpperCase()}`;
  const estimatedDate = addDays(new Date(order.created_at), estimatedDays);

  const handleStatusUpdate = async (newStatus: OrderStatus) => {
    try {
      await updateStatus.mutateAsync({
        orderId: order.id,
        shopId,
        currentStatus: order.status,
        newStatus,
      });
      toast.success(`Statut mis à jour → ${t(`orders.status.${newStatus}`, newStatus)}`);
    } catch (e: unknown) {
      toast.error((e as Error).message ?? 'Erreur lors de la mise à jour');
    }
  };

  const handleWhatsApp = () => {
    if (!phone) return;
    const clean = phone.replace(/\s/g, '');
    const msg = encodeURIComponent(
      `Bonjour ${order.customer_name} ! 👋\nVotre commande ${orderNum} est en cours de traitement.\nNous vous contacterons dès qu'elle sera prête. Merci de votre confiance !`
    );
    window.open(`https://wa.me/${clean}?text=${msg}`, '_blank');
  };

  return (
    <Sheet open={isOpen} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-lg overflow-y-auto p-0 flex flex-col"
      >
        {/* Header */}
        <SheetHeader className="px-4 pt-4 pb-3 border-b border-border sticky top-0 bg-card z-10">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-base font-bold">
              Commande {orderNum}
            </SheetTitle>
            <div className="flex items-center gap-2">
              <OrderStatusBadge status={order.status} />
              <Button
                variant="ghost" size="icon"
                className="h-8 w-8"
                onClick={() => printReceipt(order, currencyCode)}
                title="Imprimer le reçu"
              >
                <Printer className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(order.created_at), { addSuffix: true, locale })}
          </p>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto">
          {/* Customer Info */}
          <div className="px-4 py-4 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
              <Package className="h-3.5 w-3.5" /> Client
            </h3>
            <div className="bg-secondary/60 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm text-foreground">{order.customer_name}</span>
                {isRepeatCustomer && (
                  <Badge variant="outline" className="text-[10px] bg-primary/5 text-primary border-primary/20">
                    🔄 Client fidèle
                  </Badge>
                )}
              </div>
              {phone && (
                <div className="flex items-center gap-2">
                  <a href={`tel:${phone}`} className="flex items-center gap-1.5 text-xs text-primary hover:underline">
                    <Phone className="h-3.5 w-3.5" /> {phone}
                  </a>
                  <Button
                    variant="outline" size="sm"
                    className="h-6 px-2 text-[10px] bg-[hsl(142,76%,36%)]/10 text-[hsl(142,76%,28%)] border-[hsl(142,76%,36%)]/30 hover:bg-[hsl(142,76%,36%)]/20"
                    onClick={handleWhatsApp}
                  >
                    <MessageCircle className="h-3 w-3 mr-1" /> WhatsApp
                  </Button>
                </div>
              )}
              {(order.city || order.quartier) && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                  <span>{[order.quartier, order.city].filter(Boolean).join(', ')}</span>
                </div>
              )}
              {order.location_url && (
                <a
                  href={order.location_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-primary hover:underline"
                >
                  <ExternalLink className="h-3.5 w-3.5" /> Voir sur Maps
                </a>
              )}
              {order.notes && (
                <p className="text-xs text-muted-foreground italic border-t border-border pt-2">
                  📝 {order.notes}
                </p>
              )}
            </div>
          </div>

          <Separator />

          {/* Items */}
          <div className="px-4 py-4 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Articles commandés
            </h3>
            <div className="space-y-2">
              {items.length === 0 ? (
                <p className="text-xs text-muted-foreground">Aucun article disponible</p>
              ) : (
                items.map((item, idx) => {
                  const i = item as Record<string, unknown>;
                  const qty = Number(i.quantity ?? 1);
                  const price = Number(i.unit_price ?? 0);
                  return (
                    <div key={idx} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {(i.name as string) ?? (i.product_id as string) ?? `Article ${idx + 1}`}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {qty} × {formatCurrency(price, currencyCode as 'XOF')}
                        </p>
                      </div>
                      <span className="text-sm font-semibold text-foreground ml-4">
                        {formatCurrency(qty * price, currencyCode as 'XOF')}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <Separator />

          {/* Payment Summary */}
          <div className="px-4 py-4 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Résumé de paiement
            </h3>
            <div className="bg-secondary/60 rounded-xl p-3 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Sous-total</span>
                <span>{formatCurrency(total, currencyCode as 'XOF')}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Mode de paiement</span>
                <Badge variant="outline" className="text-[10px] bg-primary/5 border-primary/20 text-primary">
                  {order.payment_method === 'cod' ? '💵 Livraison' : order.payment_method ?? 'N/A'}
                </Badge>
              </div>
              <Separator />
              <div className="flex justify-between text-base font-bold">
                <span>Total</span>
                <span className="text-primary">{formatCurrency(total, currencyCode as 'XOF')}</span>
              </div>
            </div>
          </div>

          {/* Estimated delivery countdown for shipping orders */}
          {order.status === 'shipping' && (
            <>
              <Separator />
              <div className="px-4 py-4 space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" /> Livraison estimée
                </h3>
                <div className="flex items-center gap-3">
                  <DeliveryCountdown estimatedDate={estimatedDate} />
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>Délai :</span>
                    <select
                      className="border border-border rounded px-1.5 py-0.5 bg-background text-foreground text-xs"
                      value={estimatedDays}
                      onChange={e => setEstimatedDays(Number(e.target.value))}
                    >
                      {[1,2,3,5,7].map(d => (
                        <option key={d} value={d}>{d} jour{d > 1 ? 's' : ''}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </>
          )}

          <Separator />

          {/* Status Actions */}
          <div className="px-4 py-4 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Mettre à jour le statut
            </h3>
            <div className="flex flex-col gap-2">
              {nextStatus && (
                <Button
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-10"
                  onClick={() => handleStatusUpdate(nextStatus)}
                  disabled={updateStatus.isPending}
                >
                  <ChevronRight className="h-4 w-4 mr-2" />
                  {ACTION_LABELS[order.status]}
                </Button>
              )}
              {canCancel && (
                <Button
                  variant="outline"
                  className="w-full border-destructive/30 text-destructive hover:bg-destructive/5 h-10"
                  onClick={() => handleStatusUpdate('cancelled')}
                  disabled={updateStatus.isPending}
                >
                  Annuler la commande
                </Button>
              )}
              {!nextStatus && !canCancel && (
                <p className="text-xs text-muted-foreground text-center py-2">
                  {order.status === 'delivered' ? '✅ Commande livrée — statut final' : '❌ Commande annulée'}
                </p>
              )}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
