import { useState } from 'react';
import { Globe, Copy, Check, ExternalLink } from 'lucide-react';
import { SettingsPageLayout } from '@/components/settings/SettingsPageLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useShop } from '@/hooks/useShop';

export default function SettingsDomaine() {
  const { shop } = useShop();
  const [copied, setCopied] = useState(false);

  const shopUrl = shop?.slug ? `https://${shop.slug}.ventou.shop` : '';

  const handleCopy = () => {
    if (!shopUrl) return;
    navigator.clipboard.writeText(shopUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <SettingsPageLayout
      title="Domaine"
      description="URL publique de votre boutique"
    >
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Globe className="h-4 w-4 text-muted-foreground" />
            URL de votre boutique
          </CardTitle>
          <CardDescription>
            Votre boutique est accessible via cette adresse unique.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-2">
            <Label>Sous-domaine actuel</Label>
            <div className="flex items-center gap-2">
              <Input value={shopUrl} readOnly className="bg-muted font-mono text-sm" />
              <Button variant="outline" size="icon" onClick={handleCopy}>
                {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
              </Button>
              {shopUrl && (
                <Button variant="outline" size="icon" asChild>
                  <a href={shopUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Le slug de votre boutique est <span className="font-mono font-medium">{shop?.slug}</span>. Il est défini lors de la création.
            </p>
          </div>

          <div className="border-t pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Domaine personnalisé</p>
                <p className="text-xs text-muted-foreground mt-0.5">Connectez votre propre domaine (ex: maboutique.com)</p>
              </div>
              <Badge variant="secondary" className="text-xs">Bientôt</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </SettingsPageLayout>
  );
}
