CREATE OR REPLACE FUNCTION public.increment_tracked_link_click(_ref_code text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE tracked_links
  SET clicks = COALESCE(clicks, 0) + 1,
      last_clicked_at = now()
  WHERE ref_code = _ref_code;
$$;