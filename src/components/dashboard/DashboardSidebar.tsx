import { useState, memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router-dom';
import { ChevronDown, Headphones, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useShop } from '@/hooks/useShop';
import { allNavItems, onboardingNavItems, isNavActive } from '@/config/navigation';
import { StoreAvatar } from './StoreAvatar';
import { StoreSwitcherPopover } from './StoreSwitcherPopover';
import { useSidebarCollapse } from '@/contexts/SidebarCollapseContext';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const NavItems = memo(function NavItems({
  items,
  pathname,
  collapsed,
  t,
}: {
  items: typeof allNavItems;
  pathname: string;
  collapsed: boolean;
  t: ReturnType<typeof import('react-i18next').useTranslation>['t'];
}) {
  return (
    <>
      {items.map((item) => {
        const isActive = isNavActive(item.path, pathname);
        const label = t(`dashboard.nav.${item.key}`);

        const link = (
          <Link
            key={item.key}
            to={item.path}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150',
              collapsed && 'justify-center px-0',
              isActive
                ? 'bg-sidebar-accent text-sidebar-accent-foreground font-semibold'
                : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
            )}
          >
            <item.icon size={20} strokeWidth={1.8} className="shrink-0" />
            {!collapsed && label}
          </Link>
        );

        if (collapsed) {
          return (
            <Tooltip key={item.key}>
              <TooltipTrigger asChild>{link}</TooltipTrigger>
              <TooltipContent side="right">{label}</TooltipContent>
            </Tooltip>
          );
        }

        return link;
      })}
    </>
  );
});

export function DashboardSidebar() {
  const { t } = useTranslation();
  const location = useLocation();
  const { hasShop, shop } = useShop();
  const { collapsed, toggle: toggleCollapsed } = useSidebarCollapse();
  const [switcherOpen, setSwitcherOpen] = useState(false);

  const navItems = hasShop ? allNavItems : onboardingNavItems;

  return (
    <TooltipProvider delayDuration={200}>
      <aside
        className={cn(
          'hidden lg:flex flex-col bg-sidebar text-sidebar-foreground min-h-screen fixed left-0 top-0 z-40 border-r border-sidebar-border transition-all duration-200',
          collapsed ? 'w-16' : 'w-60'
        )}
      >
        {/* Store switcher */}
        {hasShop && shop ? (
          <StoreSwitcherPopover open={switcherOpen} onOpenChange={setSwitcherOpen}>
            <button
              aria-expanded={switcherOpen}
              aria-label={t('dashboard.shopSwitcher.title', 'Changer de boutique')}
              className={cn(
                'flex items-center gap-2.5 p-3 mx-2 mt-3 rounded-lg hover:bg-sidebar-accent/50 transition-all duration-150 text-left',
                collapsed && 'justify-center mx-0 px-0'
              )}
            >
              <StoreAvatar name={shop.name} logoUrl={shop.logo_url} size={32} />
              {!collapsed && (
                <>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-sidebar-foreground truncate">{shop.name}</p>
                    <p className="text-[11px] text-sidebar-foreground/50 truncate">{shop.slug}.ventou.shop</p>
                  </div>
                  <ChevronDown className="h-4 w-4 text-sidebar-foreground/40 shrink-0" />
                </>
              )}
            </button>
          </StoreSwitcherPopover>
        ) : (
          <div className="p-4">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-accent rounded-[6px] flex items-center justify-center">
                <span className="text-accent-foreground font-bold text-sm">V</span>
              </div>
              {!collapsed && <span className="text-lg font-bold text-sidebar-foreground">VENTOU</span>}
            </Link>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 px-2 mt-3 space-y-0.5">
          <NavItems items={navItems} pathname={location.pathname} collapsed={collapsed} t={t} />
        </nav>

        {/* Footer */}
        <div className="px-2 pb-3 space-y-0.5">
          {/* Help center */}
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  to="/support"
                  className="flex items-center justify-center py-2 rounded-lg text-[13px] font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-all duration-150"
                >
                  <Headphones size={20} strokeWidth={1.8} />
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">{t('dashboard.sidebar.helpCenter', 'Centre d\'aide')}</TooltipContent>
            </Tooltip>
          ) : (
            <Link
              to="/support"
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-all duration-150"
            >
              <Headphones size={20} strokeWidth={1.8} />
              {t('dashboard.sidebar.helpCenter', 'Centre d\'aide')}
            </Link>
          )}

          {/* Collapse toggle */}
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={toggleCollapsed}
                  aria-label={t('dashboard.sidebar.expand', 'Étendre le menu')}
                  className="flex items-center justify-center py-2 rounded-lg text-[13px] font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-all duration-150 w-full"
                >
                  <PanelLeftOpen size={20} strokeWidth={1.8} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">{t('dashboard.sidebar.expand', 'Étendre le menu')}</TooltipContent>
            </Tooltip>
          ) : (
            <button
              onClick={toggleCollapsed}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-all duration-150 w-full"
            >
              <PanelLeftClose size={20} strokeWidth={1.8} />
              {t('dashboard.sidebar.collapse', 'Réduire le menu')}
            </button>
          )}
        </div>
      </aside>
    </TooltipProvider>
  );
}
