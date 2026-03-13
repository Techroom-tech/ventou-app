import { useMarketplaceCategories } from "@/hooks/useMarketplaceCategories";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { SlidersHorizontal, RotateCcw } from "lucide-react";
import { Link } from "react-router-dom";
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
  { code: "Ivory Coast", flag: "🇨🇮", label: "Côte d'Ivoire" },
  { code: "Senegal", flag: "🇸🇳", label: "Sénégal" },
  { code: "Cameroon", flag: "🇨🇲", label: "Cameroun" },
  { code: "Burkina Faso", flag: "🇧🇫", label: "Burkina Faso" },
  { code: "Mali", flag: "🇲🇱", label: "Mali" },
  { code: "Guinea", flag: "🇬🇳", label: "Guinée" },
  { code: "Togo", flag: "🇹🇬", label: "Togo" },
  { code: "Benin", flag: "🇧🇯", label: "Bénin" },
  { code: "Nigeria", flag: "🇳🇬", label: "Nigeria" },
  { code: "Ghana", flag: "🇬🇭", label: "Ghana" },
];

const SORT_OPTIONS = [
  { value: "newest", label: "Récents" },
  { value: "popular", label: "Populaires" },
  { value: "price_asc", label: "Prix ↑" },
  { value: "price_desc", label: "Prix ↓" },
  { value: "rating", label: "Mieux notés" },
];

function FilterContent({ filters, onChange, activeCategory }: Props) {
  const { data: categories } = useMarketplaceCategories();
  const [priceRange, setPriceRange] = useState<[number, number]>([
    filters.minPrice ?? 0,
    filters.maxPrice ?? 500000,
  ]);

  const hasActiveFilters = filters.minPrice || filters.maxPrice || filters.country || filters.hasPromo;

  return (
    <div className="space-y-5">
      {/* Reset */}
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          className="text-xs gap-1.5 text-muted-foreground w-full justify-start"
          onClick={() => onChange({ sort: filters.sort })}
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Réinitialiser les filtres
        </Button>
      )}

      {/* Sort */}
      <div>
        <h4 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground mb-3">Trier par</h4>
        <div className="flex flex-wrap gap-1.5">
          {SORT_OPTIONS.map((opt) => (
            <Button
              key={opt.value}
              variant={filters.sort === opt.value ? "default" : "outline"}
              size="sm"
              className="text-[11px] rounded-full h-7 px-3"
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
          <h4 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground mb-3">Catégories</h4>
          <div className="space-y-0.5">
            <Link
              to="/marketplace"
              className={`block px-3 py-2 rounded-lg text-sm transition-colors ${!activeCategory ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted text-muted-foreground"}`}
            >
              Toutes les catégories
            </Link>
            {categories.map((cat) => (
              <Link
                key={cat.id}
                to={`/marketplace/${cat.slug}`}
                className={`block px-3 py-2 rounded-lg text-sm transition-colors ${activeCategory === cat.slug ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted text-muted-foreground"}`}
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
        <h4 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground mb-3">Budget (FCFA)</h4>
        <Slider
          min={0}
          max={500000}
          step={1000}
          value={priceRange}
          onValueChange={(v) => setPriceRange(v as [number, number])}
          onValueCommit={(v) => onChange({ ...filters, minPrice: v[0], maxPrice: v[1] })}
          className="mb-3"
        />
        <div className="flex justify-between text-xs text-muted-foreground font-medium">
          <span className="bg-muted px-2 py-0.5 rounded">{priceRange[0].toLocaleString("fr")} F</span>
          <span className="bg-muted px-2 py-0.5 rounded">{priceRange[1].toLocaleString("fr")} F</span>
        </div>
      </div>

      <Separator />

      {/* Country */}
      <div>
        <h4 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground mb-3">Pays du vendeur</h4>
        <div className="flex flex-wrap gap-1.5">
          <Button
            variant={!filters.country ? "default" : "outline"}
            size="sm"
            className="text-[11px] rounded-full h-7 px-3"
            onClick={() => onChange({ ...filters, country: undefined })}
          >
            🌍 Tous
          </Button>
          {COUNTRIES.map((c) => (
            <Button
              key={c.code}
              variant={filters.country === c.code ? "default" : "outline"}
              size="sm"
              className="text-[11px] rounded-full h-7 px-3"
              onClick={() => onChange({ ...filters, country: c.code })}
            >
              {c.flag} {c.label}
            </Button>
          ))}
        </div>
      </div>

      <Separator />

      {/* Promo */}
      <div>
        <Button
          variant={filters.hasPromo ? "default" : "outline"}
          size="sm"
          className="text-xs rounded-full gap-1.5 h-8"
          onClick={() => onChange({ ...filters, hasPromo: !filters.hasPromo })}
        >
          🔥 En promotion
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
          <Button variant="outline" size="sm" className="gap-2 rounded-lg">
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
    <aside className="w-60 shrink-0">
      <div className="sticky top-[140px] space-y-2 bg-card border rounded-xl p-4">
        <h3 className="font-semibold text-sm mb-3">Filtres</h3>
        <FilterContent {...props} />
      </div>
    </aside>
  );
}
