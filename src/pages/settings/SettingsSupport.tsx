import { Headphones, Mail, BookOpen, MessageCircle } from 'lucide-react';
import { SettingsPageLayout } from '@/components/settings/SettingsPageLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

export default function SettingsSupport() {
  const { user } = useAuth();

  return (
    <SettingsPageLayout
      title="Support"
      description="Obtenez de l'aide et contactez l'équipe Ventou"
    >
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Headphones className="h-4 w-4 text-muted-foreground" />
            Assistance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-950 flex items-center justify-center">
                <BookOpen className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-medium">Documentation</p>
                <p className="text-xs text-muted-foreground">Guides et tutoriels Ventou</p>
              </div>
            </div>
            <Button variant="outline" size="sm" asChild>
              <a href="https://docs.ventou.shop" target="_blank" rel="noopener noreferrer">Ouvrir</a>
            </Button>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-green-100 dark:bg-green-950 flex items-center justify-center">
                <MessageCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm font-medium">WhatsApp Support</p>
                <p className="text-xs text-muted-foreground">Réponse sous 24h en jours ouvrés</p>
              </div>
            </div>
            <Button variant="outline" size="sm" asChild>
              <a href="https://wa.me/22600000000" target="_blank" rel="noopener noreferrer">Contacter</a>
            </Button>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-orange-100 dark:bg-orange-950 flex items-center justify-center">
                <Mail className="h-4 w-4 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-sm font-medium">Email</p>
                <p className="text-xs text-muted-foreground">support@ventou.shop</p>
              </div>
            </div>
            <Button variant="outline" size="sm" asChild>
              <a href={`mailto:support@ventou.shop?subject=Support - ${user?.email}`}>Envoyer</a>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Votre compte</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground space-y-1">
            <p>Email : <span className="font-medium text-foreground">{user?.email}</span></p>
            <p>ID utilisateur : <span className="font-mono text-xs">{user?.id}</span></p>
          </div>
        </CardContent>
      </Card>
    </SettingsPageLayout>
  );
}
