import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useShop } from '@/hooks/useShop';
import { useDataMask } from '@/contexts/DataMaskContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { NotificationsPopover } from './NotificationsPopover';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LogOut, User, Search, Store, Copy, Eye, EyeOff, Globe } from 'lucide-react';
import { toast } from 'sonner';
import { getStorefrontUrl } from '@/lib/domain';
import { CommandPalette } from './CommandPalette';
import { useState, useEffect } from 'react';

export function DashboardHeader() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { profile, user, signOut } = useAuth();
  const { shop } = useShop();
  const { isMasked, toggleMask } = useDataMask();
  const [cmdOpen, setCmdOpen] = useState(false);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setCmdOpen((o) => !o);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const getInitials = () => {
    if (profile?.first_name && profile?.last_name) {
      return `${profile.first_name[0]}${profile.last_name[0]}`.toUpperCase();
    }
    return user?.email?.[0]?.toUpperCase() || 'U';
  };

  const handleSignOut = async () => {
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
  };

  const switchLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    localStorage.setItem('i18nextLng', lng);
  };

  const currentLang = i18n.language?.startsWith('en') ? 'en' : 'fr';

  return (
    <header className="h-14 bg-card border-b border-border flex items-center gap-3 px-4 sm:px-6">
      {/* Logo - mobile only */}
      <div className="lg:hidden flex items-center gap-2 shrink-0">
        <div className="w-7 h-7 bg-primary rounded-md flex items-center justify-center">
          <span className="text-primary-foreground font-bold text-xs">V</span>
        </div>
        <span className="text-base font-bold text-foreground">VENTOU</span>
      </div>

      {/* Search trigger - desktop */}
      <div className="hidden lg:flex flex-1 max-w-md">
        <button
          onClick={() => setCmdOpen(true)}
          className="w-full h-9 flex items-center gap-2 px-3 rounded-lg bg-muted text-xs text-muted-foreground cursor-pointer hover:bg-muted/80 transition-colors"
        >
          <Search className="h-4 w-4 shrink-0" />
          <span className="flex-1 text-left truncate">
            {t('dashboard.header.search', 'Trouvez n\'importe quoi…')}
          </span>
          <kbd className="hidden sm:inline-flex h-5 items-center rounded border border-border bg-background px-1.5 font-mono text-[10px] text-muted-foreground">
            ⌘K
          </kbd>
        </button>
      </div>

      <CommandPalette open={cmdOpen} onOpenChange={setCmdOpen} />

      {/* Right actions */}
      <div className="flex items-center gap-1.5 ml-auto">
        {/* Visit shop */}
        {shop?.slug && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleVisitShop}
            className="hidden sm:flex h-8 rounded-lg text-xs gap-1.5 px-3 border-border"
          >
            <Store className="h-4 w-4" />
            {t('dashboard.header.visitShop', 'Visiter ma boutique')}
          </Button>
        )}

        {/* Copy link */}
        {shop?.slug && (
          <button
            onClick={handleCopyLink}
            className="hidden sm:flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted transition-colors"
            title={t('dashboard.actions.shareSub')}
          >
            <Copy className="h-4 w-4" />
          </button>
        )}

        {/* Mask toggle */}
        <button
          onClick={toggleMask}
          className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted transition-colors"
          title={t('dashboard.header.maskData', 'Masquer les données')}
        >
          {isMasked ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>

        <NotificationsPopover />

        {/* Profile dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Avatar className="h-8 w-8 cursor-pointer">
              <AvatarImage src={profile?.avatar_url || undefined} />
              <AvatarFallback className="bg-accent text-accent-foreground text-xs">
                {getInitials()}
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[260px] rounded-xl p-3 shadow-lg">
            {/* User info */}
            <div className="flex items-center gap-3 px-1 pb-3">
              <Avatar className="h-10 w-10 shrink-0">
                <AvatarImage src={profile?.avatar_url || undefined} />
                <AvatarFallback className="bg-accent text-accent-foreground text-sm">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">
                  {profile?.first_name ? `${profile.first_name} ${profile.last_name || ''}`.trim() : (user?.email?.split('@')[0] || 'User')}
                </p>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              </div>
            </div>
            <DropdownMenuSeparator />

            {/* Language */}
            <DropdownMenuLabel className="text-[11px] uppercase text-muted-foreground font-medium tracking-wide px-1">
              <Globe className="h-3.5 w-3.5 inline mr-1.5 -mt-0.5" />
              {t('dashboard.profile.language', 'Langue')}
            </DropdownMenuLabel>
            <div className="flex gap-1 px-1 pb-1">
              <button
                onClick={() => switchLanguage('fr')}
                className={`flex-1 text-xs py-1.5 rounded-md font-medium transition-colors ${currentLang === 'fr' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-muted-foreground'}`}
              >
                🇫🇷 Français
              </button>
              <button
                onClick={() => switchLanguage('en')}
                className={`flex-1 text-xs py-1.5 rounded-md font-medium transition-colors ${currentLang === 'en' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-muted-foreground'}`}
              >
                🇬🇧 English
              </button>
            </div>

            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/dashboard/parametres/profil')} className="rounded-lg">
              <User className="h-4 w-4 mr-2" />
              {t('dashboard.myAccount', 'Mon compte')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive rounded-lg">
              <LogOut className="h-4 w-4 mr-2" />
              {t('dashboard.signOut', 'Se déconnecter')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
