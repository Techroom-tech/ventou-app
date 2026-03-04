ALTER TABLE public.product_reviews
  ADD COLUMN vendor_reply text,
  ADD COLUMN vendor_reply_at timestamptz;