-- Security hardening phase 2
-- Focus: remove unrestricted public inserts, reduce review abuse, and scope vote visibility

-- ------------------------------------------------------------
-- Campaign tracking: stop direct public inserts
-- Edge functions use the service role and bypass RLS, so this only blocks
-- direct anonymous/client-side writes.
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "public_insert_campaign_clicks" ON public.campaign_clicks;
DROP POLICY IF EXISTS "public_insert_campaign_events" ON public.campaign_events;

-- Keep owner/admin reads only (already present in previous migrations).

-- ------------------------------------------------------------
-- Product reviews: keep public submissions, but validate the target product/shop
-- and make reviews pending by default to prevent instant spam visibility.
-- ------------------------------------------------------------
ALTER TABLE public.product_reviews
  ALTER COLUMN is_approved SET DEFAULT false;

DROP POLICY IF EXISTS "public_insert_reviews" ON public.product_reviews;
CREATE POLICY "public_insert_reviews"
ON public.product_reviews
FOR INSERT
TO anon, authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.products p
    WHERE p.id = product_id
      AND p.shop_id = shop_id
      AND (p.is_active IS DISTINCT FROM false)
  )
);

-- Approved reviews remain publicly readable.
DROP POLICY IF EXISTS "public_read_approved_reviews" ON public.product_reviews;
CREATE POLICY "public_read_approved_reviews"
ON public.product_reviews
FOR SELECT
TO anon, authenticated
USING (is_approved = true);

-- Owner/admin moderation stays in place.
DROP POLICY IF EXISTS "owner_manage_reviews" ON public.product_reviews;
CREATE POLICY "owner_manage_reviews"
ON public.product_reviews
FOR ALL
TO authenticated
USING (
  shop_id IN (SELECT id FROM public.shops WHERE owner_id = auth.uid())
  OR public.is_admin(auth.uid())
)
WITH CHECK (
  shop_id IN (SELECT id FROM public.shops WHERE owner_id = auth.uid())
  OR public.is_admin(auth.uid())
);

-- ------------------------------------------------------------
-- Feedback votes: users should only see their own votes
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated can read votes" ON public.feedback_votes;
CREATE POLICY "Users can read own votes"
ON public.feedback_votes
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own votes" ON public.feedback_votes;
CREATE POLICY "Users can insert own votes"
ON public.feedback_votes
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own votes" ON public.feedback_votes;
CREATE POLICY "Users can delete own votes"
ON public.feedback_votes
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- ------------------------------------------------------------
-- Feedback screenshots: keep existing bucket behavior unchanged here.
-- This should be revisited later for private buckets + signed URLs.
-- ------------------------------------------------------------
