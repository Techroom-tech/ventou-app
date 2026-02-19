import { useState, useCallback, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Search, Download, MessageCircle, ChevronLeft, ChevronRight,
  RefreshCw,
} from 'lucide-react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { OrderStatusBadge } from '@/components/dashboard/OrderStatusBadge';
import { OrderDetailPanel } from '@/components/dashboard/OrderDetailPanel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { useOrders, useOrderCounts, useUpdateOrderStatus, useRepeatCustomers } from '@/hooks/useOrders';
import { useShop } from '@/hooks/useShop';
import { formatCurrency, supabase } from '@/integrations/supabase/client';
import { Order, OrderStatus, ORDER_TRANSITIONS } from '@/types/shop';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const STATUS_TABS: Array<OrderStatus | 'all'> = [
  'all', 'pending', 'confirmed', 'preparing', 'shipping', 'delivered', 'cancelled',
];

const PAGE_SIZE = 20;

// --- CSV Export ---
function exportOrdersCSV(orders: Order[], currencyCode: string) {
  const headers = ['N° Commande', 'Client', 'Téléphone', 'Ville', 'Total', 'Paiement', 'Statut', 'Date'];
  const rows = orders.map(o => [
    o.order_number ?? o.id.slice(0, 8),
    o.customer_name,
    o.phone ?? o.customer_phone ?? '',
    o.city ?? '',
    formatCurrency(o.total_amount ?? o.total ?? 0, currencyCode as 'XOF'),
    o.payment_method ?? '',
    o.status,
    new Date(o.created_at).toLocaleDateString('fr-FR'),
  ]);

  const csv = [headers, ...rows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `commandes-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

// --- WhatsApp bulk messaging ---
function sendBulkWhatsApp(orders: Order[], status: OrderStatus | 'all') {
  const withPhone = orders.filter(o => o.phone ?? o.customer_phone);
  if (withPhone.length === 0) {
    toast.error('Aucun client avec numéro WhatsApp dans cette sélection');
    return;
  }
  // Open each in sequence (browsers may block multiple tabs, so we open one by one with delay)
  withPhone.forEach((order, i) => {
    setTimeout(() => {
      const phone = (order.phone ?? order.customer_phone ?? '').replace(/\s/g, '');
      const orderNum = order.order_number ?? `#${order.id.slice(0, 8).toUpperCase()}`;
      const statusMsg =
        status === 'shipping' ? "est en cours de livraison 🚚" :
        status === 'confirmed' ? "a été confirmée ✅" :
        status === 'preparing' ? "est en préparation 📦" :
        "a été mise à jour";
      const msg = encodeURIComponent(
        `Bonjour ${order.customer_name} 👋\n\nVotre commande ${orderNum} ${statusMsg}.\n\nMerci pour votre confiance ! — Ventou`
      );
      window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
    }, i * 800);
  });
  toast.success(`${withPhone.length} message(s) WhatsApp envoyé(s)`);
}

// --- Order row context menu ---
function OrderContextMenu({
  children,
  order,
  shopId,
}: {
  children: React.ReactNode;
  order: Order;
  shopId: string;
}) {
  const updateStatus = useUpdateOrderStatus();
  const nextStatuses = ORDER_TRANSITIONS[order.status];

  const handleQuick = async (newStatus: OrderStatus) => {
    try {
      await updateStatus.mutateAsync({
        orderId: order.id, shopId,
        currentStatus: order.status, newStatus,
      });
      toast.success(`Commande → ${newStatus}`);
    } catch (e: unknown) {
      toast.error((e as Error).message);
    }
  };

  if (nextStatuses.length === 0) return <>{children}</>;

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent>
        <p className="px-2 py-1 text-[10px] text-muted-foreground font-semibold uppercase">Changer le statut</p>
        <ContextMenuSeparator />
        {nextStatuses.map(s => (
          <ContextMenuItem key={s} onSelect={() => handleQuick(s)}>
            <OrderStatusBadge status={s} />
          </ContextMenuItem>
        ))}
      </ContextMenuContent>
    </ContextMenu>
  );
}

// --- Long press hook for mobile ---
function useLongPress(callback: () => void, ms = 600) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const start = useCallback(() => {
    timerRef.current = setTimeout(callback, ms);
  }, [callback, ms]);

  const stop = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  return { onTouchStart: start, onTouchEnd: stop, onTouchMove: stop };
}

// --- Mobile order card ---
function OrderCard({
  order, onView, isRepeat, shopId,
}: {
  order: Order;
  onView: () => void;
  isRepeat: boolean;
  shopId: string;
}) {
  const { i18n } = useTranslation();
  const locale = i18n.language === 'fr' ? fr : undefined;
  const phone = order.phone ?? order.customer_phone ?? '';
  const total = order.total_amount ?? order.total ?? 0;
  const [showQuickMenu, setShowQuickMenu] = useState(false);
  const longPress = useLongPress(() => setShowQuickMenu(true));

  return (
    <OrderContextMenu order={order} shopId={shopId}>
      <div
        className={cn(
          'bg-card border border-border rounded-xl p-4 transition-all duration-200',
          'hover:shadow-md hover:border-primary/20 active:scale-[0.99] cursor-pointer'
        )}
        onClick={onView}
        {...longPress}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-semibold text-sm text-foreground truncate">
                {order.customer_name}
              </span>
              {isRepeat && (
                <span title="Client fidèle" className="text-xs">🔄</span>
              )}
            </div>
            {phone && (
              <p className="text-xs text-muted-foreground mt-0.5">{phone}</p>
            )}
          </div>
          <OrderStatusBadge status={order.status} />
        </div>

        <div className="flex items-center justify-between mt-3">
          <span className="text-base font-bold text-foreground">
            {formatCurrency(total, 'XOF')}
          </span>
          <span className="text-[11px] text-muted-foreground">
            {formatDistanceToNow(new Date(order.created_at), { addSuffix: true, locale })}
          </span>
        </div>

        {order.payment_method && (
          <Badge variant="outline" className="mt-2 text-[10px] bg-primary/5 border-primary/20 text-primary">
            {order.payment_method === 'cod' ? '💵 Livraison' : order.payment_method}
          </Badge>
        )}
        <p className="text-[10px] text-muted-foreground/60 mt-2">Clic droit ou appui long pour changer le statut</p>
      </div>
    </OrderContextMenu>
  );
}

// --- Skeleton loaders ---
function OrderSkeletons() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-28 w-full rounded-xl" />
      ))}
    </div>
  );
}

// --- Main Orders Page ---
export default function Orders() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'fr' ? fr : undefined;
  const { shop } = useShop();
  const shopId = shop?.id;
  const currencyCode = shop?.currency ?? 'XOF';

  const [activeStatus, setActiveStatus] = useState<OrderStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(0);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading, refetch } = useOrders({
    shopId,
    status: activeStatus,
    search: debouncedSearch,
    page,
  });

  const { data: counts } = useOrderCounts(shopId);
  const { data: repeatCustomers } = useRepeatCustomers(shopId);

  const orders = data?.orders ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const isRepeat = useCallback((order: Order) => {
    if (!repeatCustomers) return false;
    const key = order.phone ?? order.customer_name;
    return repeatCustomers.has(key);
  }, [repeatCustomers]);

  // Real-time new order subscription
  useEffect(() => {
    if (!shopId) return;

    const channel = supabase
      .channel(`orders-realtime-${shopId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders', filter: `shop_id=eq.${shopId}` },
        (payload) => {
          const newOrder = payload.new as Order;
          toast.success(
            `🛍️ Nouvelle commande de ${newOrder.customer_name} — ${formatCurrency(newOrder.total_amount ?? newOrder.total ?? 0, currencyCode as 'XOF')}`,
            { duration: 6000 }
          );
          refetch();
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [shopId, currencyCode, refetch]);

  const handleTabChange = (status: OrderStatus | 'all') => {
    setActiveStatus(status);
    setPage(0);
  };

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-4">
        {/* Page header */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-xl font-bold text-foreground">Commandes</h2>
            <p className="text-sm text-muted-foreground">
              {total > 0 ? `${total} commande${total > 1 ? 's' : ''} au total` : 'Gérez vos commandes clients'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline" size="sm"
              onClick={() => refetch()}
              className="h-8 gap-1.5 text-xs"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Actualiser</span>
            </Button>
            {orders.length > 0 && (
              <Button
                variant="outline" size="sm"
                className="h-8 gap-1.5 text-xs"
                onClick={() => exportOrdersCSV(orders, currencyCode)}
              >
                <Download className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Export CSV</span>
              </Button>
            )}
            {orders.length > 0 && (
              <Button
                variant="outline" size="sm"
                className="h-8 gap-1.5 text-xs text-[hsl(142,76%,28%)] border-[hsl(142,76%,36%)]/30 bg-[hsl(142,76%,36%)]/5 hover:bg-[hsl(142,76%,36%)]/10"
                onClick={() => sendBulkWhatsApp(orders, activeStatus)}
              >
                <MessageCircle className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">WhatsApp</span>
              </Button>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0); }}
            placeholder="Rechercher par nom ou téléphone..."
            className="pl-9 bg-card"
          />
        </div>

        {/* Status tabs */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
          {STATUS_TABS.map(status => (
            <button
              key={status}
              onClick={() => handleTabChange(status)}
              className={cn(
                'flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                activeStatus === status
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-card border border-border text-muted-foreground hover:border-primary/30 hover:text-foreground'
              )}
            >
              <span className="capitalize">
                {status === 'all' ? 'Toutes' : t(`orders.status.${status}`, status)}
              </span>
              {counts?.[status] !== undefined && (
                <span className={cn(
                  'text-[10px] font-bold px-1 rounded',
                  activeStatus === status ? 'bg-white/20' : 'bg-muted'
                )}>
                  {counts[status]}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        {isLoading ? (
          <OrderSkeletons />
        ) : orders.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <div className="text-4xl">📦</div>
            <p className="font-semibold text-foreground">Aucune commande trouvée</p>
            <p className="text-sm text-muted-foreground">
              {search ? 'Essayez un autre terme de recherche.' : 'Les commandes de votre boutique apparaîtront ici.'}
            </p>
          </div>
        ) : (
          <>
            {/* Mobile: cards */}
            <div className="grid gap-3 sm:hidden">
              {orders.map(order => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onView={() => setSelectedOrder(order)}
                  isRepeat={isRepeat(order)}
                  shopId={shopId ?? ''}
                />
              ))}
            </div>

            {/* Desktop: table */}
            <div className="hidden sm:block bg-card border border-border rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-secondary/40">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Commande</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Client</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Total</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Paiement</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Statut</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Date</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order, idx) => {
                      const phone = order.phone ?? order.customer_phone ?? '';
                      const total = order.total_amount ?? order.total ?? 0;
                      const orderNum = order.order_number ?? `#${order.id.slice(0, 8).toUpperCase()}`;
                      return (
                        <OrderContextMenu key={order.id} order={order} shopId={shopId ?? ''}>
                          <tr
                            className={cn(
                              'border-b border-border last:border-0 cursor-pointer',
                              'hover:bg-secondary/30 transition-colors',
                              idx % 2 === 0 ? '' : 'bg-secondary/10'
                            )}
                            onClick={() => setSelectedOrder(order)}
                          >
                            <td className="px-4 py-3">
                              <span className="font-mono text-xs text-muted-foreground">{orderNum}</span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1.5">
                                <span className="font-medium text-foreground">{order.customer_name}</span>
                                {isRepeat(order) && <span title="Client fidèle">🔄</span>}
                              </div>
                              {phone && <p className="text-xs text-muted-foreground">{phone}</p>}
                            </td>
                            <td className="px-4 py-3 font-semibold text-foreground">
                              {formatCurrency(total, currencyCode as 'XOF')}
                            </td>
                            <td className="px-4 py-3">
                              <Badge variant="outline" className="text-[10px] bg-primary/5 border-primary/20 text-primary">
                                {order.payment_method === 'cod' ? '💵 Livraison' : order.payment_method ?? 'N/A'}
                              </Badge>
                            </td>
                            <td className="px-4 py-3">
                              <OrderStatusBadge status={order.status} />
                            </td>
                            <td className="px-4 py-3 text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(order.created_at), { addSuffix: true, locale })}
                            </td>
                            <td className="px-4 py-3">
                              <Button
                                variant="ghost" size="sm"
                                className="h-7 text-xs text-primary hover:bg-primary/5"
                                onClick={(e) => { e.stopPropagation(); setSelectedOrder(order); }}
                              >
                                Voir →
                              </Button>
                            </td>
                          </tr>
                        </OrderContextMenu>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between py-2">
                <p className="text-xs text-muted-foreground">
                  Page {page + 1} / {totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline" size="sm"
                    disabled={page === 0}
                    onClick={() => setPage(p => p - 1)}
                    className="h-8 w-8 p-0"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline" size="sm"
                    disabled={page >= totalPages - 1}
                    onClick={() => setPage(p => p + 1)}
                    className="h-8 w-8 p-0"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Order detail panel */}
      <OrderDetailPanel
        order={selectedOrder}
        shopId={shopId ?? ''}
        currencyCode={currencyCode}
        isOpen={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        isRepeatCustomer={selectedOrder ? isRepeat(selectedOrder) : false}
      />
    </DashboardLayout>
  );
}
