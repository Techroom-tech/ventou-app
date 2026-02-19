import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { DollarSign, ShoppingCart, TrendingUp } from 'lucide-react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { RecentOrdersList } from '@/components/dashboard/RecentOrdersList';
import { mockStats, mockShop } from '@/data/mockData';
import { formatCurrency } from '@/integrations/supabase/client';
import { useShop } from '@/hooks/useShop';
import { useRevenueChart } from '@/hooks/useRevenueChart';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

function RevenueSparkline() {
  const { shop } = useShop();
  const { data: chartData, isLoading } = useRevenueChart(shop?.id, 7);
  const currencyCode = shop?.currency ?? 'XOF';

  const totalRevenue = chartData?.reduce((s, d) => s + d.revenue, 0) ?? 0;
  const totalOrders = chartData?.reduce((s, d) => s + d.orders, 0) ?? 0;

  return (
    <Card className="p-4 col-span-1 md:col-span-2 lg:col-span-3">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="flex items-center gap-1.5 mb-0.5">
            <TrendingUp className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">Revenus — 7 derniers jours</span>
          </div>
          <p className="text-xs text-muted-foreground">
            {totalOrders} commande{totalOrders !== 1 ? 's' : ''} · {formatCurrency(totalRevenue, currencyCode)}
          </p>
        </div>
        <Link
          to="/dashboard/orders"
          className="text-xs text-primary hover:underline font-medium"
        >
          Voir tout →
        </Link>
      </div>

      {isLoading ? (
        <Skeleton className="h-28 w-full rounded-lg" />
      ) : (
        <div className="h-28">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
              <defs>
                <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(212,52%,24%)" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="hsl(212,52%,24%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214,32%,91%)" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: 'hsl(212,20%,46%)' }}
                axisLine={false} tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: 'hsl(212,20%,46%)' }}
                axisLine={false} tickLine={false}
                tickFormatter={v => v === 0 ? '0' : `${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                contentStyle={{
                  background: 'hsl(0,0%,100%)',
                  border: '1px solid hsl(214,32%,91%)',
                  borderRadius: 8,
                  fontSize: 11,
                }}
                formatter={(v: number) => [formatCurrency(v, currencyCode), 'Revenus']}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="hsl(212,52%,24%)"
                strokeWidth={2}
                fill="url(#revenueGrad)"
                dot={false}
                activeDot={{ r: 4, fill: 'hsl(17,100%,60%)' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}

export default function Dashboard() {
  const { t } = useTranslation();

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h2 className="text-xl font-bold text-foreground">{t('dashboard.overview')}</h2>
          <p className="text-sm text-muted-foreground">{t('dashboard.overviewSubtitle')}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatsCard
            title={t('dashboard.stats.totalSales')}
            value={formatCurrency(mockStats.totalSales, mockShop.currency)}
            change={mockStats.salesChange}
            icon={DollarSign}
          />
          <StatsCard
            title={t('dashboard.stats.ordersToday')}
            value={String(mockStats.ordersToday)}
            change={mockStats.ordersChange}
            icon={ShoppingCart}
            iconBg="bg-primary/10"
          />
          <div className="md:col-span-2 lg:col-span-1">
            <QuickActions />
          </div>
        </div>

        {/* Revenue sparkline — 7 day chart */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <RevenueSparkline />
        </div>

        <RecentOrdersList />
      </div>
    </DashboardLayout>
  );
}
