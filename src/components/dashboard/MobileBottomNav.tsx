import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { MoreHorizontal, User, LogOut, ExternalLink, Copy, HelpCircle, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useShop } from '@/hooks/useShop';
import { useAuth } from '@/contexts/AuthContext';
import { primaryNavItems, secondaryNavItems, onboardingNavItems, isNavActive } from '@/config/navigation';
import { ShopSwitcherModal } from './ShopSwitcherModal';
import { toast } from 'sonner';
import { getStorefrontUrl } from '@/lib/domain';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
} from '@/components/ui/drawer';

// Override primary nav for mobile: show 4 items + Menu

export function MobileBottomNav() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { hasShop, shop } = useShop();
  const { signOut } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [switcherOpen, setSwitcherOpen] = useState(false);

  if (!hasShop) {
    return (
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border rounded-t-2xl">
        <div className="flex items-center justify-around h-16">
          {onboardingNavItems.map((item) => {
            const isActive = isNavActive(item.path, location.pathname);
            return (
              <Link
                key={item.key}
                to={item.path}
                className={cn(
                  'flex flex-col items-center gap-1 px-3 py-2 text-[11px] font-medium transition-colors',
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

  const bottomItems = [
    primaryNavItems[0], // Dashboard
    primaryNavItems[1], // Products
    primaryNavItems[2], // Orders
    { key: 'customers', icon: Users, path: '/dashboard/customers' },
  ];

  const isMenuActive = secondaryNavItems.some((item) =>
    isNavActive(item.path, location.pathname)
  );

  const handleSignOut = async () => {
    setDrawerOpen(false);
    await signOut();
    navigate('/login');
  };

  const handleVisitShop = () => {
    if (!shop?.slug) return;
    window.open(getStorefrontUrl(shop.slug), '_blank');
  };

  const handleCopyLink = () => {
    if (!shop?.slug) return;
    navigator.clipboard.writeText(getStorefrontUrl(shop.slug)).then(() => {
      toast.success(t('dashboard.actions.shareCopied'));
    });
    setDrawerOpen(false);
  };

  return (
    <>
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border rounded-t-2xl shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
        <div className="flex items-center justify-around h-16">
          {bottomItems.map((item) => {
            const isActive = isNavActive(item.path, location.pathname);
            return (
              <Link
                key={item.key}
                to={item.path}
                className={cn(
                  'flex flex-col items-center gap-1 px-3 py-2 text-[11px] font-medium transition-colors',
                  isActive ? 'text-accent' : 'text-muted-foreground'
                )}
              >
                <item.icon className="h-5 w-5 icon-interactive" />
                <span>{t(`dashboard.nav.${item.key}`)}</span>
              </Link>
            );
          })}

          {/* Menu button */}
          <button
            onClick={() => setDrawerOpen(true)}
            className={cn(
              'flex flex-col items-center gap-1 px-3 py-2 text-[11px] font-medium transition-colors',
              isMenuActive || drawerOpen ? 'text-accent' : 'text-muted-foreground'
            )}
          >
            <MoreHorizontal className="h-5 w-5 icon-interactive" />
            <span>{t('dashboard.nav.menu', 'Menu')}</span>
          </button>
        </div>
      </nav>

      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerContent>
          <DrawerHeader className="sr-only">
            <DrawerTitle>{t('dashboard.nav.menu', 'Menu')}</DrawerTitle>
          </DrawerHeader>
          <div className="px-2 pb-6 pt-2">
            {/* Secondary nav items */}
            {secondaryNavItems.map((item) => {
              const isActive = isNavActive(item.path, location.pathname);
              return (
                <DrawerClose asChild key={item.key}>
                  <Link
                    to={item.path}
                    className={cn(
                      'flex items-center gap-3 px-4 py-3 min-h-[44px] rounded-lg text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-accent/10 text-accent'
                        : 'text-foreground hover:bg-muted'
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    {t(`dashboard.nav.${item.key}`)}
                  </Link>
                </DrawerClose>
              );
            })}

            <div className="my-2 border-t border-border" />

            {/* Help center */}
            <DrawerClose asChild>
              <Link
                to="/support"
                className="flex items-center gap-3 px-4 py-3 min-h-[44px] rounded-lg text-sm font-medium text-foreground hover:bg-muted transition-colors"
              >
                <HelpCircle className="h-5 w-5" />
                {t('dashboard.sidebar.helpCenter', 'Centre d\'aide')}
              </Link>
            </DrawerClose>

            {/* Mon compte */}
            <DrawerClose asChild>
              <Link
                to="/dashboard/parametres/profil"
                className="flex items-center gap-3 px-4 py-3 min-h-[44px] rounded-lg text-sm font-medium text-foreground hover:bg-muted transition-colors"
              >
                <User className="h-5 w-5" />
                {t('dashboard.nav.account', 'Mon compte')}
              </Link>
            </DrawerClose>

            <div className="my-2 border-t border-border" />

            {/* Visit shop */}
            {shop?.slug && (
              <button
                onClick={handleVisitShop}
                className="flex items-center gap-3 px-4 py-3 min-h-[44px] rounded-lg text-sm font-medium text-foreground hover:bg-muted transition-colors w-full"
              >
                <ExternalLink className="h-5 w-5" />
                {t('dashboard.header.visitShop', 'Visiter ma boutique')}
                <Copy className="h-4 w-4 ml-auto text-muted-foreground" onClick={(e) => { e.stopPropagation(); handleCopyLink(); }} />
              </button>
            )}

            {/* Déconnexion */}
            <button
              onClick={handleSignOut}
              className="flex items-center gap-3 px-4 py-3 min-h-[44px] rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors w-full"
            >
              <LogOut className="h-5 w-5" />
              {t('nav.logout')}
            </button>
          </div>
        </DrawerContent>
      </Drawer>

      <ShopSwitcherModal open={switcherOpen} onOpenChange={setSwitcherOpen} />
    </>
  );
}
