/**
 * Shared CORS utility for Supabase Edge Functions.
 * Supports wildcard subdomains for multi-tenant architecture.
 */

const ALLOWED_ORIGIN_PATTERN = /^https:\/\/([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)*ventou\.shop$/i;

export function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") || "";
  const requestOrigin = new URL(req.url).origin;
  const allowedOrigin = ALLOWED_ORIGIN_PATTERN.test(origin) ? origin : requestOrigin;

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Vary": "Origin",
  };
}

export function handleCorsPreflightOrMethod(req: Request, allowedMethod = "POST"): Response | null {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== allowedMethod) {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return null;
}
