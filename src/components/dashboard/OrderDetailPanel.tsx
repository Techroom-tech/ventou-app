import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { formatDistanceToNow, format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Phone, MapPin, ExternalLink, MessageCircle, Printer,
  Clock, CheckCircle2, XCircle,
  FileText, MoreVertical, Copy, Trash2, Star, User,
  Package, CreditCard, SendHorizonal, ChevronRight,
  AlertCircle,
} from 'lucide-react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { OrderStatusBadge } from './OrderStatusBadge';
import { useUpdateOrderStatus, useOrderTimeline, useUpdateSellerNote, useDeleteOrders } from '@/hooks/useOrders';
import { formatCurrency } from '@/integrations/supabase/client';
import { Order, OrderStatus, ORDER_TRANSITIONS } from '@/types/shop';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ─── Constants ───────────────────────────────────────────────────────────────

const MAIN_FLOW: OrderStatus[] = ['pending', 'confirmed', 'delivered'];

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending:   'En attente',
  confirmed: 'Confirmée',
  delivered: 'Livrée',
  cancelled: 'Annulée',
};

const ACTION_LABELS: Partial<Record<OrderStatus, string>> = {
  confirmed: 'Confirmer la commande',
  delivered: 'Marquer comme livrée',
  cancelled: 'Annuler la commande',
};

// ─── Status Timeline ──────────────────────────────────────────────────────────

function StatusTimeline({
  currentStatus,
  onStepClick,
  isUpdating,
}: {
  currentStatus: OrderStatus;
  onStepClick: (status: OrderStatus) => void;
  isUpdating: boolean;
}) {
  const isCancelled = currentStatus === 'cancelled';
  const currentIndex = MAIN_FLOW.indexOf(currentStatus);

  if (isCancelled) {
    return (
      <div className="flex items-center gap-2 py-2">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-destructive/10 border border-destructive/20">
          <XCircle className="h-3.5 w-3.5 text-destructive" />
          <span className="text-xs font-semibold text-destructive">
            {STATUS_LABELS[currentStatus]}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-0 w-full overflow-x-auto pb-1">
      {MAIN_FLOW.map((step, idx) => {
        const isPast    = idx < currentIndex;
        const isCurrent = idx === currentIndex;
        const isFuture  = idx > currentIndex;
        const isNext    = idx === currentIndex + 1;
        const allowed   = ORDER_TRANSITIONS[currentStatus];
        const canClick  = isNext && allowed.includes(step);

        return (
          <div key={step} className="flex items-center flex-shrink-0">
            <button
              onClick={() => canClick && onStepClick(step)}
              disabled={isUpdating || !canClick}
              className={cn(
                'flex flex-col items-center gap-1 group',
                canClick ? 'cursor-pointer' : 'cursor-default',
              )}
            >
              <div className={cn(
                'relative flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all duration-300',
                isPast    && 'bg-primary border-primary text-primary-foreground',
                isCurrent && 'bg-primary border-primary text-primary-foreground shadow-md shadow-primary/30 scale-110',
                isFuture  && !canClick && 'bg-background border-border text-muted-foreground',
                canClick  && 'bg-background border-primary/40 text-primary hover:border-primary hover:scale-105',
              )}>
                {isPast ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <span className="text-[10px] font-bold">{idx + 1}</span>
                )}
                {canClick && (
                  <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-primary animate-pulse" />
                )}
              </div>
              <span className={cn(
                'text-[9px] font-medium text-center whitespace-nowrap max-w-[52px] leading-tight',
                isPast    && 'text-primary',
                isCurrent && 'text-primary font-bold',
                isFuture  && !canClick && 'text-muted-foreground',
                canClick  && 'text-primary',
              )}>
                {STATUS_LABELS[step]}
              </span>
            </button>

            {idx < MAIN_FLOW.length - 1 && (
              <div className={cn(
                'h-0.5 w-6 mx-0.5 flex-shrink-0 transition-all duration-500',
                idx < currentIndex ? 'bg-primary' : 'bg-border',
              )} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Print Receipt ────────────────────────────────────────────────────────────

function printReceipt(order: Order, currencyCode: string) {
  const items = (Array.isArray(order.items) ? order.items : []) as Record<string, unknown>[];
  const total = order.total_amount ?? order.total ?? 0;
  const phone = order.phone ?? order.customer_phone ?? '';
  const date = new Date(order.created_at).toLocaleDateString('fr-FR');
  const orderNum = order.order_number ?? order.id.slice(0, 8).toUpperCase();
  const html = `<html><head><title>Reçu #${orderNum}</title>
  <style>body{font-family:monospace;font-size:13px;max-width:300px;margin:0 auto;padding:16px}h1{font-size:16px;text-align:center;margin:0 0 4px}.center{text-align:center}.row{display:flex;justify-content:space-between;margin:4px 0}hr{border-top:1px dashed #000}.bold{font-weight:bold}.total{font-size:15px}</style>
  </head><body>
  <h1>VENTOU</h1><p class="center">Reçu de commande</p><hr/>
  <div class="row"><span>N° commande</span><span class="bold">${orderNum}</span></div>
  <div class="row"><span>Date</span><span>${date}</span></div>
  <div class="row"><span>Client</span><span>${order.customer_name}</span></div>
  ${phone ? `<div class="row"><span>Téléphone</span><span>${phone}</span></div>` : ''}
  ${order.city ? `<div class="row"><span>Ville</span><span>${order.city}</span></div>` : ''}
  <hr/><p class="bold">Articles :</p>
  ${items.map((item: Record<string, unknown>) => `<div class="row"><span>${(item.name as string) ?? 'Produit'} x${item.quantity}</span><span>${formatCurrency((item.unit_price as number) * (item.quantity as number), currencyCode as 'XOF')}</span></div>`).join('')}
  <hr/>
  <div class="row total"><span class="bold">TOTAL</span><span class="bold">${formatCurrency(total, currencyCode as 'XOF')}</span></div>
  <div class="row"><span>Paiement</span><span>${order.payment_method ?? 'N/A'}</span></div>
  <hr/><p class="center">Merci pour votre commande !</p><p class="center">Propulsé par Ventou</p>
  </body></html>`;
  const win = window.open('', '_blank', 'width=400,height=600');
  if (win) { win.document.write(html); win.document.close(); win.focus(); win.print(); win.close(); }
}

// ─── Section Header ───────────────────────────────────────────────────────────

function SectionHeader({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="flex items-center justify-center w-6 h-6 rounded-md bg-primary/10">
        <Icon className="h-3.5 w-3.5 text-primary" />
      </div>
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </h3>
    </div>
  );
}

// ─── Card Wrapper ─────────────────────────────────────────────────────────────

function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn('bg-card border border-border rounded-2xl p-4 shadow-sm', className)}>
      {children}
    </div>
  );
}

// ─── Note Item ────────────────────────────────────────────────────────────────

interface NoteEntry {
  text: string;
  date: Date;
}

function parseNotes(raw: string | null | undefined): NoteEntry[] {
  if (!raw) return [];
  return raw.split('\n---\n').map(chunk => {
    const match = chunk.match(/^\[(\d{4}-\d{2}-\d{2}T[^\]]+)\] (.+)$/s);
    if (match) return { date: new Date(match[1]), text: match[2] };
    return { date: new Date(0), text: chunk };
  }).filter(n => n.text.trim());
}

function formatNotes(notes: NoteEntry[]): string {
  return notes.map(n => `[${n.date.toISOString()}] ${n.text}`).join('\n---\n');
}

// ─── Main Props ───────────────────────────────────────────────────────────────

interface OrderDetailPanelProps {
  order: Order | null;
  shopId: string;
  currencyCode: string;
  isOpen: boolean;
  onClose: () => void;
  isRepeatCustomer?: boolean;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function OrderDetailPanel({
  order, shopId, currencyCode, isOpen, onClose, isRepeatCustomer,
}: OrderDetailPanelProps) {
  const { i18n } = useTranslation();
  const locale = i18n.language === 'fr' ? fr : undefined;
  const updateStatus = useUpdateOrderStatus();
  const updateNote   = useUpdateSellerNote();
  const deleteOrders = useDeleteOrders();

  const [notes, setNotes] = useState<NoteEntry[]>([]);
  const [newNote, setNewNote] = useState('');
  const noteInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (order) {
      const raw = (order as Order & { seller_note?: string }).seller_note;
      setNotes(parseNotes(raw));
    }
  }, [order?.id]);

  const { data: timeline = [] } = useOrderTimeline(order?.id);

  if (!order) return null;

  const phone      = order.phone ?? order.customer_phone ?? '';
  const total      = order.total_amount ?? order.total ?? 0;
  const items      = (Array.isArray(order.items) ? order.items : []) as Record<string, unknown>[];
  const nextStatuses = ORDER_TRANSITIONS[order.status] ?? [];
  const orderNum   = order.order_number ?? `#${order.id.slice(0, 8).toUpperCase()}`;
  const isNew      = Date.now() - new Date(order.created_at).getTime() < 10 * 60 * 1000;

  const subtotal = items.reduce((acc, item) => {
    const i = item as Record<string, unknown>;
    return acc + Number(i.unit_price ?? 0) * Number(i.quantity ?? 1);
  }, 0);

  const handleStatusUpdate = async (newStatus: OrderStatus) => {
    try {
      await updateStatus.mutateAsync({ orderId: order.id, shopId, currentStatus: order.status, newStatus });
      toast.success(`Statut mis à jour → ${STATUS_LABELS[newStatus]}`);
    } catch (e: unknown) {
      toast.error((e as Error).message ?? 'Erreur lors de la mise à jour');
    }
  };

  const handleDeleteOrder = async () => {
    if (!window.confirm('Supprimer définitivement cette commande annulée ?')) return;
    try {
      await deleteOrders.mutateAsync({ orderIds: [order.id], shopId });
      toast.success('Commande supprimée');
      onClose();
    } catch {
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleAddNote = async () => {
    const text = newNote.trim();
    if (!text) return;
    const updated: NoteEntry[] = [{ text, date: new Date() }, ...notes];
    setNotes(updated);
    setNewNote('');
    try {
      await updateNote.mutateAsync({ orderId: order.id, shopId, note: formatNotes(updated) });
    } catch {
      toast.error('Erreur lors de la sauvegarde de la note');
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

  const primaryNextStatuses = nextStatuses.filter(s => s !== 'cancelled');
  const primaryNext = primaryNextStatuses[0];

  return (
    <Sheet open={isOpen} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-2xl overflow-y-auto p-0 flex flex-col bg-secondary/30"
      >
        {/* ── HEADER ─────────────────────────────────────────────────────── */}
        <div className="sticky top-0 z-20 bg-card border-b border-border px-5 py-4 shadow-sm">
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mb-1.5">
            <span>Commandes</span>
            <ChevronRight className="h-3 w-3" />
            <span>Détails</span>
          </div>

          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-lg font-bold text-foreground">Commande {orderNum}</h2>
              <OrderStatusBadge status={order.status} />
              {isNew && (
                <Badge className="animate-pulse bg-[hsl(38,92%,50%)] text-white border-0 text-[9px] px-1.5 py-0.5">
                  NOUVEAU
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-1.5 flex-shrink-0">
              <Button
                variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={() => printReceipt(order, currencyCode)}
                title="Imprimer le reçu"
              >
                <Printer className="h-4 w-4" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 bg-card border border-border shadow-lg">
                  <DropdownMenuItem className="gap-2 cursor-pointer text-xs">
                    <Copy className="h-3.5 w-3.5" /> Dupliquer commande
                  </DropdownMenuItem>
                  {order.status === 'cancelled' && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="gap-2 cursor-pointer text-xs text-destructive focus:text-destructive"
                        onClick={handleDeleteOrder}
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Supprimer
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <p className="text-xs text-muted-foreground mt-1">
            {formatDistanceToNow(new Date(order.created_at), { addSuffix: true, locale })}
          </p>
        </div>

        {/* ── BODY ───────────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 space-y-4">

            {/* ── TIMELINE CARD ─────────────────────────────────────────── */}
            <Card>
              <SectionHeader icon={Clock} label="Progression de la commande" />
              <StatusTimeline
                currentStatus={order.status}
                onStepClick={handleStatusUpdate}
                isUpdating={updateStatus.isPending}
              />

              {/* Quick action buttons */}
              <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-border">
                {primaryNext && (
                  <Button
                    className="flex-1 min-w-[140px] h-9 text-sm font-semibold transition-all"
                    onClick={() => handleStatusUpdate(primaryNext)}
                    disabled={updateStatus.isPending}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1.5" />
                    {ACTION_LABELS[primaryNext] ?? STATUS_LABELS[primaryNext]}
                  </Button>
                )}

                {phone && (
                  <Button
                    variant="outline"
                    className="h-9 gap-1.5 text-xs text-[hsl(142,76%,28%)] border-[hsl(142,76%,36%)]/40 bg-[hsl(142,76%,36%)]/5 hover:bg-[hsl(142,76%,36%)]/15 flex-shrink-0"
                    onClick={handleWhatsApp}
                  >
                    <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                  </Button>
                )}

                {phone && (
                  <a href={`tel:${phone}`}>
                    <Button variant="outline" className="h-9 gap-1.5 text-xs flex-shrink-0">
                      <Phone className="h-3.5 w-3.5" /> Appeler
                    </Button>
                  </a>
                )}

                {order.location_url && (
                  <a href={order.location_url} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" className="h-9 gap-1.5 text-xs text-primary flex-shrink-0">
                      <MapPin className="h-3.5 w-3.5" /> Maps
                    </Button>
                  </a>
                )}

                {nextStatuses.includes('cancelled') && (
                  <Button
                    variant="outline"
                    className="h-9 gap-1.5 text-xs text-destructive border-destructive/30 hover:bg-destructive/5 flex-shrink-0"
                    onClick={() => handleStatusUpdate('cancelled')}
                    disabled={updateStatus.isPending}
                  >
                    <XCircle className="h-3.5 w-3.5" /> Annuler
                  </Button>
                )}

                {/* Delete for cancelled */}
                {order.status === 'cancelled' && (
                  <Button
                    variant="outline"
                    className="h-9 gap-1.5 text-xs text-destructive border-destructive/30 hover:bg-destructive/5 flex-shrink-0"
                    onClick={handleDeleteOrder}
                    disabled={deleteOrders.isPending}
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Supprimer
                  </Button>
                )}

                {nextStatuses.length === 0 && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground py-1">
                    <AlertCircle className="h-3.5 w-3.5" />
                    {order.status === 'delivered' && 'Commande livrée — aucune action requise'}
                    {order.status === 'cancelled' && 'Commande annulée'}
                  </div>
                )}
              </div>
            </Card>

            {/* ── 2-COL GRID ─────────────────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

              {/* ── ARTICLES ─────────────────────────────────────────────── */}
              <Card className="lg:col-span-2">
                <SectionHeader icon={Package} label={`Articles commandés — ${items.length} article${items.length !== 1 ? 's' : ''}`} />
                {items.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">Aucun article disponible</p>
                ) : (
                  <div className="space-y-0">
                    <div className="grid grid-cols-[1fr_auto_auto] gap-2 pb-2 mb-1 border-b border-border text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      <span>Produit</span><span className="text-right">Qté</span><span className="text-right">Total</span>
                    </div>
                    {items.map((item, idx) => {
                      const i = item as Record<string, unknown>;
                      const qty   = Number(i.quantity ?? 1);
                      const price = Number(i.unit_price ?? 0);
                      const name  = (i.name as string) ?? `Article ${idx + 1}`;
                      const variant = i.variant as string | undefined;
                      return (
                        <div key={idx} className="grid grid-cols-[1fr_auto_auto] gap-2 py-2.5 border-b border-border/60 last:border-0">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                              <Package className="h-3.5 w-3.5 text-muted-foreground" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">{name}</p>
                              {variant && <p className="text-[10px] text-muted-foreground">{variant}</p>}
                              <p className="text-[10px] text-muted-foreground">{formatCurrency(price, currencyCode as 'XOF')} / unité</p>
                            </div>
                          </div>
                          <span className="text-sm font-medium text-foreground text-right self-center">{qty}</span>
                          <span className="text-sm font-semibold text-foreground text-right self-center">{formatCurrency(qty * price, currencyCode as 'XOF')}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>

              {/* ── FINANCIAL DETAILS ─────────────────────────────────────── */}
              <Card>
                <SectionHeader icon={CreditCard} label="Détails financiers" />
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Sous-total</span>
                    <span className="font-medium">{formatCurrency(subtotal || total, currencyCode as 'XOF')}</span>
                  </div>
                  <Separator className="my-2" />
                  <div className="flex justify-between">
                    <span className="font-bold text-foreground">Total à encaisser</span>
                    <span className="text-lg font-bold text-foreground">{formatCurrency(total, currencyCode as 'XOF')}</span>
                  </div>

                  <div className="flex justify-between items-center text-xs pt-1">
                    <span className="text-muted-foreground">Mode de paiement</span>
                    <Badge variant="outline" className="text-[10px] bg-primary/5 border-primary/20 text-primary">
                      {order.payment_method === 'cod' ? '💵 Paiement livraison' : order.payment_method ?? 'COD'}
                    </Badge>
                  </div>
                </div>
              </Card>

              {/* ── CLIENT CARD ───────────────────────────────────────────── */}
              <Card>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center justify-center w-6 h-6 rounded-md bg-primary/10">
                      <User className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Client</h3>
                  </div>
                </div>

                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-primary">
                      {order.customer_name.slice(0, 2).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="font-semibold text-sm text-foreground">{order.customer_name}</p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                      {isRepeatCustomer ? (
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-primary/5 text-primary border-primary/20">
                          <Star className="h-2.5 w-2.5 mr-0.5 fill-primary" /> CLIENT FIDÈLE
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0">
                          NOUVEAU CLIENT
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-2.5">
                  {phone && (
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                        <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                      <div className="flex-1">
                        <p className="text-[10px] text-muted-foreground">Téléphone</p>
                        <a href={`tel:${phone}`} className="text-xs font-medium text-foreground hover:text-primary transition-colors">
                          {phone}
                        </a>
                      </div>
                      <Button
                        variant="ghost" size="icon"
                        className="h-6 w-6 text-[hsl(142,76%,36%)]"
                        onClick={handleWhatsApp}
                      >
                        <MessageCircle className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}

                  {(order.city || order.quartier) && (
                    <div className="flex items-start gap-2">
                      <div className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0 mt-0.5">
                        <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                      <div className="flex-1">
                        <p className="text-[10px] text-muted-foreground">Adresse de livraison</p>
                        <p className="text-xs font-medium text-foreground">
                          {[order.quartier, order.city].filter(Boolean).join(', ')}
                        </p>
                        {order.notes && (
                          <p className="text-[10px] text-muted-foreground italic mt-0.5">"{order.notes}"</p>
                        )}
                      </div>
                    </div>
                  )}

                  {order.location_url && (
                    <a
                      href={order.location_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-2 rounded-xl bg-primary/5 border border-primary/10 hover:bg-primary/10 transition-colors"
                    >
                      <ExternalLink className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                      <span className="text-xs text-primary font-medium">Voir sur la carte</span>
                    </a>
                  )}
                </div>
              </Card>

              {/* ── NOTES INTERNES ────────────────────────────────────────── */}
              <Card className="lg:col-span-2">
                <SectionHeader icon={FileText} label="Notes internes" />

                {notes.length > 0 && (
                  <div className="space-y-2 mb-3">
                    {notes.map((note, idx) => (
                      <div key={idx} className="bg-[hsl(48,100%,97%)] dark:bg-[hsl(48,30%,12%)] border border-[hsl(48,60%,85%)] dark:border-[hsl(48,30%,22%)] rounded-xl p-3">
                        <p className="text-sm text-foreground leading-relaxed">"{note.text}"</p>
                        <p className="text-[10px] text-muted-foreground mt-1.5">
                          {format(note.date, 'dd/MM/yyyy HH:mm', { locale })}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <input
                    ref={noteInputRef}
                    type="text"
                    value={newNote}
                    onChange={e => setNewNote(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddNote()}
                    placeholder="Ajouter une note..."
                    className="flex-1 h-9 rounded-xl border border-border bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
                  />
                  <Button
                    size="icon"
                    className="h-9 w-9 rounded-xl flex-shrink-0"
                    onClick={handleAddNote}
                    disabled={!newNote.trim() || updateNote.isPending}
                  >
                    <SendHorizonal className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1.5">Visible seulement par vous</p>
              </Card>

              {/* ── HISTORIQUE D'ACTIONS ───────────────────────────────────── */}
              <Card className="lg:col-span-2">
                <SectionHeader icon={Clock} label="Historique d'actions" />
                {timeline.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">Aucun historique disponible</p>
                ) : (
                  <div className="space-y-3">
                    {timeline.map((log: Record<string, unknown>, idx: number) => (
                      <div key={idx} className="flex items-start gap-3">
                        <div className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                        <div>
                          <p className="text-xs text-foreground">
                            <span className="font-medium">{String(log.old_status)}</span>
                            {' → '}
                            <span className="font-semibold">{String(log.new_status)}</span>
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {format(new Date(log.changed_at as string), 'dd/MM/yyyy HH:mm', { locale })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
