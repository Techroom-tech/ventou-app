import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreflightOrMethod } from "../_shared/cors.ts";

const VALID_EVENTS = ["view_product", "add_to_cart", "checkout_started", "purchase"];

Deno.serve(async (req) => {
  const early = handleCorsPreflightOrMethod(req, "POST");
  if (early) return early;

  const corsHeaders = getCorsHeaders(req);

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

    if (!VALID_EVENTS.includes(event_type)) {
      return new Response(
        JSON.stringify({ error: `Invalid event_type. Must be one of: ${VALID_EVENTS.join(", ")}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

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
