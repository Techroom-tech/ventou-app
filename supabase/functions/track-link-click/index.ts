import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreflightOrMethod } from "../_shared/cors.ts";
import { checkPersistentRateLimit } from "../_shared/persistentRateLimit.ts";

const REF_CODE_RE = /^[a-zA-Z0-9_-]{3,80}$/;
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

  const rl = await checkPersistentRateLimit(supabase, `track-link-click:${clientIp}`, 100, 60_000, 10 * 60_000);
  if (rl.blocked) {
    return new Response(JSON.stringify({ error: "Too many requests", retry_after: rl.retryAfterSeconds ?? 60 }), {
      status: 429,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

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

    if (!REF_CODE_RE.test(ref_code)) {
      return new Response(JSON.stringify({ error: "invalid ref_code format" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (visitor_id && !UUID_RE.test(visitor_id)) {
      return new Response(JSON.stringify({ error: "invalid visitor_id format" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
        ip_address: clientIp !== "unknown" ? clientIp : (ip_address || null),
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
