import { useState, useEffect, useRef, useCallback } from "react";
import MarketplaceHero from "@/components/marketplace/MarketplaceHero";
import MarketplaceProductCard from "@/components/marketplace/MarketplaceProductCard";
import MarketplaceToolbar from "@/components/marketplace/MarketplaceToolbar";
import MarketplaceSidebarFilters from "@/components/marketplace/MarketplaceSidebarFilters";
import { useInfiniteMarketplaceProducts, type MarketplaceFiltersState } from "@/hooks/useInfiniteMarketplaceProducts";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsMobile } from "@/hooks/use-mobile";
import { Package, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl border overflow-hidden bg-card">
          <Skeleton className="aspect-square w-full" />
          <div className="p-3 space-y-2">
            <Skeleton className="h-3 w-2/3" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-5 w-1/2" />
          </div>
        </div>
      ))}
    </>
  );
}

export default function MarketplaceHome() {
  const [filters, setFilters] = useState<MarketplaceFiltersState>({ sort: "score" });
  const isMobile = useIsMobile();

  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteMarketplaceProducts(filters);

  const allProducts = data?.pages.flatMap((p) => p.products) ?? [];
  const totalCount = allProducts.length;

  // Infinite scroll observer
  const sentinelRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const handleIntersect = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    },
    [hasNextPage, isFetchingNextPage, fetchNextPage]
  );

  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();
    observerRef.current = new IntersectionObserver(handleIntersect, {
      rootMargin: "400px",
    });
    if (sentinelRef.current) observerRef.current.observe(sentinelRef.current);
    return () => observerRef.current?.disconnect();
  }, [handleIntersect]);

  return (
    <div className="pb-8">
      {/* Hero */}
      <div className="container mx-auto px-4 pt-4 md:pt-6">
        <MarketplaceHero />
      </div>

      {/* Main content */}
      <div className="container mx-auto px-4 mt-6">
        <div className="flex gap-6">
          {/* Sidebar filters (desktop) */}
          {!isMobile && (
            <aside className="w-60 shrink-0">
              <div className="sticky top-[140px] bg-card border rounded-xl p-4 space-y-2">
                <h3 className="font-semibold text-sm mb-3">Filtres</h3>
                <MarketplaceSidebarFilters filters={filters} onChange={setFilters} />
              </div>
            </aside>
          )}

          {/* Products area */}
          <div className="flex-1 min-w-0">
            {/* Toolbar */}
            <MarketplaceToolbar
              filters={filters}
              onChange={setFilters}
              totalCount={totalCount}
            />

            {/* Product grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
              {isLoading ? (
                <ProductGridSkeleton count={12} />
              ) : allProducts.length === 0 ? (
                <div className="col-span-full text-center py-20 text-muted-foreground">
                  <div className="h-16 w-16 mx-auto rounded-full bg-muted flex items-center justify-center mb-4">
                    <Package className="h-7 w-7" />
                  </div>
                  <p className="font-medium text-lg">Aucun produit trouvé</p>
                  <p className="text-sm mt-1">Essayez de modifier vos filtres.</p>
                </div>
              ) : (
                allProducts.map((p) => (
                  <MarketplaceProductCard key={p.id} product={p} />
                ))
              )}

              {isFetchingNextPage && <ProductGridSkeleton count={4} />}
            </div>

            {/* Infinite scroll sentinel */}
            <div ref={sentinelRef} className="h-4" />

            {isFetchingNextPage && (
              <div className="flex justify-center py-6">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* CTA Banner */}
      <section className="container mx-auto px-4 mt-12">
        <div className="rounded-2xl bg-gradient-to-r from-primary to-primary/80 p-8 md:p-12 text-center text-primary-foreground">
          <h2 className="text-2xl md:text-3xl font-bold mb-3">Vendez sur Ventou</h2>
          <p className="text-primary-foreground/80 mb-6 max-w-lg mx-auto text-sm md:text-base">
            Créez votre boutique gratuitement et rejoignez des milliers de vendeurs en Afrique.
          </p>
          <Button asChild size="lg" variant="secondary" className="rounded-xl h-12 px-8 font-semibold shadow-lg">
            <Link to="/signup">Créer ma boutique gratuitement</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
