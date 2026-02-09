import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { OrderStatus } from '@/types/shop';

const statusStyles: Record<OrderStatus, string> = {
  PAID: 'bg-ventou-success/10 text-ventou-success border-ventou-success/20',
  PENDING: 'bg-ventou-warning/10 text-ventou-warning border-ventou-warning/20',
  CANCELLED: 'bg-destructive/10 text-destructive border-destructive/20',
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const { t } = useTranslation();

  return (
    <Badge variant="outline" className={cn('text-[10px] font-semibold uppercase', statusStyles[status])}>
      {t(`dashboard.status.${status.toLowerCase()}`)}
    </Badge>
  );
}
