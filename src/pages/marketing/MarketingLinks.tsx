import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Link2, Copy } from 'lucide-react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useShop } from '@/hooks/useShop';
import { useTrackedLinks, useCreateTrackedLink, useDeleteTrackedLink } from '@/hooks/useTrackedLinks';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

function genRefCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export default function MarketingLinks() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { shop } = useShop();
  const { data: links, isLoading } = useTrackedLinks(shop?.id);
  const createMut = useCreateTrackedLink();
  const deleteMut = useDeleteTrackedLink();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [targetUrl, setTargetUrl] = useState('');
  const [source, setSource] = useState('facebook');

  const handleCreate = async () => {
    if (!shop || !name || !targetUrl) return;
    await createMut.mutateAsync({
      shop_id: shop.id,
      name,
      target_url: targetUrl,
      source,
      ref_code: genRefCode(),
    });
    toast.success(t('common.success'));
    setOpen(false);
    setName(''); setTargetUrl('');
  };

  const copyLink = (link: any) => {
    const url = `${link.target_url}${link.target_url.includes('?') ? '&' : '?'}ref=${link.ref_code}`;
    navigator.clipboard.writeText(url);
    toast.success(t('dashboard.actions.shareCopied'));
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto pb-12 space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard/marketing')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-foreground">{t('marketing.hub.links')}</h1>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-1" />{t('marketing.links.create')}</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{t('marketing.links.create')}</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <Input placeholder={t('marketing.links.name')} value={name} onChange={(e) => setName(e.target.value)} />
                <Input placeholder="https://..." value={targetUrl} onChange={(e) => setTargetUrl(e.target.value)} />
                <Select value={source} onValueChange={setSource}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="facebook">Facebook</SelectItem>
                    <SelectItem value="instagram">Instagram</SelectItem>
                    <SelectItem value="tiktok">TikTok</SelectItem>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="other">{t('marketing.links.other')}</SelectItem>
                  </SelectContent>
                </Select>
                <Button className="w-full" onClick={handleCreate} disabled={createMut.isPending}>{t('common.save')}</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Link2 className="h-4 w-4" />{t('marketing.links.list')}</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
            ) : !links?.length ? (
              <p className="text-sm text-muted-foreground">{t('marketing.links.empty')}</p>
            ) : (
              <div className="space-y-3">
                {links.map((l) => (
                  <div key={l.id} className="flex items-center gap-3 p-3 rounded-lg border border-border">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">{l.name}</span>
                        <span className="text-xs bg-muted px-1.5 py-0.5 rounded">{l.source}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{l.target_url}?ref={l.ref_code}</p>
                      <p className="text-xs text-muted-foreground">{l.clicks} {t('marketing.links.clicks')}</p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => copyLink(l)}>
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => { deleteMut.mutate({ id: l.id, shop_id: shop!.id }); toast.success(t('common.success')); }}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
