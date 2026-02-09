import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { OrderStatusBadge } from './OrderStatusBadge';
import { mockOrders, mockProducts, mockShop } from '@/data/mockData';
import { formatCurrency } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useTranslation as useI18n } from 'react-i18next';

export function RecentOrdersList() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'fr' ? fr : undefined;

  return (
    <Card className="rounded-xl shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-semibold">{t('dashboard.orders.recent')}</CardTitle>
        <Button variant="ghost" size="sm" className="text-accent text-xs">
          {t('dashboard.orders.viewAll')}
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-border">
          {mockOrders.map((order) => {
            const product = mockProducts.find(p => order.items?.[0]?.product_id === p.id);
            const timeAgo = formatDistanceToNow(new Date(order.created_at), { addSuffix: true, locale });

            return (
              <div key={order.id} className="flex items-center gap-3 px-4 sm:px-6 py-3">
                {/* Product image */}
                <div className="w-10 h-10 rounded-lg bg-muted flex-shrink-0 overflow-hidden">
                  {product?.image_url ? (
                    <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                      📦
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{order.customer_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {order.order_number} · {timeAgo}
                  </p>
                </div>

                {/* Amount + status */}
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <span className="text-sm font-semibold text-foreground">
                    {formatCurrency(order.total_amount, mockShop.currency)}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <OrderStatusBadge status={order.status} />
                    {order.payment_method && (
                      <span className="text-[10px] text-muted-foreground">{order.payment_method}</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
