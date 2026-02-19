import { useState, useEffect } from 'react';
import { Palette, Loader2, CheckCircle2 } from 'lucide-react';
import { SettingsPageLayout } from '@/components/settings/SettingsPageLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useShop } from '@/hooks/useShop';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

const PRESET_COLORS = [
  '#FF6B35', '#1E3A5F', '#10B981', '#8B5CF6', '#F59E0B',
  '#EF4444', '#3B82F6', '#EC4899', '#06B6D4', '#84CC16',
];

export default function SettingsApparence() {
  const { shop, isLoading } = useShop();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({ logo_url: '', banner_url: '', primary_color: '#FF6B35' });

  useEffect(() => {
    if (shop) {
      setForm({
        logo_url: shop.logo_url ?? '',
        banner_url: shop.banner_url ?? '',
        primary_color: shop.primary_color ?? '#FF6B35',
      });
    }
  }, [shop]);

  const handleSave = async () => {
    if (!shop) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('shops')
        .update({ ...form, updated_at: new Date().toISOString() })
        .eq('id', shop.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['shop'] });
      setSaved(true);
      toast.success('Apparence sauvegardée !');
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      toast.error(err?.message || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SettingsPageLayout
      title="Apparence"
      description="Personnalisez l'identité visuelle de votre boutique"
    >
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Palette className="h-4 w-4 text-muted-foreground" />
            Visuels & Couleurs
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-2">
            <Label htmlFor="logo_url">URL du logo</Label>
            <Input
              id="logo_url"
              value={form.logo_url}
              onChange={e => setForm(f => ({ ...f, logo_url: e.target.value }))}
              placeholder="https://exemple.com/logo.png"
            />
            {form.logo_url && (
              <div className="mt-2">
                <img src={form.logo_url} alt="Aperçu logo" className="h-16 w-16 object-contain rounded-lg border border-border" onError={e => (e.currentTarget.style.display = 'none')} />
              </div>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="banner_url">URL de la bannière</Label>
            <Input
              id="banner_url"
              value={form.banner_url}
              onChange={e => setForm(f => ({ ...f, banner_url: e.target.value }))}
              placeholder="https://exemple.com/banniere.jpg"
            />
            {form.banner_url && (
              <div className="mt-2">
                <img src={form.banner_url} alt="Aperçu bannière" className="h-24 w-full object-cover rounded-lg border border-border" onError={e => (e.currentTarget.style.display = 'none')} />
              </div>
            )}
          </div>

          <div className="grid gap-3">
            <Label>Couleur principale</Label>
            <div className="flex items-center gap-3 flex-wrap">
              {PRESET_COLORS.map(color => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, primary_color: color }))}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${form.primary_color === color ? 'border-foreground scale-110' : 'border-transparent'}`}
                  style={{ backgroundColor: color }}
                />
              ))}
              <input
                type="color"
                value={form.primary_color}
                onChange={e => setForm(f => ({ ...f, primary_color: e.target.value }))}
                className="w-8 h-8 rounded-full border border-border cursor-pointer"
                title="Couleur personnalisée"
              />
            </div>
            <p className="text-xs text-muted-foreground">Couleur sélectionnée : <span className="font-mono font-medium">{form.primary_color}</span></p>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={saving || isLoading} className="btn-ventou h-11 px-6">
          {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Sauvegarde...</> : saved ? <><CheckCircle2 className="h-4 w-4 mr-2" />Sauvegardé</> : 'Enregistrer'}
        </Button>
      </div>
    </SettingsPageLayout>
  );
}
