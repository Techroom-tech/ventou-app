import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreflightOrMethod } from "../_shared/cors.ts";
import { checkPersistentRateLimit } from "../_shared/persistentRateLimit.ts";

const VALID_EVENTS = ["view_product", "add_to_cart", "checkout_started", "purchase"];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  const early = handleCorsPreflightOrMethod(req, "POST");
  if (early) return early;

  const corsHeaders = getCorsHeaders(req);
  const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const rl = await checkPersistentRateLimit(supabase, `track-campaign-event:${clientIp}`, 80, 60_000, 10 * 60_000);
  if (rl.blocked) {
    return new Response(JSON.stringify({ error: "Too many requests", retry_after: rl.retryAfterSeconds ?? 60 }), {
      status: 429,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const {
      visitor_id,
      link_id,
      click_id,
      shop_id,
      event_type,
      product_id,
      order_id,
      revenue,
    } = await req.json();

    if (!visitor_id || !link_id || !shop_id || !event_type) {
      return new Response(
        JSON.stringify({ error: "visitor_id, link_id, shop_id, event_type required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!UUID_RE.test(visitor_id) || !UUID_RE.test(link_id) || !UUID_RE.test(shop_id)) {
      return new Response(
        JSON.stringify({ error: "Invalid identifier format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (click_id && !UUID_RE.test(click_id)) {
      return new Response(
        JSON.stringify({ error: "Invalid click_id format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!VALID_EVENTS.includes(event_type)) {
      return new Response(
        JSON.stringify({ error: `Invalid event_type. Must be one of: ${VALID_EVENTS.join(", ")}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { error } = await supabase.from("campaign_events").insert({
      click_id: click_id || null,
      link_id,
      shop_id,
      visitor_id,
      event_type,
      product_id: product_id || null,
      order_id: order_id || null,
      revenue: revenue ?? null,
    });

    if (error) {
      console.error("campaign_events insert error", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
