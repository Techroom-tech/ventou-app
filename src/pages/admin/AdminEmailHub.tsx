import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, Server, FileText, ScrollText, Globe, LayoutTemplate } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const cards = [
  { title: 'Configuration Email', desc: 'Fournisseurs et providers actifs', icon: Server, path: '/admin/settings/email/providers' },
  { title: 'Template par défaut', desc: 'Header, footer et wrapper global', icon: LayoutTemplate, path: '/admin/settings/email/default-template' },
  { title: 'Templates Email', desc: '28 templates transactionnels', icon: FileText, path: '/admin/settings/email/templates' },
  { title: 'Logs Email', desc: 'Historique des envois et erreurs', icon: ScrollText, path: '/admin/settings/email/logs' },
  { title: 'Authentification Domaine', desc: 'DKIM, SPF et vérification DNS', icon: Globe, path: '/admin/settings/email/domains' },
];

export default function AdminEmailHub() {
  const navigate = useNavigate();

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Mail className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Système Email</h1>
            <p className="text-sm text-muted-foreground">Dashboard / Settings / Email</p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {cards.map(c => (
            <Card
              key={c.path}
              className="cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => navigate(c.path)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-md bg-primary/10 flex items-center justify-center">
                    <c.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{c.title}</CardTitle>
                    <CardDescription className="text-xs">{c.desc}</CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}
