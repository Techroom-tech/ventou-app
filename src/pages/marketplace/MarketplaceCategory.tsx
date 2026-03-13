import { useParams } from "react-router-dom";
import { useMarketplaceProducts } from "@/hooks/useMarketplaceProducts";
import { useMarketplaceCategories } from "@/hooks/useMarketplaceCategories";
import MarketplaceProductCard from "@/components/marketplace/MarketplaceProductCard";
import MarketplaceFilters from "@/components/marketplace/MarketplaceFilters";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Package } from "lucide-react";

export default function MarketplaceCategory() {
  const { categorySlug } = useParams<{ categorySlug: string }>();
  const { data: categories } = useMarketplaceCategories();
  const category = categories?.find((c) => c.slug === categorySlug);

  const [filters, setFilters] = useState<any>({ sort: "score" });

  const { data: products, isLoading } = useMarketplaceProducts({
    categorySlug,
    ...filters,
  });

  const isMobile = useIsMobile();

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Category banner */}
      {category?.banner_url ? (
        <div className="relative rounded-2xl overflow-hidden mb-8 aspect-[4/1]">
          <img src={category.banner_url} alt={category.name} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-4 left-6">
            <h1 className="text-2xl md:text-3xl font-bold text-white drop-shadow-md">{category.banner_title || category.name}</h1>
          </div>
        </div>
      ) : (
        <div className="mb-6 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Package className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold">{category?.name || categorySlug}</h1>
            {products && <p className="text-xs text-muted-foreground">{products.length} produit(s)</p>}
          </div>
        </div>
      )}

      <div className="flex gap-6">
        {/* Sidebar filters (desktop) */}
        {!isMobile && (
          <MarketplaceFilters
            filters={filters}
            onChange={setFilters}
            activeCategory={categorySlug}
          />
        )}

        {/* Products */}
        <div className="flex-1">
          {/* Mobile filter bar */}
          {isMobile && (
            <div className="flex items-center gap-3 mb-4">
              <MarketplaceFilters
                filters={filters}
                onChange={setFilters}
                activeCategory={categorySlug}
              />
              <span className="text-sm text-muted-foreground">
                {products?.length ?? 0} produit(s)
              </span>
            </div>
          )}

          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="rounded-xl border overflow-hidden bg-card">
                  <Skeleton className="aspect-square w-full" />
                  <div className="p-3 space-y-2">
                    <Skeleton className="h-3 w-2/3" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-5 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : !products?.length ? (
            <div className="text-center py-20 text-muted-foreground">
              <div className="h-16 w-16 mx-auto rounded-full bg-muted flex items-center justify-center mb-4">
                <Package className="h-7 w-7" />
              </div>
              <p className="font-medium text-lg">Aucun produit dans cette catégorie</p>
              <p className="text-sm mt-1">Essayez de modifier vos filtres.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
              {products.map((p) => (
                <MarketplaceProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
