import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface MarketplaceProduct {
  id: string;
  name: string;
  slug: string | null;
  price: number;
  compare_at_price: number | null;
  image_url: string | null;
  category: string | null;
  marketplace_category_id: string | null;
  created_at: string;
  shop: {
    id: string;
    name: string;
    slug: string;
    country: string | null;
    logo_url: string | null;
    is_verified: boolean | null;
    currency: string | null;
  };
  avg_rating: number | null;
  review_count: number;
  is_sponsored: boolean;
  score?: number;
  order_count?: number;
}

interface Filters {
  categorySlug?: string;
  search?: string;
  country?: string;
  minPrice?: number;
  maxPrice?: number;
  hasPromo?: boolean;
  sort?: "popular" | "newest" | "price_asc" | "price_desc" | "rating" | "score";
  page?: number;
  pageSize?: number;
}

export function useMarketplaceProducts(filters: Filters = {}) {
  const { categorySlug, search, country, minPrice, maxPrice, hasPromo, sort = "score", page = 1, pageSize = 24 } = filters;

  return useQuery({
    queryKey: ["marketplace-products", filters],
    queryFn: async () => {
      // Resolve category slug to id
      let categoryId: string | null = null;
      if (categorySlug) {
        const { data: cat } = await supabase
          .from("marketplace_categories")
          .select("id")
          .eq("slug", categorySlug)
          .single();
        categoryId = cat?.id ?? null;
      }

      // Use RPC for scored results
      const { data, error } = await supabase.rpc("get_marketplace_products", {
        _category_id: categoryId,
        _search: search || "",
        _country: country || "",
        _min_price: minPrice ?? null,
        _max_price: maxPrice ?? null,
        _has_promo: hasPromo || false,
        _sort: sort === "popular" ? "score" : sort,
        _page_size: pageSize,
        _page_offset: (page - 1) * pageSize,
      });

      if (error) throw error;

      const products: MarketplaceProduct[] = (data ?? []).map((row: any) => ({
        id: row.id,
        name: row.name,
        slug: row.slug,
        price: row.price,
        compare_at_price: row.compare_at_price,
        image_url: row.image_url,
        category: row.category,
        marketplace_category_id: row.marketplace_category_id,
        created_at: row.created_at,
        shop: {
          id: row.shop_id,
          name: row.shop_name,
          slug: row.shop_slug,
          country: row.shop_country,
          logo_url: row.shop_logo_url,
          is_verified: row.shop_is_verified,
          currency: row.shop_currency,
        },
        avg_rating: row.avg_rating > 0 ? row.avg_rating : null,
        review_count: Number(row.review_count) || 0,
        is_sponsored: row.is_sponsored,
        score: row.score,
        order_count: Number(row.order_count) || 0,
      }));

      return products;
    },
    staleTime: 30_000,
  });
}
