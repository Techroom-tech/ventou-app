import {
  Home,
  Package,
  ShoppingBag,
  Users,
  MessageSquare,
  Megaphone,
  Settings,
  Store,
  Lightbulb,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  key: string;
  icon: LucideIcon;
  path: string;
}

/** Primary nav — visible in sidebar + mobile bottom bar */
export const primaryNavItems: NavItem[] = [
  { key: 'dashboard', icon: Home, path: '/dashboard' },
  { key: 'products', icon: Package, path: '/dashboard/products' },
  { key: 'orders', icon: ShoppingBag, path: '/dashboard/orders' },
];

/** Secondary nav — visible in sidebar + mobile "Plus" drawer */
export const secondaryNavItems: NavItem[] = [
  { key: 'customers', icon: Users, path: '/dashboard/customers' },
  { key: 'reviews', icon: MessageSquare, path: '/dashboard/reviews' },
  { key: 'ideas', icon: Lightbulb, path: '/dashboard/ideas' },
  { key: 'marketing', icon: Megaphone, path: '/dashboard/marketing' },
  { key: 'settings', icon: Settings, path: '/dashboard/parametres' },
];

/** All nav items combined (sidebar uses this) */
export const allNavItems: NavItem[] = [...primaryNavItems, ...secondaryNavItems];

/** Onboarding nav — shown when user has no shop yet */
export const onboardingNavItems: NavItem[] = [
  { key: 'dashboard', icon: Home, path: '/dashboard' },
  { key: 'createShop', icon: Store, path: '/dashboard/create-shop' },
];

/** Shared active-state detection */
export function isNavActive(itemPath: string, currentPath: string): boolean {
  if (itemPath === '/dashboard') {
    return currentPath === '/dashboard';
  }
  return currentPath === itemPath || currentPath.startsWith(itemPath + '/');
}
