import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface CampaignStats {
  clicks: number;
  view_product: number;
  add_to_cart: number;
  checkout_started: number;
  purchase: number;
  revenue: number;
  conversionRate: number;
  topCountries: { country: string; count: number }[];
}

export function useCampaignAnalytics(linkId: string | undefined) {
  return useQuery({
    queryKey: ['campaign-analytics', linkId],
    queryFn: async (): Promise<CampaignStats> => {
      if (!linkId) throw new Error('No linkId');

      // Fetch clicks
      const { data: clicks, error: clicksErr } = await supabase
        .from('campaign_clicks')
        .select('id, country')
        .eq('link_id', linkId);
      if (clicksErr) throw clicksErr;

      // Fetch events
      const { data: events, error: eventsErr } = await supabase
        .from('campaign_events')
        .select('event_type, revenue')
        .eq('link_id', linkId);
      if (eventsErr) throw eventsErr;

      const clickCount = clicks?.length ?? 0;
      const eventCounts = { view_product: 0, add_to_cart: 0, checkout_started: 0, purchase: 0 };
      let totalRevenue = 0;

      for (const e of events ?? []) {
        if (e.event_type in eventCounts) {
          eventCounts[e.event_type as keyof typeof eventCounts]++;
        }
        if (e.event_type === 'purchase' && e.revenue) {
          totalRevenue += Number(e.revenue);
        }
      }

      // Top countries
      const countryMap: Record<string, number> = {};
      for (const c of clicks ?? []) {
        const country = c.country || 'Unknown';
        countryMap[country] = (countryMap[country] || 0) + 1;
      }
      const topCountries = Object.entries(countryMap)
        .map(([country, count]) => ({ country, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      return {
        clicks: clickCount,
        ...eventCounts,
        revenue: totalRevenue,
        conversionRate: clickCount > 0 ? (eventCounts.purchase / clickCount) * 100 : 0,
        topCountries,
      };
    },
    enabled: !!linkId,
  });
}
