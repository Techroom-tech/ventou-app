
-- Fix: Add RLS policies to tables that currently have NONE

-- 1. product_variants: should be publicly readable, manageable by product owner
CREATE POLICY "Public can view product variants"
  ON public.product_variants
  FOR SELECT
  USING (true);

CREATE POLICY "Owner can manage product variants"
  ON public.product_variants
  FOR ALL
  USING (
    product_id IN (
      SELECT p.id FROM products p
      JOIN shops s ON s.id = p.shop_id
      WHERE s.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    product_id IN (
      SELECT p.id FROM products p
      JOIN shops s ON s.id = p.shop_id
      WHERE s.owner_id = auth.uid()
    )
  );

-- 2. email_rate_limits: only service role should access (edge functions use service_role key)
-- Deny all access via anon/authenticated to prevent manipulation
CREATE POLICY "No public access to rate limits"
  ON public.email_rate_limits
  FOR ALL
  USING (false);

-- 3. subscription_plans: publicly readable (pricing page), only super_admin can manage
CREATE POLICY "Public can read subscription plans"
  ON public.subscription_plans
  FOR SELECT
  USING (true);

CREATE POLICY "Super admins manage subscription plans"
  ON public.subscription_plans
  FOR ALL
  USING (public.has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));
