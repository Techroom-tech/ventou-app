
-- 1. Add encrypted_config column to email_providers
ALTER TABLE public.email_providers
ADD COLUMN IF NOT EXISTS encrypted_config jsonb DEFAULT '{}'::jsonb;

-- 2. Create email_logs table
CREATE TABLE IF NOT EXISTS public.email_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient text NOT NULL,
  template_slug text,
  provider text,
  status text NOT NULL DEFAULT 'success',
  error_message text,
  user_id uuid,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS: deny public, admins can read
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read email logs"
  ON public.email_logs FOR SELECT
  TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "No public write to email logs"
  ON public.email_logs FOR ALL
  TO public
  USING (false);
