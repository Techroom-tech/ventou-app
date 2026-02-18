import { useState, useCallback, memo } from 'react';
import { Check, ChevronDown, Plus, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';

export interface Category {
  id: string;
  name: string;
  slug: string;
}

interface CategoryPickerProps {
  shopId: string;
  value: string | null; // category_id
  categories: Category[];
  onSelect: (categoryId: string | null) => void;
  onCategoryCreated: (category: Category) => void;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export const CategoryPicker = memo(function CategoryPicker({
  shopId,
  value,
  categories,
  onSelect,
  onCategoryCreated,
}: CategoryPickerProps) {
  const [open, setOpen] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedCategory = categories.find((c) => c.id === value);

  const handleCreate = useCallback(async () => {
    const name = newName.trim();
    if (!name) return;
    const slug = slugify(name);
    setCreating(true);
    setError(null);
    try {
      const { data, error: dbError } = await supabase
        .from('categories')
        .insert({ shop_id: shopId, name, slug })
        .select('id, name, slug')
        .single();
      if (dbError) throw dbError;
      const created: Category = { id: data.id, name: data.name, slug: data.slug };
      onCategoryCreated(created);
      onSelect(created.id);
      setNewName('');
      setShowCreate(false);
      setOpen(false);
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la création');
    } finally {
      setCreating(false);
    }
  }, [newName, shopId, onCategoryCreated, onSelect]);

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            className="w-full justify-between font-normal h-10"
          >
            <span className={cn(!selectedCategory && 'text-muted-foreground')}>
              {selectedCategory?.name || 'Sélectionner une catégorie'}
            </span>
            <div className="flex items-center gap-1">
              {value && (
                <span
                  role="button"
                  onClick={(e) => { e.stopPropagation(); onSelect(null); }}
                  className="p-0.5 rounded hover:bg-muted"
                >
                  <X className="h-3 w-3" />
                </span>
              )}
              <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
            </div>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0 z-50" align="start">
          <div className="max-h-52 overflow-y-auto">
            {categories.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">
                Aucune catégorie. Créez-en une ci-dessous.
              </p>
            )}
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => { onSelect(cat.id); setOpen(false); }}
                className={cn(
                  'flex items-center w-full px-4 py-2.5 text-sm text-left transition-colors',
                  value === cat.id
                    ? 'bg-accent text-accent-foreground font-medium'
                    : 'hover:bg-muted'
                )}
              >
                {value === cat.id && <Check className="mr-2 h-4 w-4 shrink-0" />}
                <span className={cn(value !== cat.id && 'ml-6')}>{cat.name}</span>
              </button>
            ))}
          </div>
          <div className="border-t p-2">
            <button
              type="button"
              onClick={() => { setShowCreate(true); setOpen(false); }}
              className="flex items-center gap-2 w-full px-2 py-1.5 text-sm text-primary hover:underline rounded"
            >
              <Plus className="h-4 w-4" />
              Créer une nouvelle catégorie
            </button>
          </div>
        </PopoverContent>
      </Popover>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Nouvelle catégorie</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Nom de la catégorie</Label>
              <Input
                placeholder="Ex: Vêtements"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                autoFocus
              />
              {newName.trim() && (
                <p className="text-xs text-muted-foreground">
                  Slug : <span className="font-mono">{slugify(newName)}</span>
                </p>
              )}
              {error && <p className="text-xs text-destructive">{error}</p>}
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => { setShowCreate(false); setNewName(''); setError(null); }}
              >
                Annuler
              </Button>
              <Button
                type="button"
                className="flex-1"
                disabled={!newName.trim() || creating}
                onClick={handleCreate}
              >
                {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Créer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
});
