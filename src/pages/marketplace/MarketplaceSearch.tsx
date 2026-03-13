import { useSearchParams } from "react-router-dom";
import { useMarketplaceProducts } from "@/hooks/useMarketplaceProducts";
import MarketplaceProductCard from "@/components/marketplace/MarketplaceProductCard";
import MarketplaceFilters from "@/components/marketplace/MarketplaceFilters";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Search } from "lucide-react";

export default function MarketplaceSearch() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get("q") ?? "";
  const sortParam = searchParams.get("sort") ?? "newest";

  const [filters, setFilters] = useState<any>({ sort: sortParam });

  const { data: products, isLoading } = useMarketplaceProducts({
    search: query,
    ...filters,
  });

  const isMobile = useIsMobile();

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <Search className="h-5 w-5 text-muted-foreground" />
        <h1 className="text-xl font-bold">
          {query ? `Résultats pour "${query}"` : "Tous les produits"}
        </h1>
        <span className="text-sm text-muted-foreground">
          ({products?.length ?? 0} résultat{(products?.length ?? 0) > 1 ? "s" : ""})
        </span>
      </div>

      <div className="flex gap-8">
        {!isMobile && (
          <MarketplaceFilters filters={filters} onChange={setFilters} />
        )}

        <div className="flex-1">
          {isMobile && (
            <div className="mb-4">
              <MarketplaceFilters filters={filters} onChange={setFilters} />
            </div>
          )}

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="rounded-xl border overflow-hidden">
                  <Skeleton className="aspect-square w-full" />
                  <div className="p-3 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-5 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : !products?.length ? (
            <div className="text-center py-16 text-muted-foreground">
              <p className="text-lg">Aucun produit trouvé.</p>
              <p className="text-sm mt-1">Essayez d'autres mots-clés ou filtres.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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
