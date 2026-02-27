import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreflightOrMethod } from "../_shared/cors.ts";

// ─── AES-256-CBC Encrypt using Web Crypto API ────
async function encryptValue(plaintext: string): Promise<string> {
  const keyHex = Deno.env.get("ENCRYPTION_KEY");
  if (!keyHex) throw new Error("ENCRYPTION_KEY not configured");

  const key = new Uint8Array(keyHex.match(/.{2}/g)!.map((b: string) => parseInt(b, 16)));
  const iv = crypto.getRandomValues(new Uint8Array(16));

  const cryptoKey = await crypto.subtle.importKey("raw", key, { name: "AES-CBC" }, false, ["encrypt"]);

  // PKCS7 padding
  const encoder = new TextEncoder();
  const data = encoder.encode(plaintext);
  const blockSize = 16;
  const padLength = blockSize - (data.length % blockSize);
  const padded = new Uint8Array(data.length + padLength);
  padded.set(data);
  padded.fill(padLength, data.length);

  const encrypted = await crypto.subtle.encrypt({ name: "AES-CBC", iv }, cryptoKey, padded);

  const ivHex = Array.from(iv).map(b => b.toString(16).padStart(2, "0")).join("");
  const cipherHex = Array.from(new Uint8Array(encrypted)).map(b => b.toString(16).padStart(2, "0")).join("");

  return `${ivHex}:${cipherHex}`;
}

Deno.serve(async (req) => {
  const methodResponse = handleCorsPreflightOrMethod(req, "POST");
  if (methodResponse) return methodResponse;
  const corsHeaders = getCorsHeaders(req);

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // ─── Auth: validate JWT (admin only) ─────────
    const authHeader = req.headers.get("authorization") || "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");

    if (token !== Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")) {
      const userClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } }
      );

      const { data: userData, error: authErr } = await userClient.auth.getUser();
      if (authErr || !userData?.user) {
        return new Response(JSON.stringify({ error: "Invalid token" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: roleData } = await supabaseAdmin
        .from("user_roles")
        .select("role")
        .eq("user_id", userData.user.id)
        .in("role", ["super_admin", "manager"])
        .limit(1);

      if (!roleData || roleData.length === 0) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // ─── Parse body ──────────────────────────────
    const { provider_id, config } = await req.json();

    if (!provider_id || !config || typeof config !== "object") {
      return new Response(JSON.stringify({ error: "Missing provider_id or config" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── Encrypt each config value ───────────────
    const encryptedConfig: Record<string, string> = {};
    for (const [key, value] of Object.entries(config)) {
      if (value && typeof value === "string" && value.trim().length > 0) {
        encryptedConfig[key] = await encryptValue(value);
      }
    }

    // ─── Update provider in DB ───────────────────
    const { error: updateErr } = await supabaseAdmin
      .from("email_providers")
      .update({
        encrypted_config: encryptedConfig,
        updated_at: new Date().toISOString(),
      })
      .eq("id", provider_id);

    if (updateErr) throw updateErr;

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("[encrypt-config] Error:", err.message);
    return new Response(
      JSON.stringify({ error: err.message || "Encryption failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
