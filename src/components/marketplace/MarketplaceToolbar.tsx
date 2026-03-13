import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { SlidersHorizontal, ArrowUpDown } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useIsMobile } from "@/hooks/use-mobile";
import type { MarketplaceFiltersState } from "@/hooks/useInfiniteMarketplaceProducts";
import MarketplaceSidebarFilters from "@/components/marketplace/MarketplaceSidebarFilters";

const SORT_OPTIONS = [
  { value: "score", label: "Pertinence" },
  { value: "popular", label: "Populaires" },
  { value: "best_selling", label: "Plus vendus" },
  { value: "newest", label: "Nouveautés" },
  { value: "price_asc", label: "Prix croissant" },
  { value: "price_desc", label: "Prix décroissant" },
  { value: "rating", label: "Mieux notés" },
] as const;

interface Props {
  filters: MarketplaceFiltersState;
  onChange: (f: MarketplaceFiltersState) => void;
  totalCount?: number;
}

export default function MarketplaceToolbar({ filters, onChange, totalCount }: Props) {
  const isMobile = useIsMobile();
  const currentSort = SORT_OPTIONS.find(s => s.value === (filters.sort ?? "score"));

  return (
    <div className="flex items-center justify-between gap-3 py-3 px-1 sticky top-[64px] z-20 bg-background">
      <div className="flex items-center gap-2">
        {/* Mobile filter trigger */}
        {isMobile && (
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5 rounded-lg text-xs">
                <SlidersHorizontal className="h-3.5 w-3.5" />
                Filtres
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[300px] overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Filtres</SheetTitle>
              </SheetHeader>
              <div className="mt-4">
                <MarketplaceSidebarFilters filters={filters} onChange={onChange} />
              </div>
            </SheetContent>
          </Sheet>
        )}

        {totalCount !== undefined && (
          <span className="text-xs text-muted-foreground">
            {totalCount} produit{totalCount > 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Sort dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5 rounded-lg text-xs">
            <ArrowUpDown className="h-3.5 w-3.5" />
            {currentSort?.label ?? "Trier"}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          {SORT_OPTIONS.map((opt) => (
            <DropdownMenuItem
              key={opt.value}
              onClick={() => onChange({ ...filters, sort: opt.value as any })}
              className={filters.sort === opt.value ? "bg-accent font-medium" : ""}
            >
              {opt.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
