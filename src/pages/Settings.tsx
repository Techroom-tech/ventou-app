import { useState, useEffect } from 'react';
import { Settings2, Truck, MessageCircle, DollarSign, Loader2, CheckCircle2 } from 'lucide-react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useShop } from '@/hooks/useShop';
import { useDeliverySettings, useUpdateDeliverySettings } from '@/hooks/useDeliverySettings';
import type { DeliverySettings } from '@/hooks/useDeliverySettings';

export default function Settings() {
  const { shop, isLoading: shopLoading } = useShop();
  const { toast } = useToast();
  const { data: savedSettings, isLoading: settingsLoading } = useDeliverySettings(shop?.id);
  const { mutateAsync: updateSettings, isPending: saving } = useUpdateDeliverySettings();

  const [form, setForm] = useState<Omit<DeliverySettings, 'id'>>({
    shop_id: '',
    allow_cod: true,
    allow_whatsapp: false,
    has_delivery_fee: false,
    delivery_fee: 0,
  });

  const [saved, setSaved] = useState(false);

  // Sync form when settings load
  useEffect(() => {
    if (savedSettings) {
      setForm({
        shop_id: savedSettings.shop_id,
        allow_cod: savedSettings.allow_cod,
        allow_whatsapp: savedSettings.allow_whatsapp,
        has_delivery_fee: savedSettings.has_delivery_fee,
        delivery_fee: savedSettings.delivery_fee,
      });
    }
  }, [savedSettings]);

  const handleSave = async () => {
    if (!shop) return;
    try {
      await updateSettings({ ...form, shop_id: shop.id });
      setSaved(true);
      toast({ title: 'Paramètres sauvegardés', description: 'Vos préférences de livraison sont à jour.' });
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      console.error('[Settings] Save error:', err);
      toast({
        title: 'Erreur',
        description: err?.message || 'Impossible de sauvegarder les paramètres.',
        variant: 'destructive',
      });
    }
  };

  if (shopLoading || settingsLoading) {
    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto space-y-6 p-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-56" />
          <Skeleton className="h-10 w-32" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Settings2 className="h-6 w-6 text-muted-foreground" />
          <div>
            <h2 className="text-xl font-bold text-foreground">Paramètres</h2>
            <p className="text-sm text-muted-foreground">Gérez les préférences de votre boutique</p>
          </div>
        </div>

        {/* Delivery & Payment Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Truck className="h-4 w-4 text-muted-foreground" />
              Livraison & Paiement
            </CardTitle>
            <CardDescription>
              Configurez les modes de paiement et les frais de livraison visibles sur votre vitrine.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* COD toggle */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <Truck className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <Label className="text-sm font-medium cursor-pointer" htmlFor="allow-cod">
                    Paiement à la livraison (COD)
                  </Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Le client paie en espèces lors de la réception de sa commande.
                  </p>
                </div>
              </div>
              <Switch
                id="allow-cod"
                checked={form.allow_cod}
                onCheckedChange={(v) => setForm((f) => ({ ...f, allow_cod: v }))}
              />
            </div>

            <div className="border-t" />

            {/* WhatsApp toggle */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <MessageCircle className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <Label className="text-sm font-medium cursor-pointer" htmlFor="allow-whatsapp">
                    Commandes via WhatsApp
                  </Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Les clients pourront passer commande directement via WhatsApp.
                  </p>
                </div>
              </div>
              <Switch
                id="allow-whatsapp"
                checked={form.allow_whatsapp}
                onCheckedChange={(v) => setForm((f) => ({ ...f, allow_whatsapp: v }))}
              />
            </div>

            <div className="border-t" />

            {/* Delivery fee toggle */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <DollarSign className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <Label className="text-sm font-medium cursor-pointer" htmlFor="has-delivery-fee">
                    Frais de livraison
                  </Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Appliquer des frais fixes ajoutés au total de la commande.
                  </p>
                </div>
              </div>
              <Switch
                id="has-delivery-fee"
                checked={form.has_delivery_fee}
                onCheckedChange={(v) => setForm((f) => ({ ...f, has_delivery_fee: v }))}
              />
            </div>

            {/* Delivery fee amount — only shown when enabled */}
            {form.has_delivery_fee && (
              <div className="ml-8 space-y-2 animate-in fade-in-50 slide-in-from-top-2 duration-200">
                <Label>Montant des frais (FCFA)</Label>
                <Input
                  type="number"
                  min="0"
                  step="100"
                  placeholder="Ex: 500"
                  value={form.delivery_fee || ''}
                  onChange={(e) => setForm((f) => ({ ...f, delivery_fee: Number(e.target.value) || 0 }))}
                  className="max-w-xs"
                />
                <p className="text-xs text-muted-foreground">
                  Ce montant sera affiché et ajouté au sous-total lors du checkout.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Save button */}
        <div className="flex items-center gap-3">
          <Button onClick={handleSave} disabled={saving || !shop} className="btn-ventou h-11 px-6">
            {saving ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sauvegarde...</>
            ) : saved ? (
              <><CheckCircle2 className="h-4 w-4 mr-2" /> Sauvegardé</>
            ) : (
              'Enregistrer les paramètres'
            )}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
