import { useState } from 'react';
import { Plus, Trash2, ToggleLeft, Tag, Loader2 } from 'lucide-react';
import { SettingsPageLayout } from '@/components/settings/SettingsPageLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useShop } from '@/hooks/useShop';
import {
  useDiscountCodes, useCreateDiscountCode, useToggleDiscountCode, useDeleteDiscountCode,
} from '@/hooks/useDiscountCodes';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function SettingsCodesPromo() {
  const { shop } = useShop();
  const { data: codes = [], isLoading } = useDiscountCodes(shop?.id);
  const { mutateAsync: createCode, isPending: creating } = useCreateDiscountCode();
  const { mutateAsync: toggleCode } = useToggleDiscountCode();
  const { mutateAsync: deleteCode } = useDeleteDiscountCode();

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ code: '', type: 'percentage' as 'percentage' | 'fixed', value: '', expires_at: '', usage_limit: '' });

  const handleCreate = async () => {
    if (!shop || !form.code.trim() || !form.value) return;
    try {
      await createCode({
        shop_id: shop.id,
        code: form.code.trim().toUpperCase(),
        type: form.type,
        value: Number(form.value),
        expires_at: form.expires_at || null,
        usage_limit: form.usage_limit ? Number(form.usage_limit) : null,
      });
      toast.success('Code promo créé !');
      setForm({ code: '', type: 'percentage', value: '', expires_at: '', usage_limit: '' });
      setShowForm(false);
    } catch (err: any) {
      toast.error(err?.message || 'Erreur lors de la création');
    }
  };

  const handleToggle = async (id: string, is_active: boolean) => {
    if (!shop) return;
    await toggleCode({ id, shop_id: shop.id, is_active: !is_active });
  };

  const handleDelete = async (id: string) => {
    if (!shop) return;
    await deleteCode({ id, shop_id: shop.id });
    toast.success('Code supprimé');
  };

  return (
    <SettingsPageLayout
      title="Codes promo"
      description="Créez et gérez des codes de réduction pour vos clients"
    >
      {/* Action button */}
      <div className="flex justify-end">
        <Button onClick={() => setShowForm(v => !v)} size="sm" className="btn-ventou gap-2">
          <Plus className="h-4 w-4" />
          Nouveau code
        </Button>
      </div>

      {/* Creation form */}
      {showForm && (
        <Card className="animate-in fade-in-50 slide-in-from-top-2 duration-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Tag className="h-4 w-4 text-muted-foreground" />
              Nouveau code promo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Code *</Label>
                <Input
                  value={form.code}
                  onChange={e => setForm(f => ({ ...f, code: e.target.value }))}
                  placeholder="EX: PROMO20"
                  className="font-mono uppercase"
                />
              </div>
              <div className="grid gap-2">
                <Label>Type *</Label>
                <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v as 'percentage' | 'fixed' }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Pourcentage (%)</SelectItem>
                    <SelectItem value="fixed">Montant fixe (FCFA)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Valeur *</Label>
                <Input
                  type="number"
                  min="0"
                  value={form.value}
                  onChange={e => setForm(f => ({ ...f, value: e.target.value }))}
                  placeholder={form.type === 'percentage' ? 'Ex: 20' : 'Ex: 500'}
                />
              </div>
              <div className="grid gap-2">
                <Label>Limite d'utilisation</Label>
                <Input
                  type="number"
                  min="0"
                  value={form.usage_limit}
                  onChange={e => setForm(f => ({ ...f, usage_limit: e.target.value }))}
                  placeholder="Illimité"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Date d'expiration (optionnel)</Label>
              <Input
                type="datetime-local"
                value={form.expires_at}
                onChange={e => setForm(f => ({ ...f, expires_at: e.target.value }))}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCreate} disabled={creating || !form.code || !form.value} className="btn-ventou">
                {creating ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Création...</> : 'Créer le code'}
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Annuler</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Codes list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Codes actifs</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : codes.length === 0 ? (
            <div className="text-center py-8">
              <Tag className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Aucun code promo pour l'instant</p>
            </div>
          ) : (
            <div className="space-y-2">
              {codes.map(code => (
                <div key={code.id} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/30">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold text-sm">{code.code}</span>
                      <Badge variant={code.is_active ? 'default' : 'secondary'} className="text-xs">
                        {code.type === 'percentage' ? `${code.value}%` : `${code.value} FCFA`}
                      </Badge>
                      {!code.is_active && <Badge variant="outline" className="text-xs text-muted-foreground">Désactivé</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {code.used_count} utilisation(s)
                      {code.usage_limit ? ` / ${code.usage_limit}` : ''}
                      {code.expires_at ? ` · Expire le ${format(new Date(code.expires_at), 'dd/MM/yyyy')}` : ''}
                    </p>
                  </div>
                  <Switch checked={code.is_active} onCheckedChange={() => handleToggle(code.id, code.is_active)} />
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(code.id)} className="text-destructive hover:text-destructive h-8 w-8">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </SettingsPageLayout>
  );
}
