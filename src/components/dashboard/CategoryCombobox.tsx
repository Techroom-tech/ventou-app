import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, ChevronDown, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface CategoryComboboxProps {
  value: string;
  onChange: (value: string) => void;
  categories: string[];
  onAddCategory: (category: string) => void;
}

export function CategoryCombobox({
  value,
  onChange,
  categories,
  onAddCategory,
}: CategoryComboboxProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isAdding && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isAdding]);

  const handleAdd = () => {
    const trimmed = newCategory.trim();
    if (trimmed && !categories.includes(trimmed)) {
      onAddCategory(trimmed);
      onChange(trimmed);
      setNewCategory('');
      setIsAdding(false);
      setOpen(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal h-10"
        >
          <span className={cn(!value && 'text-muted-foreground')}>
            {value || t('dashboard.addProduct.categoryPlaceholder')}
          </span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0 z-50" align="start">
        <div className="max-h-60 overflow-y-auto">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => {
                onChange(cat);
                setOpen(false);
              }}
              className={cn(
                'flex items-center w-full px-4 py-2.5 text-sm text-left transition-colors',
                value === cat
                  ? 'bg-accent text-accent-foreground font-medium'
                  : 'hover:bg-muted'
              )}
            >
              {value === cat && <Check className="mr-2 h-4 w-4" />}
              <span className={cn(value !== cat && 'ml-6')}>{cat}</span>
            </button>
          ))}
        </div>

        <div className="border-t p-2">
          {isAdding ? (
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                placeholder={t('dashboard.addProduct.newCategoryPlaceholder')}
                className="h-8 text-sm"
              />
              <Button size="sm" className="h-8 px-3" onClick={handleAdd}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsAdding(true)}
              className="flex items-center gap-2 w-full px-2 py-1.5 text-sm text-accent hover:underline"
            >
              <Plus className="h-4 w-4" />
              {t('dashboard.addProduct.addCategory')}
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
