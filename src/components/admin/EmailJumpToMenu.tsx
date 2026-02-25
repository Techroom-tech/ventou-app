import { useNavigate, useLocation } from 'react-router-dom';
import { Server, LayoutTemplate, FileText, ScrollText, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

const items = [
  { label: 'Email Configuration', path: '/admin/settings/email/providers', icon: Server },
  { label: 'Default Templates', path: '/admin/settings/email/default-template', icon: LayoutTemplate },
  { label: 'Email Templates', path: '/admin/settings/email/templates', icon: FileText },
  { label: 'Logs Email', path: '/admin/settings/email/logs', icon: ScrollText },
  { label: 'Authentification Domaine', path: '/admin/settings/email/domains', icon: ShieldCheck },
];

export function EmailJumpToMenu() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return (
    <div className="bg-card border rounded-xl p-5 h-fit">
      <h3 className="font-semibold text-foreground mb-4">Jump To</h3>
      <nav className="space-y-1">
        {items.map((item) => {
          const active = pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                'flex items-center gap-2.5 w-full px-3 py-2.5 rounded-lg text-sm transition-colors text-left',
                active
                  ? 'bg-primary/10 text-primary border-l-[3px] border-primary font-medium'
                  : 'text-muted-foreground hover:bg-muted'
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
