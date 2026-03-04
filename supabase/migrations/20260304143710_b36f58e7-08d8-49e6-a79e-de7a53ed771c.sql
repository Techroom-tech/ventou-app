-- Allow admins to permanently delete shops
CREATE POLICY "Admins can delete shops"
ON public.shops
FOR DELETE
TO authenticated
USING (is_admin(auth.uid()));