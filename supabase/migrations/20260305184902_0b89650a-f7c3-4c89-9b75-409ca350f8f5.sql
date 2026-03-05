-- Add public read policy for footer_disclaimer key only
CREATE POLICY "public_read_footer_disclaimer"
ON public.platform_settings
FOR SELECT
TO anon, authenticated
USING (key = 'footer_disclaimer');