import { useInfiniteQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { MarketplaceProduct } from "@/hooks/useMarketplaceProducts";

export interface MarketplaceFiltersState {
  categorySlug?: string;
  search?: string;
  country?: string;
  minPrice?: number;
  maxPrice?: number;
  hasPromo?: boolean;
  verifiedOnly?: boolean;
  sort?: "popular" | "newest" | "price_asc" | "price_desc" | "rating" | "score" | "best_selling";
}

const PAGE_SIZE = 24;

export function useInfiniteMarketplaceProducts(filters: MarketplaceFiltersState = {}) {
  const { categorySlug, search, country, minPrice, maxPrice, hasPromo, verifiedOnly, sort = "score" } = filters;

  return useInfiniteQuery({
    queryKey: ["marketplace-products-infinite", filters],
    queryFn: async ({ pageParam = 0 }) => {
      let categoryId: string | null = null;
      if (categorySlug) {
        const { data: cat } = await supabase
          .from("marketplace_categories")
          .select("id")
          .eq("slug", categorySlug)
          .single();
        categoryId = cat?.id ?? null;
      }

      // Map "popular" to "best_selling" since they share the same logic
      const rpcSort = sort === "popular" ? "best_selling" : sort;

      // Strict filters based on sort type
      const minRating = rpcSort === "rating" ? 4 : null;
      const minOrders = rpcSort === "best_selling" ? 1 : null;

      const { data, error } = await supabase.rpc("get_marketplace_products", {
        _category_id: categoryId,
        _search: search || "",
        _country: country || "",
        _min_price: minPrice ?? null,
        _max_price: maxPrice ?? null,
        _has_promo: hasPromo || false,
        _sort: rpcSort,
        _page_size: PAGE_SIZE,
        _page_offset: pageParam,
        _min_rating: minRating,
        _min_orders: minOrders,
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

      // Client-side filter for verified only (not in RPC)
      const filtered = verifiedOnly ? products.filter(p => p.shop?.is_verified) : products;

      return {
        products: filtered,
        nextOffset: products.length === PAGE_SIZE ? pageParam + PAGE_SIZE : undefined,
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextOffset,
    initialPageParam: 0,
    staleTime: 30_000,
  });
}
