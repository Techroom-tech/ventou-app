import { Link } from "react-router-dom";
import { Star, BadgeCheck, Sparkles, Eye, Flame } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

  const productUrl = `/marketplace/product/${product.id}`;

  return (
    <div className="group relative bg-card rounded-xl border overflow-hidden hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 flex flex-col">
      {/* Badges top-left */}
      <div className="absolute top-2.5 left-2.5 z-10 flex flex-col gap-1.5">
        {product.is_sponsored && (
          <Badge variant="secondary" className="text-[10px] gap-1 bg-amber-50 text-amber-700 border-amber-200 shadow-sm">
            <Sparkles className="h-3 w-3" />
            Sponsorisé
          </Badge>
        )}
        {product.shop?.is_verified && (
          <Badge variant="secondary" className="text-[10px] gap-1 bg-emerald-50 text-emerald-700 border-emerald-200 shadow-sm">
            <BadgeCheck className="h-3 w-3" />
            Vérifié
          </Badge>
        )}
      </div>

      {/* Discount badge top-right */}
      {hasDiscount && (
        <div className="absolute top-2.5 right-2.5 z-10">
          <Badge className="text-xs font-bold bg-destructive text-destructive-foreground shadow-sm gap-1">
            <Flame className="h-3 w-3" />
            -{discountPct}%
          </Badge>
        </div>
      )}

      {/* Image */}
      <Link to={productUrl} className="block relative aspect-square bg-muted overflow-hidden">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-[1.08] transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-4xl bg-gradient-to-br from-muted to-muted/60">
            📦
          </div>
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/5 transition-colors duration-300" />

        {/* Quick action */}
        <div className="absolute bottom-3 left-3 right-3 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300">
          <Button asChild size="sm" className="w-full rounded-lg shadow-lg h-9 text-xs font-medium">
            <Link to={productUrl}>
              <Eye className="h-3.5 w-3.5 mr-1.5" />
              Voir le produit
            </Link>
          </Button>
        </div>
      </Link>

      {/* Info */}
      <div className="p-3.5 flex flex-col gap-2 flex-1">
        {/* Shop info */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {product.shop?.logo_url ? (
            <img src={product.shop.logo_url} alt="" className="h-4 w-4 rounded-full object-cover ring-1 ring-border" />
          ) : (
            <div className="h-4 w-4 rounded-full bg-muted ring-1 ring-border" />
          )}
          <span className="truncate">{product.shop?.name}</span>
          {product.shop?.is_verified && (
            <BadgeCheck className="h-3.5 w-3.5 text-primary shrink-0" />
          )}
          {product.shop?.country && (
            <span className="ml-auto shrink-0 text-[11px]">{getCountryFlag(product.shop.country)}</span>
          )}
        </div>

        {/* Product name */}
        <Link to={productUrl}>
          <h3 className="font-medium text-sm line-clamp-2 group-hover:text-primary transition-colors leading-snug">
            {product.name}
          </h3>
        </Link>

        {/* Rating + sales */}
        <div className="flex items-center gap-2 text-xs flex-wrap">
          {product.avg_rating !== null && (
            <div className="flex items-center gap-0.5">
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
              <span className="font-medium">{product.avg_rating.toFixed(1)}</span>
              <span className="text-muted-foreground">({product.review_count})</span>
            </div>
          )}
          {(product.order_count ?? 0) > 0 && (
            <span className="text-muted-foreground">
              {product.order_count}+ vendus
            </span>
          )}
        </div>

        {/* Price */}
        <div className="flex items-baseline gap-2 mt-auto pt-1">
          <span className="font-bold text-base text-foreground">
            {formatCurrency(product.price, currency)}
          </span>
          {hasDiscount && (
            <span className="text-xs text-muted-foreground line-through">
              {formatCurrency(product.compare_at_price!, currency)}
            </span>
          )}
        </div>
      </div>
    </div>
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
