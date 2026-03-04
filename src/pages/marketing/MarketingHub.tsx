import { useNavigate } from 'react-router-dom';
import { BarChart3, Tag, Zap, Link2, Activity, ChevronRight } from 'lucide-react';

import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

interface MktCard {
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  titleKey: string;
  descKey: string;
  path: string;
}

const cards: MktCard[] = [
  { icon: BarChart3, iconBg: 'bg-blue-50 dark:bg-blue-950/50', iconColor: 'text-blue-600 dark:text-blue-400', titleKey: 'marketing.hub.analytics', descKey: 'marketing.hub.analyticsDesc', path: '/dashboard/marketing/analytics' },
  { icon: Tag, iconBg: 'bg-pink-50 dark:bg-pink-950/50', iconColor: 'text-pink-600 dark:text-pink-400', titleKey: 'marketing.hub.coupons', descKey: 'marketing.hub.couponsDesc', path: '/dashboard/marketing/coupons' },
  { icon: Zap, iconBg: 'bg-amber-50 dark:bg-amber-950/50', iconColor: 'text-amber-600 dark:text-amber-400', titleKey: 'marketing.hub.promos', descKey: 'marketing.hub.promosDesc', path: '/dashboard/marketing/promos' },
  { icon: Link2, iconBg: 'bg-emerald-50 dark:bg-emerald-950/50', iconColor: 'text-emerald-600 dark:text-emerald-400', titleKey: 'marketing.hub.links', descKey: 'marketing.hub.linksDesc', path: '/dashboard/marketing/liens' },
  { icon: Activity, iconBg: 'bg-violet-50 dark:bg-violet-950/50', iconColor: 'text-violet-600 dark:text-violet-400', titleKey: 'marketing.hub.pixels', descKey: 'marketing.hub.pixelsDesc', path: '/dashboard/marketing/pixels' },
];

export default function MarketingHub() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <>
      <div className="max-w-[1200px] mx-auto px-4 md:px-8 pb-12">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-[28px] font-semibold text-foreground tracking-tight">
            {t('marketing.hub.title')}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t('marketing.hub.subtitle')}
          </p>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {cards.map((card) => (
            <div
              key={card.path}
              onClick={() => navigate(card.path)}
              className={cn(
                'group flex items-center gap-4 p-5 rounded-2xl border border-border bg-card cursor-pointer',
                'min-h-[120px] transition-all duration-200',
                'hover:shadow-md hover:border-primary/20'
              )}
            >
              <div className={cn(
                'w-11 h-11 rounded-xl flex items-center justify-center shrink-0',
                card.iconBg
              )}>
                <card.icon className={cn('h-5 w-5', card.iconColor)} />
              </div>
              <div className="flex-1 min-w-0">
                <span className="font-semibold text-sm text-foreground block">
                  {t(card.titleKey)}
                </span>
                <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
                  {t(card.descKey)}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/50 group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
