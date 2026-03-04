import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { NavLink } from '@/components/NavLink';
import { filterNavByRole, isAdminNavActive } from '@/config/adminNavigation';
import { useAdminRole } from '@/hooks/useAdminRole';
import { cn } from '@/lib/utils';

export function AdminSidebar() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const { role } = useAdminRole();

  const items = filterNavByRole(role ?? 'support');

  return (
    <aside className="hidden md:flex w-60 flex-col bg-sidebar border-r border-sidebar-border min-h-screen">
      <div className="px-5 py-5">
        <span className="text-lg font-bold text-sidebar-foreground tracking-tight">🛡️ Admin</span>
      </div>

      <nav className="flex-1 px-3 space-y-1">
        {items.map((item) => {
          const active = isAdminNavActive(item.path, pathname);
          return (
            <NavLink
              key={item.key}
              to={item.path}
              end={item.path === '/admin'}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors',
                'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground',
                active && 'bg-sidebar-accent text-sidebar-foreground border-l-2 border-sidebar-primary'
              )}
              activeClassName=""
            >
              <item.icon className="h-5 w-5 shrink-0 icon-interactive" />
              <span>{t(`admin.nav.${item.key}`, item.key)}</span>
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}
