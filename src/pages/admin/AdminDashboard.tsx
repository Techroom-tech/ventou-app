import { useTranslation } from 'react-i18next';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAdminStats } from '@/hooks/useAdminStats';
import { Loader2, Users, Store, Package, Flag, CreditCard, TrendingUp, Clock, Zap } from 'lucide-react';

const statConfig = [
  { key: 'totalVendors', icon: Users, label: 'Vendeurs' },
  { key: 'activeSubscriptions', icon: CreditCard, label: 'Abonnements actifs' },
  { key: 'storesCount', icon: Store, label: 'Boutiques' },
  { key: 'productsCount', icon: Package, label: 'Produits' },
  { key: 'pendingReports', icon: Flag, label: 'Signalements en attente' },
  { key: 'subscriptionRevenue', icon: TrendingUp, label: 'Revenus (FCFA)' },
  { key: 'expiringSoon', icon: Clock, label: 'Expirent sous 7j' },
  { key: 'vendorsOnTrial', icon: Zap, label: 'En période d\'essai' },
] as const;

export default function AdminDashboard() {
  const { t } = useTranslation();
  const { data: stats, isLoading } = useAdminStats();

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {t('admin.nav.dashboard', 'Tableau de bord')}
          </h1>
          <p className="text-sm text-muted-foreground">Vue d'ensemble de la plateforme</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {statConfig.map(({ key, icon: Icon, label }) => (
            <Card key={key}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">{label}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-foreground">
                  {key === 'subscriptionRevenue'
                    ? (stats?.[key] ?? 0).toLocaleString('fr-FR')
                    : stats?.[key] ?? 0}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Placeholder for charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Revenus d'abonnements</CardTitle>
            </CardHeader>
            <CardContent className="h-48 flex items-center justify-center text-muted-foreground text-sm">
              Graphique disponible avec des données réelles
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Croissance des abonnements</CardTitle>
            </CardHeader>
            <CardContent className="h-48 flex items-center justify-center text-muted-foreground text-sm">
              Graphique disponible avec des données réelles
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
