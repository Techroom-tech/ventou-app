import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Zap } from 'lucide-react';

import { useShop } from '@/hooks/useShop';
import { useFlashPromotions, useCreateFlashPromotion, useToggleFlashPromotion, useDeleteFlashPromotion } from '@/hooks/useFlashPromotions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

export default function MarketingPromos() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { shop } = useShop();
  const { data: promos, isLoading } = useFlashPromotions(shop?.id);
  const createMut = useCreateFlashPromotion();
  const toggleMut = useToggleFlashPromotion();
  const deleteMut = useDeleteFlashPromotion();

  const { data: products } = useQuery({
    queryKey: ['products_list', shop?.id],
    queryFn: async () => {
      if (!shop?.id) return [];
      const { data } = await supabase.from('products').select('id, name').eq('shop_id', shop.id).eq('is_active', true).order('name');
      return data ?? [];
    },
    enabled: !!shop?.id,
  });

  const [open, setOpen] = useState(false);
  const [productId, setProductId] = useState('');
  const [discountType, setDiscountType] = useState('percentage');
  const [discountValue, setDiscountValue] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [showBadge, setShowBadge] = useState(true);
  const [showCountdown, setShowCountdown] = useState(true);

  const handleCreate = async () => {
    if (!shop || !productId || !discountValue || !startsAt || !endsAt) return;
    await createMut.mutateAsync({
      shop_id: shop.id,
      product_id: productId,
      discount_type: discountType,
      discount_value: Number(discountValue),
      starts_at: new Date(startsAt).toISOString(),
      ends_at: new Date(endsAt).toISOString(),
      show_badge: showBadge,
      show_countdown: showCountdown,
    });
    toast.success(t('common.success'));
    setOpen(false);
    setProductId(''); setDiscountValue(''); setStartsAt(''); setEndsAt('');
  };

  const productName = (id: string) => products?.find(p => p.id === id)?.name ?? id.slice(0, 8);

  const getStatus = (p: any) => {
    if (!p.is_active) return 'paused';
    const now = new Date();
    if (new Date(p.ends_at) < now) return 'expired';
    if (new Date(p.starts_at) > now) return 'scheduled';
    return 'active';
  };

  const statusBadge = (status: string) => {
    const variant = status === 'active' ? 'default' : status === 'expired' ? 'destructive' : 'secondary';
    return <Badge variant={variant}>{status}</Badge>;
  };

  return (
    <>
      <div className="max-w-[1200px] mx-auto px-4 md:px-8 pb-12 space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard/marketing')} className="shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-[28px] font-semibold text-foreground tracking-tight">{t('marketing.hub.promos')}</h1>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-[hsl(25,100%,50%)] hover:bg-[hsl(25,100%,45%)] text-white">
                <Plus className="h-4 w-4 mr-1" />{t('marketing.promos.create')}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[600px]">
              <DialogHeader><DialogTitle>{t('marketing.promos.create')}</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <Select value={productId} onValueChange={setProductId}>
                  <SelectTrigger><SelectValue placeholder={t('marketing.promos.selectProduct')} /></SelectTrigger>
                  <SelectContent>
                    {products?.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <div className="flex gap-2">
                  <Select value={discountType} onValueChange={setDiscountType}>
                    <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">%</SelectItem>
                      <SelectItem value="fixed">FCFA</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input type="number" placeholder={t('marketing.coupons.value')} value={discountValue} onChange={(e) => setDiscountValue(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-muted-foreground">{t('marketing.promos.startsAt')}</label>
                    <Input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">{t('marketing.promos.endsAt')}</label>
                    <Input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <Checkbox id="showBadge" checked={showBadge} onCheckedChange={(v) => setShowBadge(!!v)} />
                    <Label htmlFor="showBadge" className="text-sm">{t('marketing.promos.showBadge')}</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox id="showCountdown" checked={showCountdown} onCheckedChange={(v) => setShowCountdown(!!v)} />
                    <Label htmlFor="showCountdown" className="text-sm">{t('marketing.promos.showCountdown')}</Label>
                  </div>
                </div>
                <Button className="w-full bg-[hsl(25,100%,50%)] hover:bg-[hsl(25,100%,45%)] text-white" onClick={handleCreate} disabled={createMut.isPending}>{t('common.save')}</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Zap className="h-4 w-4" />{t('marketing.promos.list')}</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
            ) : !promos?.length ? (
              <p className="text-sm text-muted-foreground">{t('marketing.promos.empty')}</p>
            ) : (
              <div className="space-y-3">
                {promos.map((p) => {
                  const status = getStatus(p);
                  return (
                    <div key={p.id} className="flex items-center gap-3 p-4 rounded-xl border border-border">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm">{productName(p.product_id)}</span>
                          {statusBadge(status)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          -{p.discount_value}{p.discount_type === 'percentage' ? '%' : ' FCFA'} · {format(new Date(p.starts_at), 'dd/MM HH:mm')} → {format(new Date(p.ends_at), 'dd/MM HH:mm')}
                        </p>
                      </div>
                      <Switch checked={p.is_active} onCheckedChange={(v) => toggleMut.mutate({ id: p.id, shop_id: shop!.id, is_active: v })} />
                      <Button variant="ghost" size="icon" onClick={() => deleteMut.mutate({ id: p.id, shop_id: shop!.id })}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
