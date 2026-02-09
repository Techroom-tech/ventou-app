import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Bell, ShoppingCart, CreditCard, Info, Shield } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { mockNotifications } from '@/data/mockData';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { Notification } from '@/types/shop';

const typeIcons: Record<Notification['type'], typeof Bell> = {
  new_order: ShoppingCart,
  payment_confirmed: CreditCard,
  security_alert: Shield,
  info: Info,
};

export function NotificationsPopover() {
  const { t, i18n } = useTranslation();
  const [notifications] = useState(mockNotifications);
  const unreadCount = notifications.filter(n => !n.is_read).length;
  const locale = i18n.language === 'fr' ? fr : undefined;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-3 border-b border-border">
          <h3 className="font-semibold text-sm">{t('dashboard.notifications.title')}</h3>
        </div>
        <div className="max-h-72 overflow-y-auto">
          {notifications.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground text-center">
              {t('dashboard.notifications.empty')}
            </p>
          ) : (
            notifications.map((notif) => {
              const Icon = typeIcons[notif.type];
              return (
                <div
                  key={notif.id}
                  className={cn(
                    'flex gap-3 px-3 py-3 border-b border-border last:border-0 hover:bg-muted/50 transition-colors',
                    !notif.is_read && 'bg-accent/5'
                  )}
                >
                  <div className="p-2 rounded-lg bg-muted flex-shrink-0">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn('text-sm', !notif.is_read && 'font-semibold')}>{notif.title}</p>
                    {notif.message && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{notif.message}</p>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true, locale })}
                    </p>
                  </div>
                  {!notif.is_read && (
                    <div className="w-2 h-2 rounded-full bg-accent flex-shrink-0 mt-2" />
                  )}
                </div>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
