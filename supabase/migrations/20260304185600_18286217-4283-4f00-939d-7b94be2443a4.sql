
-- Phase 1: Create campaign_clicks and campaign_events tables

CREATE TABLE public.campaign_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id uuid NOT NULL REFERENCES public.tracked_links(id) ON DELETE CASCADE,
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  visitor_id text NOT NULL,
  ip_address text,
  country text,
  city text,
  device text,
  browser text,
  fbclid text,
  ttclid text,
  clicked_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.campaign_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  click_id uuid REFERENCES public.campaign_clicks(id) ON DELETE SET NULL,
  link_id uuid NOT NULL REFERENCES public.tracked_links(id) ON DELETE CASCADE,
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  visitor_id text NOT NULL,
  event_type text NOT NULL,
  product_id uuid,
  order_id uuid,
  revenue numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_campaign_clicks_link_id ON public.campaign_clicks(link_id);
CREATE INDEX idx_campaign_clicks_shop_id ON public.campaign_clicks(shop_id);
CREATE INDEX idx_campaign_clicks_visitor_id ON public.campaign_clicks(visitor_id);
CREATE INDEX idx_campaign_events_link_id ON public.campaign_events(link_id);
CREATE INDEX idx_campaign_events_shop_id ON public.campaign_events(shop_id);
CREATE INDEX idx_campaign_events_event_type ON public.campaign_events(event_type);
CREATE INDEX idx_campaign_events_click_id ON public.campaign_events(click_id);

-- RLS policies for campaign_clicks
ALTER TABLE public.campaign_clicks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_insert_campaign_clicks" ON public.campaign_clicks
  FOR INSERT WITH CHECK (true);

CREATE POLICY "owner_read_campaign_clicks" ON public.campaign_clicks
  FOR SELECT USING (
    shop_id IN (SELECT id FROM public.shops WHERE owner_id = auth.uid())
    OR is_admin(auth.uid())
  );

-- RLS policies for campaign_events
ALTER TABLE public.campaign_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_insert_campaign_events" ON public.campaign_events
  FOR INSERT WITH CHECK (true);

CREATE POLICY "owner_read_campaign_events" ON public.campaign_events
  FOR SELECT USING (
    shop_id IN (SELECT id FROM public.shops WHERE owner_id = auth.uid())
    OR is_admin(auth.uid())
  );
