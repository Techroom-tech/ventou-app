import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import {
  DollarSign, ShoppingCart, Package, TrendingUp,
  Plus, Share2, BarChart2, Tag, Info,
  AlertTriangle, AlertCircle, ArrowUpRight, ArrowDownRight,
  Clock, UserCircle,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

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
import { useDataMask, maskValue } from '@/contexts/DataMaskContext';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { getStorefrontUrl } from '@/lib/domain';
import { getTimeGreeting } from '@/lib/greeting';

// ─── Stat Card (Premium) ─────────────────────────────────────────────────────
interface StatCardProps {
  title: string;
  value: string;
  icon: React.ElementType;
  loading?: boolean;
  large?: boolean;
}

function StatCard({ title, value, icon: Icon, loading, large }: StatCardProps) {
  return (
    <Card className={cn('rounded-2xl border-0 bg-muted/60', large && 'col-span-2 sm:col-span-1')}>
      <CardContent className={cn('p-5', large && 'p-6')}>
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            {loading ? (
              <Skeleton className={cn('h-8 w-32', large && 'h-10 w-40')} />
            ) : (
              <p className={cn('font-bold text-foreground', large ? 'text-2xl sm:text-3xl' : 'text-xl')}>
                {value}
              </p>
            )}
            <p className="text-xs text-muted-foreground font-medium">{title}</p>
          </div>
          <div className="flex items-center gap-1">
            <Icon className="h-4 w-4 text-muted-foreground/60" />
            <Info className="h-3.5 w-3.5 text-muted-foreground/40" />
          </div>
        </div>
      </CardContent>
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

// ─── Revenue Chart ────────────────────────────────────────────────────────────
function RevenueChart({ shopId, currency }: { shopId: string; currency: string }) {
  const { t } = useTranslation();
  const [days, setDays] = useState(7);
  const { data: chartData, isLoading } = useRevenueChart(shopId, days);

  const totalRev = chartData?.reduce((s, d) => s + d.revenue, 0) ?? 0;
  const totalOrders = chartData?.reduce((s, d) => s + d.orders, 0) ?? 0;

  return (
    <Card className="p-4 sm:p-5 rounded-2xl">
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
    <Card className="rounded-2xl">
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

  return (
    <Card className="rounded-2xl">
      <CardHeader className="pb-3 px-4 pt-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold">
            {t('dashboard.topProducts.title')}
          </CardTitle>
          <Link to="/dashboard/products" className="text-xs text-primary hover:underline font-medium">
            {t('dashboard.orders.viewAll')} →
          </Link>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="px-4 pb-4 space-y-3">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-lg" />)}
          </div>
        ) : (!topProducts || topProducts.length === 0) ? (
          <div className="px-4 pb-6 text-center">
            <Package className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground mb-3">
              {t('dashboard.topProducts.empty', 'Aucune donnée disponible')}
            </p>
            <Link to="/dashboard/products/new">
              <Button size="sm" className="rounded-full text-xs">
                <Plus className="h-3.5 w-3.5 mr-1" />
                {t('dashboard.actions.addProduct')}
              </Button>
            </Link>
          </div>
        ) : (
          topProducts.map((p, i) => (
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
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { shop } = useShop();
  const { profile } = useAuth();
  const { isMasked } = useDataMask();
  const shopId = shop?.id;
  const currency = shop?.currency ?? 'XOF';

  const { data: kpi, isLoading: kpiLoading } = useDashboardKPIs(shopId);
  const { data: alerts } = useDashboardAlerts(shopId);

  const greeting = getTimeGreeting();
  const firstName = profile?.first_name || '';
  const isFr = i18n.language?.startsWith('fr');

  function handleShare() {
    if (!shop?.slug) return;
    const url = getStorefrontUrl(shop.slug);
    navigator.clipboard.writeText(url).then(() => {
      toast.success(t('dashboard.actions.shareCopied'));
    });
  }

  // Format values with mask support
  const fmtCurrency = (val: number) => maskValue(formatCurrency(val, currency as 'XOF'), isMasked);
  const fmtNumber = (val: number) => maskValue(String(val), isMasked);

  return (
    <>
      <div className="max-w-5xl mx-auto space-y-6">

        {/* ── Hero Greeting ── */}
        <div className="pt-2 sm:pt-4">
          <h1 className="text-3xl sm:text-4xl lg:text-[42px] font-serif font-medium text-foreground leading-tight">
            {isFr ? greeting.text : greeting.textEn}{firstName ? ` ${firstName}` : ''}&nbsp;!{' '}
            <span role="img" aria-label="greeting emoji" className="emoji-color">{greeting.emoji}</span>
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-2 max-w-lg">
            {t('dashboard.hero.subtitle', "C'est l'heure de pointe - lancez cette campagne que vous planifiez !")}
          </p>
        </div>

        {/* ── Complete Profile Banner ── */}
        {!profile?.first_name && (
          <Link to="/dashboard/parametres/profil" className="block">
            <div className="flex items-center gap-3 rounded-lg border border-accent/30 bg-accent/5 px-4 py-3 transition-colors hover:bg-accent/10">
              <UserCircle className="h-5 w-5 text-accent shrink-0" />
              <span className="text-sm text-muted-foreground flex-1">
                {t('dashboard.completeProfile.title', 'Complétez votre profil pour personnaliser votre expérience')}
              </span>
              <span className="text-sm font-medium text-accent whitespace-nowrap">
                {t('dashboard.completeProfile.cta', 'Compléter')}
              </span>
            </div>
          </Link>
        )}

        {/* ── Action Buttons (Pills) ── */}
        <div className="flex items-center gap-3 overflow-x-auto pb-1 scrollbar-none">
          <Link to="/dashboard/products/new">
            <Button variant="outline" className="rounded-full whitespace-nowrap h-10 text-sm gap-2 border-accent text-accent hover:bg-accent hover:text-accent-foreground">
              <Plus className="h-4 w-4" />
              {t('dashboard.actions.addProduct')}
            </Button>
          </Link>
          <Link to="/dashboard/parametres/codes-promo">
            <Button variant="outline" className="rounded-full whitespace-nowrap h-10 text-sm gap-2">
              <Tag className="h-4 w-4" />
              {t('dashboard.actions.createPromo')}
            </Button>
          </Link>
          <Button variant="outline" className="rounded-full whitespace-nowrap h-10 text-sm gap-2" onClick={handleShare}>
            <Share2 className="h-4 w-4" />
            {t('dashboard.actions.shareShop')}
          </Button>
        </div>

        {/* ── Stat Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <StatCard
            title={t('dashboard.stats.revenueTotal', 'Revenu total')}
            value={fmtCurrency(kpi?.revenueToday ?? 0)}
            icon={DollarSign}
            loading={kpiLoading}
            large
          />
          <StatCard
            title={t('dashboard.stats.revenue7days', '7 derniers jours')}
            value={fmtCurrency(kpi?.avgOrderValue ?? 0)}
            icon={TrendingUp}
            loading={kpiLoading}
          />
          <StatCard
            title={t('dashboard.stats.totalClients', 'Nombre total de clients')}
            value={fmtNumber(kpi?.ordersToday ?? 0)}
            icon={ShoppingCart}
            loading={kpiLoading}
          />
        </div>

        {/* ── Smart Alerts ── */}
        {(alerts ?? []).length > 0 && (
          <div className="space-y-2">
            {alerts!.map(alert => (
              <AlertCard key={alert.type} alert={alert} />
            ))}
          </div>
        )}

        {/* ── Revenue Chart ── */}
        {shopId && <RevenueChart shopId={shopId} currency={currency} />}

        {/* ── Top Products + Recent Orders ── */}
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
    </>
  );
}
