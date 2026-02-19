import { Receipt, Clock } from 'lucide-react';
import { SettingsPageLayout } from '@/components/settings/SettingsPageLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function SettingsFacturation() {
  return (
    <SettingsPageLayout
      title="Facturation"
      description="Gérez votre abonnement et vos factures"
    >
      <Card>
        <CardContent className="py-16 flex flex-col items-center text-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
            <Receipt className="h-8 w-8 text-muted-foreground" />
          </div>
          <div>
            <div className="flex items-center justify-center gap-2 mb-2">
              <h3 className="text-lg font-semibold">Facturation & Abonnement</h3>
              <Badge variant="secondary" className="text-xs gap-1">
                <Clock className="h-3 w-3" />
                Bientôt
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground max-w-sm">
              Consultez et téléchargez vos factures, gérez votre abonnement et accédez à l'historique de vos paiements Ventou.
            </p>
          </div>
        </CardContent>
      </Card>
    </SettingsPageLayout>
  );
}
