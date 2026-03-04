import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface TrackEventBody {
  event_name: string;
  event_id: string;
  shop_id: string;
  custom_data?: Record<string, unknown>;
  user_data?: Record<string, unknown>;
  event_source_url?: string;
}

// SHA-256 hash for CAPI user data
async function sha256(value: string): Promise<string> {
  const data = new TextEncoder().encode(value.trim().toLowerCase());
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body: TrackEventBody = await req.json();
    const { event_name, event_id, shop_id, custom_data, user_data, event_source_url } = body;

    if (!event_name || !event_id || !shop_id) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch tracking settings using service role
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: settings, error } = await supabaseAdmin
      .from("tracking_settings")
      .select("facebook_pixel, facebook_capi_token, tiktok_pixel")
      .eq("shop_id", shop_id)
      .maybeSingle();

    if (error || !settings) {
      return new Response(
        JSON.stringify({ error: "No tracking settings found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results: Record<string, unknown> = {};
    const eventTime = Math.floor(Date.now() / 1000);

    // ── Facebook CAPI ──
    if (settings.facebook_pixel && settings.facebook_capi_token) {
      try {
        const hashedUserData: Record<string, string> = {};
        if (user_data?.em && typeof user_data.em === "string") {
          hashedUserData.em = [await sha256(user_data.em)];
        }
        if (user_data?.ph && typeof user_data.ph === "string") {
          hashedUserData.ph = [await sha256(user_data.ph)];
        }

        const fbPayload = {
          data: [
            {
              event_name,
              event_time: eventTime,
              event_id,
              event_source_url: event_source_url || "",
              action_source: "website",
              user_data: {
                client_user_agent: req.headers.get("user-agent") || "",
                client_ip_address: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "",
                ...hashedUserData,
              },
              custom_data: custom_data || {},
            },
          ],
        };

        const fbRes = await fetch(
          `https://graph.facebook.com/v18.0/${settings.facebook_pixel}/events?access_token=${settings.facebook_capi_token}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(fbPayload),
          }
        );

        results.facebook = {
          status: fbRes.status,
          body: await fbRes.json().catch(() => null),
        };
      } catch (e) {
        results.facebook = { error: String(e) };
      }
    }

    // ── TikTok Events API ──
    if (settings.tiktok_pixel) {
      // TikTok Events API requires an access token stored separately
      // For now, log that the pixel exists but server-side is not configured
      results.tiktok = { status: "pixel_exists_no_server_token" };
    }

    return new Response(JSON.stringify({ ok: true, results }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
