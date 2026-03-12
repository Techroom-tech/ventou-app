
CREATE TABLE public.email_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  email text NOT NULL,
  otp_code text NOT NULL,
  token text NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  type text NOT NULL DEFAULT 'signup',
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '10 minutes'),
  used boolean NOT NULL DEFAULT false,
  attempts int NOT NULL DEFAULT 0,
  locked_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.email_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No public access" ON public.email_verifications
  FOR ALL TO public USING (false);

CREATE INDEX idx_email_verifications_user_email ON public.email_verifications (user_id, email, type);
CREATE INDEX idx_email_verifications_token ON public.email_verifications (token);
CREATE INDEX idx_email_verifications_otp ON public.email_verifications (otp_code, type, used);
