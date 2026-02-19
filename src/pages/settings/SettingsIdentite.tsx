import { useState, useEffect } from 'react';
import { Loader2, CheckCircle2, Store } from 'lucide-react';
import { SettingsPageLayout } from '@/components/settings/SettingsPageLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useShop } from '@/hooks/useShop';
import { useQueryClient } from '@tanstack/react-query';
import { supabase, CURRENCIES } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const COUNTRIES = [
  { code: 'BF', name: 'Burkina Faso' },
  { code: 'SN', name: 'Sénégal' },
  { code: 'CI', name: "Côte d'Ivoire" },
  { code: 'ML', name: 'Mali' },
  { code: 'GN', name: 'Guinée' },
  { code: 'TG', name: 'Togo' },
  { code: 'BJ', name: 'Bénin' },
  { code: 'NE', name: 'Niger' },
  { code: 'CM', name: 'Cameroun' },
  { code: 'GH', name: 'Ghana' },
  { code: 'NG', name: 'Nigeria' },
  { code: 'FR', name: 'France' },
];

const CATEGORIES = [
  'Mode & Vêtements', 'Électronique', 'Alimentation', 'Beauté & Cosmétiques',
  'Maison & Décoration', 'Sport & Loisirs', 'Livres & Médias', 'Santé & Bien-être',
  'Automobile', 'Artisanat', 'Services', 'Autre',
];

export default function SettingsIdentite() {
  const { shop, isLoading } = useShop();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    name: '', description: '', city: '', country: 'BF', category: '', currency: 'XOF', whatsapp: '',
  });

  useEffect(() => {
    if (shop) {
      setForm({
        name: shop.name ?? '',
        description: shop.description ?? '',
        city: shop.city ?? '',
        country: shop.country ?? 'BF',
        category: shop.category ?? '',
        currency: shop.currency ?? 'XOF',
        whatsapp: shop.whatsapp ?? '',
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
      toast.success('Identité sauvegardée !');
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      toast.error(err?.message || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SettingsPageLayout
      title="Identité de la boutique"
      description="Informations principales visibles par vos clients"
    >
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Store className="h-4 w-4 text-muted-foreground" />
            Informations générales
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-2">
            <Label htmlFor="name">Nom de la boutique *</Label>
            <Input id="name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ma boutique" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Décrivez votre boutique en quelques mots..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="city">Ville</Label>
              <Input id="city" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} placeholder="Ouagadougou" />
            </div>
            <div className="grid gap-2">
              <Label>Pays</Label>
              <Select value={form.country} onValueChange={v => setForm(f => ({ ...f, country: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {COUNTRIES.map(c => <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Catégorie</Label>
              <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Devise</Label>
              <Select value={form.currency} onValueChange={v => setForm(f => ({ ...f, currency: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map(c => <SelectItem key={c.code} value={c.code}>{c.code} — {c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="whatsapp">Numéro WhatsApp</Label>
            <Input id="whatsapp" value={form.whatsapp} onChange={e => setForm(f => ({ ...f, whatsapp: e.target.value }))} placeholder="+226 70 00 00 00" />
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
