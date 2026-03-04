import { useState, useEffect } from 'react';
import { BarChart2, Loader2, CheckCircle2 } from 'lucide-react';
import { SettingsPageLayout } from '@/components/settings/SettingsPageLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useShop } from '@/hooks/useShop';
import { useTrackingSettings, useUpdateTrackingSettings } from '@/hooks/useTrackingSettings';
import { toast } from 'sonner';

export default function SettingsPixels() {
  const { shop } = useShop();
  const { data: settings, isLoading } = useTrackingSettings(shop?.id);
  const { mutateAsync: updateSettings, isPending: saving } = useUpdateTrackingSettings();
  const [saved, setSaved] = useState(false);

  const [form, setForm] = useState({
    facebook_pixel: '',
    tiktok_pixel: '',
    gtm_id: '',
    custom_scripts: '',
  });

  useEffect(() => {
    if (settings) {
      setForm({
        facebook_pixel: settings.facebook_pixel ?? '',
        tiktok_pixel: settings.tiktok_pixel ?? '',
        gtm_id: settings.gtm_id ?? '',
        custom_scripts: settings.custom_scripts ?? '',
      });
    }
  }, [settings]);

  const handleSave = async () => {
    if (!shop) return;
    try {
      await updateSettings({
        shop_id: shop.id,
        facebook_pixel: form.facebook_pixel || null,
        facebook_capi_token: null,
        tiktok_pixel: form.tiktok_pixel || null,
        gtm_id: form.gtm_id || null,
        custom_scripts: form.custom_scripts || null,
      });
      setSaved(true);
      toast.success('Paramètres pixels sauvegardés !');
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      toast.error(err?.message || 'Erreur lors de la sauvegarde');
    }
  };

  return (
    <SettingsPageLayout
      title="Pixels & Tracking"
      description="Connectez vos outils d'analyse et de publicité"
    >
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart2 className="h-4 w-4 text-muted-foreground" />
            Identifiants de tracking
          </CardTitle>
          <CardDescription>Ces codes sont automatiquement injectés dans la vitrine de votre boutique.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-2">
            <Label htmlFor="fb_pixel">Facebook Pixel ID</Label>
            <Input
              id="fb_pixel"
              value={form.facebook_pixel}
              onChange={e => setForm(f => ({ ...f, facebook_pixel: e.target.value }))}
              placeholder="123456789012345"
              className="font-mono"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="tt_pixel">TikTok Pixel ID</Label>
            <Input
              id="tt_pixel"
              value={form.tiktok_pixel}
              onChange={e => setForm(f => ({ ...f, tiktok_pixel: e.target.value }))}
              placeholder="CXXXXXXXXXXXXXXX"
              className="font-mono"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="gtm">Google Tag Manager ID</Label>
            <Input
              id="gtm"
              value={form.gtm_id}
              onChange={e => setForm(f => ({ ...f, gtm_id: e.target.value }))}
              placeholder="GTM-XXXXXXX"
              className="font-mono"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="custom">Scripts personnalisés</Label>
            <Textarea
              id="custom"
              rows={4}
              value={form.custom_scripts}
              onChange={e => setForm(f => ({ ...f, custom_scripts: e.target.value }))}
              placeholder="<script>...</script>"
              className="font-mono text-xs"
            />
            <p className="text-xs text-muted-foreground">Injectés dans le {'<head>'} de votre vitrine. Utilisez avec précaution.</p>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={saving || isLoading || !shop} className="btn-ventou h-11 px-6">
          {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Sauvegarde...</> : saved ? <><CheckCircle2 className="h-4 w-4 mr-2" />Sauvegardé</> : 'Enregistrer'}
        </Button>
      </div>
    </SettingsPageLayout>
  );
}
