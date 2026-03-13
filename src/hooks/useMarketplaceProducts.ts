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
}

interface Filters {
  categorySlug?: string;
  search?: string;
  country?: string;
  minPrice?: number;
  maxPrice?: number;
  hasPromo?: boolean;
  sort?: "popular" | "newest" | "price_asc" | "price_desc" | "rating";
  page?: number;
  pageSize?: number;
}

export function useMarketplaceProducts(filters: Filters = {}) {
  const { categorySlug, search, country, minPrice, maxPrice, hasPromo, sort = "newest", page = 1, pageSize = 24 } = filters;

  return useQuery({
    queryKey: ["marketplace-products", filters],
    queryFn: async () => {
      // 1. Get category id if slug provided
      let categoryId: string | undefined;
      if (categorySlug) {
        const { data: cat } = await supabase
          .from("marketplace_categories")
          .select("id")
          .eq("slug", categorySlug)
          .single();
        categoryId = cat?.id;
      }

      // 2. Query products
      let query = supabase
        .from("products")
        .select(`
          id, name, slug, price, compare_at_price, image_url, category, marketplace_category_id, created_at,
          shops!inner(id, name, slug, country, logo_url, is_verified, currency)
        `)
        .eq("show_in_marketplace", true)
        .eq("is_active", true)
        .eq("status", "published");

      if (categoryId) {
        query = query.eq("marketplace_category_id", categoryId);
      }

      if (search) {
        query = query.ilike("name", `%${search}%`);
      }

      if (country) {
        query = query.eq("shops.country", country);
      }

      if (minPrice !== undefined) {
        query = query.gte("price", minPrice);
      }
      if (maxPrice !== undefined) {
        query = query.lte("price", maxPrice);
      }

      if (hasPromo) {
        query = query.not("compare_at_price", "is", null);
      }

      // Sort
      switch (sort) {
        case "price_asc":
          query = query.order("price", { ascending: true });
          break;
        case "price_desc":
          query = query.order("price", { ascending: false });
          break;
        case "newest":
        default:
          query = query.order("created_at", { ascending: false });
          break;
      }

      // Pagination
      const from = (page - 1) * pageSize;
      query = query.range(from, from + pageSize - 1);

      const { data, error } = await query;
      if (error) throw error;

      // 3. Get reviews for these products
      const productIds = (data ?? []).map((p: any) => p.id);
      let reviewsMap: Record<string, { avg: number; count: number }> = {};
      if (productIds.length > 0) {
        const { data: reviews } = await supabase
          .from("product_reviews")
          .select("product_id, rating")
          .in("product_id", productIds)
          .eq("is_approved", true);

        if (reviews) {
          const grouped: Record<string, number[]> = {};
          for (const r of reviews) {
            if (!grouped[r.product_id]) grouped[r.product_id] = [];
            grouped[r.product_id].push(r.rating);
          }
          for (const [pid, ratings] of Object.entries(grouped)) {
            reviewsMap[pid] = {
              avg: ratings.reduce((a, b) => a + b, 0) / ratings.length,
              count: ratings.length,
            };
          }
        }
      }

      // 4. Get sponsored product ids
      const { data: sponsored } = await supabase
        .from("sponsored_products")
        .select("product_id")
        .eq("is_active", true)
        .in("product_id", productIds);

      const sponsoredSet = new Set((sponsored ?? []).map((s: any) => s.product_id));

      // 5. Map results
      const products: MarketplaceProduct[] = (data ?? []).map((p: any) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        price: p.price,
        compare_at_price: p.compare_at_price,
        image_url: p.image_url,
        category: p.category,
        marketplace_category_id: p.marketplace_category_id,
        created_at: p.created_at,
        shop: Array.isArray(p.shops) ? p.shops[0] : p.shops,
        avg_rating: reviewsMap[p.id]?.avg ?? null,
        review_count: reviewsMap[p.id]?.count ?? 0,
        is_sponsored: sponsoredSet.has(p.id),
      }));

      return products;
    },
    staleTime: 30_000,
  });
}
