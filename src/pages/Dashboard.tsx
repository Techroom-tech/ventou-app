import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import {
  DollarSign, ShoppingCart, Package, TrendingUp,
  Plus, Share2, BarChart2, Tag,
  AlertTriangle, AlertCircle, ArrowUpRight, ArrowDownRight,
  Monitor, Clock,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { OrderStatusBadge } from '@/components/dashboard/OrderStatusBadge';
import { useShop } from '@/hooks/useShop';
import { useOrders } from '@/hooks/useOrders';
import { useRevenueChart } from '@/hooks/useRevenueChart';
import { useDashboardKPIs } from '@/hooks/useDashboardKPIs';
import { useDashboardAlerts, DashboardAlert } from '@/hooks/useDashboardAlerts';
import { useTopProducts } from '@/hooks/useTopProducts';
import { formatCurrency } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { getStorefrontUrl } from '@/lib/domain';

// ─── KPI Card ───────────────────────────────────────────────────────────────
interface KpiCardProps {
  title: string;
  value: string | number;
  change: number | null;
  icon: React.ElementType;
  loading?: boolean;
}

function KpiCard({ title, value, change, icon: Icon, loading }: KpiCardProps) {
  const isPositive = change !== null && change >= 0;

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground font-medium truncate mb-1">{title}</p>
          {loading ? (
            <Skeleton className="h-7 w-24" />
          ) : (
            <p className="text-xl font-bold text-foreground truncate">{value}</p>
          )}
          {change !== null && !loading && (
            <div className={cn(
              'flex items-center gap-0.5 mt-1 text-xs font-medium',
              isPositive ? 'text-[hsl(142,76%,36%)]' : 'text-destructive'
            )}>
              {isPositive
                ? <ArrowUpRight className="h-3 w-3" />
                : <ArrowDownRight className="h-3 w-3" />}
              <span>{isPositive ? '+' : ''}{change}%</span>
            </div>
          )}
        </div>
        <div className="p-2 rounded-lg bg-muted shrink-0">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
    </Card>
  );
}

// ─── Alert Card ──────────────────────────────────────────────────────────────
function AlertCard({ alert }: { alert: DashboardAlert }) {
  const { t } = useTranslation();
  const isWarning = alert.severity === 'warning';

  return (
    <div className={cn(
      'flex items-center justify-between gap-3 rounded-xl border px-4 py-3',
      isWarning
        ? 'bg-[hsl(48,100%,96%)] border-[hsl(45,93%,47%)]/40 dark:bg-[hsl(48,100%,4%)] dark:border-[hsl(45,93%,47%)]/30'
        : 'bg-destructive/5 border-destructive/20'
    )}>
      <div className="flex items-center gap-2.5">
        {isWarning
          ? <AlertTriangle className="h-4 w-4 text-[hsl(32,95%,44%)] shrink-0" />
          : <AlertCircle className="h-4 w-4 text-destructive shrink-0" />}
        <p className={cn('text-sm font-medium', isWarning ? 'text-[hsl(30,60%,30%)] dark:text-[hsl(45,93%,70%)]' : 'text-destructive')}>
          {alert.type === 'pending_stale'
            ? t('dashboard.alerts.pendingOld', { count: alert.count })
            : t('dashboard.alerts.outOfStock', { count: alert.count })}
        </p>
      </div>
      <Link
        to={alert.actionUrl}
        className={cn(
          'text-xs font-medium whitespace-nowrap hover:underline shrink-0',
          isWarning ? 'text-[hsl(30,60%,30%)] dark:text-[hsl(45,93%,70%)]' : 'text-destructive'
        )}
      >
        {alert.type === 'pending_stale'
          ? t('dashboard.alerts.viewOrders')
          : t('dashboard.alerts.viewProducts')}
        {' →'}
      </Link>
    </div>
  );
}

// ─── Quick Action Button ──────────────────────────────────────────────────────
interface QuickActionBtnProps {
  icon: React.ElementType;
  label: string;
  sub: string;
  to?: string;
  onClick?: () => void;
}

function QuickActionBtn({ icon: Icon, label, sub, to, onClick }: QuickActionBtnProps) {
  const inner = (
    <Card className="p-4 h-full flex flex-col items-start gap-1.5 rounded-xl border hover:bg-muted/50 transition-colors cursor-pointer">
      <div className="p-1.5 rounded-md bg-muted">
        <Icon className="h-4 w-4 text-foreground" />
      </div>
      <p className="text-sm font-semibold text-foreground leading-tight">{label}</p>
      <p className="text-xs text-muted-foreground leading-tight">{sub}</p>
    </Card>
  );

  if (to) return <Link to={to} className="block h-full">{inner}</Link>;
  return <button onClick={onClick} className="text-left h-full w-full">{inner}</button>;
}

// ─── Revenue Chart ────────────────────────────────────────────────────────────
function RevenueChart({ shopId, currency }: { shopId: string; currency: string }) {
  const { t } = useTranslation();
  const [days, setDays] = useState(7);
  const { data: chartData, isLoading } = useRevenueChart(shopId, days);

  const totalRev = chartData?.reduce((s, d) => s + d.revenue, 0) ?? 0;
  const totalOrders = chartData?.reduce((s, d) => s + d.orders, 0) ?? 0;

  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-center justify-between mb-1">
        <div>
          <h3 className="text-sm font-semibold text-foreground">{t('dashboard.chart.title')}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {totalOrders} {totalOrders === 1 ? t('dashboard.chart.order') : t('dashboard.chart.orders')}
            {' · '}{formatCurrency(totalRev, currency as 'XOF')}
          </p>
        </div>
        <div className="flex gap-1">
          {[7, 30, 90].map(d => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={cn(
                'text-xs px-2.5 py-1 rounded-md font-medium transition-colors',
                days === d
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted'
              )}
            >
              {t(`dashboard.chart.days${d}`)}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <Skeleton className="h-[220px] w-full rounded-lg mt-4" />
      ) : (
        <div className="h-[220px] sm:h-[260px] mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={v => v === 0 ? '0' : `${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                contentStyle={{
                  background: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: 8,
                  fontSize: 11,
                  color: 'hsl(var(--foreground))',
                }}
                formatter={(v: number) => [formatCurrency(v, currency as 'XOF'), t('dashboard.chart.revenue')]}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fill="url(#revGrad)"
                dot={false}
                activeDot={{ r: 4 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}

// ─── Recent Orders Section ───────────────────────────────────────────────────
function RecentOrdersSection({ shopId, currency }: { shopId: string; currency: string }) {
  const { t } = useTranslation();
  const { data: ordersData, isLoading } = useOrders({ shopId, page: 0 });
  const recentOrders = (ordersData?.orders ?? []).slice(0, 5);

  function timeAgo(dateStr: string): string {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
    if (diff < 60) return `${diff} min`;
    if (diff < 1440) return `${Math.floor(diff / 60)}h`;
    return `${Math.floor(diff / 1440)}j`;
  }

  return (
    <Card>
      <CardHeader className="pb-3 px-4 pt-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold">{t('dashboard.orders.recent')}</CardTitle>
          <Link to="/dashboard/orders" className="text-xs text-primary hover:underline font-medium">
            {t('dashboard.orders.viewAll')} →
          </Link>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="px-4 pb-4 space-y-3">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
          </div>
        ) : recentOrders.length === 0 ? (
          <div className="px-4 pb-4 text-center">
            <Clock className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">{t('dashboard.orders.noOrders')}</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {recentOrders.map(order => (
              <Link
                key={order.id}
                to={`/dashboard/orders/${order.id}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{order.customer_name}</p>
                  <p className="text-xs text-muted-foreground">
                    #{order.order_number} · {timeAgo(order.created_at)}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold text-foreground">
                    {formatCurrency(order.total ?? 0, currency as 'XOF')}
                  </p>
                  <OrderStatusBadge status={order.status} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Top Products Section ─────────────────────────────────────────────────────
function TopProductsSection({ shopId, currency }: { shopId: string; currency: string }) {
  const { t } = useTranslation();
  const { data: topProducts, isLoading } = useTopProducts(shopId);

  if (!isLoading && (!topProducts || topProducts.length === 0)) return null;

  return (
    <Card>
      <CardHeader className="pb-3 px-4 pt-4">
        <CardTitle className="text-sm font-semibold">{t('dashboard.topProducts.title')}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="px-4 pb-4 space-y-3">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-lg" />)}
          </div>
        ) : (
          topProducts!.map((p, i) => (
            <div key={p.name} className="flex items-center gap-3 px-4 py-3 border-b last:border-0">
              <span className="text-xs text-muted-foreground w-4 shrink-0">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{p.name}</p>
                <p className="text-xs text-muted-foreground">{p.units} {t('dashboard.topProducts.units')}</p>
              </div>
              <span className="text-sm font-semibold text-foreground shrink-0">
                {formatCurrency(p.revenue, currency as 'XOF')}
              </span>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function Dashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { shop } = useShop();
  const shopId = shop?.id;
  const currency = shop?.currency ?? 'XOF';

  const { data: kpi, isLoading: kpiLoading } = useDashboardKPIs(shopId);
  const { data: alerts } = useDashboardAlerts(shopId);

  function handleShare() {
    if (!shop?.slug) return;
    const url = getStorefrontUrl(shop.slug);
    navigator.clipboard.writeText(url).then(() => {
      toast.success(t('dashboard.actions.shareCopied'));
    });
  }

  const hasActivity = (kpi?.ordersToday ?? 0) > 0;

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-4">

        {/* ── Section 1: Smart Summary Banner ── */}
        <div className="bg-muted/40 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
          <p className="text-sm text-foreground leading-relaxed">
            {kpiLoading ? (
              <Skeleton className="h-4 w-72 inline-block" />
            ) : hasActivity ? (
              t('dashboard.summary.todayRevenue', {
                amount: formatCurrency(kpi!.revenueToday, currency as 'XOF'),
                count: kpi!.ordersToday,
              })
            ) : (
              t('dashboard.summary.noActivity')
            )}
          </p>
          {!kpiLoading && kpi?.revenueChange !== null && (
            <Badge
              className={cn(
                'shrink-0 text-xs font-semibold border-0',
                (kpi!.revenueChange ?? 0) >= 0
                  ? 'bg-[hsl(142,76%,36%)]/15 text-[hsl(142,76%,30%)] dark:text-[hsl(142,76%,60%)]'
                  : 'bg-destructive/10 text-destructive'
              )}
            >
              {(kpi!.revenueChange ?? 0) >= 0 ? '+' : ''}{kpi!.revenueChange}% {t('dashboard.summary.vsYesterday')}
            </Badge>
          )}
        </div>

        {/* ── Section 2: KPI Cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard
            title={t('dashboard.kpis.revenueToday')}
            value={formatCurrency(kpi?.revenueToday ?? 0, currency as 'XOF')}
            change={kpi?.revenueChange ?? null}
            icon={DollarSign}
            loading={kpiLoading}
          />
          <KpiCard
            title={t('dashboard.kpis.ordersToday')}
            value={kpi?.ordersToday ?? 0}
            change={kpi?.ordersChange ?? null}
            icon={ShoppingCart}
            loading={kpiLoading}
          />
          <KpiCard
            title={t('dashboard.kpis.productsSold')}
            value={kpi?.productsSoldToday ?? 0}
            change={null}
            icon={Package}
            loading={kpiLoading}
          />
          <KpiCard
            title={t('dashboard.kpis.avgOrder')}
            value={formatCurrency(kpi?.avgOrderValue ?? 0, currency as 'XOF')}
            change={null}
            icon={TrendingUp}
            loading={kpiLoading}
          />
        </div>

        {/* ── Section 3: Smart Alerts (conditional) ── */}
        {(alerts ?? []).length > 0 && (
          <div className="space-y-2">
            {alerts!.map(alert => (
              <AlertCard key={alert.type} alert={alert} />
            ))}
          </div>
        )}

        {/* ── Section 4: Quick Actions ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <QuickActionBtn
            icon={Plus}
            label={t('dashboard.actions.addProduct')}
            sub={t('dashboard.actions.addProductSub')}
            to="/dashboard/products/new"
          />
          <QuickActionBtn
            icon={Share2}
            label={t('dashboard.actions.shareShop')}
            sub={t('dashboard.actions.shareSub')}
            onClick={handleShare}
          />
          <QuickActionBtn
            icon={BarChart2}
            label={t('dashboard.actions.viewAnalytics')}
            sub={t('dashboard.actions.analyticsSub')}
            to="/dashboard/orders"
          />
          <QuickActionBtn
            icon={Tag}
            label={t('dashboard.actions.createPromo')}
            sub={t('dashboard.actions.promoSub')}
            to="/dashboard/parametres/codes-promo"
          />
        </div>

        {/* ── Section 5: Revenue Chart ── */}
        {shopId && <RevenueChart shopId={shopId} currency={currency} />}

        {/* ── Sections 6 & 7: Recent Orders + Top Products ── */}
        {shopId && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <RecentOrdersSection shopId={shopId} currency={currency} />
            </div>
            <div>
              <TopProductsSection shopId={shopId} currency={currency} />
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
