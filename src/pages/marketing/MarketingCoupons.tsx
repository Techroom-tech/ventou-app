import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Tag } from 'lucide-react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useShop } from '@/hooks/useShop';
import { useDiscountCodes, useCreateDiscountCode, useToggleDiscountCode, useDeleteDiscountCode } from '@/hooks/useDiscountCodes';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

export default function MarketingCoupons() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { shop } = useShop();
  const { data: codes, isLoading } = useDiscountCodes(shop?.id);
  const createMut = useCreateDiscountCode();
  const toggleMut = useToggleDiscountCode();
  const deleteMut = useDeleteDiscountCode();

  const [open, setOpen] = useState(false);
  const [code, setCode] = useState('');
  const [type, setType] = useState<'percentage' | 'fixed'>('percentage');
  const [value, setValue] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [usageLimit, setUsageLimit] = useState('');

  const handleCreate = async () => {
    if (!shop || !code || !value) return;
    await createMut.mutateAsync({
      shop_id: shop.id,
      code: code.toUpperCase(),
      type,
      value: Number(value),
      expires_at: expiresAt || null,
      usage_limit: usageLimit ? Number(usageLimit) : null,
    });
    toast.success(t('common.success'));
    setOpen(false);
    setCode(''); setValue(''); setExpiresAt(''); setUsageLimit('');
  };

  const getStatus = (c: any) => {
    if (!c.is_active) return 'paused';
    if (c.expires_at && new Date(c.expires_at) < new Date()) return 'expired';
    return 'active';
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto pb-12 space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard/marketing')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-foreground">{t('marketing.hub.coupons')}</h1>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-1" />{t('marketing.coupons.create')}</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{t('marketing.coupons.create')}</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <Input placeholder="CODE" value={code} onChange={(e) => setCode(e.target.value)} />
                <Select value={type} onValueChange={(v: any) => setType(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">%</SelectItem>
                    <SelectItem value="fixed">FCFA</SelectItem>
                  </SelectContent>
                </Select>
                <Input type="number" placeholder={t('marketing.coupons.value')} value={value} onChange={(e) => setValue(e.target.value)} />
                <Input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
                <Input type="number" placeholder={t('marketing.coupons.usageLimit')} value={usageLimit} onChange={(e) => setUsageLimit(e.target.value)} />
                <Button className="w-full" onClick={handleCreate} disabled={createMut.isPending}>
                  {t('common.save')}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Tag className="h-4 w-4" />{t('marketing.coupons.list')}</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
            ) : !codes?.length ? (
              <p className="text-sm text-muted-foreground">{t('marketing.coupons.empty')}</p>
            ) : (
              <div className="space-y-3">
                {codes.map((c) => {
                  const status = getStatus(c);
                  return (
                    <div key={c.id} className="flex items-center gap-3 p-3 rounded-lg border border-border">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-sm">{c.code}</span>
                          <Badge variant={status === 'active' ? 'default' : status === 'expired' ? 'destructive' : 'secondary'}>
                            {status === 'active' ? t('marketing.coupons.active') : status === 'expired' ? t('marketing.coupons.expired') : t('marketing.coupons.paused')}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {c.type === 'percentage' ? `${c.value}%` : `${c.value} FCFA`} · {t('marketing.coupons.used')}: {c.used_count}/{c.usage_limit ?? '∞'}
                        </p>
                      </div>
                      <Switch
                        checked={c.is_active}
                        onCheckedChange={(v) => toggleMut.mutate({ id: c.id, shop_id: shop!.id, is_active: v })}
                      />
                      <Button variant="ghost" size="icon" onClick={() => { deleteMut.mutate({ id: c.id, shop_id: shop!.id }); toast.success(t('common.success')); }}>
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
    </DashboardLayout>
  );
}
