import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router-dom';
import { BadgeCheck, ChevronDown, ChevronsLeft, ChevronsRight, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useShop } from '@/hooks/useShop';
import { allNavItems, onboardingNavItems, isNavActive } from '@/config/navigation';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { ShopSwitcherModal } from './ShopSwitcherModal';
import { useSidebarCollapse } from '@/contexts/SidebarCollapseContext';

export function DashboardSidebar() {
  const { t } = useTranslation();
  const location = useLocation();
  const { hasShop, shop, shops } = useShop();
  const { collapsed, toggle: toggleCollapsed } = useSidebarCollapse();
  const [switcherOpen, setSwitcherOpen] = useState(false);

  const navItems = hasShop ? allNavItems : onboardingNavItems;

  return (
    <>
      <aside
        className={cn(
          'hidden lg:flex flex-col bg-sidebar text-sidebar-foreground min-h-screen fixed left-0 top-0 z-40 transition-all duration-200',
          collapsed ? 'w-[68px]' : 'w-60'
        )}
      >
        {/* Shop profile block */}
        {hasShop && shop ? (
          <button
            onClick={() => setSwitcherOpen(true)}
            className="flex items-center gap-3 p-4 mx-2 mt-3 rounded-xl hover:bg-sidebar-accent/50 transition-colors text-left"
          >
            <Avatar className="h-9 w-9 rounded-lg shrink-0">
              <AvatarImage src={shop.logo_url || undefined} />
              <AvatarFallback className="rounded-lg bg-sidebar-primary text-sidebar-primary-foreground text-sm font-bold">
                {shop.name?.[0]?.toUpperCase() || 'V'}
              </AvatarFallback>
            </Avatar>
            {!collapsed && (
              <>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-sidebar-foreground truncate">{shop.name}</p>
                  {shops.length > 1 && (
                    <p className="text-xs text-sidebar-foreground/50">{shops.length} boutiques</p>
                  )}
                </div>
                <ChevronDown className="h-4 w-4 text-sidebar-foreground/50 shrink-0" />
              </>
            )}
          </button>
        ) : (
          <div className="p-6">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-9 h-9 bg-sidebar-primary rounded-lg flex items-center justify-center">
                <span className="text-sidebar-primary-foreground font-bold text-lg">V</span>
              </div>
              {!collapsed && <span className="text-xl font-bold text-sidebar-foreground">VENTOU</span>}
            </Link>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 px-3 mt-2 space-y-1">
          {navItems.map((item) => {
            const isActive = isNavActive(item.path, location.pathname);
            return (
              <Link
                key={item.key}
                to={item.path}
                title={collapsed ? t(`dashboard.nav.${item.key}`) : undefined}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors relative',
                  collapsed && 'justify-center',
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                )}
              >
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-sidebar-primary" />
                )}
                <item.icon className="h-5 w-5 shrink-0" />
                {!collapsed && t(`dashboard.nav.${item.key}`)}
              </Link>
            );
          })}
        </nav>

        {/* Bottom section */}
        <div className="px-3 pb-4 space-y-1">
          {/* Help center */}
          <Link
            to="/support"
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-colors',
              collapsed && 'justify-center'
            )}
          >
            <HelpCircle className="h-5 w-5 shrink-0" />
            {!collapsed && t('dashboard.sidebar.helpCenter', 'Centre d\'aide')}
          </Link>

          {/* Collapse toggle */}
          <button
            onClick={toggleCollapsed}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-colors w-full',
              collapsed && 'justify-center'
            )}
          >
            {collapsed ? (
              <ChevronsRight className="h-5 w-5 shrink-0" />
            ) : (
              <>
                <ChevronsLeft className="h-5 w-5 shrink-0" />
                {t('dashboard.sidebar.collapse', 'Réduire le menu')}
              </>
            )}
          </button>

          {/* Verified badge */}
          {!collapsed && hasShop && shop?.is_verified && (
            <div className="p-3 rounded-lg bg-sidebar-accent/30">
              <div className="flex items-center gap-2 text-sm">
                <BadgeCheck className="h-5 w-5 text-sidebar-primary" />
                <span className="font-medium">{t('dashboard.account.verified')}</span>
              </div>
            </div>
          )}
        </div>
      </aside>

      <ShopSwitcherModal open={switcherOpen} onOpenChange={setSwitcherOpen} />
    </>
  );
}
