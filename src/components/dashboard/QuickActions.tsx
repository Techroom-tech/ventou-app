import { useTranslation } from 'react-i18next';
import { Plus, Share2, ArrowDownToLine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export function QuickActions() {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      {/* Add Product CTA */}
      <Card className="rounded-xl border-2 border-dashed border-accent/30 bg-accent/5 hover:bg-accent/10 transition-colors cursor-pointer">
        <CardContent className="p-4 sm:p-6 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-accent">
            <Plus className="h-6 w-6 text-accent-foreground" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-foreground">{t('dashboard.actions.addProduct')}</h3>
            <p className="text-sm text-muted-foreground">{t('dashboard.actions.addProductSubtitle')}</p>
          </div>
        </CardContent>
      </Card>

      {/* Share & Withdraw */}
      <div className="grid grid-cols-2 gap-3">
        <Button variant="outline" className="h-auto py-3 flex flex-col items-center gap-1 rounded-xl">
          <Share2 className="h-5 w-5 text-muted-foreground" />
          <span className="text-xs font-medium">{t('dashboard.actions.shareShop')}</span>
          <span className="text-[10px] text-muted-foreground">{t('dashboard.actions.shareShopSubtitle')}</span>
        </Button>
        <Button variant="outline" className="h-auto py-3 flex flex-col items-center gap-1 rounded-xl">
          <ArrowDownToLine className="h-5 w-5 text-muted-foreground" />
          <span className="text-xs font-medium">{t('dashboard.actions.withdraw')}</span>
          <span className="text-[10px] text-muted-foreground">{t('dashboard.actions.withdrawSubtitle')}</span>
        </Button>
      </div>
    </div>
  );
}
