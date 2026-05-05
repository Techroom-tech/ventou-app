-- Security hardening: admin audit logs RLS + edge function abuse prevention

-- Lock down audit log table so only admins can read/insert their own entries
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read audit logs" ON public.admin_audit_logs;
CREATE POLICY "Admins can read audit logs"
ON public.admin_audit_logs
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can insert audit logs" ON public.admin_audit_logs;
CREATE POLICY "Admins can insert audit logs"
ON public.admin_audit_logs
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin(auth.uid()) AND admin_id = auth.uid());

-- Make sure edge rate limit storage stays private
ALTER TABLE public.edge_rate_limits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "No public access edge_rate_limits" ON public.edge_rate_limits;
CREATE POLICY "No public access edge_rate_limits"
ON public.edge_rate_limits
FOR ALL
TO public
USING (false)
WITH CHECK (false);
