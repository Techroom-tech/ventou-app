import { Link } from "react-router-dom";
import { Star, BadgeCheck, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { MarketplaceProduct } from "@/hooks/useMarketplaceProducts";
import { formatCurrency } from "@/integrations/supabase/client";

interface Props {
  product: MarketplaceProduct;
}

export default function MarketplaceProductCard({ product }: Props) {
  const currency = product.shop?.currency ?? "XOF";
  const hasDiscount = product.compare_at_price && product.compare_at_price > product.price;
  const discountPct = hasDiscount
    ? Math.round(((product.compare_at_price! - product.price) / product.compare_at_price!) * 100)
    : 0;

  const productUrl = product.shop?.slug
    ? `/boutique/${product.shop.slug}/p/${product.slug}`
    : "#";

  return (
    <Link
      to={productUrl}
      className="group relative bg-card rounded-xl border overflow-hidden hover:shadow-lg transition-all duration-300 flex flex-col"
    >
      {/* Sponsored badge */}
      {product.is_sponsored && (
        <div className="absolute top-2 left-2 z-10">
          <Badge variant="secondary" className="text-[10px] gap-1 bg-amber-100 text-amber-800 border-amber-200">
            <Sparkles className="h-3 w-3" />
            Sponsorisé
          </Badge>
        </div>
      )}

      {/* Discount badge */}
      {hasDiscount && (
        <div className="absolute top-2 right-2 z-10">
          <Badge variant="destructive" className="text-xs font-bold">
            -{discountPct}%
          </Badge>
        </div>
      )}

      {/* Image */}
      <div className="aspect-square bg-muted overflow-hidden">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-4xl">
            📦
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3 flex flex-col gap-1.5 flex-1">
        <h3 className="font-medium text-sm line-clamp-2 group-hover:text-primary transition-colors">
          {product.name}
        </h3>

        {/* Price */}
        <div className="flex items-baseline gap-2">
          <span className="font-bold text-base text-foreground">
            {formatCurrency(product.price, currency)}
          </span>
          {hasDiscount && (
            <span className="text-xs text-muted-foreground line-through">
              {formatCurrency(product.compare_at_price!, currency)}
            </span>
          )}
        </div>

        {/* Rating */}
        {product.avg_rating !== null && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
            <span className="font-medium text-foreground">{product.avg_rating.toFixed(1)}</span>
            <span>({product.review_count})</span>
          </div>
        )}

        {/* Shop info */}
        <div className="flex items-center gap-1.5 mt-auto pt-2 border-t text-xs text-muted-foreground">
          {product.shop?.logo_url ? (
            <img src={product.shop.logo_url} alt="" className="h-4 w-4 rounded-full object-cover" />
          ) : (
            <div className="h-4 w-4 rounded-full bg-muted" />
          )}
          <span className="truncate">{product.shop?.name}</span>
          {product.shop?.is_verified && (
            <BadgeCheck className="h-3.5 w-3.5 text-primary shrink-0" />
          )}
          {product.shop?.country && (
            <span className="ml-auto shrink-0">{getCountryFlag(product.shop.country)}</span>
          )}
        </div>
      </div>
    </Link>
  );
}

function getCountryFlag(country: string): string {
  const map: Record<string, string> = {
    "Ivory Coast": "🇨🇮", "Côte d'Ivoire": "🇨🇮",
    "Senegal": "🇸🇳", "Sénégal": "🇸🇳",
    "Cameroon": "🇨🇲", "Cameroun": "🇨🇲",
    "Burkina Faso": "🇧🇫",
    "Mali": "🇲🇱",
    "Guinea": "🇬🇳", "Guinée": "🇬🇳",
    "Togo": "🇹🇬",
    "Benin": "🇧🇯", "Bénin": "🇧🇯",
    "Niger": "🇳🇪",
    "Congo": "🇨🇬",
    "Gabon": "🇬🇦",
    "Nigeria": "🇳🇬",
    "Ghana": "🇬🇭",
    "France": "🇫🇷",
    "Morocco": "🇲🇦", "Maroc": "🇲🇦",
    "Tunisia": "🇹🇳", "Tunisie": "🇹🇳",
  };
  return map[country] ?? "🌍";
}
