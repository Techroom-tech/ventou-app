import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  ArrowLeft, Printer, MoreVertical, Check, CheckCheck,
  Phone, MessageCircle, MapPin, ShieldCheck, Eye, EyeOff,
  Send, Clock, Package, Truck, Star, User, Mail,
  ChevronRight, Copy, Trash2, Archive,
} from 'lucide-react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { OrderStatusBadge } from '@/components/dashboard/OrderStatusBadge';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { supabase, formatCurrency } from '@/integrations/supabase/client';
import { useShop } from '@/hooks/useShop';
import {
  useOrderTimeline, useUpdateOrderStatus,
  useUpdateSellerNote, useRepeatCustomers,
} from '@/hooks/useOrders';
import { Order, OrderStatus, ORDER_TRANSITIONS } from '@/types/shop';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────
interface OrderItem {
  id: string;
  product_id: string | null;
  name?: string;
  quantity: number;
  unit_price: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const STATUS_FLOW: OrderStatus[] = ['pending', 'confirmed', 'preparing', 'shipping', 'delivered'];

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'En attente',
  confirmed: 'Confirmée',
  preparing: 'Préparation',
  shipping: 'Livraison',
  delivered: 'Livrée',
  cancelled: 'Annulée',
  archived: 'Archivée',
};

const CTA_MAP: Partial<Record<OrderStatus, { label: string; next: OrderStatus; emoji: string }>> = {
  pending:   { label: 'Confirmer la commande',  next: 'confirmed',  emoji: '✓' },
  confirmed: { label: 'Mettre en préparation',  next: 'preparing',  emoji: '📦' },
  preparing: { label: 'Marquer en livraison',   next: 'shipping',   emoji: '🚚' },
  shipping:  { label: 'Marquer livrée',         next: 'delivered',  emoji: '✓' },
};

function getInitials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function parseNotes(raw: string | null | undefined): Array<{ date: string; text: string }> {
  if (!raw) return [];
  return raw
    .split('---')
    .map(block => block.trim())
    .filter(Boolean)
    .map(block => {
      const match = block.match(/^\[(.+?)\]\s*([\s\S]+)$/);
      if (match) return { date: match[1], text: match[2].trim() };
      return { date: new Date().toISOString(), text: block };
    });
}

function formatTime(iso: string) {
  try { return format(new Date(iso), 'HH:mm', { locale: fr }); } catch { return ''; }
}
function formatDateTime(iso: string) {
  try { return format(new Date(iso), "d MMM yyyy 'à' HH:mm", { locale: fr }); } catch { return iso; }
}

// ─── Timeline ─────────────────────────────────────────────────────────────────
function StatusTimeline({
  order, shopId, onStatusChange,
}: { order: Order; shopId: string; onStatusChange: () => void }) {
  const updateStatus = useUpdateOrderStatus();

  const currentIdx = STATUS_FLOW.indexOf(order.status);
  const isCancelled = order.status === 'cancelled' || order.status === 'archived';

  const handleStepClick = async (targetStatus: OrderStatus, stepIdx: number) => {
    if (isCancelled) return;
    if (stepIdx <= currentIdx) return; // no backward
    const allowed = ORDER_TRANSITIONS[order.status];
    if (!allowed.includes(targetStatus)) return;

    try {
      await updateStatus.mutateAsync({
        orderId: order.id, shopId,
        currentStatus: order.status, newStatus: targetStatus,
      });
      toast.success(`Statut mis à jour → ${STATUS_LABELS[targetStatus]}`);
      onStatusChange();
    } catch (e: unknown) {
      toast.error((e as Error).message ?? 'Erreur lors de la mise à jour');
    }
  };

  if (isCancelled) {
    return (
      <div className="flex items-center justify-center gap-3 py-4 px-6 bg-destructive/8 border border-destructive/20 rounded-xl">
        <div className="w-8 h-8 rounded-full bg-destructive flex items-center justify-center">
          <span className="text-white text-sm font-bold">✕</span>
        </div>
        <div>
          <p className="font-semibold text-destructive">
            {order.status === 'cancelled' ? 'Commande annulée' : 'Commande archivée'}
          </p>
          <p className="text-xs text-muted-foreground">Cette commande ne peut plus être modifiée</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex items-start justify-between gap-0">
      {/* Connector line behind dots */}
      <div className="absolute top-[14px] left-[calc(10%)] right-[calc(10%)] h-[2px] bg-border z-0" />

      {STATUS_FLOW.map((status, idx) => {
        const isPast = idx < currentIdx;
        const isActive = idx === currentIdx;
        const isFuture = idx > currentIdx;
        const isNext = ORDER_TRANSITIONS[order.status].includes(status) && idx === currentIdx + 1;
        const stepTime = order.updated_at && isActive
          ? formatTime(order.updated_at)
          : order.created_at && idx === 0
          ? formatTime(order.created_at)
          : null;

        return (
          <button
            key={status}
            onClick={() => isNext ? handleStepClick(status, idx) : undefined}
            disabled={!isNext || updateStatus.isPending}
            className={cn(
              'relative flex flex-col items-center gap-1.5 flex-1 z-10 transition-all',
              isNext && 'cursor-pointer group',
              isFuture && !isNext && 'cursor-default opacity-50',
            )}
          >
            <div className={cn(
              'w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all duration-300',
              isPast && 'bg-[hsl(142,76%,36%)] border-[hsl(142,76%,36%)] text-white',
              isActive && 'bg-white border-primary text-primary shadow-[0_0_0_4px_hsl(var(--primary)/0.15)] scale-110',
              isFuture && 'bg-background border-border text-muted-foreground',
              isNext && 'group-hover:border-primary group-hover:text-primary group-hover:scale-105',
            )}>
              {isPast ? <Check className="h-3.5 w-3.5" /> : idx + 1}
            </div>
            <div className="text-center">
              <p className={cn(
                'text-[10px] font-semibold leading-tight',
                isPast && 'text-[hsl(142,76%,36%)]',
                isActive && 'text-primary',
                isFuture && 'text-muted-foreground',
                isNext && 'group-hover:text-primary',
              )}>
                {STATUS_LABELS[status]}
              </p>
              {stepTime && isActive && (
                <p className="text-[9px] text-muted-foreground mt-0.5">{stepTime}</p>
              )}
              {isNext && (
                <p className="text-[9px] text-primary/70 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  Cliquer →
                </p>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function OrderDetailSkeleton() {
  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-4 animate-pulse">
        <Skeleton className="h-12 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-36 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    </DashboardLayout>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function OrderDetail() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { shop } = useShop();
  const shopId = shop?.id ?? '';
  const currencyCode = shop?.currency ?? 'XOF';

  const [showMargin, setShowMargin] = useState(false);
  const [noteInput, setNoteInput] = useState('');
  const [showAllHistory, setShowAllHistory] = useState(false);
  const noteRef = useRef<HTMLTextAreaElement>(null);

  // ── Fetch order ──────────────────────────────────────────────────────────
  const {
    data: order, isLoading, error, refetch,
  } = useQuery({
    queryKey: ['order-detail', orderId, shopId],
    queryFn: async () => {
      if (!orderId || !shopId) return null;
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .eq('shop_id', shopId)
        .maybeSingle();
      if (error) throw error;
      return data as Order | null;
    },
    enabled: !!orderId && !!shopId,
  });

  const { data: timeline = [] } = useOrderTimeline(orderId);
  const { data: repeatCustomers } = useRepeatCustomers(shopId);
  const updateNote = useUpdateSellerNote();

  const isRepeat = (() => {
    if (!order || !repeatCustomers) return false;
    const key = order.phone ?? order.customer_name;
    return repeatCustomers.has(key);
  })();

  // ── Parse items ──────────────────────────────────────────────────────────
  const rawItems = (order?.items ?? []) as unknown[];
  const items: OrderItem[] = rawItems.map((item, idx) => {
    const i = item as Record<string, unknown>;
    return {
      id: (i.id as string) ?? String(idx),
      product_id: (i.product_id as string) ?? null,
      name: (i.name as string) ?? `Article ${idx + 1}`,
      quantity: Number(i.quantity ?? 1),
      unit_price: Number(i.unit_price ?? i.price ?? 0),
    };
  });

  const subtotal = items.reduce((acc, i) => acc + i.unit_price * i.quantity, 0);
  const total = order?.total_amount ?? order?.total ?? subtotal;
  const deliveryFee = total - subtotal > 0 ? total - subtotal : 0;
  const margin = Math.round(total * 0.22);

  // ── Notes ────────────────────────────────────────────────────────────────
  const notes = parseNotes((order as (Order & { seller_note?: string }) | null)?.seller_note);

  const handleAddNote = async () => {
    if (!noteInput.trim() || !orderId || !shopId) return;
    const existing = (order as (Order & { seller_note?: string }) | null)?.seller_note ?? '';
    const newEntry = `[${new Date().toISOString()}] ${noteInput.trim()}`;
    const updated = existing ? `${existing}\n---\n${newEntry}` : newEntry;
    try {
      await updateNote.mutateAsync({ orderId, shopId, note: updated });
      setNoteInput('');
      refetch();
      toast.success('Note ajoutée');
    } catch {
      toast.error('Impossible d\'ajouter la note');
    }
  };

  // ── Status CTA ───────────────────────────────────────────────────────────
  const updateStatus = useUpdateOrderStatus();

  const handleCTA = async (next: OrderStatus) => {
    if (!order || !shopId) return;
    try {
      await updateStatus.mutateAsync({
        orderId: order.id, shopId,
        currentStatus: order.status, newStatus: next,
      });
      toast.success(`Statut mis à jour → ${STATUS_LABELS[next]}`);
      refetch();
    } catch (e: unknown) {
      toast.error((e as Error).message ?? 'Erreur');
    }
  };

  if (isLoading) return <OrderDetailSkeleton />;
  if (error || !order) {
    return (
      <DashboardLayout>
        <div className="max-w-3xl mx-auto py-16 text-center space-y-3">
          <div className="text-4xl">🔍</div>
          <p className="font-semibold text-foreground">Commande introuvable</p>
          <p className="text-sm text-muted-foreground">Cette commande n'existe pas ou vous n'y avez pas accès.</p>
          <Button variant="outline" onClick={() => navigate('/dashboard/orders')} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Retour aux commandes
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const orderNum = order.order_number ?? `#${order.id.slice(0, 8).toUpperCase()}`;
  const phone = order.phone ?? order.customer_phone ?? '';
  const cta = CTA_MAP[order.status];
  const canCancel = ORDER_TRANSITIONS[order.status].includes('cancelled');
  const canArchive = ORDER_TRANSITIONS[order.status].includes('archived');
  const isNew = Date.now() - new Date(order.created_at).getTime() < 10 * 60 * 1000;

  const historyEvents = [
    {
      id: 'created',
      label: 'Commande créée',
      sub: 'Via Boutique en ligne',
      time: order.created_at,
      icon: <Package className="h-3.5 w-3.5" />,
      color: 'text-blue-500 bg-blue-500/10',
    },
    ...timeline.map(log => ({
      id: log.id,
      label: `Statut → ${STATUS_LABELS[log.new_status as OrderStatus] ?? log.new_status}`,
      sub: `Depuis ${STATUS_LABELS[log.old_status as OrderStatus] ?? log.old_status}`,
      time: log.changed_at,
      icon: <CheckCheck className="h-3.5 w-3.5" />,
      color: 'text-primary bg-primary/10',
    })),
    ...notes.map((n, i) => ({
      id: `note-${i}`,
      label: 'Note ajoutée',
      sub: n.text.slice(0, 60) + (n.text.length > 60 ? '…' : ''),
      time: n.date,
      icon: <Star className="h-3.5 w-3.5" />,
      color: 'text-amber-500 bg-amber-500/10',
    })),
  ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

  const visibleHistory = showAllHistory ? historyEvents : historyEvents.slice(0, 3);

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto pb-32 lg:pb-8">

        {/* ─── STICKY HEADER ─────────────────────────────────────────────── */}
        <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border -mx-4 sm:-mx-6 px-4 sm:px-6 py-3 mb-6">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Button
                variant="ghost" size="icon"
                className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
                onClick={() => navigate('/dashboard/orders')}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-2 min-w-0">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-base font-bold text-foreground font-mono">
                      Commande {orderNum}
                    </h1>
                    {isNew && (
                      <Badge className="animate-pulse bg-primary text-primary-foreground border-0 text-[9px] px-1.5 py-0">
                        NOUVEAU
                      </Badge>
                    )}
                    <OrderStatusBadge status={order.status} />
                  </div>
                  <p className="text-[11px] text-muted-foreground hidden sm:block">
                    {formatDateTime(order.created_at)}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <Button
                variant="ghost" size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={() => window.print()}
                title="Imprimer"
              >
                <Printer className="h-4 w-4" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuItem className="gap-2" onClick={() => {
                    navigator.clipboard.writeText(orderNum);
                    toast.success('Numéro copié');
                  }}>
                    <Copy className="h-3.5 w-3.5" />
                    Copier le numéro
                  </DropdownMenuItem>
                  {canArchive && (
                    <DropdownMenuItem className="gap-2 text-muted-foreground" onClick={() => handleCTA('archived')}>
                      <Archive className="h-3.5 w-3.5" />
                      Archiver
                    </DropdownMenuItem>
                  )}
                  {canCancel && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="gap-2 text-destructive focus:text-destructive"
                        onClick={() => handleCTA('cancelled')}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Annuler la commande
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        <div className="space-y-4 px-0">

          {/* ─── TIMELINE ────────────────────────────────────────────────── */}
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
            <StatusTimeline order={order} shopId={shopId} onStatusChange={refetch} />
          </div>

          {/* ─── CTA BUTTONS ─────────────────────────────────────────────── */}
          <div className="bg-card border border-border rounded-2xl p-4 shadow-sm space-y-3">
            {cta && (
              <Button
                className="w-full h-11 font-semibold text-sm gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-md shadow-primary/20"
                onClick={() => handleCTA(cta.next)}
                disabled={updateStatus.isPending}
              >
                <span>{cta.emoji}</span>
                {cta.label}
              </Button>
            )}
            <div className="grid grid-cols-3 gap-2">
              {phone && (
                <a
                  href={`https://wa.me/${phone.replace(/\s/g, '')}`}
                  target="_blank" rel="noopener noreferrer"
                  className={cn(
                    'flex flex-col items-center gap-1 py-2.5 rounded-xl border border-border',
                    'text-[hsl(142,76%,36%)] bg-[hsl(142,76%,36%)]/5 hover:bg-[hsl(142,76%,36%)]/10',
                    'transition-colors text-[10px] font-medium'
                  )}
                >
                  <MessageCircle className="h-4 w-4" />
                  WhatsApp
                </a>
              )}
              {phone && (
                <a
                  href={`tel:${phone}`}
                  className={cn(
                    'flex flex-col items-center gap-1 py-2.5 rounded-xl border border-border',
                    'text-blue-600 bg-blue-50 hover:bg-blue-100 dark:bg-blue-500/10 dark:hover:bg-blue-500/20',
                    'transition-colors text-[10px] font-medium'
                  )}
                >
                  <Phone className="h-4 w-4" />
                  Appeler
                </a>
              )}
              {order.location_url ? (
                <a
                  href={order.location_url} target="_blank" rel="noopener noreferrer"
                  className={cn(
                    'flex flex-col items-center gap-1 py-2.5 rounded-xl border border-border',
                    'text-orange-600 bg-orange-50 hover:bg-orange-100 dark:bg-orange-500/10 dark:hover:bg-orange-500/20',
                    'transition-colors text-[10px] font-medium'
                  )}
                >
                  <MapPin className="h-4 w-4" />
                  Maps
                </a>
              ) : (
                <div className={cn(
                  'flex flex-col items-center gap-1 py-2.5 rounded-xl border border-border',
                  'text-muted-foreground/40 bg-muted/20',
                  'text-[10px] font-medium cursor-not-allowed'
                )}>
                  <MapPin className="h-4 w-4" />
                  Maps
                </div>
              )}
            </div>
          </div>

          {/* ─── ARTICLES ────────────────────────────────────────────────── */}
          <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-muted-foreground" />
                <h2 className="font-semibold text-foreground text-sm">Articles commandés</h2>
              </div>
              <Badge variant="secondary" className="text-xs">{items.length} article{items.length > 1 ? 's' : ''}</Badge>
            </div>

            {items.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-muted-foreground">
                Aucun article trouvé
              </div>
            ) : (
              <div className="divide-y divide-border">
                {/* Table header (desktop) */}
                <div className="hidden sm:grid grid-cols-[1fr_80px_80px_80px] px-5 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide bg-muted/30">
                  <span>Produit</span>
                  <span className="text-right">Prix unit.</span>
                  <span className="text-right">Qté</span>
                  <span className="text-right">Total</span>
                </div>
                {items.map((item, idx) => (
                  <div key={item.id ?? idx} className="px-5 py-4">
                    {/* Desktop */}
                    <div className="hidden sm:grid grid-cols-[1fr_80px_80px_80px] items-center gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Package className="h-4 w-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-sm text-foreground truncate">{item.name ?? `Article ${idx + 1}`}</p>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground text-right">
                        {formatCurrency(item.unit_price, currencyCode as 'XOF')}
                      </p>
                      <p className="text-sm text-center font-medium">{item.quantity}</p>
                      <p className="text-sm font-semibold text-foreground text-right">
                        {formatCurrency(item.unit_price * item.quantity, currencyCode as 'XOF')}
                      </p>
                    </div>
                    {/* Mobile */}
                    <div className="sm:hidden flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Package className="h-4 w-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-sm text-foreground truncate">{item.name ?? `Article ${idx + 1}`}</p>
                          <p className="text-xs text-muted-foreground">x{item.quantity} · {formatCurrency(item.unit_price, currencyCode as 'XOF')}</p>
                        </div>
                      </div>
                      <p className="text-sm font-bold text-foreground shrink-0">
                        {formatCurrency(item.unit_price * item.quantity, currencyCode as 'XOF')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ─── NOTES INTERNES ──────────────────────────────────────────── */}
          <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
              <Star className="h-4 w-4 text-amber-500" />
              <h2 className="font-semibold text-foreground text-sm">Notes internes</h2>
              <span className="text-xs text-muted-foreground">· Visible uniquement par vous</span>
            </div>

            <div className="px-5 py-4 space-y-3">
              {notes.length === 0 && (
                <p className="text-sm text-muted-foreground italic">Aucune note pour l'instant</p>
              )}
              {notes.map((note, idx) => (
                <div key={idx} className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl p-3.5">
                  <p className="text-sm text-foreground leading-relaxed">"{note.text}"</p>
                  <p className="text-[10px] text-muted-foreground mt-2">
                    Par {shop?.name ?? 'Vous'} · {formatDateTime(note.date)}
                  </p>
                </div>
              ))}

              {/* Note input */}
              <div className="flex gap-2 items-end pt-1">
                <textarea
                  ref={noteRef}
                  value={noteInput}
                  onChange={e => setNoteInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddNote(); } }}
                  placeholder="Ajouter une note interne..."
                  rows={2}
                  className={cn(
                    'flex-1 resize-none rounded-xl border border-border bg-background px-3 py-2.5',
                    'text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30',
                    'transition-colors'
                  )}
                />
                <Button
                  size="icon"
                  className="h-10 w-10 shrink-0 rounded-xl bg-primary hover:bg-primary/90"
                  onClick={handleAddNote}
                  disabled={!noteInput.trim() || updateNote.isPending}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* ─── FINANCIALS ──────────────────────────────────────────────── */}
          <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
              <div className="w-4 h-4 rounded bg-primary/20 flex items-center justify-center">
                <span className="text-[9px] font-bold text-primary">₣</span>
              </div>
              <h2 className="font-semibold text-foreground text-sm">Détails financiers</h2>
            </div>

            <div className="px-5 py-4 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Sous-total</span>
                <span className="font-medium">{formatCurrency(subtotal, currencyCode as 'XOF')}</span>
              </div>
              {deliveryFee > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Livraison</span>
                    <Badge className="bg-blue-100 text-blue-700 border-0 text-[9px] dark:bg-blue-500/20 dark:text-blue-400">
                      LIVRAISON
                    </Badge>
                  </div>
                  <span className="font-medium">{formatCurrency(deliveryFee, currencyCode as 'XOF')}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Remise</span>
                <span className="font-medium text-[hsl(142,76%,36%)]">–0 {currencyCode === 'XOF' ? 'FCFA' : currencyCode}</span>
              </div>
              <div className="border-t border-border pt-3 flex items-center justify-between">
                <span className="font-bold text-foreground">Total à payer</span>
                <span className="text-xl font-bold text-foreground">{formatCurrency(total, currencyCode as 'XOF')}</span>
              </div>

              {/* Margin (seller only) */}
              <div className="border-t border-border pt-3 flex items-center justify-between">
                <button
                  onClick={() => setShowMargin(v => !v)}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showMargin ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  Marge estimée
                </button>
                {showMargin ? (
                  <span className="font-semibold text-[hsl(142,76%,36%)]">
                    + {formatCurrency(margin, currencyCode as 'XOF')}
                  </span>
                ) : (
                  <span className="text-sm text-muted-foreground blur-sm select-none">••••••</span>
                )}
              </div>

              {order.payment_method && (
                <div className="flex items-center justify-between text-sm pt-1">
                  <span className="text-muted-foreground">Mode de paiement</span>
                  <Badge variant="outline" className="text-xs bg-primary/5 border-primary/20 text-primary">
                    {order.payment_method === 'cod' ? '💵 Livraison' : order.payment_method}
                  </Badge>
                </div>
              )}
            </div>
          </div>

          {/* ─── CUSTOMER CARD ───────────────────────────────────────────── */}
          <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
              <User className="h-4 w-4 text-muted-foreground" />
              <h2 className="font-semibold text-foreground text-sm">Client</h2>
            </div>

            <div className="px-5 py-5 space-y-4">
              {/* Avatar + badges */}
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center shrink-0">
                  <span className="text-primary-foreground font-bold text-lg">
                    {getInitials(order.customer_name)}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-foreground">{order.customer_name}</h3>
                    <ShieldCheck className="h-4 w-4 text-[hsl(142,76%,36%)]" />
                  </div>
                  <div className="flex gap-1.5 mt-1.5 flex-wrap">
                    {isRepeat ? (
                      <Badge className="bg-[hsl(142,76%,36%)]/10 text-[hsl(142,76%,36%)] border-[hsl(142,76%,36%)]/20 text-[9px] font-bold">
                        ⭐ CLIENT FIDÈLE
                      </Badge>
                    ) : (
                      <Badge className="bg-blue-50 text-blue-600 border-blue-100 text-[9px] font-bold dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20">
                        NOUVEAU CLIENT
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Contact rows */}
              <div className="space-y-2">
                {phone && (
                  <a
                    href={`tel:${phone}`}
                    className="flex items-center justify-between p-3 rounded-xl bg-secondary/40 hover:bg-secondary/70 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center">
                        <Phone className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground">Téléphone</p>
                        <p className="text-sm font-medium text-foreground">{phone}</p>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </a>
                )}
                {phone && (
                  <a
                    href={`https://wa.me/${phone.replace(/\s/g, '')}`}
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-between p-3 rounded-xl bg-secondary/40 hover:bg-secondary/70 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg bg-[hsl(142,76%,36%)]/10 flex items-center justify-center">
                        <MessageCircle className="h-3.5 w-3.5 text-[hsl(142,76%,36%)]" />
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground">WhatsApp</p>
                        <p className="text-sm font-medium text-foreground">{phone}</p>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </a>
                )}
                {(order.city || order.quartier || order.notes) && (
                  <div className="p-3 rounded-xl bg-secondary/40">
                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-lg bg-orange-100 dark:bg-orange-500/20 flex items-center justify-center mt-0.5 shrink-0">
                        <MapPin className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400" />
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground">Adresse de livraison</p>
                        <p className="text-sm font-medium text-foreground">
                          {[order.quartier, order.city].filter(Boolean).join(', ') || '—'}
                        </p>
                        {order.notes && (
                          <p className="text-xs text-muted-foreground italic mt-0.5">"{order.notes}"</p>
                        )}
                      </div>
                    </div>
                    {order.location_url && (
                      <a
                        href={order.location_url} target="_blank" rel="noopener noreferrer"
                        className="mt-3 flex items-center gap-2 text-xs text-primary font-medium hover:underline"
                      >
                        <MapPin className="h-3 w-3" />
                        Voir la carte Google Maps
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ─── HISTORIQUE ──────────────────────────────────────────────── */}
          <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <h2 className="font-semibold text-foreground text-sm">Historique d'actions</h2>
            </div>

            <div className="px-5 py-4 space-y-1">
              {historyEvents.length === 0 && (
                <p className="text-sm text-muted-foreground italic py-2">Aucun événement</p>
              )}
              {visibleHistory.map((event, idx) => (
                <div key={event.id} className="flex items-start gap-3 py-2.5">
                  <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5', event.color)}>
                    {event.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground leading-tight">{event.label}</p>
                    <p className="text-xs text-muted-foreground">{event.sub}</p>
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0 mt-1">{formatTime(event.time)}</span>
                </div>
              ))}

              {historyEvents.length > 3 && (
                <button
                  onClick={() => setShowAllHistory(v => !v)}
                  className="w-full pt-2 text-xs text-primary font-medium hover:underline text-center"
                >
                  {showAllHistory ? 'Masquer' : `Voir tout l'historique (${historyEvents.length})`}
                </button>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Mobile sticky CTA */}
      {cta && (
        <div className="lg:hidden fixed bottom-16 left-0 right-0 z-40 px-4 pb-2 bg-background/80 backdrop-blur-sm border-t border-border pt-3">
          <Button
            className="w-full h-12 font-semibold text-sm gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20"
            onClick={() => handleCTA(cta.next)}
            disabled={updateStatus.isPending}
          >
            <span>{cta.emoji}</span>
            {cta.label}
          </Button>
        </div>
      )}
    </DashboardLayout>
  );
}
