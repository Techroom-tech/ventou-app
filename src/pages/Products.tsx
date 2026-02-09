import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { ProductsEmptyState } from '@/components/dashboard/ProductsEmptyState';
import { ProductCardSkeleton } from '@/components/dashboard/ProductCardSkeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { mockProducts } from '@/data/mockData';

export default function Products() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isLoading] = useState(false);
  const [showEmpty] = useState(false); // Toggle to true to preview empty state

  const products = showEmpty ? [] : mockProducts;

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
              {t('dashboard.products.subtitle', { count: products.length })}
            </p>
          </div>
          <Button className="gap-2 w-full sm:w-auto" onClick={() => navigate('/dashboard/products/new')}>
            <Plus className="h-4 w-4" />
            {t('dashboard.actions.addProduct')}
          </Button>
        </div>

        {/* Search */}
        {!showEmpty && (
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('dashboard.products.searchPlaceholder')}
              className="pl-9"
            />
          </div>
        )}

        {/* Content */}
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        ) : products.length === 0 ? (
          <ProductsEmptyState />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.map((product) => (
              <div
                key={product.id}
                className="rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden"
              >
                <div className="aspect-square bg-muted flex items-center justify-center">
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
