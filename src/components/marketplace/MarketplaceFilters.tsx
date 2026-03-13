import { useMarketplaceCategories } from "@/hooks/useMarketplaceCategories";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { SlidersHorizontal, X } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";

interface FiltersState {
  minPrice?: number;
  maxPrice?: number;
  country?: string;
  hasPromo?: boolean;
  sort?: string;
}

interface Props {
  filters: FiltersState;
  onChange: (f: FiltersState) => void;
  activeCategory?: string;
}

const COUNTRIES = [
  "Ivory Coast", "Senegal", "Cameroon", "Burkina Faso", "Mali",
  "Guinea", "Togo", "Benin", "Niger", "Nigeria", "Ghana"
];

const SORT_OPTIONS = [
  { value: "newest", label: "Plus récents" },
  { value: "popular", label: "Populaires" },
  { value: "price_asc", label: "Prix croissant" },
  { value: "price_desc", label: "Prix décroissant" },
  { value: "rating", label: "Mieux notés" },
];

function FilterContent({ filters, onChange, activeCategory }: Props) {
  const { data: categories } = useMarketplaceCategories();
  const [priceRange, setPriceRange] = useState<[number, number]>([
    filters.minPrice ?? 0,
    filters.maxPrice ?? 500000,
  ]);

  return (
    <div className="space-y-6">
      {/* Sort */}
      <div>
        <h4 className="font-semibold text-sm mb-3">Trier par</h4>
        <div className="flex flex-wrap gap-2">
          {SORT_OPTIONS.map((opt) => (
            <Button
              key={opt.value}
              variant={filters.sort === opt.value ? "default" : "outline"}
              size="sm"
              className="text-xs rounded-full"
              onClick={() => onChange({ ...filters, sort: opt.value })}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      <Separator />

      {/* Categories */}
      {categories && categories.length > 0 && (
        <div>
          <h4 className="font-semibold text-sm mb-3">Catégories</h4>
          <div className="space-y-1">
            <Link
              to="/marketplace"
              className={`block px-3 py-1.5 rounded-lg text-sm transition-colors ${!activeCategory ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted"}`}
            >
              Toutes
            </Link>
            {categories.map((cat) => (
              <Link
                key={cat.id}
                to={`/marketplace/${cat.slug}`}
                className={`block px-3 py-1.5 rounded-lg text-sm transition-colors ${activeCategory === cat.slug ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted"}`}
              >
                {cat.name}
              </Link>
            ))}
          </div>
        </div>
      )}

      <Separator />

      {/* Price range */}
      <div>
        <h4 className="font-semibold text-sm mb-3">Prix (FCFA)</h4>
        <Slider
          min={0}
          max={500000}
          step={1000}
          value={priceRange}
          onValueChange={(v) => setPriceRange(v as [number, number])}
          onValueCommit={(v) => onChange({ ...filters, minPrice: v[0], maxPrice: v[1] })}
          className="mb-2"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{priceRange[0].toLocaleString()} F</span>
          <span>{priceRange[1].toLocaleString()} F</span>
        </div>
      </div>

      <Separator />

      {/* Country */}
      <div>
        <h4 className="font-semibold text-sm mb-3">Pays du vendeur</h4>
        <div className="flex flex-wrap gap-2">
          <Button
            variant={!filters.country ? "default" : "outline"}
            size="sm"
            className="text-xs rounded-full"
            onClick={() => onChange({ ...filters, country: undefined })}
          >
            Tous
          </Button>
          {COUNTRIES.map((c) => (
            <Button
              key={c}
              variant={filters.country === c ? "default" : "outline"}
              size="sm"
              className="text-xs rounded-full"
              onClick={() => onChange({ ...filters, country: c })}
            >
              {c}
            </Button>
          ))}
        </div>
      </div>

      <Separator />

      {/* Promo */}
      <div>
        <h4 className="font-semibold text-sm mb-3">Promotions</h4>
        <Button
          variant={filters.hasPromo ? "default" : "outline"}
          size="sm"
          className="text-xs rounded-full"
          onClick={() => onChange({ ...filters, hasPromo: !filters.hasPromo })}
        >
          En promotion uniquement
        </Button>
      </div>
    </div>
  );
}

export default function MarketplaceFilters(props: Props) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <SlidersHorizontal className="h-4 w-4" />
            Filtres
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[300px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Filtres</SheetTitle>
          </SheetHeader>
          <div className="mt-6">
            <FilterContent {...props} />
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <aside className="w-64 shrink-0 space-y-2">
      <h3 className="font-semibold text-base mb-4">Filtres</h3>
      <FilterContent {...props} />
    </aside>
  );
}
