import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from '@/components/ui/command';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import {
  Plus,
  Percent,
  ShoppingBag,
  Users,
  BarChart3,
  Settings,
  Home,
  Package,
  Megaphone,
  Store,
  CreditCard,
  Truck,
  Bell,
  Palette,
  Globe,
  Link,
  Zap,
} from 'lucide-react';

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const quickActions = [
  { icon: Plus, label: 'Ajouter un produit', labelEn: 'Add a product', path: '/dashboard/products/add' },
  { icon: Percent, label: 'Créer une réduction', labelEn: 'Create a discount', path: '/dashboard/marketing/coupons' },
  { icon: ShoppingBag, label: 'Voir les commandes', labelEn: 'View orders', path: '/dashboard/orders' },
  { icon: Users, label: 'Voir les clients', labelEn: 'View customers', path: '/dashboard/customers' },
  { icon: BarChart3, label: 'Voir les analytics', labelEn: 'View analytics', path: '/dashboard/marketing/analytics' },
  { icon: Settings, label: 'Paramètres', labelEn: 'Settings', path: '/dashboard/parametres' },
];

const pages = [
  { icon: Home, label: 'Tableau de bord', labelEn: 'Dashboard', path: '/dashboard' },
  { icon: Package, label: 'Produits', labelEn: 'Products', path: '/dashboard/products' },
  { icon: ShoppingBag, label: 'Commandes', labelEn: 'Orders', path: '/dashboard/orders' },
  { icon: Users, label: 'Clients', labelEn: 'Customers', path: '/dashboard/customers' },
  { icon: Megaphone, label: 'Marketing', labelEn: 'Marketing', path: '/dashboard/marketing' },
  { icon: Link, label: 'Liens trackés', labelEn: 'Tracked links', path: '/dashboard/marketing/links' },
  { icon: Zap, label: 'Promotions flash', labelEn: 'Flash promotions', path: '/dashboard/marketing/promos' },
  { icon: Settings, label: 'Paramètres', labelEn: 'Settings', path: '/dashboard/parametres' },
  { icon: Store, label: 'Identité boutique', labelEn: 'Shop identity', path: '/dashboard/parametres/identite' },
  { icon: Palette, label: 'Apparence', labelEn: 'Appearance', path: '/dashboard/parametres/apparence' },
  { icon: Globe, label: 'Domaine', labelEn: 'Domain', path: '/dashboard/parametres/domaine' },
  { icon: CreditCard, label: 'Paiement', labelEn: 'Payment', path: '/dashboard/parametres/paiement' },
  { icon: Truck, label: 'Livraison', labelEn: 'Delivery', path: '/dashboard/parametres/livraison' },
  { icon: Bell, label: 'Notifications', labelEn: 'Notifications', path: '/dashboard/parametres/notifications' },
];

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const isEn = i18n.language?.startsWith('en');

  const runAction = (path: string) => {
    onOpenChange(false);
    navigate(path);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden p-0 rounded-xl shadow-2xl max-w-[540px] gap-0 border-border">
        <Command className="rounded-xl">
          <CommandInput placeholder={isEn ? 'Start typing to search…' : 'Commencez à taper pour rechercher…'} />
          <CommandList className="max-h-[360px]">
            <CommandEmpty className="py-8 text-center text-sm text-muted-foreground">
              {isEn ? 'No results found.' : 'Aucun résultat trouvé.'}
            </CommandEmpty>

            <CommandGroup heading={isEn ? '⚡ Quick actions' : '⚡ Actions rapides'}>
              {quickActions.map((action) => (
                <CommandItem
                  key={action.path}
                  onSelect={() => runAction(action.path)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <action.icon className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-medium">{isEn ? action.labelEn : action.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>

            <CommandSeparator />

            <CommandGroup heading={isEn ? '📄 Pages' : '📄 Pages'}>
              {pages.map((page) => (
                <CommandItem
                  key={page.path}
                  onSelect={() => runAction(page.path)}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer"
                >
                  <page.icon className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm">{isEn ? page.labelEn : page.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>

          <div className="flex items-center justify-end border-t border-border px-3 py-2">
            <span className="text-[11px] text-muted-foreground">
              {isEn ? 'Close' : 'Quitter'}{' '}
              <kbd className="ml-1 inline-flex h-5 items-center rounded border border-border bg-muted px-1.5 font-mono text-[10px] text-muted-foreground">
                esc
              </kbd>
            </span>
          </div>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
