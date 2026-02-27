import { useState, useEffect } from 'react';
import { Search, Loader2, CheckCircle2 } from 'lucide-react';
import { SettingsPageLayout } from '@/components/settings/SettingsPageLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useShop } from '@/hooks/useShop';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getSeoBasePath } from '@/lib/domain';

export default function SettingsSeo() {
  const { shop, isLoading } = useShop();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({ meta_title: '', meta_description: '', og_image_url: '' });

  useEffect(() => {
    if (shop) {
      setForm({
        meta_title: (shop as any).meta_title ?? '',
        meta_description: (shop as any).meta_description ?? '',
        og_image_url: (shop as any).og_image_url ?? '',
      });
    }
  }, [shop]);

  const handleSave = async () => {
    if (!shop) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('shops')
        .update({ meta_title: form.meta_title, meta_description: form.meta_description, og_image_url: form.og_image_url, updated_at: new Date().toISOString() } as any)
        .eq('id', shop.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['shop'] });
      setSaved(true);
      toast.success('Paramètres SEO sauvegardés !');
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      toast.error(err?.message || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const titleLen = form.meta_title.length;
  const descLen = form.meta_description.length;

  return (
    <SettingsPageLayout
      title="SEO"
      description="Optimisez votre boutique pour les moteurs de recherche"
    >
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Search className="h-4 w-4 text-muted-foreground" />
            Méta-données
          </CardTitle>
          <CardDescription>Ces informations apparaissent dans les résultats Google et sur les réseaux sociaux.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="meta_title">Titre SEO</Label>
              <span className={`text-xs ${titleLen > 60 ? 'text-destructive' : 'text-muted-foreground'}`}>{titleLen}/60</span>
            </div>
            <Input
              id="meta_title"
              value={form.meta_title}
              onChange={e => setForm(f => ({ ...f, meta_title: e.target.value }))}
              placeholder="Ma boutique — Meilleurs produits au Burkina"
              maxLength={80}
            />
            <p className="text-xs text-muted-foreground">Idéalement sous 60 caractères.</p>
          </div>

          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="meta_desc">Description SEO</Label>
              <span className={`text-xs ${descLen > 160 ? 'text-destructive' : 'text-muted-foreground'}`}>{descLen}/160</span>
            </div>
            <Textarea
              id="meta_desc"
              rows={3}
              value={form.meta_description}
              onChange={e => setForm(f => ({ ...f, meta_description: e.target.value }))}
              placeholder="Découvrez notre sélection de produits de qualité..."
              maxLength={200}
            />
            <p className="text-xs text-muted-foreground">Idéalement sous 160 caractères.</p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="og_image">Image Open Graph (URL)</Label>
            <Input
              id="og_image"
              value={form.og_image_url}
              onChange={e => setForm(f => ({ ...f, og_image_url: e.target.value }))}
              placeholder="https://exemple.com/og-image.jpg"
            />
            <p className="text-xs text-muted-foreground">Apparaît lors du partage sur WhatsApp, Facebook, Twitter. Taille recommandée : 1200×630px.</p>
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      {(form.meta_title || form.meta_description) && (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Aperçu Google</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <p className="text-base font-medium text-blue-600 truncate">{form.meta_title || shop?.name}</p>
              <p className="text-xs text-green-700">{shop?.slug ? getSeoBasePath(shop.slug) : ''}</p>
              <p className="text-sm text-muted-foreground line-clamp-2">{form.meta_description}</p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={saving || isLoading || !shop} className="btn-ventou h-11 px-6">
          {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Sauvegarde...</> : saved ? <><CheckCircle2 className="h-4 w-4 mr-2" />Sauvegardé</> : 'Enregistrer'}
        </Button>
      </div>
    </SettingsPageLayout>
  );
}
