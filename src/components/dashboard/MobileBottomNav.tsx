import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Package, ShoppingCart, Wallet, Store } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useShop } from '@/hooks/useShop';

const fullItems = [
  { key: 'dashboard', icon: LayoutDashboard, path: '/dashboard' },
  { key: 'products', icon: Package, path: '/dashboard/products' },
  { key: 'orders', icon: ShoppingCart, path: '/dashboard/orders' },
  { key: 'wallet', icon: Wallet, path: '/dashboard/wallet' },
];

const onboardingItems = [
  { key: 'dashboard', icon: LayoutDashboard, path: '/dashboard' },
  { key: 'createShop', icon: Store, path: '/dashboard/create-shop' },
];

export function MobileBottomNav() {
  const { t } = useTranslation();
  const location = useLocation();
  const { hasShop } = useShop();

  const items = hasShop ? fullItems : onboardingItems;

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border">
      <div className="flex items-center justify-around h-16">
        {items.map((item) => {
          const isActive = location.pathname === item.path ||
            (item.key === 'dashboard' && location.pathname === '/dashboard');
          return (
            <Link
              key={item.key}
              to={item.path}
              className={cn(
                'flex flex-col items-center gap-1 px-3 py-2 text-xs font-medium transition-colors',
                isActive ? 'text-accent' : 'text-muted-foreground'
              )}
            >
              <item.icon className="h-5 w-5" />
              <span>{t(`dashboard.nav.${item.key}`)}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
