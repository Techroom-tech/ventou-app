import { useMarketplaceCategories } from "@/hooks/useMarketplaceCategories";
import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { Icon } from "@/components/ui/Icon";

export default function MarketplaceCategoryGrid() {
  const { data: categories, isLoading } = useMarketplaceCategories();

  if (isLoading) {
    return (
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
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
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
      {categories.map((cat) => (
        <Link
          key={cat.id}
          to={`/marketplace/${cat.slug}`}
          className="flex flex-col items-center gap-2 group"
        >
          <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center group-hover:bg-primary/10 group-hover:scale-105 transition-all duration-200 overflow-hidden">
            {cat.image_url ? (
              <img src={cat.image_url} alt={cat.name} className="h-full w-full object-cover rounded-2xl" />
            ) : (
              <Icon name={cat.icon || "Package"} className="h-7 w-7 text-muted-foreground group-hover:text-primary transition-colors" />
            )}
          </div>
          <span className="text-xs font-medium text-center text-muted-foreground group-hover:text-foreground transition-colors line-clamp-2">
            {cat.name}
          </span>
        </Link>
      ))}
    </div>
  );
}
