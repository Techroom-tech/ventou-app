import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Activity } from 'lucide-react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useShop } from '@/hooks/useShop';
import { useTrackingSettings, useUpdateTrackingSettings } from '@/hooks/useTrackingSettings';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

export default function MarketingPixels() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { shop } = useShop();
  const { data: settings, isLoading } = useTrackingSettings(shop?.id);
  const updateMut = useUpdateTrackingSettings();

  const [fbPixel, setFbPixel] = useState('');
  const [ttPixel, setTtPixel] = useState('');
  const [gtmId, setGtmId] = useState('');
  const [customScripts, setCustomScripts] = useState('');

  useEffect(() => {
    if (settings) {
      setFbPixel(settings.facebook_pixel ?? '');
      setTtPixel(settings.tiktok_pixel ?? '');
      setGtmId(settings.gtm_id ?? '');
      setCustomScripts(settings.custom_scripts ?? '');
    }
  }, [settings]);

  const handleSave = async () => {
    if (!shop) return;
    await updateMut.mutateAsync({
      shop_id: shop.id,
      facebook_pixel: fbPixel || null,
      tiktok_pixel: ttPixel || null,
      gtm_id: gtmId || null,
      custom_scripts: customScripts || null,
    });
    toast.success(t('common.success'));
  };

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto pb-12 space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard/marketing')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-foreground">{t('marketing.hub.pixels')}</h1>
          </div>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
        ) : (
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Activity className="h-4 w-4" />{t('marketing.hub.pixels')}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Facebook Pixel ID</Label>
                <Input placeholder="123456789" value={fbPixel} onChange={(e) => setFbPixel(e.target.value)} />
              </div>
              <div>
                <Label>TikTok Pixel ID</Label>
                <Input placeholder="ABCDEF123" value={ttPixel} onChange={(e) => setTtPixel(e.target.value)} />
              </div>
              <div>
                <Label>Google Tag Manager ID</Label>
                <Input placeholder="GTM-XXXXXX" value={gtmId} onChange={(e) => setGtmId(e.target.value)} />
              </div>
              <div>
                <Label>{t('marketing.pixels.customScripts')}</Label>
                <Textarea rows={4} placeholder="<script>...</script>" value={customScripts} onChange={(e) => setCustomScripts(e.target.value)} />
              </div>
              <Button onClick={handleSave} disabled={updateMut.isPending}>{t('common.save')}</Button>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
