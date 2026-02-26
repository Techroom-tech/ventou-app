import { Store } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';

export default function StoreNotFound() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center space-y-4 px-4">
        <Store className="h-16 w-16 mx-auto text-muted-foreground" />
        <h1 className="text-2xl font-bold">{t('storefront.notFound', 'Boutique introuvable')}</h1>
        <p className="text-muted-foreground">
          {t('storefront.notFoundDescription', "Cette boutique n'existe pas ou a été désactivée.")}
        </p>
        <Button variant="outline" onClick={() => (window.location.href = '/')}>
          {t('common.back', 'Retour')}
        </Button>
      </div>
    </div>
  );
}
