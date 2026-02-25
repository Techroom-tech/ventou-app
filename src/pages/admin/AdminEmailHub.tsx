import { Server, LayoutTemplate, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { EmailSettingsTopbar } from '@/components/admin/EmailSettingsTopbar';
import { EmailSettingsCard } from '@/components/admin/EmailSettingsCard';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from '@/components/ui/breadcrumb';

const cards = [
  {
    icon: Server,
    title: 'Email Configuration',
    description: 'Configure sender email, SMTP settings, and email delivery method.',
    path: '/admin/settings/email/providers',
  },
  {
    icon: LayoutTemplate,
    title: 'Default Templates',
    description: 'Manage default system email templates used for authentication and notifications.',
    path: '/admin/settings/email/default-template',
  },
  {
    icon: FileText,
    title: 'Email Templates',
    description: 'Create and customize email templates for different platform events.',
    path: '/admin/settings/email/templates',
  },
];

export default function AdminEmailHub() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <EmailSettingsTopbar />

      <div className="max-w-[1200px] mx-auto px-5 md:px-8">
        <div className="mt-6">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/admin" className="text-muted-foreground hover:text-foreground">
                  Dashboard
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink href="/admin/settings" className="text-muted-foreground hover:text-foreground">
                  Settings
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Email</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-12">
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
    </div>
  );
}
