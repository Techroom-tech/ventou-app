import { useMarketplaceCategories } from "@/hooks/useMarketplaceCategories";
import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import * as LucideIcons from "lucide-react";
import { Package } from "lucide-react";

export default function MarketplaceCategoryGrid() {
  const { data: categories, isLoading } = useMarketplaceCategories();

  if (isLoading) {
    return (
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-2">
            <Skeleton className="h-16 w-16 rounded-2xl" />
            <Skeleton className="h-3 w-14" />
          </div>
        ))}
      </div>
    );
  }

  if (!categories?.length) return null;

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 md:gap-4">
      {categories.map((cat) => {
        const IconComp = (LucideIcons as any)[cat.icon || "Package"] || Package;
        return (
          <Link
            key={cat.id}
            to={`/marketplace/${cat.slug}`}
            className="flex flex-col items-center gap-2.5 group"
          >
            <div className="h-16 w-16 md:h-[72px] md:w-[72px] rounded-2xl bg-muted/80 border flex items-center justify-center group-hover:bg-primary/10 group-hover:border-primary/30 group-hover:scale-105 transition-all duration-200 overflow-hidden shadow-sm">
              {cat.image_url ? (
                <img src={cat.image_url} alt={cat.name} className="h-full w-full object-cover rounded-2xl" />
              ) : (
                <IconComp className="h-6 w-6 md:h-7 md:w-7 text-muted-foreground group-hover:text-primary transition-colors" />
              )}
            </div>
            <span className="text-[11px] md:text-xs font-medium text-center text-muted-foreground group-hover:text-foreground transition-colors line-clamp-2 leading-tight">
              {cat.name}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
