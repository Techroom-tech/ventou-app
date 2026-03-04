import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useShop } from '@/hooks/useShop';
import { useDataMask } from '@/contexts/DataMaskContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LanguageToggle } from '@/components/LanguageToggle';
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
import { LogOut, User, Search, ExternalLink, Copy, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { getStorefrontUrl } from '@/lib/domain';

export function DashboardHeader() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { profile, user, signOut } = useAuth();
  const { shop } = useShop();
  const { isMasked, toggleMask } = useDataMask();

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

  return (
    <header className="h-16 bg-card border-b border-border flex items-center gap-3 px-4 sm:px-6">
      {/* Logo - mobile only */}
      <div className="lg:hidden flex items-center gap-2 shrink-0">
        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
          <span className="text-primary-foreground font-bold text-sm">V</span>
        </div>
        <span className="text-lg font-bold text-foreground">VENTOU</span>
      </div>

      {/* Search bar - desktop */}
      <div className="hidden lg:flex flex-1 max-w-xl">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-muted-foreground" />
          <input
            type="text"
            readOnly
            placeholder={t('dashboard.header.search', 'Trouvez n\'importe quoi : ⌘K')}
            className="w-full h-10 pl-10 pr-4 rounded-xl bg-muted border-0 text-sm text-muted-foreground cursor-pointer focus:outline-none"
          />
        </div>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-2 ml-auto">
        {/* Visit shop - desktop */}
        {shop?.slug && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleVisitShop}
            className="hidden sm:flex rounded-full text-xs gap-1.5"
          >
            <ExternalLink className="h-[18px] w-[18px] icon-interactive" />
            {t('dashboard.header.visitShop', 'Visiter ma boutique')}
          </Button>
        )}

        {/* Copy link */}
        {shop?.slug && (
          <button
            onClick={handleCopyLink}
            className="hidden sm:flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted transition-colors"
            title={t('dashboard.actions.shareSub')}
          >
            <Copy className="h-[18px] w-[18px] icon-interactive" />
          </button>
        )}

        {/* Mask toggle */}
        <button
          onClick={toggleMask}
          className="h-9 w-9 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted transition-colors"
          title={t('dashboard.header.maskData', 'Masquer les données')}
        >
          {isMasked ? <EyeOff className="h-[18px] w-[18px] icon-interactive" /> : <Eye className="h-[18px] w-[18px] icon-interactive" />}
        </button>

        <div className="hidden sm:block">
          <LanguageToggle />
        </div>
        <NotificationsPopover />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Avatar className="h-9 w-9 cursor-pointer">
              <AvatarImage src={profile?.avatar_url || undefined} />
              <AvatarFallback className="bg-accent text-accent-foreground text-sm">
                {getInitials()}
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>{profile?.first_name || user?.email}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/dashboard/parametres/profil')}>
              <User className="h-4 w-4 mr-2" />
              {t('dashboard.myAccount', 'Mon compte')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
              <LogOut className="h-4 w-4 mr-2" />
              {t('dashboard.signOut', 'Se déconnecter')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
