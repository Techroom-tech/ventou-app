import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Link2, Copy, BarChart3 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

import { useShop } from '@/hooks/useShop';
import { useTrackedLinks, useCreateTrackedLink, useDeleteTrackedLink } from '@/hooks/useTrackedLinks';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

function genRefCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function buildFullUrl(link: { target_url: string; ref_code: string }) {
  return `${link.target_url}${link.target_url.includes('?') ? '&' : '?'}ref=${link.ref_code}`;
}

function LastActivity({ date }: { date: string | null }) {
  if (!date) return <span className="text-muted-foreground text-xs">Jamais</span>;
  return (
    <span className="text-xs text-muted-foreground">
      {formatDistanceToNow(new Date(date), { addSuffix: true, locale: fr })}
    </span>
  );
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
   const [source, setSource] = useState('facebook_ads');
   const [destMode, setDestMode] = useState<'product' | 'link'>('product');
  const [selectedProductId, setSelectedProductId] = useState('');

  const { data: products } = useQuery({
    queryKey: ['products-for-links', shop?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, slug')
        .eq('shop_id', shop!.id)
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!shop?.id && open,
  });

  const resolvedUrl = (() => {
    if (destMode === 'link') return targetUrl;
    const prod = products?.find((p) => p.id === selectedProductId);
    if (!prod?.slug || !shop?.slug) return '';
    return `https://${shop.slug}.ventou.shop/produit/${prod.slug}`;
  })();

  const handleCreate = async () => {
    if (!shop || !name || !resolvedUrl) return;
    await createMut.mutateAsync({
      shop_id: shop.id,
      name,
      target_url: resolvedUrl,
      source,
      ref_code: genRefCode(),
    });
    toast.success(t('common.success'));
    setOpen(false);
    setName(''); setTargetUrl(''); setSelectedProductId('');
  };

  const copyLink = (link: { target_url: string; ref_code: string }) => {
    navigator.clipboard.writeText(buildFullUrl(link));
    toast.success(t('dashboard.actions.shareCopied'));
  };

  return (
    <>
      <div className="max-w-[1200px] mx-auto px-4 md:px-8 pb-12 space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard/marketing')} className="shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-[28px] font-semibold text-foreground tracking-tight">{t('marketing.hub.links')}</h1>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-[hsl(25,100%,50%)] hover:bg-[hsl(25,100%,45%)] text-white">
                <Plus className="h-4 w-4 mr-1" />{t('marketing.links.create')}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[600px]">
              <DialogHeader><DialogTitle>{t('marketing.links.create')}</DialogTitle></DialogHeader>
              <div className="space-y-5">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">{t('marketing.links.campaignName', 'Nom de la campagne')}</Label>
                  <Input placeholder="Ex: Promo été Facebook" value={name} onChange={(e) => setName(e.target.value)} />
                  <p className="text-xs text-muted-foreground">{t('marketing.links.campaignHint', 'Donnez un nom pour identifier cette campagne')}</p>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Destination</Label>
                  <p className="text-xs text-muted-foreground">{t('marketing.links.destHint', 'Choisissez un produit ou entrez un lien personnalisé')}</p>
                  <Tabs value={destMode} onValueChange={(v) => setDestMode(v as 'product' | 'link')} className="w-full">
                    <TabsList className="w-full">
                      <TabsTrigger value="product" className="flex-1">🛍️ {t('marketing.links.pickProduct', 'Produit')}</TabsTrigger>
                      <TabsTrigger value="link" className="flex-1">🔗 {t('marketing.links.customLink', 'Lien personnalisé')}</TabsTrigger>
                    </TabsList>
                  </Tabs>
                  {destMode === 'product' ? (
                    <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                      <SelectTrigger><SelectValue placeholder={t('marketing.links.selectProduct', 'Sélectionner un produit…')} /></SelectTrigger>
                      <SelectContent>
                        {products?.map((p) => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input placeholder="Ex: https://monshop.ventou.shop/produit/..." value={targetUrl} onChange={(e) => setTargetUrl(e.target.value)} />
                  )}
                  {resolvedUrl && (
                    <p className="text-xs text-muted-foreground truncate">→ {resolvedUrl}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">{t('marketing.links.trafficSource', 'Source de trafic')}</Label>
                  <p className="text-xs text-muted-foreground">{t('marketing.links.sourceHint', "D'où viendront les visiteurs ?")}</p>
                  <Select value={source} onValueChange={setSource}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="facebook_ads">Facebook Ads</SelectItem>
                      <SelectItem value="tiktok_ads">TikTok Ads</SelectItem>
                      <SelectItem value="instagram">Instagram</SelectItem>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                      <SelectItem value="influencer">Influencer</SelectItem>
                      <SelectItem value="direct">Direct</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button className="w-full bg-[hsl(25,100%,50%)] hover:bg-[hsl(25,100%,45%)] text-white" onClick={handleCreate} disabled={createMut.isPending || !resolvedUrl}>{t('common.save')}</Button>
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
              <>
                {/* Desktop */}
                <div className="hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('marketing.links.name')}</TableHead>
                        <TableHead>Source</TableHead>
                        <TableHead>{t('marketing.links.trackingLink', 'Lien')}</TableHead>
                        <TableHead className="text-center">{t('marketing.links.clicks')}</TableHead>
                        <TableHead>{t('marketing.links.lastActivity', 'Dernière activité')}</TableHead>
                        <TableHead className="text-right"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {links.map((l) => {
                        const fullUrl = buildFullUrl(l);
                        return (
                          <TableRow key={l.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/dashboard/marketing/liens/${l.id}`)}>
                            <TableCell className="font-medium">{l.name}</TableCell>
                            <TableCell><Badge variant="secondary">{l.source}</Badge></TableCell>
                            <TableCell className="max-w-[260px]">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-mono text-muted-foreground truncate">{fullUrl}</span>
                                <Button variant="ghost" size="icon" className="shrink-0 h-7 w-7" onClick={(e) => { e.stopPropagation(); copyLink(l); }}>
                                  <Copy className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">{l.clicks}</TableCell>
                            <TableCell><LastActivity date={l.last_clicked_at} /></TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); navigate(`/dashboard/marketing/liens/${l.id}`); }}>
                                  <BarChart3 className="h-3.5 w-3.5" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); deleteMut.mutate({ id: l.id, shop_id: shop!.id }); }}>
                                  <Trash2 className="h-4 w-4 text-destructive icon-interactive" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
                {/* Mobile */}
                <div className="md:hidden space-y-3">
                  {links.map((l) => {
                    const fullUrl = buildFullUrl(l);
                    return (
                      <div key={l.id} className="p-3 rounded-xl border border-border space-y-2 cursor-pointer" onClick={() => navigate(`/dashboard/marketing/liens/${l.id}`)}>
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-semibold text-sm truncate">{l.name}</span>
                            <Badge variant="secondary" className="text-[10px] shrink-0">{l.source}</Badge>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); copyLink(l); }}>
                              <Copy className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); deleteMut.mutate({ id: l.id, shop_id: shop!.id }); }}>
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          </div>
                        </div>
                        <p className="text-[11px] font-mono text-muted-foreground truncate">{fullUrl}</p>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{l.clicks} {t('marketing.links.clicks')}</span>
                          <LastActivity date={l.last_clicked_at} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
