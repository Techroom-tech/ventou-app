import { useMarketplaceCategories } from "@/hooks/useMarketplaceCategories";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { RotateCcw, Tag, MapPin, BadgeCheck, Flame, Sparkles, Layers } from "lucide-react";
import { useState } from "react";
import type { MarketplaceFiltersState } from "@/hooks/useInfiniteMarketplaceProducts";

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

interface Props {
  filters: MarketplaceFiltersState;
  onChange: (f: MarketplaceFiltersState) => void;
}

export default function MarketplaceSidebarFilters({ filters, onChange }: Props) {
  const { data: categories } = useMarketplaceCategories();
  const [priceRange, setPriceRange] = useState<[number, number]>([
    filters.minPrice ?? 0,
    filters.maxPrice ?? 500000,
  ]);

  const hasActiveFilters = filters.minPrice || filters.maxPrice || filters.country || filters.hasPromo || filters.verifiedOnly || filters.categorySlug;

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

      {/* Categories */}
      {categories && categories.length > 0 && (
        <div>
          <h4 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5" /> Catégories
          </h4>
          <div className="space-y-0.5 max-h-48 overflow-y-auto">
            <button
              onClick={() => onChange({ ...filters, categorySlug: undefined })}
              className={`block w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${!filters.categorySlug ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted text-muted-foreground"}`}
            >
              Toutes
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => onChange({ ...filters, categorySlug: cat.slug })}
                className={`block w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${filters.categorySlug === cat.slug ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted text-muted-foreground"}`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <Separator />

      {/* Budget */}
      <div>
        <h4 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
          <Tag className="h-3.5 w-3.5" /> Budget (FCFA)
        </h4>
        <Slider
          min={0}
          max={500000}
          step={1000}
          value={priceRange}
          onValueChange={(v) => setPriceRange(v as [number, number])}
          onValueCommit={(v) => onChange({ ...filters, minPrice: v[0] || undefined, maxPrice: v[1] < 500000 ? v[1] : undefined })}
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
        <h4 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5" /> Pays du vendeur
        </h4>
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

      {/* Toggles */}
      <div className="space-y-4">
        <h4 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5" /> Filtres rapides
        </h4>

        <div className="flex items-center justify-between">
          <Label htmlFor="promo-toggle" className="text-sm flex items-center gap-2 cursor-pointer">
            <Flame className="h-4 w-4 text-destructive" />
            En promotion
          </Label>
          <Switch
            id="promo-toggle"
            checked={!!filters.hasPromo}
            onCheckedChange={(v) => onChange({ ...filters, hasPromo: v || undefined })}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="verified-toggle" className="text-sm flex items-center gap-2 cursor-pointer">
            <BadgeCheck className="h-4 w-4 text-primary" />
            Vendeur vérifié
          </Label>
          <Switch
            id="verified-toggle"
            checked={!!filters.verifiedOnly}
            onCheckedChange={(v) => onChange({ ...filters, verifiedOnly: v || undefined })}
          />
        </div>
      </div>
    </div>
  );
}
