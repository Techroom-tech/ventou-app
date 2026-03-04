import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, MoreVertical, Pencil, Copy, Trash2, Eye, EyeOff, ChevronLeft, ChevronRight } from 'lucide-react';
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
  const {
    products, isLoading, deleteProduct, duplicateProduct, toggleVisibility,
    page, setPage, totalCount, totalPages,
    search, setSearch, statusFilter, setStatusFilter,
  } = useProducts();

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
              {t('dashboard.products.subtitle', { count: totalCount })}
            </p>
          </div>
          <Button className="gap-2 w-full sm:w-auto" onClick={() => navigate('/dashboard/products/new')}>
            <Plus className="h-4 w-4" />
            {t('dashboard.actions.addProduct')}
          </Button>
        </div>

        {/* Search & Filters */}
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

        {/* Content */}
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        ) : products.length === 0 && totalCount === 0 && !search && statusFilter === 'all' ? (
          <ProductsEmptyState />
        ) : products.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">{t('dashboard.products.noResults')}</p>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {products.map((product) => (
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

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 0}
                  onClick={() => setPage(page - 1)}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  {t('common.previous', 'Précédent')}
                </Button>
                <span className="text-sm text-muted-foreground px-3">
                  {page + 1} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page + 1 >= totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  {t('common.next', 'Suivant')}
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
