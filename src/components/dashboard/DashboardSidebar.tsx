import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  Megaphone,
  Settings,
  BadgeCheck,
  Store,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useShop } from '@/hooks/useShop';

const fullNavItems = [
  { key: 'dashboard', icon: LayoutDashboard, path: '/dashboard' },
  { key: 'products', icon: Package, path: '/dashboard/products' },
  { key: 'orders', icon: ShoppingCart, path: '/dashboard/orders' },
  { key: 'customers', icon: Users, path: '/dashboard/customers' },
  { key: 'marketing', icon: Megaphone, path: '/dashboard/marketing' },
  { key: 'settings', icon: Settings, path: '/dashboard/parametres' },
];

const onboardingNavItems = [
  { key: 'dashboard', icon: LayoutDashboard, path: '/dashboard' },
  { key: 'createShop', icon: Store, path: '/dashboard/create-shop' },
];

export function DashboardSidebar() {
  const { t } = useTranslation();
  const location = useLocation();
  const { hasShop, shop } = useShop();

  const navItems = hasShop ? fullNavItems : onboardingNavItems;

  return (
    <aside className="hidden lg:flex flex-col w-60 bg-sidebar text-sidebar-foreground min-h-screen fixed left-0 top-0 z-40">
      {/* Logo */}
      <div className="p-6">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-9 h-9 bg-sidebar-primary rounded-lg flex items-center justify-center">
            <span className="text-sidebar-primary-foreground font-bold text-lg">V</span>
          </div>
          <span className="text-xl font-bold text-sidebar-foreground">VENTOU</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path ||
            (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
          return (
            <Link
              key={item.key}
              to={item.path}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
              )}
            >
              <item.icon className="h-5 w-5" />
              {t(`dashboard.nav.${item.key}`)}
            </Link>
          );
        })}
      </nav>

      {/* Verified badge */}
      {hasShop && shop?.is_verified && (
        <div className="p-4 mx-3 mb-4 rounded-lg bg-sidebar-accent/30">
          <div className="flex items-center gap-2 text-sm">
            <BadgeCheck className="h-5 w-5 text-sidebar-primary" />
            <span className="font-medium">{t('dashboard.account.verified')}</span>
          </div>
        </div>
      )}
    </aside>
  );
}
