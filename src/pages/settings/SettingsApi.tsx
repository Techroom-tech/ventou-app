import { useState } from 'react';
import { Code2, Copy, Check } from 'lucide-react';
import { SettingsPageLayout } from '@/components/settings/SettingsPageLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useShop } from '@/hooks/useShop';

export default function SettingsApi() {
  const { shop } = useShop();
  const [copiedId, setCopiedId] = useState(false);
  const [copiedSlug, setCopiedSlug] = useState(false);

  const copy = (text: string, setter: (v: boolean) => void) => {
    navigator.clipboard.writeText(text);
    setter(true);
    setTimeout(() => setter(false), 2000);
  };

  return (
    <SettingsPageLayout
      title="API"
      description="Intégrez votre boutique avec des applications tierces"
    >
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Code2 className="h-4 w-4 text-muted-foreground" />
            Identifiants de la boutique
          </CardTitle>
          <CardDescription>
            Utilisez ces identifiants pour accéder aux données de votre boutique via l'API Ventou.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-2">
            <Label>Shop ID (clé publique)</Label>
            <div className="flex items-center gap-2">
              <Input
                value={shop?.id ?? '—'}
                readOnly
                className="bg-muted font-mono text-sm"
              />
              <Button variant="outline" size="icon" onClick={() => shop?.id && copy(shop.id, setCopiedId)}>
                {copiedId ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4 icon-interactive" />}
              </Button>
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Slug boutique</Label>
            <div className="flex items-center gap-2">
              <Input
                value={shop?.slug ?? '—'}
                readOnly
                className="bg-muted font-mono text-sm"
              />
              <Button variant="outline" size="icon" onClick={() => shop?.slug && copy(shop.slug, setCopiedSlug)}>
                {copiedSlug ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4 icon-interactive" />}
              </Button>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-muted/40 p-4 space-y-2">
            <p className="text-xs font-semibold text-foreground">Endpoint de la vitrine</p>
            <code className="text-xs text-muted-foreground break-all">
              GET https://chpplckgndznakuvcqbx.supabase.co/rest/v1/shops?slug=eq.{shop?.slug ?? 'votre-slug'}
            </code>
          </div>

          <p className="text-xs text-muted-foreground">
            Une documentation API complète et des clés privées seront disponibles prochainement.
          </p>
        </CardContent>
      </Card>
    </SettingsPageLayout>
  );
}
