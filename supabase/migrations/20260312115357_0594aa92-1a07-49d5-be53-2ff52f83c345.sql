
-- Feedbacks table
CREATE TABLE public.feedbacks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  store_id UUID REFERENCES public.shops(id) ON DELETE SET NULL,
  type TEXT NOT NULL DEFAULT 'feedback',
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  page_url TEXT,
  browser TEXT,
  device TEXT,
  screenshot_url TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  votes_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_feedbacks_user_id ON public.feedbacks(user_id);
CREATE INDEX idx_feedbacks_store_id ON public.feedbacks(store_id);
CREATE INDEX idx_feedbacks_status ON public.feedbacks(status);
CREATE INDEX idx_feedbacks_type ON public.feedbacks(type);

-- RLS
ALTER TABLE public.feedbacks ENABLE ROW LEVEL SECURITY;

-- Users can insert their own feedback
CREATE POLICY "Users can insert own feedback"
  ON public.feedbacks FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can read their own feedback
CREATE POLICY "Users can read own feedback"
  ON public.feedbacks FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Admins can read all feedback
CREATE POLICY "Admins can read all feedback"
  ON public.feedbacks FOR SELECT TO authenticated
  USING (is_admin(auth.uid()));

-- Admins can update feedback (status changes)
CREATE POLICY "Admins can update feedback"
  ON public.feedbacks FOR UPDATE TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- Storage bucket for feedback screenshots
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('feedback-screenshots', 'feedback-screenshots', true, 5242880)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: authenticated users can upload
CREATE POLICY "Authenticated users can upload feedback screenshots"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'feedback-screenshots');

-- Storage RLS: public read
CREATE POLICY "Public can view feedback screenshots"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'feedback-screenshots');
