import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Link2, Copy } from 'lucide-react';

import { useShop } from '@/hooks/useShop';
import { useTrackedLinks, useCreateTrackedLink, useDeleteTrackedLink } from '@/hooks/useTrackedLinks';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
                <Button className="w-full bg-[hsl(25,100%,50%)] hover:bg-[hsl(25,100%,45%)] text-white" onClick={handleCreate} disabled={createMut.isPending}>{t('common.save')}</Button>
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
                        <TableHead>Ref</TableHead>
                        <TableHead className="text-center">{t('marketing.links.clicks')}</TableHead>
                        <TableHead className="text-right"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {links.map((l) => (
                        <TableRow key={l.id}>
                          <TableCell className="font-medium">{l.name}</TableCell>
                          <TableCell><Badge variant="secondary">{l.source}</Badge></TableCell>
                          <TableCell className="font-mono text-xs">{l.ref_code}</TableCell>
                          <TableCell className="text-center">{l.clicks}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                               <Button variant="ghost" size="icon" onClick={() => copyLink(l)}>
                                <Copy className="h-4 w-4 icon-interactive" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => deleteMut.mutate({ id: l.id, shop_id: shop!.id })}>
                                <Trash2 className="h-4 w-4 text-destructive icon-interactive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {/* Mobile */}
                <div className="md:hidden space-y-3">
                  {links.map((l) => (
                    <div key={l.id} className="flex items-center gap-3 p-3 rounded-xl border border-border">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm">{l.name}</span>
                          <Badge variant="secondary" className="text-[10px]">{l.source}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate font-mono">{l.ref_code} · {l.clicks} {t('marketing.links.clicks')}</p>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => copyLink(l)}>
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteMut.mutate({ id: l.id, shop_id: shop!.id })}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
