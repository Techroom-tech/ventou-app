
-- Enable pg_net extension (already available on Supabase)
CREATE EXTENSION IF NOT EXISTS pg_net SCHEMA extensions;

-- Function that calls notify-order via pg_net on each new order
CREATE OR REPLACE FUNCTION public.notify_order_on_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  _supabase_url text;
  _service_role_key text;
BEGIN
  -- Read secrets from vault or env
  _supabase_url := current_setting('app.settings.supabase_url', true);
  _service_role_key := current_setting('app.settings.service_role_key', true);

  -- Fallback to hardcoded project URL if setting not available
  IF _supabase_url IS NULL OR _supabase_url = '' THEN
    _supabase_url := 'https://chpplckgndznakuvcqbx.supabase.co';
  END IF;

  -- Use anon key for the call (notify-order has verify_jwt = false)
  PERFORM extensions.http_post(
    url := _supabase_url || '/functions/v1/notify-order',
    body := jsonb_build_object('order_id', NEW.id, 'shop_id', NEW.shop_id),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || coalesce(_service_role_key, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNocHBsY2tnbmR6bmFrdXZjcWJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1ODEyMTAsImV4cCI6MjA4NjE1NzIxMH0.oimHRR-gDoli9w26pif2pcurnrZQlN7mR51rBc_-gek')
    )
  );

  RETURN NEW;
END;
$$;

-- Create the trigger
DROP TRIGGER IF EXISTS after_order_insert_notify ON public.orders;
CREATE TRIGGER after_order_insert_notify
  AFTER INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_order_on_insert();
