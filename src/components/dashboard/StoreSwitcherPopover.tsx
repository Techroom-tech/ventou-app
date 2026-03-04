import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Check, Plus } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useShop } from '@/hooks/useShop';
import { StoreAvatar } from './StoreAvatar';
import { Separator } from '@/components/ui/separator';
import { type ReactNode } from 'react';

const MAX_SHOPS = 4;

interface StoreSwitcherPopoverProps {
  children: ReactNode;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function StoreSwitcherPopover({ children, open, onOpenChange }: StoreSwitcherPopoverProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { shops, shop: activeShop, selectShop } = useShop();

  const handleSelect = (id: string) => {
    selectShop(id);
    onOpenChange(false);
    window.location.reload();
  };

  const handleCreate = () => {
    onOpenChange(false);
    navigate('/dashboard/create-shop');
  };

  const canCreate = shops.length < MAX_SHOPS;

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent side="bottom" align="start" className="w-64 p-2">
        <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
          {t('dashboard.shopSwitcher.title', 'Mes boutiques')}
        </p>

        <div className="space-y-0.5">
          {shops.map((s) => {
            const isActive = s.id === activeShop?.id;
            return (
              <button
                key={s.id}
                onClick={() => handleSelect(s.id)}
                className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm transition-colors hover:bg-muted"
              >
                <StoreAvatar name={s.name} logoUrl={s.logo_url} size={28} />
                <div className="flex-1 min-w-0 text-left">
                  <p className="font-medium text-foreground truncate text-[13px]">{s.name}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{s.slug}.ventou.shop</p>
                </div>
                {isActive && <Check className="h-4 w-4 text-accent shrink-0" />}
              </button>
            );
          })}
        </div>

        <Separator className="my-1.5" />

        <button
          onClick={handleCreate}
          disabled={!canCreate}
          className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm font-medium text-accent hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="h-4 w-4" />
          {t('dashboard.shopSwitcher.create', 'Créer une boutique')}
          {!canCreate && ` (${MAX_SHOPS}/${MAX_SHOPS})`}
        </button>
      </PopoverContent>
    </Popover>
  );
}
