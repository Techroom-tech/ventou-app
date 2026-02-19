import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { OrderStatus } from '@/types/shop';

const statusStyles: Record<OrderStatus, string> = {
  pending:   'bg-[hsl(38,92%,50%)]/10 text-[hsl(38,92%,40%)] border-[hsl(38,92%,50%)]/30',
  confirmed: 'bg-[hsl(212,52%,24%)]/10 text-[hsl(212,52%,30%)] border-[hsl(212,52%,24%)]/30',
  preparing: 'bg-[hsl(17,100%,60%)]/10 text-[hsl(17,100%,45%)] border-[hsl(17,100%,60%)]/30',
  shipping:  'bg-[hsl(260,60%,55%)]/10 text-[hsl(260,60%,45%)] border-[hsl(260,60%,55%)]/30',
  delivered: 'bg-[hsl(142,76%,36%)]/10 text-[hsl(142,76%,30%)] border-[hsl(142,76%,36%)]/30',
  cancelled: 'bg-destructive/10 text-destructive border-destructive/30',
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const { t } = useTranslation();

  return (
    <Badge variant="outline" className={cn('text-[10px] font-semibold uppercase tracking-wide', statusStyles[status])}>
      {t(`orders.status.${status}`, status)}
    </Badge>
  );
}
