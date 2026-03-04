import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CampaignEventRow {
  id: string;
  event_type: string;
  created_at: string;
  product_id: string | null;
  order_id: string | null;
  revenue: number | null;
  click: {
    country: string | null;
    city: string | null;
    device: string | null;
    browser: string | null;
  } | null;
}

export function useCampaignEvents(linkId: string | undefined) {
  return useQuery({
    queryKey: ['campaign-events', linkId],
    queryFn: async (): Promise<CampaignEventRow[]> => {
      if (!linkId) return [];

      // Fetch events
      const { data: events, error } = await supabase
        .from('campaign_events')
        .select('id, event_type, created_at, product_id, order_id, revenue, click_id')
        .eq('link_id', linkId)
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;

      // Get unique click_ids to fetch device/country info
      const clickIds = [...new Set((events ?? []).map(e => e.click_id).filter(Boolean))] as string[];
      
      let clickMap: Record<string, { country: string | null; city: string | null; device: string | null; browser: string | null }> = {};
      
      if (clickIds.length > 0) {
        const { data: clicks } = await supabase
          .from('campaign_clicks')
          .select('id, country, city, device, browser')
          .in('id', clickIds);
        
        for (const c of clicks ?? []) {
          clickMap[c.id] = { country: c.country, city: c.city, device: c.device, browser: c.browser };
        }
      }

      return (events ?? []).map(e => ({
        id: e.id,
        event_type: e.event_type,
        created_at: e.created_at,
        product_id: e.product_id,
        order_id: e.order_id,
        revenue: e.revenue,
        click: e.click_id ? clickMap[e.click_id] || null : null,
      }));
    },
    enabled: !!linkId,
  });
}
