import { useSearchParams } from "react-router-dom";
import { useState, useEffect, useRef, useCallback } from "react";
import MarketplaceProductCard from "@/components/marketplace/MarketplaceProductCard";
import MarketplaceToolbar from "@/components/marketplace/MarketplaceToolbar";
import MarketplaceSidebarFilters from "@/components/marketplace/MarketplaceSidebarFilters";
import { useInfiniteMarketplaceProducts, type MarketplaceFiltersState } from "@/hooks/useInfiniteMarketplaceProducts";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsMobile } from "@/hooks/use-mobile";
import { Search, Package, Loader2 } from "lucide-react";

export default function MarketplaceSearch() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get("q") ?? "";
  const sortParam = searchParams.get("sort") ?? "score";
  const promoParam = searchParams.get("promo") === "true";

  const [filters, setFilters] = useState<MarketplaceFiltersState>({
    sort: sortParam as any,
    hasPromo: promoParam || undefined,
  });

  const isMobile = useIsMobile();

  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteMarketplaceProducts({ search: query, ...filters });

  const allProducts = data?.pages.flatMap((p) => p.products) ?? [];

  // Infinite scroll
  const sentinelRef = useRef<HTMLDivElement>(null);
  const handleIntersect = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    },
    [hasNextPage, isFetchingNextPage, fetchNextPage]
  );

  useEffect(() => {
    const observer = new IntersectionObserver(handleIntersect, { rootMargin: "400px" });
    if (sentinelRef.current) observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [handleIntersect]);

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Search className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold leading-tight">
            {query ? `Résultats pour "${query}"` : "Tous les produits"}
          </h1>
        </div>
      </div>

      <div className="flex gap-6">
        {!isMobile && (
          <aside className="w-60 shrink-0">
            <div className="sticky top-[140px] bg-card border rounded-xl p-4 space-y-2">
              <h3 className="font-semibold text-sm mb-3">Filtres</h3>
              <MarketplaceSidebarFilters filters={filters} onChange={setFilters} />
            </div>
          </aside>
        )}

        <div className="flex-1 min-w-0">
          <MarketplaceToolbar filters={filters} onChange={setFilters} totalCount={allProducts.length} />

          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2 md:gap-4">
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="rounded-xl border overflow-hidden bg-card">
                  <Skeleton className="aspect-square w-full" />
                  <div className="p-3 space-y-2">
                    <Skeleton className="h-3 w-2/3" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-5 w-1/2" />
                  </div>
                </div>
              ))
            ) : !allProducts.length ? (
              <div className="col-span-full text-center py-20 text-muted-foreground">
                <div className="h-16 w-16 mx-auto rounded-full bg-muted flex items-center justify-center mb-4">
                  <Package className="h-7 w-7" />
                </div>
                <p className="font-medium text-lg">Aucun produit trouvé</p>
                <p className="text-sm mt-1">Essayez d'autres mots-clés ou modifiez vos filtres.</p>
              </div>
            ) : (
              allProducts.map((p) => (
                <MarketplaceProductCard key={p.id} product={p} />
              ))
            )}
            {isFetchingNextPage && Array.from({ length: 4 }).map((_, i) => (
              <div key={`skel-${i}`} className="rounded-xl border overflow-hidden bg-card">
                <Skeleton className="aspect-square w-full" />
                <div className="p-3 space-y-2">
                  <Skeleton className="h-3 w-2/3" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-5 w-1/2" />
                </div>
              </div>
            ))}
          </div>

          <div ref={sentinelRef} className="h-4" />
          {isFetchingNextPage && (
            <div className="flex justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
