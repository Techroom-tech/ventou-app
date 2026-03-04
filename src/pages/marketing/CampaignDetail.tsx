import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, MousePointerClick, ShoppingCart, CreditCard, TrendingUp, DollarSign, Globe } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';

import { useCampaignAnalytics } from '@/hooks/useCampaignAnalytics';
import { useCampaignEvents } from '@/hooks/useCampaignEvents';
import { useTrackedLinks } from '@/hooks/useTrackedLinks';
import { useShop } from '@/hooks/useShop';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';

const EVENT_LABELS: Record<string, string> = {
  view_product: '👁️ Vue produit',
  add_to_cart: '🛒 Ajout panier',
  checkout_started: '📋 Checkout',
  purchase: '💰 Achat',
};

const EVENT_COLORS: Record<string, string> = {
  view_product: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  add_to_cart: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  checkout_started: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  purchase: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
};

export default function CampaignDetail() {
  const { linkId } = useParams<{ linkId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { shop } = useShop();
  const { data: links } = useTrackedLinks(shop?.id);
  const link = links?.find(l => l.id === linkId);
  const { data: stats, isLoading: statsLoading } = useCampaignAnalytics(linkId);
  const { data: events, isLoading: eventsLoading } = useCampaignEvents(linkId);

  const currency = (shop as any)?.currency ?? 'XOF';

  return (
    <div className="max-w-[1200px] mx-auto px-4 md:px-8 pb-12 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard/marketing/liens')} className="shrink-0">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-[28px] font-semibold text-foreground tracking-tight truncate">
            {link?.name ?? 'Campagne'}
          </h1>
          {link && (
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary">{link.source}</Badge>
              <span className="text-xs text-muted-foreground truncate">{link.target_url}</span>
            </div>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      {statsLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      ) : stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <KPICard icon={<MousePointerClick className="h-4 w-4" />} label="Clics" value={stats.clicks} />
          <KPICard icon={<ShoppingCart className="h-4 w-4" />} label="Ajout panier" value={stats.add_to_cart} />
          <KPICard icon={<CreditCard className="h-4 w-4" />} label="Achats" value={stats.purchase} />
          <KPICard icon={<TrendingUp className="h-4 w-4" />} label="Conversion" value={`${stats.conversionRate.toFixed(1)}%`} />
          <KPICard icon={<DollarSign className="h-4 w-4" />} label="Revenu" value={`${stats.revenue.toLocaleString()} ${currency}`} />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Top Countries */}
        <Card className="md:col-span-1">
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Globe className="h-4 w-4" /> Top pays</CardTitle></CardHeader>
          <CardContent>
            {stats?.topCountries.length ? (
              <div className="space-y-2">
                {stats.topCountries.map(c => (
                  <div key={c.country} className="flex items-center justify-between text-sm">
                    <span>{c.country}</span>
                    <Badge variant="outline">{c.count}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Aucune donnée</p>
            )}
          </CardContent>
        </Card>

        {/* Event Log */}
        <Card className="md:col-span-2">
          <CardHeader><CardTitle className="text-sm">Journal d'événements</CardTitle></CardHeader>
          <CardContent>
            {eventsLoading ? (
              <Skeleton className="h-32" />
            ) : !events?.length ? (
              <p className="text-xs text-muted-foreground">Aucun événement enregistré</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Heure</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Pays</TableHead>
                      <TableHead>Appareil</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {events.map(e => (
                      <TableRow key={e.id}>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatDistanceToNow(new Date(e.created_at), { addSuffix: true, locale: fr })}
                        </TableCell>
                        <TableCell>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${EVENT_COLORS[e.event_type] || ''}`}>
                            {EVENT_LABELS[e.event_type] || e.event_type}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs">{e.click?.country || '—'}</TableCell>
                        <TableCell className="text-xs">{e.click?.device || '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function KPICard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <Card>
      <CardContent className="pt-4 pb-3 px-4">
        <div className="flex items-center gap-2 text-muted-foreground mb-1">
          {icon}
          <span className="text-xs font-medium">{label}</span>
        </div>
        <p className="text-xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}
