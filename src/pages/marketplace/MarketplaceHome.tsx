import MarketplaceHero from "@/components/marketplace/MarketplaceHero";
import MarketplaceCategoryGrid from "@/components/marketplace/MarketplaceCategoryGrid";
import MarketplaceProductCard from "@/components/marketplace/MarketplaceProductCard";
import { useMarketplaceProducts } from "@/hooks/useMarketplaceProducts";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight, TrendingUp, Clock, Store } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

function SectionTitle({ icon: IconComp, title, linkTo }: { icon: any; title: string; linkTo?: string }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-2">
        <IconComp className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-bold">{title}</h2>
      </div>
      {linkTo && (
        <Link to={linkTo} className="text-sm text-primary flex items-center gap-1 hover:underline">
          Voir tout <ArrowRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}

function ProductGrid({ products, isLoading }: { products: any[]; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="rounded-xl border overflow-hidden">
            <Skeleton className="aspect-square w-full" />
            <div className="p-3 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-5 w-1/2" />
              <Skeleton className="h-3 w-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!products.length) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>Aucun produit disponible pour le moment.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {products.map((p) => (
        <MarketplaceProductCard key={p.id} product={p} />
      ))}
    </div>
  );
}

// Top sellers section
function TopSellers() {
  const { data: shops, isLoading } = useQuery({
    queryKey: ["marketplace-top-sellers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shops")
        .select("id, name, slug, logo_url, country, is_verified")
        .eq("is_active", true)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(12);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 5 * 60_000,
  });

  if (isLoading) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-2 shrink-0">
            <Skeleton className="h-16 w-16 rounded-full" />
            <Skeleton className="h-3 w-16" />
          </div>
        ))}
      </div>
    );
  }

  if (!shops?.length) return null;

  return (
    <div className="flex gap-6 overflow-x-auto pb-2 scrollbar-hide">
      {shops.map((shop) => (
        <Link
          key={shop.id}
          to={`/boutique/${shop.slug}`}
          className="flex flex-col items-center gap-2 shrink-0 group"
        >
          <div className="h-16 w-16 rounded-full bg-muted overflow-hidden border-2 border-transparent group-hover:border-primary transition-colors">
            {shop.logo_url ? (
              <img src={shop.logo_url} alt={shop.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xl font-bold text-muted-foreground">
                {shop.name.charAt(0)}
              </div>
            )}
          </div>
          <span className="text-xs font-medium text-center max-w-[80px] truncate group-hover:text-primary transition-colors">
            {shop.name}
          </span>
        </Link>
      ))}
    </div>
  );
}

export default function MarketplaceHome() {
  const { data: popularProducts, isLoading: loadingPopular } = useMarketplaceProducts({
    sort: "newest",
    pageSize: 8,
  });

  const { data: newProducts, isLoading: loadingNew } = useMarketplaceProducts({
    sort: "newest",
    pageSize: 8,
    page: 1,
  });

  return (
    <div className="space-y-10 pb-8">
      {/* Hero */}
      <div className="container mx-auto px-4 pt-6">
        <MarketplaceHero />
      </div>

      {/* Categories */}
      <section className="container mx-auto px-4">
        <SectionTitle icon={Store} title="Catégories" />
        <MarketplaceCategoryGrid />
      </section>

      {/* Top sellers */}
      <section className="container mx-auto px-4">
        <SectionTitle icon={Store} title="Top Vendeurs" />
        <TopSellers />
      </section>

      {/* Popular products */}
      <section className="container mx-auto px-4">
        <SectionTitle icon={TrendingUp} title="Produits populaires" linkTo="/marketplace/search?sort=popular" />
        <ProductGrid products={popularProducts ?? []} isLoading={loadingPopular} />
      </section>

      {/* New products */}
      <section className="container mx-auto px-4">
        <SectionTitle icon={Clock} title="Nouveautés" linkTo="/marketplace/search?sort=newest" />
        <ProductGrid products={newProducts ?? []} isLoading={loadingNew} />
      </section>
    </div>
  );
}
