import { useTranslation } from 'react-i18next';
import { Package, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export function ProductsEmptyState() {
  const { t } = useTranslation();

  return (
    <Card className="border-dashed border-2">
      <CardContent className="flex flex-col items-center justify-center py-16 px-6 text-center">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-6">
          <Package className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">
          {t('dashboard.products.emptyTitle')}
        </h3>
        <p className="text-sm text-muted-foreground max-w-sm mb-6">
          {t('dashboard.products.emptyDescription')}
        </p>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          {t('dashboard.actions.addProduct')}
        </Button>
        <div className="flex flex-wrap gap-3 mt-6 justify-center">
          {['csv', 'stock', 'variants'].map((feature) => (
            <span
              key={feature}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground bg-muted px-3 py-1.5 rounded-full"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              {t(`dashboard.products.features.${feature}`)}
            </span>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
