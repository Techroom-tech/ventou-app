import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Search, Download, Plus, ChevronLeft, ChevronRight,
  Phone, MessageCircle, Check, X, Trash2, Zap,
} from 'lucide-react';

import { OrderStatusBadge } from '@/components/dashboard/OrderStatusBadge';
import { CreateOrderModal } from '@/components/dashboard/CreateOrderModal';
import { ConfirmDialog, ConfirmVariant } from '@/components/dashboard/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useOrders, useOrderCounts, useOrdersToday,
  useUpdateOrderStatus, useBatchUpdateOrderStatus, useDeleteOrders,
} from '@/hooks/useOrders';
import { useShop } from '@/hooks/useShop';
import { formatCurrency, supabase } from '@/integrations/supabase/client';
import { Order, OrderStatus, ORDER_TRANSITIONS } from '@/types/shop';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

const STATUS_TABS: Array<OrderStatus | 'all'> = [
  'all', 'pending', 'confirmed', 'delivered', 'cancelled',
];

const PAGE_SIZE = 20;

// --- Confirm action state type ---
interface ConfirmAction {
  type: 'status' | 'delete' | 'batch-status' | 'batch-delete';
  order?: Order;
  newStatus?: OrderStatus;
  orderIds?: string[];
  title: string;
  description: string;
  confirmLabel: string;
  variant: ConfirmVariant;
}

function getVariantForStatus(status: OrderStatus): ConfirmVariant {
  if (status === 'confirmed') return 'confirm';
  if (status === 'delivered') return 'deliver';
  if (status === 'cancelled') return 'cancel';
  return 'warning';
}

// --- CSV Export ---
function exportOrdersCSV(orders: Order[], currencyCode: string) {
  const headers = ['ID', 'Client', 'Téléphone', 'Ville', 'Quartier', 'Total', 'Statut', 'Date'];
  const rows = orders.map(o => [
    o.id.slice(0, 8).toUpperCase(),
    o.customer_name,
    o.phone ?? o.customer_phone ?? '',
    o.city ?? '',
    o.quartier ?? '',
    formatCurrency(o.total_amount ?? o.total ?? 0, currencyCode as 'XOF'),
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

// --- Inline quick action button ---
function QuickActionBtn({
  icon, label, onClick, variant = 'default', disabled,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: (e: React.MouseEvent) => void;
  variant?: 'default' | 'success' | 'danger' | 'whatsapp' | 'phone';
  disabled?: boolean;
}) {
  const colorMap = {
    default: 'text-muted-foreground hover:bg-muted',
    success: 'text-[hsl(142,76%,36%)] hover:bg-[hsl(142,76%,36%)]/10',
    danger: 'text-destructive hover:bg-destructive/10',
    whatsapp: 'text-[hsl(142,76%,36%)] hover:bg-[hsl(142,76%,36%)]/10',
    phone: 'text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      className={cn(
        'inline-flex items-center justify-center h-8 w-8 rounded-lg transition-colors disabled:opacity-50 icon-interactive',
        colorMap[variant]
      )}
    >
      {icon}
    </button>
  );
}

// --- Skeleton loaders ---
function OrderSkeletons() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-24 w-full rounded-xl" />
      ))}
    </div>
  );
}

// --- Main Orders Page ---
export default function Orders() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'fr' ? fr : undefined;
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { shop } = useShop();
  const shopId = shop?.id;
  const currencyCode = shop?.currency ?? 'XOF';

  const [activeStatus, setActiveStatus] = useState<OrderStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [quickMode, setQuickMode] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(timer);
  }, [search]);

  const effectiveStatus = quickMode ? 'pending' : activeStatus;

  const { data, isLoading, refetch } = useOrders({
    shopId,
    status: effectiveStatus,
    search: quickMode ? '' : debouncedSearch,
    page,
  });

  const { data: counts } = useOrderCounts(shopId);
  const { data: todayCount = 0 } = useOrdersToday(shopId);
  const updateStatus = useUpdateOrderStatus();
  const batchUpdate = useBatchUpdateOrderStatus();
  const deleteOrders = useDeleteOrders();

  const orders = data?.orders ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  // Clear selection on filter/page change
  useEffect(() => {
    setSelectedIds(new Set());
  }, [activeStatus, page, debouncedSearch, quickMode]);

  // Realtime is handled globally in DashboardShell via useOrdersRealtime

  const handleTabChange = (status: OrderStatus | 'all') => {
    setActiveStatus(status);
    setPage(0);
    if (quickMode) setQuickMode(false);
  };

  // Toggle select
  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === orders.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(orders.map(o => o.id)));
    }
  }, [orders, selectedIds.size]);

  // Quick status change — open confirm dialog
  const handleQuickStatus = useCallback((order: Order, newStatus: OrderStatus) => {
    if (!shopId) return;
    const statusLabel = t(`orders.status.${newStatus}`, newStatus);
    setConfirmAction({
      type: 'status',
      order,
      newStatus,
      title: `Passer en « ${statusLabel} » ?`,
      description: `La commande de ${order.customer_name} sera marquée comme « ${statusLabel} ».`,
      confirmLabel: statusLabel,
      variant: getVariantForStatus(newStatus),
    });
  }, [shopId, t]);

  // Delete cancelled orders — open confirm dialog
  const handleDeleteOrder = useCallback((order: Order) => {
    if (!shopId) return;
    setConfirmAction({
      type: 'delete',
      order,
      title: 'Supprimer cette commande ?',
      description: `La commande de ${order.customer_name} sera définitivement supprimée. Cette action est irréversible.`,
      confirmLabel: 'Supprimer',
      variant: 'delete',
    });
  }, [shopId]);

  // Batch actions — open confirm dialog
  const handleBatchAction = useCallback((newStatus: OrderStatus) => {
    if (!shopId || selectedIds.size === 0) return;
    const statusLabel = t(`orders.status.${newStatus}`, newStatus);
    setConfirmAction({
      type: 'batch-status',
      newStatus,
      orderIds: Array.from(selectedIds),
      title: `Modifier ${selectedIds.size} commande(s) ?`,
      description: `${selectedIds.size} commande(s) seront passées en « ${statusLabel} ».`,
      confirmLabel: `${statusLabel} (${selectedIds.size})`,
      variant: getVariantForStatus(newStatus),
    });
  }, [shopId, selectedIds, t]);

  // Batch delete cancelled — open confirm dialog
  const handleBatchDelete = useCallback(() => {
    if (!shopId || selectedIds.size === 0) return;
    setConfirmAction({
      type: 'batch-delete',
      orderIds: Array.from(selectedIds),
      title: `Supprimer ${selectedIds.size} commande(s) ?`,
      description: `${selectedIds.size} commande(s) annulée(s) seront définitivement supprimées. Cette action est irréversible.`,
      confirmLabel: `Supprimer (${selectedIds.size})`,
      variant: 'delete',
    });
  }, [shopId, selectedIds]);

  // Execute confirmed action
  const executeConfirmedAction = useCallback(async () => {
    if (!confirmAction || !shopId) return;

    try {
      switch (confirmAction.type) {
        case 'status': {
          const { order, newStatus } = confirmAction;
          if (!order || !newStatus) return;
          await updateStatus.mutateAsync({
            orderId: order.id, shopId,
            currentStatus: order.status, newStatus,
          });
          toast.success(`Statut → ${t(`orders.status.${newStatus}`, newStatus)}`);
          break;
        }
        case 'delete': {
          const { order } = confirmAction;
          if (!order) return;
          await deleteOrders.mutateAsync({ orderIds: [order.id], shopId });
          toast.success(t('orders.deleted', 'Commande supprimée'));
          break;
        }
        case 'batch-status': {
          const { orderIds, newStatus } = confirmAction;
          if (!orderIds || !newStatus) return;
          const result = await batchUpdate.mutateAsync({ orderIds, shopId, newStatus });
          toast.success(`${result.succeeded}/${result.total} commande(s) mises à jour`);
          setSelectedIds(new Set());
          break;
        }
        case 'batch-delete': {
          const { orderIds } = confirmAction;
          if (!orderIds) return;
          const result = await deleteOrders.mutateAsync({ orderIds, shopId });
          toast.success(`${result.succeeded}/${result.total} commande(s) supprimée(s)`);
          setSelectedIds(new Set());
          break;
        }
      }
    } catch (e: unknown) {
      toast.error((e as Error).message ?? 'Erreur');
    }

    setConfirmAction(null);
  }, [confirmAction, shopId, updateStatus, deleteOrders, batchUpdate, t]);

  // Available next statuses for inline actions
  const getNextStatuses = (status: OrderStatus): OrderStatus[] => ORDER_TRANSITIONS[status] ?? [];

  const isActionPending = updateStatus.isPending || batchUpdate.isPending || deleteOrders.isPending;

  return (
    <>
      <div className="max-w-[1200px] mx-auto space-y-4">
        {/* Page header */}
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-xl font-bold text-foreground">{t('orders.title', 'Commandes')}</h2>
            <p className="text-sm text-muted-foreground">
              {todayCount > 0
                ? t('orders.todayCount', '{{count}} commande(s) aujourd\'hui', { count: todayCount })
                : t('orders.noOrdersHint', 'Les commandes de votre boutique apparaîtront ici.')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={quickMode ? 'default' : 'outline'}
              className={cn('h-8 gap-1.5 text-xs', quickMode && 'bg-[hsl(38,92%,50%)] hover:bg-[hsl(38,92%,45%)] text-white')}
              onClick={() => setQuickMode(!quickMode)}
            >
              <Zap className="h-3.5 w-3.5 icon-interactive" />
              <span className="hidden sm:inline">{t('orders.quickMode', 'Mode rapide')}</span>
            </Button>
            <Button
              size="sm"
              className="h-8 gap-1.5 text-xs"
              onClick={() => setCreateOpen(true)}
            >
              <Plus className="h-3.5 w-3.5 icon-interactive" />
              <span className="hidden sm:inline">{t('orders.newOrder', 'Nouvelle commande')}</span>
              <span className="sm:hidden">+</span>
            </Button>
            {orders.length > 0 && (
              <Button
                variant="outline" size="sm"
                className="h-8 gap-1.5 text-xs"
                onClick={() => exportOrdersCSV(orders, currencyCode)}
              >
                <Download className="h-3.5 w-3.5 icon-interactive" />
                <span className="hidden sm:inline">CSV</span>
              </Button>
            )}
          </div>
        </div>

        {/* Quick mode view */}
        {quickMode ? (
          <>
            <div className="bg-[hsl(38,92%,50%)]/10 border border-[hsl(38,92%,50%)]/30 rounded-xl p-3 text-sm text-[hsl(38,92%,35%)] font-medium flex items-center gap-2">
              <Zap className="h-4 w-4" />
              {t('orders.quickModeHint', 'Mode traitement rapide — Commandes en attente uniquement')}
            </div>

            {isLoading ? <OrderSkeletons /> : orders.length === 0 ? (
              <div className="text-center py-16 space-y-3">
                <div className="text-4xl">✅</div>
                <p className="font-semibold text-foreground">{t('orders.allProcessed', 'Toutes les commandes sont traitées !')}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {orders.map(order => {
                  const phone = order.phone ?? order.customer_phone ?? '';
                  const amount = order.total_amount ?? order.total ?? 0;
                  return (
                    <div key={order.id} className="bg-card border border-border rounded-xl p-3 flex items-center gap-3">
                      <div className="flex-1 min-w-0" onClick={() => navigate(`/dashboard/commandes/${order.id}`)} role="button">
                        <p className="font-semibold text-sm text-foreground truncate">{order.customer_name}</p>
                        <p className="text-xs text-muted-foreground">{order.city ?? ''}</p>
                      </div>
                      <p className="font-bold text-base text-foreground shrink-0">{formatCurrency(amount, currencyCode as 'XOF')}</p>
                      <div className="flex items-center gap-1 shrink-0">
                        {phone && (
                          <a href={`tel:${phone}`}>
                            <QuickActionBtn icon={<Phone className="h-3.5 w-3.5" />} label="Appeler" variant="phone" onClick={() => {}} />
                          </a>
                        )}
                        <Button
                          size="sm"
                          className="h-9 px-4 gap-1.5 text-xs font-semibold bg-[hsl(142,76%,36%)] hover:bg-[hsl(142,76%,30%)] text-white"
                          onClick={() => handleQuickStatus(order, 'confirmed')}
                          disabled={updateStatus.isPending}
                        >
                          <Check className="h-4 w-4" />
                          {t('orders.status.confirmed', 'Confirmer')}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          <>
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(0); }}
                placeholder={t('orders.search', 'Rechercher par nom, téléphone ou ID...')}
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
                  <span>{t(`orders.status.${status}`, status)}</span>
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
                <p className="font-semibold text-foreground">{t('orders.noOrders', 'Aucune commande trouvée')}</p>
                <p className="text-sm text-muted-foreground">
                  {search ? 'Essayez un autre terme de recherche.' : t('orders.noOrdersHint')}
                </p>
              </div>
            ) : (
              <>
                {/* ─── MOBILE: Compact cards ─── */}
                <div className="grid gap-2 sm:hidden">
                  {orders.map(order => {
                    const phone = order.phone ?? order.customer_phone ?? '';
                    const amount = order.total_amount ?? order.total ?? 0;
                    const nextStatuses = getNextStatuses(order.status);
                    const canConfirm = nextStatuses.includes('confirmed');
                    const canDeliver = nextStatuses.includes('delivered');
                    const isCancelled = order.status === 'cancelled';
                    const primaryNext = canConfirm ? 'confirmed' : canDeliver ? 'delivered' : null;

                    return (
                      <div
                        key={order.id}
                        className="bg-card border border-border rounded-xl p-3 space-y-2"
                      >
                        <div
                          className="flex items-start justify-between gap-2 cursor-pointer"
                          onClick={() => navigate(`/dashboard/commandes/${order.id}`)}
                        >
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-sm text-foreground truncate">{order.customer_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {[order.city, order.quartier].filter(Boolean).join(' · ')}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="font-bold text-base text-foreground">{formatCurrency(amount, currencyCode as 'XOF')}</p>
                            <OrderStatusBadge status={order.status} />
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 pt-1 border-t border-border">
                          {phone && (
                            <a href={`tel:${phone}`} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-blue-600 bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 transition-colors">
                              <Phone className="h-3.5 w-3.5" />
                              Appeler
                            </a>
                          )}
                          {phone && (
                            <a
                              href={`https://wa.me/${phone.replace(/\s/g, '')}`}
                              target="_blank" rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-[hsl(142,76%,36%)] bg-[hsl(142,76%,36%)]/5 hover:bg-[hsl(142,76%,36%)]/10 transition-colors"
                            >
                              <MessageCircle className="h-3.5 w-3.5" />
                              WhatsApp
                            </a>
                          )}
                          {primaryNext && (
                            <button
                              onClick={() => handleQuickStatus(order, primaryNext)}
                              disabled={updateStatus.isPending}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors ml-auto"
                            >
                              <Check className="h-3.5 w-3.5" />
                              {t(`orders.status.${primaryNext}`, primaryNext)}
                            </button>
                          )}
                          {isCancelled && (
                            <button
                              onClick={() => handleDeleteOrder(order)}
                              disabled={deleteOrders.isPending}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-destructive bg-destructive/5 hover:bg-destructive/10 transition-colors ml-auto"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Supprimer
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* ─── DESKTOP: Table ─── */}
                <div className="hidden sm:block bg-card border border-border rounded-xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-secondary/40">
                          <th className="px-3 py-3 w-10">
                            <Checkbox
                              checked={selectedIds.size === orders.length && orders.length > 0}
                              onCheckedChange={toggleSelectAll}
                            />
                          </th>
                          <th className="text-left px-3 py-3 text-xs font-semibold text-muted-foreground">ID</th>
                          <th className="text-left px-3 py-3 text-xs font-semibold text-muted-foreground">{t('orders.detail.customer', 'Client')}</th>
                          <th className="text-left px-3 py-3 text-xs font-semibold text-muted-foreground">{t('orders.detail.total', 'Montant')}</th>
                          <th className="text-left px-3 py-3 text-xs font-semibold text-muted-foreground">Ville</th>
                          <th className="text-left px-3 py-3 text-xs font-semibold text-muted-foreground">Statut</th>
                          <th className="text-left px-3 py-3 text-xs font-semibold text-muted-foreground">Date</th>
                          <th className="px-3 py-3 text-xs font-semibold text-muted-foreground text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orders.map((order) => {
                          const phone = order.phone ?? order.customer_phone ?? '';
                          const amount = order.total_amount ?? order.total ?? 0;
                          const orderId = order.id.slice(0, 8).toUpperCase();
                          const nextStatuses = getNextStatuses(order.status);
                          const canConfirm = nextStatuses.includes('confirmed');
                          const canDeliver = nextStatuses.includes('delivered');
                          const canCancel = nextStatuses.includes('cancelled');
                          const isCancelled = order.status === 'cancelled';

                          return (
                            <tr
                              key={order.id}
                              className={cn(
                                'border-b border-border last:border-0 transition-colors',
                                'hover:bg-secondary/30',
                                selectedIds.has(order.id) && 'bg-primary/5'
                              )}
                            >
                              <td className="px-3 py-3">
                                <Checkbox
                                  checked={selectedIds.has(order.id)}
                                  onCheckedChange={() => toggleSelect(order.id)}
                                  onClick={e => e.stopPropagation()}
                                />
                              </td>
                              <td
                                className="px-3 py-3 cursor-pointer"
                                onClick={() => navigate(`/dashboard/commandes/${order.id}`)}
                              >
                                <span className="font-mono text-xs text-muted-foreground">#{orderId}</span>
                              </td>
                              <td
                                className="px-3 py-3 cursor-pointer"
                                onClick={() => navigate(`/dashboard/commandes/${order.id}`)}
                              >
                                <p className="font-medium text-foreground text-sm">{order.customer_name}</p>
                                {phone && <p className="text-xs text-muted-foreground">{phone}</p>}
                              </td>
                              <td className="px-3 py-3 font-bold text-foreground">
                                {formatCurrency(amount, currencyCode as 'XOF')}
                              </td>
                              <td className="px-3 py-3 text-sm text-muted-foreground">
                                {[order.city, order.quartier].filter(Boolean).join(', ') || '—'}
                              </td>
                              <td className="px-3 py-3">
                                <OrderStatusBadge status={order.status} />
                              </td>
                              <td className="px-3 py-3 text-xs text-muted-foreground">
                                {formatDistanceToNow(new Date(order.created_at), { addSuffix: true, locale })}
                              </td>
                              <td className="px-3 py-3">
                                <div className="flex items-center justify-end gap-0.5">
                                  {phone && (
                                    <QuickActionBtn
                                      icon={<Phone className="h-3.5 w-3.5" />}
                                      label="Appeler"
                                      variant="phone"
                                      onClick={(e) => { e.stopPropagation(); window.open(`tel:${phone}`); }}
                                    />
                                  )}
                                  {phone && (
                                    <QuickActionBtn
                                      icon={<MessageCircle className="h-3.5 w-3.5" />}
                                      label="WhatsApp"
                                      variant="whatsapp"
                                      onClick={(e) => { e.stopPropagation(); window.open(`https://wa.me/${phone.replace(/\s/g, '')}`, '_blank'); }}
                                    />
                                  )}
                                  {canConfirm && (
                                    <QuickActionBtn
                                      icon={<Check className="h-3.5 w-3.5" />}
                                      label="Confirmer"
                                      variant="success"
                                      disabled={updateStatus.isPending}
                                      onClick={(e) => { e.stopPropagation(); handleQuickStatus(order, 'confirmed'); }}
                                    />
                                  )}
                                  {canDeliver && (
                                    <QuickActionBtn
                                      icon={<Check className="h-3.5 w-3.5" />}
                                      label="Livrée"
                                      variant="success"
                                      disabled={updateStatus.isPending}
                                      onClick={(e) => { e.stopPropagation(); handleQuickStatus(order, 'delivered'); }}
                                    />
                                  )}
                                  {canCancel && (
                                    <QuickActionBtn
                                      icon={<X className="h-3.5 w-3.5" />}
                                      label="Annuler"
                                      variant="danger"
                                      disabled={updateStatus.isPending}
                                      onClick={(e) => { e.stopPropagation(); handleQuickStatus(order, 'cancelled'); }}
                                    />
                                  )}
                                  {isCancelled && (
                                    <QuickActionBtn
                                      icon={<Trash2 className="h-3.5 w-3.5" />}
                                      label="Supprimer"
                                      variant="danger"
                                      disabled={deleteOrders.isPending}
                                      onClick={(e) => { e.stopPropagation(); handleDeleteOrder(order); }}
                                    />
                                  )}
                                </div>
                              </td>
                            </tr>
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
          </>
        )}

        {/* ─── BULK ACTIONS BAR ─── */}
        {selectedIds.size > 0 && !quickMode && (
          <div className="fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border shadow-lg px-4 py-3 lg:ml-60">
            <div className="max-w-[1200px] mx-auto flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-foreground">
                {selectedIds.size} commande{selectedIds.size > 1 ? 's' : ''} sélectionnée{selectedIds.size > 1 ? 's' : ''}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  size="sm" variant="outline"
                  className="h-8 text-xs gap-1.5 border-[hsl(142,76%,36%)]/30 text-[hsl(142,76%,36%)]"
                  onClick={() => handleBatchAction('confirmed')}
                  disabled={batchUpdate.isPending}
                >
                  <Check className="h-3.5 w-3.5" />
                  Confirmer
                </Button>
                <Button
                  size="sm" variant="outline"
                  className="h-8 text-xs gap-1.5 border-[hsl(142,76%,36%)]/30 text-[hsl(142,76%,36%)]"
                  onClick={() => handleBatchAction('delivered')}
                  disabled={batchUpdate.isPending}
                >
                  <Check className="h-3.5 w-3.5" />
                  Livrées
                </Button>
                <Button
                  size="sm" variant="outline"
                  className="h-8 text-xs gap-1.5 border-destructive/30 text-destructive"
                  onClick={() => handleBatchAction('cancelled')}
                  disabled={batchUpdate.isPending}
                >
                  <X className="h-3.5 w-3.5" />
                  Annuler
                </Button>
                {activeStatus === 'cancelled' && (
                  <Button
                    size="sm" variant="outline"
                    className="h-8 text-xs gap-1.5 border-destructive/30 text-destructive"
                    onClick={handleBatchDelete}
                    disabled={deleteOrders.isPending}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Supprimer
                  </Button>
                )}
                <Button
                  size="sm" variant="ghost"
                  className="h-8 text-xs"
                  onClick={() => setSelectedIds(new Set())}
                >
                  Désélectionner
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      <CreateOrderModal open={createOpen} onClose={() => setCreateOpen(false)} />

      {/* ─── CONFIRM DIALOG ─── */}
      <ConfirmDialog
        open={!!confirmAction}
        onOpenChange={(open) => { if (!open) setConfirmAction(null); }}
        onConfirm={executeConfirmedAction}
        title={confirmAction?.title ?? ''}
        description={confirmAction?.description ?? ''}
        confirmLabel={confirmAction?.confirmLabel ?? 'Confirmer'}
        variant={confirmAction?.variant ?? 'confirm'}
        loading={isActionPending}
      />
    </>
  );
}
