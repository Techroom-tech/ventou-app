import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, MoreVertical, Pencil, Copy, Trash2, Eye, EyeOff } from 'lucide-react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { ProductsEmptyState } from '@/components/dashboard/ProductsEmptyState';
import { ProductCardSkeleton } from '@/components/dashboard/ProductCardSkeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useProducts } from '@/contexts/ProductContext';
import { useToast } from '@/hooks/use-toast';

export default function Products() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { products, deleteProduct, duplicateProduct, toggleVisibility } = useProducts();
  const [isLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const categories = useMemo(() => {
    const cats = new Set<string>();
    products.forEach((p) => {
      // We don't have category field on Product type yet, but we can use description as fallback
    });
    return Array.from(cats);
  }, [products]);

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && p.is_active) ||
        (statusFilter === 'draft' && !p.is_active);
      return matchesSearch && matchesStatus;
    });
  }, [products, search, statusFilter]);

  const handleDelete = (id: string, name: string) => {
    deleteProduct(id);
    toast({ title: t('common.success'), description: `"${name}" ${t('dashboard.products.deleted')}` });
  };

  const handleDuplicate = (id: string) => {
    duplicateProduct(id);
    toast({ title: t('common.success'), description: t('dashboard.products.duplicated') });
  };

  const handleToggle = (id: string) => {
    toggleVisibility(id);
  };

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-foreground">
              {t('dashboard.products.title')}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t('dashboard.products.subtitle', { count: filtered.length })}
            </p>
          </div>
          <Button className="gap-2 w-full sm:w-auto" onClick={() => navigate('/dashboard/products/new')}>
            <Plus className="h-4 w-4" />
            {t('dashboard.actions.addProduct')}
          </Button>
        </div>

        {/* Search & Filters */}
        {products.length > 0 && (
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('dashboard.products.searchPlaceholder')}
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue placeholder={t('dashboard.products.filterStatus')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('dashboard.products.allStatuses')}</SelectItem>
                <SelectItem value="active">{t('dashboard.products.active')}</SelectItem>
                <SelectItem value="draft">{t('dashboard.products.draft')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Content */}
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        ) : filtered.length === 0 && products.length === 0 ? (
          <ProductsEmptyState />
        ) : filtered.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">{t('dashboard.products.noResults')}</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filtered.map((product) => (
              <div
                key={product.id}
                className="rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden relative group"
              >
                {/* Actions menu */}
                <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="secondary" size="icon" className="h-8 w-8 rounded-full shadow">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => navigate(`/dashboard/products/${product.id}/edit`)}>
                        <Pencil className="h-4 w-4 mr-2" />
                        {t('common.edit')}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDuplicate(product.id)}>
                        <Copy className="h-4 w-4 mr-2" />
                        {t('dashboard.products.duplicate')}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleToggle(product.id)}>
                        {product.is_active ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                        {product.is_active ? t('dashboard.products.hide') : t('dashboard.products.show')}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => handleDelete(product.id, product.name)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        {t('common.delete')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Inactive badge */}
                {!product.is_active && (
                  <div className="absolute top-2 left-2 z-10 bg-muted text-muted-foreground text-[10px] font-semibold px-2 py-0.5 rounded">
                    {t('dashboard.products.draft')}
                  </div>
                )}

                <div className={`aspect-square bg-muted flex items-center justify-center ${!product.is_active ? 'opacity-50' : ''}`}>
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <span className="text-3xl text-muted-foreground">📦</span>
                  )}
                </div>
                <div className="p-3 space-y-1">
                  <h3 className="text-sm font-medium text-foreground truncate">
                    {product.name}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {t('dashboard.products.inStock', { count: product.stock_quantity })}
                  </p>
                  <p className="text-sm font-bold text-foreground">
                    {product.price.toLocaleString()} FCFA
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
