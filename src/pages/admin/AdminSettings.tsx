import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Settings, Palette, CreditCard, Bell, Shield, Scale, Wrench } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const sections = [
  { icon: Settings, title: 'Général', description: 'Nom de la plateforme, logo, URLs' },
  { icon: Palette, title: 'Branding', description: 'Couleurs, polices, favicon' },
  { icon: CreditCard, title: 'Abonnements', description: 'Plans, tarifs, essais' },
  { icon: Bell, title: 'Notifications & Email', description: 'Fournisseurs email, templates, notifications', link: '/admin/settings/email' },
  { icon: Shield, title: 'Sécurité', description: 'Rôles admin, journaux d\'audit' },
  { icon: Scale, title: 'Légal', description: 'CGU, Politique de confidentialité, mentions légales' },
  { icon: Wrench, title: 'Maintenance', description: 'Mode maintenance, bypass IP admin' },
];

export default function AdminSettings() {
  const navigate = useNavigate();
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Paramètres Plateforme</h1>
          <p className="text-sm text-muted-foreground">Réservé aux Super Admins</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sections.map(({ icon: Icon, title, description, link }) => (
            <Card key={title} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => link && navigate(link)}>
              <CardHeader className="flex flex-row items-center gap-4 pb-2">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Icon className="h-5 w-5 text-primary icon-interactive" />
                </div>
                <div>
                  <CardTitle className="text-sm">{title}</CardTitle>
                  <CardDescription className="text-xs">{description}</CardDescription>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>

        <Separator />

        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Wrench className="h-4 w-4" /> Mode Maintenance
            </CardTitle>
            <CardDescription>Activez pour bloquer l'accès au frontend</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Maintenance activée</p>
                <p className="text-xs text-muted-foreground">Les admins peuvent contourner via IP</p>
              </div>
              <Switch />
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
