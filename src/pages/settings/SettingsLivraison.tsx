import { useState, useEffect } from 'react';
import { Truck, Loader2, CheckCircle2, DollarSign } from 'lucide-react';
import { SettingsPageLayout } from '@/components/settings/SettingsPageLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useShop } from '@/hooks/useShop';
import { useDeliverySettings, useUpdateDeliverySettings } from '@/hooks/useDeliverySettings';
import { toast } from 'sonner';

export default function SettingsLivraison() {
  const { shop } = useShop();
  const { data: settings, isLoading } = useDeliverySettings(shop?.id);
  const { mutateAsync: updateSettings, isPending: saving } = useUpdateDeliverySettings();
  const [saved, setSaved] = useState(false);

  const [form, setForm] = useState({
    has_delivery_fee: false,
    delivery_fee: 0,
    allow_cod: true,
    allow_whatsapp: false,
  });

  useEffect(() => {
    if (settings) {
      setForm({
        has_delivery_fee: settings.has_delivery_fee,
        delivery_fee: settings.delivery_fee,
        allow_cod: settings.allow_cod,
        allow_whatsapp: settings.allow_whatsapp,
      });
    }
  }, [settings]);

  const handleSave = async () => {
    if (!shop) return;
    try {
      await updateSettings({ ...form, shop_id: shop.id });
      setSaved(true);
      toast.success('Paramètres de livraison sauvegardés !');
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      toast.error(err?.message || 'Erreur lors de la sauvegarde');
    }
  };

  return (
    <SettingsPageLayout
      title="Livraison"
      description="Configurez vos frais et options de livraison"
    >
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Truck className="h-4 w-4 text-muted-foreground" />
            Options de livraison
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Delivery fee toggle */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <DollarSign className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <Label htmlFor="has-delivery-fee" className="text-sm font-medium cursor-pointer">
                  Frais de livraison fixes
                </Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Appliquer un montant fixe ajouté au total de la commande.
                </p>
              </div>
            </div>
            <Switch
              id="has-delivery-fee"
              checked={form.has_delivery_fee}
              onCheckedChange={v => setForm(f => ({ ...f, has_delivery_fee: v }))}
            />
          </div>

          {form.has_delivery_fee && (
            <div className="ml-8 space-y-2 animate-in fade-in-50 slide-in-from-top-2 duration-200">
              <Label>Montant des frais (FCFA)</Label>
              <Input
                type="number"
                min="0"
                step="100"
                placeholder="Ex: 500"
                value={form.delivery_fee || ''}
                onChange={e => setForm(f => ({ ...f, delivery_fee: Number(e.target.value) || 0 }))}
                className="max-w-xs"
              />
              <p className="text-xs text-muted-foreground">
                Ce montant sera affiché et ajouté au sous-total lors du checkout.
              </p>
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
