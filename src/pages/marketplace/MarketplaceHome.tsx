import MarketplaceHero from "@/components/marketplace/MarketplaceHero";
import MarketplaceCategoryGrid from "@/components/marketplace/MarketplaceCategoryGrid";
import MarketplaceProductCard from "@/components/marketplace/MarketplaceProductCard";
import { useMarketplaceProducts } from "@/hooks/useMarketplaceProducts";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight, Clock, Store, Flame, BadgeCheck, Tag } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

function SectionTitle({ icon: IconComp, title, linkTo, count }: { icon: any; title: string; linkTo?: string; count?: number }) {
  return (
    <div className="flex items-center justify-between mb-5">
      <div className="flex items-center gap-2.5">
        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <IconComp className="h-4 w-4 text-primary" />
        </div>
        <div>
          <h2 className="text-lg md:text-xl font-bold leading-tight">{title}</h2>
          {count !== undefined && <p className="text-xs text-muted-foreground">{count} produits</p>}
        </div>
      </div>
      {linkTo && (
        <Button variant="ghost" size="sm" asChild className="text-primary gap-1 text-xs">
          <Link to={linkTo}>
            Voir tout <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
      )}
    </div>
  );
}

function ProductGrid({ products, isLoading }: { products: any[]; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
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
    );
  }

  if (!products.length) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <div className="h-16 w-16 mx-auto rounded-full bg-muted flex items-center justify-center mb-4">
          <Store className="h-7 w-7" />
        </div>
        <p className="font-medium">Aucun produit disponible</p>
        <p className="text-sm mt-1">Revenez bientôt pour découvrir de nouveaux produits.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
      {products.map((p) => (
        <MarketplaceProductCard key={p.id} product={p} />
      ))}
    </div>
  );
}

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
      <div className="flex gap-5 overflow-x-auto pb-2 scrollbar-hide">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-2 shrink-0">
            <Skeleton className="h-[72px] w-[72px] rounded-full" />
            <Skeleton className="h-3 w-16" />
          </div>
        ))}
      </div>
    );
  }

  if (!shops?.length) return null;

  return (
    <div className="flex gap-5 overflow-x-auto pb-3 scrollbar-hide -mx-4 px-4">
      {shops.map((shop) => (
        <Link
          key={shop.id}
          to={`/boutique/${shop.slug}`}
          className="flex flex-col items-center gap-2 shrink-0 group"
        >
          <div className="relative">
            <div className="h-[72px] w-[72px] rounded-full bg-muted overflow-hidden ring-2 ring-border group-hover:ring-primary transition-all duration-200">
              {shop.logo_url ? (
                <img src={shop.logo_url} alt={shop.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xl font-bold text-muted-foreground bg-gradient-to-br from-muted to-secondary">
                  {shop.name.charAt(0)}
                </div>
              )}
            </div>
            {shop.is_verified && (
              <div className="absolute -bottom-0.5 -right-0.5 h-5 w-5 rounded-full bg-primary flex items-center justify-center ring-2 ring-background">
                <BadgeCheck className="h-3 w-3 text-primary-foreground" />
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
    sort: "score",
    pageSize: 8,
  });

  const { data: newProducts, isLoading: loadingNew } = useMarketplaceProducts({
    sort: "newest",
    pageSize: 8,
    page: 1,
  });

  return (
    <div className="space-y-8 md:space-y-12 pb-8">
      {/* Hero */}
      <div className="container mx-auto px-4 pt-4 md:pt-6">
        <MarketplaceHero />

        {/* Quick filters */}
        <div className="flex flex-wrap gap-2 mt-4">
          <Button asChild variant="outline" size="sm" className="rounded-full gap-1.5 text-xs">
            <Link to="/marketplace/search?sort=popular"><Flame className="h-3.5 w-3.5" /> Populaires</Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="rounded-full gap-1.5 text-xs">
            <Link to="/marketplace/search?sort=newest"><Clock className="h-3.5 w-3.5" /> Nouveautés</Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="rounded-full gap-1.5 text-xs">
            <Link to="/marketplace/search?promo=true"><Tag className="h-3.5 w-3.5" /> Promos</Link>
          </Button>
        </div>
      </div>

      {/* Categories */}
      <section className="container mx-auto px-4">
        <SectionTitle icon={Store} title="Parcourir par catégorie" />
        <MarketplaceCategoryGrid />
      </section>

      {/* Top sellers */}
      <section className="container mx-auto px-4">
        <SectionTitle icon={BadgeCheck} title="Top Vendeurs" />
        <TopSellers />
      </section>

      {/* Popular products */}
      <section className="container mx-auto px-4">
        <SectionTitle icon={Flame} title="Produits populaires" linkTo="/marketplace/search?sort=popular" />
        <ProductGrid products={popularProducts ?? []} isLoading={loadingPopular} />
      </section>

      {/* New products */}
      <section className="container mx-auto px-4">
        <SectionTitle icon={Clock} title="Nouveautés" linkTo="/marketplace/search?sort=newest" />
        <ProductGrid products={newProducts ?? []} isLoading={loadingNew} />
      </section>

      {/* CTA Banner */}
      <section className="container mx-auto px-4">
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
