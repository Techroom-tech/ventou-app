
-- Enable pg_net extension
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Replace the trigger function to use net.http_post instead of extensions.http_post
CREATE OR REPLACE FUNCTION public.notify_order_on_insert()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions', 'net'
AS $function$
DECLARE
  _supabase_url text := 'https://chpplckgndznakuvcqbx.supabase.co';
  _anon_key text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNocHBsY2tnbmR6bmFrdXZjcWJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1ODEyMTAsImV4cCI6MjA4NjE1NzIxMH0.oimHRR-gDoli9w26pif2pcurnrZQlN7mR51rBc_-gek';
BEGIN
  -- Use pg_net for async HTTP call (non-blocking, won't fail the transaction)
  PERFORM net.http_post(
    url := _supabase_url || '/functions/v1/notify-order',
    body := jsonb_build_object('order_id', NEW.id, 'shop_id', NEW.shop_id),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || _anon_key
    )
  );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Never block order creation if notification fails
    RAISE LOG 'notify_order_on_insert failed: %', SQLERRM;
    RETURN NEW;
END;
$function$;
