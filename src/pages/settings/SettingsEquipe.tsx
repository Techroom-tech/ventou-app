import { Users, Clock } from 'lucide-react';
import { SettingsPageLayout } from '@/components/settings/SettingsPageLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function SettingsEquipe() {
  return (
    <SettingsPageLayout
      title="Équipe"
      description="Gérez les membres et les niveaux d'accès à votre boutique"
    >
      <Card>
        <CardContent className="py-16 flex flex-col items-center text-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
            <Users className="h-8 w-8 text-muted-foreground" />
          </div>
          <div>
            <div className="flex items-center justify-center gap-2 mb-2">
              <h3 className="text-lg font-semibold">Gestion d'équipe</h3>
              <Badge variant="secondary" className="text-xs gap-1">
                <Clock className="h-3 w-3" />
                Bientôt
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground max-w-sm">
              Invitez des collaborateurs, définissez des rôles (admin, gestionnaire de commandes, éditeur) et gérez les accès à votre boutique.
            </p>
          </div>
        </CardContent>
      </Card>
    </SettingsPageLayout>
  );
}
