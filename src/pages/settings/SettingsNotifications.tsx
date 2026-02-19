import { useState, useEffect } from 'react';
import { Bell, Mail, Loader2, CheckCircle2 } from 'lucide-react';
import { SettingsPageLayout } from '@/components/settings/SettingsPageLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useShop } from '@/hooks/useShop';
import { useNotificationSettings, useUpdateNotificationSettings } from '@/hooks/useNotificationSettings';
import { toast } from 'sonner';

export default function SettingsNotifications() {
  const { shop } = useShop();
  const { data: settings, isLoading } = useNotificationSettings(shop?.id);
  const { mutateAsync: updateSettings, isPending: saving } = useUpdateNotificationSettings();
  const [saved, setSaved] = useState(false);

  const [form, setForm] = useState({ email_orders: true, email_cancel: true, telegram_bot: '' });

  useEffect(() => {
    if (settings) {
      setForm({
        email_orders: settings.email_orders,
        email_cancel: settings.email_cancel,
        telegram_bot: settings.telegram_bot ?? '',
      });
    }
  }, [settings]);

  const handleSave = async () => {
    if (!shop) return;
    try {
      await updateSettings({
        shop_id: shop.id,
        email_orders: form.email_orders,
        email_cancel: form.email_cancel,
        telegram_bot: form.telegram_bot || null,
      });
      setSaved(true);
      toast.success('Notifications sauvegardées !');
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      toast.error(err?.message || 'Erreur lors de la sauvegarde');
    }
  };

  return (
    <SettingsPageLayout
      title="Notifications"
      description="Choisissez comment être alerté des nouvelles commandes"
    >
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="h-4 w-4 text-muted-foreground" />
            Alertes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <Mail className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <Label htmlFor="email_orders" className="text-sm font-medium cursor-pointer">
                  Email — Nouvelles commandes
                </Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Recevoir un email à chaque nouvelle commande.
                </p>
              </div>
            </div>
            <Switch id="email_orders" checked={form.email_orders} onCheckedChange={v => setForm(f => ({ ...f, email_orders: v }))} />
          </div>

          <div className="border-t" />

          <div className="flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <Mail className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <Label htmlFor="email_cancel" className="text-sm font-medium cursor-pointer">
                  Email — Annulations
                </Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Recevoir un email lorsqu'une commande est annulée.
                </p>
              </div>
            </div>
            <Switch id="email_cancel" checked={form.email_cancel} onCheckedChange={v => setForm(f => ({ ...f, email_cancel: v }))} />
          </div>

          <div className="border-t" />

          <div className="space-y-2">
            <Label htmlFor="telegram">Telegram Bot Token (optionnel)</Label>
            <Input
              id="telegram"
              value={form.telegram_bot}
              onChange={e => setForm(f => ({ ...f, telegram_bot: e.target.value }))}
              placeholder="bot123456:ABC-DEF..."
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Recevez les notifications directement sur Telegram. <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer" className="underline">Créer un bot</a>
            </p>
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
