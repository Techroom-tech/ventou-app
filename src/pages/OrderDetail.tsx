import { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  ArrowLeft, Phone, MessageCircle, MapPin,
  Send, Star, ChevronDown, Trash2,
} from 'lucide-react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { OrderStatusBadge } from '@/components/dashboard/OrderStatusBadge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { supabase, formatCurrency } from '@/integrations/supabase/client';
import { useShop } from '@/hooks/useShop';
import { useUpdateOrderStatus, useUpdateSellerNote, useDeleteOrders } from '@/hooks/useOrders';
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
const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'En attente',
  confirmed: 'Confirmée',
  delivered: 'Livrée',
  cancelled: 'Annulée',
};

const CTA_MAP: Partial<Record<OrderStatus, { label: string; next: OrderStatus; emoji: string }>> = {
  pending:   { label: 'Confirmer la commande',  next: 'confirmed',  emoji: '✓' },
  confirmed: { label: 'Marquer livrée',         next: 'delivered',  emoji: '✓' },
};

function formatDateTime(iso: string) {
  try { return format(new Date(iso), "d MMM yyyy 'à' HH:mm", { locale: fr }); } catch { return iso; }
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

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function OrderDetailSkeleton() {
  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-4 animate-pulse">
        <Skeleton className="h-12 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-36 w-full rounded-xl" />
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

  const [noteInput, setNoteInput] = useState('');
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

  const updateNote = useUpdateSellerNote();
  const updateStatus = useUpdateOrderStatus();
  const deleteOrders = useDeleteOrders();
  const queryClient = useQueryClient();

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
  const orderTotal = order?.total_amount ?? order?.total ?? subtotal;
  const deliveryFee = (order as any)?.delivery_fee ?? (orderTotal - subtotal > 0 ? orderTotal - subtotal : 0);
  const discount = subtotal + (deliveryFee || 0) - orderTotal;

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
      toast.error("Impossible d'ajouter la note");
    }
  };

  const handleCTA = async (next: OrderStatus) => {
    if (!order || !shopId) return;
    try {
      await updateStatus.mutateAsync({
        orderId: order.id, shopId,
        currentStatus: order.status, newStatus: next,
      });
      toast.success(`Statut mis à jour → ${STATUS_LABELS[next]}`);
      await queryClient.invalidateQueries({ queryKey: ['order-detail'] });
      await refetch();
    } catch (e: unknown) {
      toast.error((e as Error).message ?? 'Erreur lors de la mise à jour');
    }
  };

  const handleDelete = async () => {
    if (!order || !shopId) return;
    if (!window.confirm('Supprimer définitivement cette commande annulée ?')) return;
    try {
      await deleteOrders.mutateAsync({ orderIds: [order.id], shopId });
      toast.success('Commande supprimée');
      navigate('/dashboard/orders');
    } catch {
      toast.error('Erreur lors de la suppression');
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

  const orderNum = `#${order.id.slice(0, 8).toUpperCase()}`;
  const phone = order.phone ?? order.customer_phone ?? '';
  const cta = CTA_MAP[order.status];
  const canCancel = ORDER_TRANSITIONS[order.status].includes('cancelled');
  const nextStatuses = ORDER_TRANSITIONS[order.status];

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto pb-32 lg:pb-8">

        {/* ─── STICKY HEADER ─────────────────────────────────────────────── */}
        <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border -mx-4 sm:-mx-6 px-4 sm:px-6 py-3 mb-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Button
                variant="ghost" size="icon"
                className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
                onClick={() => navigate('/dashboard/orders')}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-base font-bold text-foreground font-mono">
                    Commande {orderNum}
                  </h1>
                  <OrderStatusBadge status={order.status} />
                </div>
                <p className="text-[11px] text-muted-foreground">{formatDateTime(order.created_at)}</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {phone && (
                <a href={`tel:${phone}`}>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600">
                    <Phone className="h-4 w-4" />
                  </Button>
                </a>
              )}
              {phone && (
                <a href={`https://wa.me/${phone.replace(/\s/g, '')}`} target="_blank" rel="noopener noreferrer">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-[hsl(142,76%,36%)]">
                    <MessageCircle className="h-4 w-4" />
                  </Button>
                </a>
              )}
              {nextStatuses.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 text-xs gap-1">
                      Statut <ChevronDown className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {nextStatuses.map(s => (
                      <DropdownMenuItem key={s} onClick={() => handleCTA(s)}>
                        <OrderStatusBadge status={s} />
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              {order.status === 'cancelled' && (
                <Button
                  variant="outline" size="sm"
                  className="h-8 text-xs gap-1 text-destructive border-destructive/30"
                  onClick={handleDelete}
                  disabled={deleteOrders.isPending}
                >
                  <Trash2 className="h-3 w-3" />
                  Supprimer
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4">

          {/* ─── CONTACT BLOCK (PRIORITY) ──────────────────────────────── */}
          <div className="bg-card border border-border rounded-2xl shadow-sm p-5 space-y-4">
            <div>
              <h2 className="font-semibold text-foreground text-lg">{order.customer_name}</h2>
              {phone && <p className="text-sm text-muted-foreground">{phone}</p>}
            </div>

            {phone && (
              <div className="grid grid-cols-2 gap-2">
                <a
                  href={`tel:${phone}`}
                  className={cn(
                    'flex items-center justify-center gap-2 py-3 rounded-xl border border-border font-medium text-sm',
                    'text-blue-600 bg-blue-50 hover:bg-blue-100 dark:bg-blue-500/10 dark:hover:bg-blue-500/20 transition-colors'
                  )}
                >
                  <Phone className="h-4 w-4" />
                  Appeler
                </a>
                <a
                  href={`https://wa.me/${phone.replace(/\s/g, '')}`}
                  target="_blank" rel="noopener noreferrer"
                  className={cn(
                    'flex items-center justify-center gap-2 py-3 rounded-xl border border-border font-medium text-sm',
                    'text-[hsl(142,76%,36%)] bg-[hsl(142,76%,36%)]/5 hover:bg-[hsl(142,76%,36%)]/10 transition-colors'
                  )}
                >
                  <MessageCircle className="h-4 w-4" />
                  WhatsApp
                </a>
              </div>
            )}

            {/* Address */}
            {(order.city || order.quartier) && (
              <div className="flex items-start gap-3 p-3 rounded-xl bg-secondary/40">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {[order.quartier, order.city].filter(Boolean).join(', ')}
                  </p>
                  {order.location_url && (
                    <a
                      href={order.location_url} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-primary font-medium hover:underline mt-1 inline-flex items-center gap-1"
                    >
                      <MapPin className="h-3 w-3" />
                      Ouvrir dans Google Maps
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ─── CLIENT NOTE (conditional) ─────────────────────────────── */}
          {order.notes && (
            <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-2xl p-4">
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1">Note du client</p>
              <p className="text-sm text-foreground">"{order.notes}"</p>
            </div>
          )}

          {/* ─── ARTICLES ────────────────────────────────────────────────── */}
          <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <h2 className="font-semibold text-foreground text-sm">Articles commandés</h2>
            </div>

            {items.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-muted-foreground">
                Aucun article trouvé
              </div>
            ) : (
              <div className="divide-y divide-border">
                <div className="hidden sm:grid grid-cols-[1fr_80px_60px_80px] px-5 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide bg-muted/30">
                  <span>Produit</span>
                  <span className="text-right">Prix unit.</span>
                  <span className="text-center">Qté</span>
                  <span className="text-right">Total</span>
                </div>
                {items.map((item, idx) => (
                  <div key={item.id ?? idx} className="px-5 py-3">
                    {/* Desktop */}
                    <div className="hidden sm:grid grid-cols-[1fr_80px_60px_80px] items-center">
                      <p className="font-medium text-sm text-foreground truncate">{item.name ?? `Article ${idx + 1}`}</p>
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
                      <div className="min-w-0">
                        <p className="font-medium text-sm text-foreground truncate">{item.name ?? `Article ${idx + 1}`}</p>
                        <p className="text-xs text-muted-foreground">x{item.quantity} · {formatCurrency(item.unit_price, currencyCode as 'XOF')}</p>
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

          {/* ─── TOTAL ───────────────────────────────────────────────────── */}
          <div className="bg-card border border-border rounded-2xl shadow-sm p-5 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Sous-total</span>
              <span className="font-medium">{formatCurrency(subtotal, currencyCode as 'XOF')}</span>
            </div>
            {deliveryFee > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Livraison</span>
                <span className="font-medium">{formatCurrency(deliveryFee, currencyCode as 'XOF')}</span>
              </div>
            )}
            {discount > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Remise</span>
                <span className="font-medium text-[hsl(142,76%,36%)]">
                  –{formatCurrency(discount, currencyCode as 'XOF')}
                </span>
              </div>
            )}
            <div className="border-t border-border pt-3 flex items-center justify-between">
              <span className="font-bold text-foreground">Total à encaisser</span>
              <span className="text-xl font-bold text-foreground">{formatCurrency(orderTotal, currencyCode as 'XOF')}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Paiement : {order.payment_method === 'cod' ? 'À la livraison (COD)' : order.payment_method ?? 'COD'}
            </p>
          </div>

          {/* ─── NOTES INTERNES ──────────────────────────────────────────── */}
          <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
              <Star className="h-4 w-4 text-amber-500" />
              <h2 className="font-semibold text-foreground text-sm">Notes internes</h2>
              <span className="text-xs text-muted-foreground">· Visible uniquement par vous</span>
            </div>

            <div className="px-5 py-4 space-y-3">
              {notes.map((note, idx) => (
                <div key={idx} className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl p-3.5">
                  <p className="text-sm text-foreground leading-relaxed">"{note.text}"</p>
                  <p className="text-[10px] text-muted-foreground mt-2">
                    {formatDateTime(note.date)}
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
