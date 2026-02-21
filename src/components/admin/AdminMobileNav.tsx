import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { filterNavByRole, isAdminNavActive } from '@/config/adminNavigation';
import { useAdminRole } from '@/hooks/useAdminRole';
import { cn } from '@/lib/utils';

export function AdminMobileNav() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { role } = useAdminRole();
  const [open, setOpen] = useState(false);

  const items = filterNavByRole(role ?? 'support');

  return (
    <div className="md:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0 bg-sidebar">
          <div className="px-5 py-5 border-b border-sidebar-border">
            <span className="text-lg font-bold text-sidebar-foreground">🛡️ Admin</span>
          </div>
          <nav className="px-3 py-3 space-y-1">
            {items.map((item) => {
              const active = isAdminNavActive(item.path, pathname);
              return (
                <button
                  key={item.key}
                  onClick={() => { navigate(item.path); setOpen(false); }}
                  className={cn(
                    'flex items-center gap-3 px-3 py-3 rounded-md text-sm font-medium w-full text-left transition-colors min-h-[44px]',
                    'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground',
                    active && 'bg-sidebar-accent text-sidebar-foreground border-l-2 border-sidebar-primary'
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  <span>{t(`admin.nav.${item.key}`, item.key)}</span>
                </button>
              );
            })}
          </nav>
        </SheetContent>
      </Sheet>
    </div>
  );
}
