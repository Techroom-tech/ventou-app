import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LanguageToggle } from '@/components/LanguageToggle';
import { NotificationsPopover } from './NotificationsPopover';
import { mockShop } from '@/data/mockData';

export function DashboardHeader() {
  const { t } = useTranslation();
  const { profile, user } = useAuth();

  const getInitials = () => {
    if (profile?.first_name && profile?.last_name) {
      return `${profile.first_name[0]}${profile.last_name[0]}`.toUpperCase();
    }
    return user?.email?.[0]?.toUpperCase() || 'U';
  };

  const firstName = profile?.first_name || 'Vendeur';

  return (
    <header className="h-16 bg-card border-b border-border flex items-center justify-between px-4 sm:px-6">
      <div>
        <h1 className="text-lg font-bold text-foreground">
          {t('dashboard.welcome')} {firstName} 👋
        </h1>
        <p className="text-sm text-muted-foreground hidden sm:block">
          {mockShop.name} — {t('dashboard.overviewSubtitle')}
        </p>
      </div>

      <div className="flex items-center gap-3">
        <LanguageToggle />
        <NotificationsPopover />
        <Avatar className="h-9 w-9 cursor-pointer">
          <AvatarImage src={profile?.avatar_url || undefined} />
          <AvatarFallback className="bg-accent text-accent-foreground text-sm">
            {getInitials()}
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}
