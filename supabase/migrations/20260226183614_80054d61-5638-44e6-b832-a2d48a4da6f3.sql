
-- Fix 1: Drop the overly permissive "Admin full access on email_providers" policy
-- The "Super admins manage email providers" policy already enforces proper access
DROP POLICY IF EXISTS "Admin full access on email_providers" ON public.email_providers;
