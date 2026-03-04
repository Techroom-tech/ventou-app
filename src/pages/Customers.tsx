import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useShop } from '@/hooks/useShop';
import { useCustomers, Customer } from '@/hooks/useCustomers';
import { useIsMobile } from '@/hooks/use-mobile';
import { formatCurrency } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Search, Phone, MessageCircle, ChevronRight, ChevronLeft, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

function getInitials(name: string) {
  return name
    .split(' ')
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function CustomerBadgeTag({ badge }: { badge: Customer['badge'] }) {
  const { t } = useTranslation();
  if (!badge) return null;
  const config = {
    loyal: { label: t('customers.loyal'), className: 'bg-[hsl(142,76%,36%)]/10 text-[hsl(142,76%,36%)] border-[hsl(142,76%,36%)]/30' },
    new: { label: t('customers.new'), className: 'bg-[hsl(38,92%,50%)]/10 text-[hsl(38,92%,40%)] border-[hsl(38,92%,50%)]/30' },
    at_risk: { label: t('customers.atRisk'), className: 'bg-destructive/10 text-destructive border-destructive/30' },
  }[badge];
  return (
    <Badge variant="outline" className={cn('text-[10px] font-semibold uppercase tracking-wide', config.className)}>
      {config.label}
    </Badge>
  );
}

function CustomerDetailDrawer({
  customer,
  open,
  onClose,
  currency,
}: {
  customer: Customer | null;
  open: boolean;
  onClose: () => void;
  currency: string;
}) {
  const { t } = useTranslation();
  const isMobile = useIsMobile();

  if (!customer) return null;

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side={isMobile ? 'bottom' : 'right'} className={cn(isMobile ? 'h-[90vh] rounded-t-2xl' : 'w-[420px] sm:max-w-[420px]', 'overflow-y-auto p-0')}>
        <div className="p-6 space-y-6">
          {/* Contact */}
          <div className="space-y-3">
            <SheetHeader className="p-0">
              <SheetTitle className="text-xl font-semibold">{customer.name}</SheetTitle>
            </SheetHeader>
            <p className="text-sm text-muted-foreground">{customer.phone}</p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="flex-1" asChild>
                <a href={`tel:${customer.phone}`}>
                  <Phone className="h-4 w-4 mr-1.5" /> {t('customers.call')}
                </a>
              </Button>
              <Button size="sm" variant="outline" className="flex-1" asChild>
                <a href={`https://wa.me/${customer.phone.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="h-4 w-4 mr-1.5" /> WhatsApp
                </a>
              </Button>
            </div>
            <div className="text-sm text-muted-foreground">
              {customer.city}{customer.quartier ? ` / ${customer.quartier}` : ''}
            </div>
            {customer.firstOrderDate && (
              <p className="text-xs text-muted-foreground">
                {t('customers.firstOrder')} : {format(new Date(customer.firstOrderDate), 'dd MMM yyyy', { locale: fr })}
              </p>
            )}
            <CustomerBadgeTag badge={customer.badge} />
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: t('customers.totalOrders'), value: customer.totalOrders },
              { label: t('customers.delivered'), value: customer.delivered },
              { label: t('customers.cancelled'), value: customer.cancelled },
            ].map((s) => (
              <Card key={s.label} className="text-center">
                <CardContent className="p-3">
                  <p className="text-xl font-semibold">{s.value}</p>
                  <p className="text-[11px] text-muted-foreground">{s.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Total amount */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">{t('customers.totalAmount', 'Montant total')}</h3>
            <p className="text-lg font-bold">{formatCurrency(customer.totalAmount, currency)}</p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default function Customers() {
  const { t } = useTranslation();
  const { shop } = useShop();
  const isMobile = useIsMobile();
  const { customers, totalCount, totalPages, page, setPage, search, setSearch, isLoading } = useCustomers(shop?.id);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const currency = shop?.currency ?? 'XOF';

  return (
    <DashboardLayout>
      <div className="max-w-[1200px] mx-auto space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold flex items-center gap-2">
              <Users className="h-5 w-5 text-muted-foreground" />
              {t('customers.title')}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t('customers.count', { count: totalCount })}
            </p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('customers.searchPlaceholder')}
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex justify-center py-12">
            <div className="animate-spin h-7 w-7 border-3 border-primary border-t-transparent rounded-full" />
          </div>
        )}

        {/* Empty */}
        {!isLoading && totalCount === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <Users className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-muted-foreground text-sm">{t('customers.empty')}</p>
            </CardContent>
          </Card>
        )}

        {/* Desktop table */}
        {!isLoading && totalCount > 0 && !isMobile && (
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground text-xs">
                    <th className="p-3 font-medium">{t('customers.name')}</th>
                    <th className="p-3 font-medium">{t('customers.phone')}</th>
                    <th className="p-3 font-medium">{t('customers.city')}</th>
                    <th className="p-3 font-medium text-center">{t('customers.totalOrders')}</th>
                    <th className="p-3 font-medium text-center">{t('customers.delivered')}</th>
                    <th className="p-3 font-medium text-center">{t('customers.cancelled')}</th>
                    <th className="p-3 font-medium">{t('customers.badge')}</th>
                    <th className="p-3 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((c) => (
                    <tr
                      key={c.phone}
                      onClick={() => setSelectedCustomer(c)}
                      className="border-b last:border-0 hover:bg-muted/40 cursor-pointer transition-colors"
                    >
                      <td className="p-3">
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold shrink-0">
                            {getInitials(c.name)}
                          </div>
                          <span className="font-medium">{c.name}</span>
                        </div>
                      </td>
                      <td className="p-3">
                        <a href={`tel:${c.phone}`} className="text-primary hover:underline" onClick={(e) => e.stopPropagation()}>
                          {c.phone}
                        </a>
                      </td>
                      <td className="p-3 text-muted-foreground">{c.city}</td>
                      <td className="p-3 text-center font-medium">{c.totalOrders}</td>
                      <td className="p-3 text-center font-medium text-[hsl(142,76%,36%)]">{c.delivered}</td>
                      <td className="p-3 text-center font-medium text-destructive">{c.cancelled}</td>
                      <td className="p-3"><CustomerBadgeTag badge={c.badge} /></td>
                      <td className="p-3"><ChevronRight className="h-4 w-4 text-muted-foreground" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Mobile cards */}
        {!isLoading && totalCount > 0 && isMobile && (
          <div className="space-y-2.5">
            {customers.map((c) => (
              <Card key={c.phone} className="cursor-pointer active:scale-[0.98] transition-transform" onClick={() => setSelectedCustomer(c)}>
                <CardContent className="p-3.5 space-y-2.5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold shrink-0">
                        {getInitials(c.name)}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{c.name}</p>
                        <p className="text-xs text-muted-foreground">{c.phone}</p>
                        <p className="text-xs text-muted-foreground">{c.city}</p>
                      </div>
                    </div>
                    <CustomerBadgeTag badge={c.badge} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {c.totalOrders} {t('customers.orders')} • {c.delivered} {t('customers.deliveredShort')} • {c.cancelled} {t('customers.cancelledShort')}
                  </p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1 h-9" asChild>
                      <a href={`tel:${c.phone}`} onClick={(e) => e.stopPropagation()}>
                        <Phone className="h-3.5 w-3.5 mr-1" /> {t('customers.call')}
                      </a>
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1 h-9" asChild>
                      <a href={`https://wa.me/${c.phone.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                        <MessageCircle className="h-3.5 w-3.5 mr-1" /> WhatsApp
                      </a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 pt-2">
            <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground">{page} / {totalPages}</span>
            <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      <CustomerDetailDrawer
        customer={selectedCustomer}
        open={!!selectedCustomer}
        onClose={() => setSelectedCustomer(null)}
        currency={currency}
      />
    </DashboardLayout>
  );
}
