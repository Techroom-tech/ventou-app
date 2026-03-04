import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { MoreHorizontal, User, LogOut, ExternalLink, Copy, LifeBuoy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useShop } from '@/hooks/useShop';
import { useAuth } from '@/contexts/AuthContext';
import { primaryNavItems, secondaryNavItems, allNavItems, onboardingNavItems, isNavActive } from '@/config/navigation';
import { StoreAvatar } from './StoreAvatar';
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
                <item.icon size={20} strokeWidth={1.8} />
                <span>{t(`dashboard.nav.${item.key}`)}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    );
  }

  // Show first 3 primary + menu
  const bottomItems = primaryNavItems.slice(0, 3);

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

  const handleCopyLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!shop?.slug) return;
    navigator.clipboard.writeText(getStorefrontUrl(shop.slug)).then(() => {
      toast.success(t('dashboard.actions.shareCopied'));
    });
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
                <item.icon size={20} strokeWidth={1.8} />
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
            <MoreHorizontal size={20} strokeWidth={1.8} />
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
            {/* Store switcher */}
            {shop && (
              <>
                <button
                  onClick={() => { setDrawerOpen(false); setSwitcherOpen(true); }}
                  className="w-full flex items-center gap-3 px-4 py-3 min-h-[48px] rounded-lg hover:bg-muted transition-colors"
                >
                  <StoreAvatar name={shop.name} logoUrl={shop.logo_url} size={32} />
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-sm font-semibold text-foreground truncate">{shop.name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{shop.slug}.ventou.shop</p>
                  </div>
                </button>
                <div className="my-2 border-t border-border" />
              </>
            )}

            {/* All nav items */}
            {allNavItems.map((item) => {
              const isActive = isNavActive(item.path, location.pathname);
              return (
                <DrawerClose asChild key={item.key}>
                  <Link
                    to={item.path}
                    aria-current={isActive ? 'page' : undefined}
                    className={cn(
                      'flex items-center gap-3 px-4 py-3 min-h-[48px] rounded-lg text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-accent/10 text-accent'
                        : 'text-foreground hover:bg-muted'
                    )}
                  >
                    <item.icon size={20} strokeWidth={1.8} />
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
                className="flex items-center gap-3 px-4 py-3 min-h-[48px] rounded-lg text-sm font-medium text-foreground hover:bg-muted transition-colors"
              >
                <LifeBuoy size={20} strokeWidth={1.8} />
                {t('dashboard.sidebar.helpCenter', 'Centre d\'aide')}
              </Link>
            </DrawerClose>

            {/* Mon compte */}
            <DrawerClose asChild>
              <Link
                to="/dashboard/parametres/profil"
                className="flex items-center gap-3 px-4 py-3 min-h-[48px] rounded-lg text-sm font-medium text-foreground hover:bg-muted transition-colors"
              >
                <User size={20} strokeWidth={1.8} />
                {t('dashboard.nav.account', 'Mon compte')}
              </Link>
            </DrawerClose>

            <div className="my-2 border-t border-border" />

            {/* Visit shop */}
            {shop?.slug && (
              <button
                onClick={handleVisitShop}
                className="flex items-center gap-3 px-4 py-3 min-h-[48px] rounded-lg text-sm font-medium text-foreground hover:bg-muted transition-colors w-full"
              >
                <ExternalLink size={20} strokeWidth={1.8} />
                {t('dashboard.header.visitShop', 'Visiter ma boutique')}
                <Copy className="h-4 w-4 ml-auto text-muted-foreground" onClick={handleCopyLink} />
              </button>
            )}

            {/* Déconnexion */}
            <button
              onClick={handleSignOut}
              className="flex items-center gap-3 px-4 py-3 min-h-[48px] rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors w-full"
            >
              <LogOut size={20} strokeWidth={1.8} />
              {t('nav.logout')}
            </button>
          </div>
        </DrawerContent>
      </Drawer>

      <ShopSwitcherModal open={switcherOpen} onOpenChange={setSwitcherOpen} />
    </>
  );
}
