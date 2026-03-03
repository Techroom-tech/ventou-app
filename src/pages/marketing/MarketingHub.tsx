import { useNavigate } from 'react-router-dom';
import { BarChart3, Tag, Zap, Link2, Activity, ChevronRight, Megaphone } from 'lucide-react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

interface MktCard {
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  titleKey: string;
  descKey: string;
  path: string;
  badge?: string;
}

const cards: MktCard[] = [
  { icon: BarChart3, iconBg: 'bg-blue-100 dark:bg-blue-950', iconColor: 'text-blue-600 dark:text-blue-400', titleKey: 'marketing.hub.analytics', descKey: 'marketing.hub.analyticsDesc', path: '/dashboard/marketing/analytics' },
  { icon: Tag, iconBg: 'bg-pink-100 dark:bg-pink-950', iconColor: 'text-pink-600 dark:text-pink-400', titleKey: 'marketing.hub.coupons', descKey: 'marketing.hub.couponsDesc', path: '/dashboard/marketing/coupons' },
  { icon: Zap, iconBg: 'bg-orange-100 dark:bg-orange-950', iconColor: 'text-orange-600 dark:text-orange-400', titleKey: 'marketing.hub.promos', descKey: 'marketing.hub.promosDesc', path: '/dashboard/marketing/promos' },
  { icon: Link2, iconBg: 'bg-green-100 dark:bg-green-950', iconColor: 'text-green-600 dark:text-green-400', titleKey: 'marketing.hub.links', descKey: 'marketing.hub.linksDesc', path: '/dashboard/marketing/liens' },
  { icon: Activity, iconBg: 'bg-indigo-100 dark:bg-indigo-950', iconColor: 'text-indigo-600 dark:text-indigo-400', titleKey: 'marketing.hub.pixels', descKey: 'marketing.hub.pixelsDesc', path: '/dashboard/marketing/pixels' },
];

export default function MarketingHub() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto pb-12">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Megaphone className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{t('marketing.hub.title')}</h1>
            <p className="text-sm text-muted-foreground">{t('marketing.hub.subtitle')}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {cards.map((card) => (
            <div
              key={card.path}
              onClick={() => navigate(card.path)}
              className="group flex items-center gap-4 p-4 rounded-xl border border-border bg-card cursor-pointer transition-all duration-200 hover:shadow-md hover:border-primary/30 hover:bg-secondary/30"
            >
              <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center shrink-0', card.iconBg)}>
                <card.icon className={cn('h-5 w-5', card.iconColor)} />
              </div>
              <div className="flex-1 min-w-0">
                <span className="font-semibold text-sm text-foreground">{t(card.titleKey)}</span>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">{t(card.descKey)}</p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-transform" />
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
