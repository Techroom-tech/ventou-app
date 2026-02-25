import { Mail, Server, LayoutTemplate, FileText, ScrollText, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { EmailSettingsCard } from '@/components/admin/EmailSettingsCard';

const cards = [
  {
    icon: Server,
    title: 'Configuration Email',
    description: 'Fournisseurs et providers actifs',
    path: '/admin/settings/email/providers',
  },
  {
    icon: LayoutTemplate,
    title: 'Template par défaut',
    description: 'Header, footer et wrapper global',
    path: '/admin/settings/email/default-template',
  },
  {
    icon: FileText,
    title: 'Templates Email',
    description: '28 templates transactionnels',
    path: '/admin/settings/email/templates',
  },
  {
    icon: ScrollText,
    title: 'Logs Email',
    description: 'Historique des envois et erreurs',
    path: '/admin/settings/email/logs',
  },
  {
    icon: ShieldCheck,
    title: 'Authentification Domaine',
    description: 'DKIM, SPF et vérification DNS',
    path: '/admin/settings/email/domains',
  },
];

export default function AdminEmailHub() {
  const navigate = useNavigate();

  return (
    <AdminLayout>
      <div>
        <div className="flex items-center gap-3 mb-1">
          <Mail className="h-6 w-6 text-foreground" />
          <h1 className="text-2xl font-semibold text-foreground">Système Email</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Dashboard / Settings / <span className="font-medium text-foreground">Email</span>
        </p>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {cards.map((c) => (
            <EmailSettingsCard
              key={c.path}
              icon={c.icon}
              title={c.title}
              description={c.description}
              onClick={() => navigate(c.path)}
            />
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}
