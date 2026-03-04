import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreflightOrMethod } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  const early = handleCorsPreflightOrMethod(req, "POST");
  if (early) return early;

  const corsHeaders = getCorsHeaders(req);

  try {
    const {
      ref_code,
      visitor_id,
      ip_address,
      country,
      city,
      device,
      browser,
      fbclid,
      ttclid,
    } = await req.json();

    if (!ref_code || typeof ref_code !== "string") {
      return new Response(JSON.stringify({ error: "ref_code required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1. Increment clicks + last_clicked_at on tracked_links
    const { error: incError } = await supabase.rpc("increment_tracked_link_click", {
      _ref_code: ref_code,
    });
    if (incError) {
      console.error("increment error", incError);
    }

    // 2. Get the link_id and shop_id for this ref_code
    const { data: link, error: linkError } = await supabase
      .from("tracked_links")
      .select("id, shop_id")
      .eq("ref_code", ref_code)
      .single();

    if (linkError || !link) {
      return new Response(JSON.stringify({ error: "Link not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Insert campaign_click
    const { data: click, error: clickError } = await supabase
      .from("campaign_clicks")
      .insert({
        link_id: link.id,
        shop_id: link.shop_id,
        visitor_id: visitor_id || "unknown",
        ip_address: ip_address || null,
        country: country || null,
        city: city || null,
        device: device || null,
        browser: browser || null,
        fbclid: fbclid || null,
        ttclid: ttclid || null,
      })
      .select("id")
      .single();

    if (clickError) {
      console.error("campaign_clicks insert error", clickError);
      return new Response(JSON.stringify({ error: clickError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        ok: true,
        click_id: click.id,
        link_id: link.id,
        shop_id: link.shop_id,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
