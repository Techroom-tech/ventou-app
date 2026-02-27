import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useShop } from '@/hooks/useShop';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { ArrowRight, Plus, Check } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const MAX_SHOPS = 4;

interface ShopSwitcherModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ShopSwitcherModal({ open, onOpenChange }: ShopSwitcherModalProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { shops, shop: activeShop, selectShop, isLoading } = useShop();

  const handleSelectShop = (shopId: string) => {
    selectShop(shopId);
    onOpenChange(false);
    window.location.reload();
  };

  const handleCreateShop = () => {
    onOpenChange(false);
    navigate('/dashboard/create-shop');
  };

  const canCreate = shops.length < MAX_SHOPS;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-3xl p-6">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl font-serif">
            {t('dashboard.shopSwitcher.title', 'Changer de boutique')}
          </DialogTitle>
        </DialogHeader>

        <div className="mt-4 space-y-2">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2].map(i => <Skeleton key={i} className="h-16 w-full rounded-2xl" />)}
            </div>
          ) : (
            shops.map(s => {
              const isActive = s.id === activeShop?.id;
              return (
                <button
                  key={s.id}
                  onClick={() => handleSelectShop(s.id)}
                  className={`w-full flex items-center gap-3 p-4 rounded-2xl transition-colors ${
                    isActive
                      ? 'bg-accent/10 border-2 border-accent'
                      : 'bg-muted hover:bg-muted/80 border-2 border-transparent'
                  }`}
                >
                  <Avatar className="h-10 w-10 rounded-lg shrink-0">
                    <AvatarImage src={s.logo_url || undefined} />
                    <AvatarFallback className="rounded-lg bg-primary text-primary-foreground text-sm font-bold">
                      {s.name?.[0]?.toUpperCase() || 'V'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="flex-1 text-left text-sm font-semibold text-foreground truncate">
                    {s.name}
                  </span>
                  {isActive ? (
                    <div className="p-1.5 rounded-full bg-accent">
                      <Check className="h-4 w-4 text-accent-foreground" />
                    </div>
                  ) : (
                    <div className="p-1.5 rounded-full bg-accent/20">
                      <ArrowRight className="h-4 w-4 text-accent" />
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>

        <Button
          onClick={handleCreateShop}
          disabled={!canCreate}
          className="w-full mt-4 h-12 rounded-2xl bg-accent text-accent-foreground hover:bg-accent/90 text-sm font-semibold"
        >
          <Plus className="h-4 w-4 mr-2" />
          {t('dashboard.shopSwitcher.create', 'Créer une boutique')}
          {!canCreate && ` (${MAX_SHOPS}/${MAX_SHOPS})`}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
