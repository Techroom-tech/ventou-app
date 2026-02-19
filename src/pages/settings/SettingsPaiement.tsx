import { useState, useEffect } from 'react';
import { CreditCard, MessageCircle, Loader2, CheckCircle2, Truck } from 'lucide-react';
import { SettingsPageLayout } from '@/components/settings/SettingsPageLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useShop } from '@/hooks/useShop';
import { usePaymentSettings, useUpdatePaymentSettings } from '@/hooks/usePaymentSettings';
import { toast } from 'sonner';

export default function SettingsPaiement() {
  const { shop } = useShop();
  const { data: settings, isLoading } = usePaymentSettings(shop?.id);
  const { mutateAsync: updateSettings, isPending: saving } = useUpdatePaymentSettings();
  const [saved, setSaved] = useState(false);

  const [form, setForm] = useState({
    cod_enabled: true,
    whatsapp_enabled: false,
    whatsapp_number: '',
  });

  useEffect(() => {
    if (settings) {
      setForm({
        cod_enabled: settings.cod_enabled,
        whatsapp_enabled: settings.whatsapp_enabled,
        whatsapp_number: settings.whatsapp_number ?? '',
      });
    }
  }, [settings]);

  const handleSave = async () => {
    if (!shop) return;
    try {
      await updateSettings({
        shop_id: shop.id,
        cod_enabled: form.cod_enabled,
        whatsapp_enabled: form.whatsapp_enabled,
        whatsapp_number: form.whatsapp_number || null,
      });
      setSaved(true);
      toast.success('Paramètres de paiement sauvegardés !');
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      toast.error(err?.message || 'Erreur lors de la sauvegarde');
    }
  };

  return (
    <SettingsPageLayout
      title="Paiement"
      description="Modes de paiement acceptés sur votre boutique"
    >
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CreditCard className="h-4 w-4 text-muted-foreground" />
            Méthodes de paiement
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* COD */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <Truck className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <Label htmlFor="cod" className="text-sm font-medium cursor-pointer">
                  Paiement à la livraison (COD)
                </Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Le client paie en espèces lors de la réception.
                </p>
              </div>
            </div>
            <Switch id="cod" checked={form.cod_enabled} onCheckedChange={v => setForm(f => ({ ...f, cod_enabled: v }))} />
          </div>

          <div className="border-t" />

          {/* WhatsApp */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <MessageCircle className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <Label htmlFor="whatsapp" className="text-sm font-medium cursor-pointer">
                  Commandes via WhatsApp
                </Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Les clients passent commande directement via WhatsApp.
                </p>
              </div>
            </div>
            <Switch id="whatsapp" checked={form.whatsapp_enabled} onCheckedChange={v => setForm(f => ({ ...f, whatsapp_enabled: v }))} />
          </div>

          {form.whatsapp_enabled && (
            <div className="ml-8 space-y-2 animate-in fade-in-50 slide-in-from-top-2 duration-200">
              <Label>Numéro WhatsApp</Label>
              <Input
                value={form.whatsapp_number}
                onChange={e => setForm(f => ({ ...f, whatsapp_number: e.target.value }))}
                placeholder="+226 70 00 00 00"
                className="max-w-xs"
              />
            </div>
          )}
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
