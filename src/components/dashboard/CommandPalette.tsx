import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
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
  ChevronRight,
} from 'lucide-react';

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const quickActions = [
  { icon: Plus, label: 'Ajouter un produit', labelEn: 'Add a product', path: '/dashboard/products/add' },
  { icon: Percent, label: 'Créer une réduction', labelEn: 'Create a discount', path: '/dashboard/marketing/coupons' },
  { icon: ShoppingBag, label: 'Voir les commandes', labelEn: 'View orders', path: '/dashboard/orders' },
];

const pages = [
  { icon: Home, label: 'Tableau de bord', labelEn: 'Dashboard', path: '/dashboard' },
  { icon: Package, label: 'Produits', labelEn: 'Products', path: '/dashboard/products' },
  { icon: ShoppingBag, label: 'Commandes', labelEn: 'Orders', path: '/dashboard/orders' },
  { icon: Users, label: 'Clients', labelEn: 'Customers', path: '/dashboard/customers' },
  { icon: Megaphone, label: 'Marketing', labelEn: 'Marketing', path: '/dashboard/marketing' },
  { icon: BarChart3, label: 'Analytics', labelEn: 'Analytics', path: '/dashboard/marketing/analytics' },
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
  const [search, setSearch] = useState('');

  const runAction = (path: string) => {
    onOpenChange(false);
    navigate(path);
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[18vh]">
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 bg-black/35 backdrop-blur-sm"
            onClick={() => onOpenChange(false)}
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="relative w-[560px] max-w-[92vw] rounded-2xl bg-background shadow-[0_24px_80px_rgba(0,0,0,0.18)] overflow-hidden"
          >
            <Command className="rounded-2xl">
              {/* Search input */}
              <div className="flex items-center gap-2.5 px-4 h-12 border-b border-border">
                <CommandInput
                  placeholder={isEn ? 'Start typing to search…' : 'Commencez à taper pour rechercher…'}
                  className="h-12 text-sm"
                  value={search}
                  onValueChange={setSearch}
                />
              </div>

              <CommandList className="max-h-[340px] overflow-y-auto">
                <CommandEmpty className="py-8 text-center text-sm text-muted-foreground">
                  {isEn ? 'No results found.' : 'Aucun résultat trouvé.'}
                </CommandEmpty>

                {/* Quick Actions */}
                <CommandGroup heading={isEn ? '⚡ Quick actions' : '⚡ Actions rapides'}>
                  {quickActions.map((action) => (
                    <CommandItem
                      key={action.path}
                      onSelect={() => runAction(action.path)}
                      className="flex items-center justify-between px-3.5 py-2.5 rounded-[10px] cursor-pointer mx-1 data-[selected=true]:bg-muted/60"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                          <action.icon className="h-[18px] w-[18px] text-foreground/70" strokeWidth={1.8} />
                        </div>
                        <span className="text-sm font-medium text-foreground">{isEn ? action.labelEn : action.label}</span>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground/60 shrink-0" />
                    </CommandItem>
                  ))}
                </CommandGroup>

                {search.length > 0 && (
                  <>
                    <CommandSeparator />
                    <CommandGroup heading={isEn ? '📄 Pages' : '📄 Pages'}>
                      {pages.map((page) => (
                        <CommandItem
                          key={page.path}
                          onSelect={() => runAction(page.path)}
                          className="flex items-center justify-between px-3.5 py-2 rounded-[10px] cursor-pointer mx-1 data-[selected=true]:bg-muted/60"
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                              <page.icon className="h-[18px] w-[18px] text-foreground/70" strokeWidth={1.8} />
                            </div>
                            <span className="text-sm text-foreground">{isEn ? page.labelEn : page.label}</span>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground/60 shrink-0" />
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </>
                )}
              </CommandList>

              {/* Footer */}
              <div className="flex items-center justify-end border-t border-border px-3.5 py-2.5">
                <span className="text-xs text-muted-foreground">
                  {isEn ? 'Close' : 'Quitter'}{' '}
                  <kbd className="ml-1 inline-flex h-5 items-center rounded border border-border bg-muted px-1.5 font-mono text-[10px] text-muted-foreground">
                    esc
                  </kbd>
                </span>
              </div>
            </Command>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
