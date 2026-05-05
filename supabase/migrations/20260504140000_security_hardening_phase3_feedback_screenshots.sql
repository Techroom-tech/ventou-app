-- Security Hardening Phase 3: Secure Feedback Screenshots
-- Issue: feedback-screenshots bucket was public, allowing anyone to view user screenshots
-- Solution: Make bucket private (authenticated only) + restrict read access to admins

-- Step 1: Make feedback-screenshots bucket private
UPDATE storage.buckets 
SET public = false 
WHERE id = 'feedback-screenshots';

-- Step 2: Drop existing public-facing policies
DROP POLICY IF EXISTS "Public can view feedback screenshots" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload feedback screenshots" ON storage.objects;

-- Step 3: New stricter policies
-- Only authenticated users can INSERT (upload) their own screenshots
CREATE POLICY "Authenticated users can upload feedback screenshots"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'feedback-screenshots');

-- Only admins can SELECT (read) feedback screenshots
-- This aligns with the fact that only admins can view/manage feedback records
CREATE POLICY "Admins can read feedback screenshots"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'feedback-screenshots' AND is_admin(auth.uid()));

-- Authenticated users can DELETE their own screenshots
CREATE POLICY "Authenticated users can delete own feedback screenshots"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'feedback-screenshots' AND auth.uid() = owner);
