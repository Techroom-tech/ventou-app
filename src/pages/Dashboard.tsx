import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { DollarSign, ShoppingCart, Store, ArrowRight } from 'lucide-react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { RecentOrdersList } from '@/components/dashboard/RecentOrdersList';
import { useShop } from '@/hooks/useShop';
import { mockStats, mockShop } from '@/data/mockData';
import { formatCurrency } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

function OnboardingScreen() {
  const { t } = useTranslation();

  return (
    <div className="max-w-2xl mx-auto flex items-center justify-center min-h-[60vh]">
      <Card className="w-full rounded-2xl shadow-lg border-dashed border-2 border-accent/30">
        <CardContent className="flex flex-col items-center text-center p-8 sm:p-12 space-y-6">
          <div className="w-20 h-20 rounded-2xl bg-accent/10 flex items-center justify-center">
            <Store className="h-10 w-10 text-accent" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-foreground">
              {t('dashboard.onboarding.title')}
            </h2>
            <p className="text-muted-foreground max-w-md">
              {t('dashboard.onboarding.description')}
            </p>
          </div>
          <Button asChild size="lg" className="gap-2 text-base px-8">
            <Link to="/dashboard/create-shop">
              {t('dashboard.onboarding.cta')}
              <ArrowRight className="h-5 w-5" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function DashboardContent() {
  const { t } = useTranslation();

  return (
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
  );
}

export default function Dashboard() {
  const { hasShop, isLoading } = useShop();

  console.log('[Dashboard] isLoading:', isLoading, 'hasShop:', hasShop);

  return (
    <DashboardLayout>
      {isLoading ? (
        <div className="max-w-6xl mx-auto space-y-6">
          <Skeleton className="h-8 w-48" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
        </div>
      ) : hasShop ? (
        <DashboardContent />
      ) : (
        <OnboardingScreen />
      )}
    </DashboardLayout>
  );
}
