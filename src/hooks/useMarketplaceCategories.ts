import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface MarketplaceCategory {
  id: string;
  name: string;
  slug: string;
  icon: string;
  image_url: string | null;
  banner_url: string | null;
  banner_title: string | null;
  banner_link: string | null;
  position: number;
}

export function useMarketplaceCategories() {
  return useQuery({
    queryKey: ["marketplace-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("marketplace_categories")
        .select("*")
        .eq("is_active", true)
        .order("position", { ascending: true });
      if (error) throw error;
      return (data ?? []) as MarketplaceCategory[];
    },
    staleTime: 5 * 60_000,
  });
}
