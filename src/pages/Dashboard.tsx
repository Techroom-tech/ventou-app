import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { DollarSign, ShoppingCart } from 'lucide-react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { RecentOrdersList } from '@/components/dashboard/RecentOrdersList';
import { mockStats, mockShop } from '@/data/mockData';
import { formatCurrency } from '@/integrations/supabase/client';

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

        <RecentOrdersList />
      </div>
    </DashboardLayout>
  );
}
