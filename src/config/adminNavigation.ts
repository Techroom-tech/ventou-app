import {
  LayoutDashboard,
  Users,
  Store,
  Package,
  Flag,
  CreditCard,
  Shield,
  Settings,
  Bug,
} from 'lucide-react';
import type { AdminNavItem, AdminRole } from '@/types/admin';

export const adminNavItems: AdminNavItem[] = [
  { key: 'dashboard', icon: LayoutDashboard, path: '/admin' },
  { key: 'vendors', icon: Users, path: '/admin/vendors' },
  { key: 'stores', icon: Store, path: '/admin/stores' },
  { key: 'deleted-stores', icon: Store, path: '/admin/deleted-stores', roles: ['super_admin'] },
  { key: 'products', icon: Package, path: '/admin/products' },
  { key: 'reports', icon: Flag, path: '/admin/reports' },
  { key: 'subscriptions', icon: CreditCard, path: '/admin/subscriptions' },
  { key: 'users', icon: Shield, path: '/admin/users' },
  { key: 'shop-diagnostic', icon: Bug, path: '/admin/shop-diagnostic', roles: ['super_admin'] },
  { key: 'settings', icon: Settings, path: '/admin/settings', roles: ['super_admin'] },
];

export function isAdminNavActive(itemPath: string, currentPath: string): boolean {
  if (itemPath === '/admin') return currentPath === '/admin';
  return currentPath.startsWith(itemPath);
}

export function filterNavByRole(role: AdminRole): AdminNavItem[] {
  return adminNavItems.filter((item) => {
    if (!item.roles) return true;
    return item.roles.includes(role);
  });
}
