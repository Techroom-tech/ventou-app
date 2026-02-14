import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export interface VariantInput {
  name: string;
  value: string;
  price: string;
  stock: string;
}

interface VariantsManagerProps {
  variants: VariantInput[];
  onChange: (variants: VariantInput[]) => void;
}

export function VariantsManager({ variants, onChange }: VariantsManagerProps) {
  const addVariant = () => {
    onChange([...variants, { name: '', value: '', price: '', stock: '0' }]);
  };

  const updateVariant = (index: number, field: keyof VariantInput, val: string) => {
    const updated = variants.map((v, i) => (i === index ? { ...v, [field]: val } : v));
    onChange(updated);
  };

  const removeVariant = (index: number) => {
    onChange(variants.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      {variants.map((v, i) => (
        <div key={i} className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-lg border border-border bg-muted/20">
          <div className="space-y-1">
            <Label className="text-xs">Nom (ex: Taille)</Label>
            <Input
              placeholder="Taille"
              value={v.name}
              onChange={(e) => updateVariant(i, 'name', e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Valeur (ex: XL)</Label>
            <Input
              placeholder="XL"
              value={v.value}
              onChange={(e) => updateVariant(i, 'value', e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Prix (optionnel)</Label>
            <Input
              type="number"
              min="0"
              placeholder="—"
              value={v.price}
              onChange={(e) => updateVariant(i, 'price', e.target.value)}
            />
          </div>
          <div className="space-y-1 flex gap-2 items-end">
            <div className="flex-1 space-y-1">
              <Label className="text-xs">Stock</Label>
              <Input
                type="number"
                min="0"
                value={v.stock}
                onChange={(e) => updateVariant(i, 'stock', e.target.value)}
              />
            </div>
            <Button type="button" variant="ghost" size="icon" onClick={() => removeVariant(i)} className="text-destructive h-10 w-10">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
      <Button type="button" variant="outline" onClick={addVariant} className="w-full">
        <Plus className="h-4 w-4 mr-2" /> Ajouter une variante
      </Button>
    </div>
  );
}
