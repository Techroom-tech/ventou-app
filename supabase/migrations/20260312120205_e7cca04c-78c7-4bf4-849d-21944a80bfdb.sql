
-- Table feedback_votes
CREATE TABLE public.feedback_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feedback_id uuid NOT NULL REFERENCES public.feedbacks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (feedback_id, user_id)
);

-- RLS
ALTER TABLE public.feedback_votes ENABLE ROW LEVEL SECURITY;

-- Authenticated can read all votes
CREATE POLICY "Authenticated can read votes"
  ON public.feedback_votes FOR SELECT
  TO authenticated
  USING (true);

-- Users can insert own votes
CREATE POLICY "Users can insert own votes"
  ON public.feedback_votes FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can delete own votes
CREATE POLICY "Users can delete own votes"
  ON public.feedback_votes FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Trigger function to sync votes_count
CREATE OR REPLACE FUNCTION public.sync_feedback_votes_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _feedback_id uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    _feedback_id := OLD.feedback_id;
  ELSE
    _feedback_id := NEW.feedback_id;
  END IF;

  UPDATE public.feedbacks
  SET votes_count = (
    SELECT COUNT(*) FROM public.feedback_votes WHERE feedback_id = _feedback_id
  )
  WHERE id = _feedback_id;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER after_feedback_vote_change
  AFTER INSERT OR DELETE ON public.feedback_votes
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_feedback_votes_count();

-- Allow all authenticated users to read feature requests (for ideas page)
CREATE POLICY "Authenticated can read feature feedbacks"
  ON public.feedbacks FOR SELECT
  TO authenticated
  USING (type = 'feature');
