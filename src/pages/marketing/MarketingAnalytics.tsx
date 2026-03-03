import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BarChart3, AlertCircle } from 'lucide-react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useShop } from '@/hooks/useShop';
import { useProductAnalytics } from '@/hooks/useProductAnalytics';
import { useHourlyAnalytics } from '@/hooks/useHourlyAnalytics';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

export default function MarketingAnalytics() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { shop } = useShop();
  const [days, setDays] = useState(30);
  const { data: products, isLoading: loadingProducts } = useProductAnalytics(shop?.id, days);
  const { data: hourly, isLoading: loadingHourly } = useHourlyAnalytics(shop?.id, days);

  return (
    <DashboardLayout>
      <div className="max-w-[1200px] mx-auto px-4 md:px-8 pb-12 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard/marketing')} className="shrink-0 self-start">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-[28px] font-semibold text-foreground tracking-tight">
              {t('marketing.analytics.title')}
            </h1>
            <p className="text-sm text-muted-foreground">{t('marketing.analytics.subtitle')}</p>
          </div>
          <Select value={String(days)} onValueChange={(v) => setDays(Number(v))}>
            <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7j</SelectItem>
              <SelectItem value="30">30j</SelectItem>
              <SelectItem value="90">90j</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Traffic placeholder */}
        <Card className="border-dashed">
          <CardContent className="flex items-center gap-3 py-6">
            <AlertCircle className="h-5 w-5 text-muted-foreground shrink-0" />
            <p className="text-sm text-muted-foreground">{t('marketing.analytics.pixelPlaceholder')}</p>
          </CardContent>
        </Card>

        {/* Product performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-4 w-4" />
              {t('marketing.analytics.productPerformance')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingProducts ? (
              <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
            ) : !products?.length ? (
              <p className="text-sm text-muted-foreground">{t('marketing.analytics.noData')}</p>
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('marketing.analytics.product')}</TableHead>
                        <TableHead className="text-center">{t('marketing.analytics.orders')}</TableHead>
                        <TableHead className="text-center">{t('marketing.analytics.delivered')}</TableHead>
                        <TableHead className="text-center">{t('marketing.analytics.cancelled')}</TableHead>
                        <TableHead className="text-right">{t('marketing.analytics.revenue')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {products.slice(0, 20).map((p) => (
                        <TableRow key={p.productName}>
                          <TableCell className="font-medium">{p.productName}</TableCell>
                          <TableCell className="text-center">{p.totalOrders}</TableCell>
                          <TableCell className="text-center text-green-600">{p.delivered}</TableCell>
                          <TableCell className="text-center text-red-500">{p.cancelled}</TableCell>
                          <TableCell className="text-right">{p.revenue.toLocaleString()} FCFA</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {/* Mobile cards */}
                <div className="md:hidden space-y-3">
                  {products.slice(0, 20).map((p) => (
                    <div key={p.productName} className="p-3 rounded-xl border border-border space-y-1">
                      <span className="font-semibold text-sm text-foreground">{p.productName}</span>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{t('marketing.analytics.orders')}: {p.totalOrders}</span>
                        <span className="text-green-600">{p.delivered} ✓</span>
                        <span className="text-red-500">{p.cancelled} ✗</span>
                      </div>
                      <p className="text-sm font-medium text-foreground">{p.revenue.toLocaleString()} FCFA</p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Hourly heatmap */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('marketing.analytics.hourlyTitle')}</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingHourly ? (
              <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
            ) : !hourly || hourly.maxVal === 0 ? (
              <p className="text-sm text-muted-foreground">{t('marketing.analytics.noData')}</p>
            ) : (
              <div className="overflow-x-auto">
                <div className="min-w-[600px]">
                  <div className="flex gap-0.5 mb-1 pl-12">
                    {Array.from({ length: 24 }, (_, i) => (
                      <div key={i} className="flex-1 text-[10px] text-muted-foreground text-center">{i}h</div>
                    ))}
                  </div>
                  {hourly.dayLabels.map((label, dayIdx) => (
                    <div key={dayIdx} className="flex gap-0.5 items-center">
                      <span className="w-10 text-xs text-muted-foreground text-right pr-2 shrink-0">{label}</span>
                      {hourly.grid[dayIdx].map((val, hourIdx) => {
                        const intensity = hourly.maxVal > 0 ? val / hourly.maxVal : 0;
                        return (
                          <div
                            key={hourIdx}
                            className={cn('flex-1 aspect-square rounded-sm', intensity === 0 ? 'bg-muted' : '')}
                            style={intensity > 0 ? { backgroundColor: `hsl(var(--primary) / ${0.15 + intensity * 0.85})` } : undefined}
                            title={`${label} ${hourIdx}h: ${val}`}
                          />
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
