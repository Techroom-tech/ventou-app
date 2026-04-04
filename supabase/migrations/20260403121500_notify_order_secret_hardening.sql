-- Remove hardcoded keys from notify-order trigger function.
CREATE OR REPLACE FUNCTION public.notify_order_on_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions', 'net'
AS $$
DECLARE
  _supabase_url text;
  _service_role_key text;
BEGIN
  _supabase_url := current_setting('app.settings.supabase_url', true);
  _service_role_key := current_setting('app.settings.service_role_key', true);

  IF _supabase_url IS NULL OR _supabase_url = '' THEN
    _supabase_url := 'https://chpplckgndznakuvcqbx.supabase.co';
  END IF;

  IF _service_role_key IS NULL OR _service_role_key = '' THEN
    RAISE LOG 'notify_order_on_insert skipped: missing app.settings.service_role_key';
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
    url := _supabase_url || '/functions/v1/notify-order',
    body := jsonb_build_object('order_id', NEW.id, 'shop_id', NEW.shop_id),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || _service_role_key
    )
  );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'notify_order_on_insert failed: %', SQLERRM;
    RETURN NEW;
END;
$$;
