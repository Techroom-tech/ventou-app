import { useTranslation } from 'react-i18next';
import { Bell, ShoppingCart, Package, Info } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { useShop } from '@/hooks/useShop';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

interface OrderNotification {
  id: string;
  customer_name: string;
  total: number;
  status: string;
  created_at: string;
}

const statusConfig: Record<string, { icon: typeof Bell; label: string }> = {
  pending: { icon: ShoppingCart, label: 'Nouvelle commande' },
  confirmed: { icon: Package, label: 'Commande confirmée' },
  delivered: { icon: Package, label: 'Commande livrée' },
  cancelled: { icon: Info, label: 'Commande annulée' },
};

export function NotificationsPopover() {
  const { t, i18n } = useTranslation();
  const { shop } = useShop();
  const navigate = useNavigate();
  const locale = i18n.language === 'fr' ? fr : undefined;

  const { data: orders = [] } = useQuery({
    queryKey: ['notifications-orders', shop?.id],
    queryFn: async () => {
      if (!shop?.id) return [];
      const { data, error } = await supabase
        .from('orders')
        .select('id, customer_name, total, status, created_at')
        .eq('shop_id', shop.id)
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return (data || []) as OrderNotification[];
    },
    enabled: !!shop?.id,
    refetchInterval: 30000, // Poll every 30s for real-time feel
  });

  // Consider orders from last 24h as "unread"
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const unreadCount = orders.filter(o => o.created_at > oneDayAgo).length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-3 border-b border-border">
          <h3 className="font-semibold text-sm">{t('dashboard.notifications.title')}</h3>
        </div>
        <div className="max-h-72 overflow-y-auto">
          {orders.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground text-center">
              {t('dashboard.notifications.empty')}
            </p>
          ) : (
            orders.map((order) => {
              const config = statusConfig[order.status] || statusConfig.pending;
              const Icon = config.icon;
              const isRecent = order.created_at > oneDayAgo;
              return (
                <button
                  key={order.id}
                  onClick={() => navigate(`/dashboard/commandes/${order.id}`)}
                  className={cn(
                    'flex gap-3 px-3 py-3 border-b border-border last:border-0 hover:bg-muted/50 transition-colors w-full text-left',
                    isRecent && 'bg-accent/5'
                  )}
                >
                  <div className="p-2 rounded-lg bg-muted flex-shrink-0">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn('text-sm', isRecent && 'font-semibold')}>
                      {config.label} #{order.id.slice(0, 8).toUpperCase()}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {order.customer_name} — {order.total.toLocaleString()} {shop?.currency || 'XOF'}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(order.created_at), { addSuffix: true, locale })}
                    </p>
                  </div>
                  {isRecent && (
                    <div className="w-2 h-2 rounded-full bg-accent flex-shrink-0 mt-2" />
                  )}
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
