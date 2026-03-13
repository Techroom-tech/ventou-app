import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface MarketplaceBanner {
  id: string;
  image_url: string;
  title: string | null;
  description: string | null;
  button_text: string | null;
  button_link: string | null;
  priority: number;
}

export function useMarketplaceBanners() {
  return useQuery({
    queryKey: ["marketplace-banners"],
    queryFn: async () => {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from("marketplace_banners")
        .select("*")
        .eq("is_active", true)
        .lte("starts_at", now)
        .or(`ends_at.is.null,ends_at.gte.${now}`)
        .order("priority", { ascending: false });
      if (error) throw error;
      return (data ?? []) as MarketplaceBanner[];
    },
    staleTime: 2 * 60_000,
  });
}
