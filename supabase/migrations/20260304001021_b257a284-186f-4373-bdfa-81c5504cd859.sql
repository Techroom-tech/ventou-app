
-- 1. Add public read policy for storefront visitors (anon)
CREATE POLICY "public_read_tracking_settings"
ON public.tracking_settings
FOR SELECT
TO anon, authenticated
USING (true);

-- 2. Add facebook_capi_token column
ALTER TABLE public.tracking_settings ADD COLUMN IF NOT EXISTS facebook_capi_token text;
