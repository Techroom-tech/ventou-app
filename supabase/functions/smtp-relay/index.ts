import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import nodemailer from "npm:nodemailer@6";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── AES-256-CBC Decrypt ─────────────────────────
function decrypt(encrypted: string): string {
  const keyHex = Deno.env.get("ENCRYPTION_KEY");
  if (!keyHex) throw new Error("ENCRYPTION_KEY not configured");

  const [ivHex, cipherHex] = encrypted.split(":");
  if (!ivHex || !cipherHex) throw new Error("Invalid encrypted format");

  const key = new Uint8Array(keyHex.match(/.{2}/g)!.map((b: string) => parseInt(b, 16)));
  const iv = new Uint8Array(ivHex.match(/.{2}/g)!.map((b: string) => parseInt(b, 16)));
  const cipherBytes = new Uint8Array(cipherHex.match(/.{2}/g)!.map((b: string) => parseInt(b, 16)));

  // Use Web Crypto API for AES-CBC decryption
  return decryptAesCbc(key, iv, cipherBytes);
}

async function decryptAesCbc(key: Uint8Array, iv: Uint8Array, data: Uint8Array): Promise<string> {
  const cryptoKey = await crypto.subtle.importKey("raw", key, { name: "AES-CBC" }, false, ["decrypt"]);
  const decrypted = await crypto.subtle.decrypt({ name: "AES-CBC", iv }, cryptoKey, data);
  return new TextDecoder().decode(decrypted);
}

// ─── Rate Limiting ───────────────────────────────
async function checkTestRateLimit(admin: any, userId: string): Promise<boolean> {
  const windowStart = new Date(Date.now() - 60000).toISOString();
  const { data } = await admin
    .from("email_rate_limits")
    .select("id, count")
    .eq("user_id", userId)
    .gte("window_start", windowStart)
    .maybeSingle();

  if (data && data.count >= 5) return false;

  if (data) {
    await admin.from("email_rate_limits").update({ count: data.count + 1 }).eq("id", data.id);
  } else {
    await admin.from("email_rate_limits").insert({ user_id: userId, count: 1, window_start: new Date().toISOString() });
  }
  return true;
}

Deno.serve(async (req) => {
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
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // ─── Auth: validate JWT ──────────────────────
    const authHeader = req.headers.get("authorization") || "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    let callerUserId: string;

    if (token === Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")) {
      callerUserId = "service_role";
    } else {
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

      callerUserId = userData.user.id;

      // Admin check
      const { data: roleData } = await supabaseAdmin
        .from("user_roles")
        .select("role")
        .eq("user_id", callerUserId)
        .in("role", ["super_admin", "manager"])
        .limit(1);

      if (!roleData || roleData.length === 0) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // ─── Rate limit ──────────────────────────────
    if (callerUserId !== "service_role") {
      const allowed = await checkTestRateLimit(supabaseAdmin, callerUserId);
      if (!allowed) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded (5/min)" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // ─── Parse body ──────────────────────────────
    const body = await req.json();
    const { provider_id, to, subject, html, smtp_config } = body;

    // Mode 1: Direct SMTP config (for test before save)
    // Mode 2: provider_id (load from DB and decrypt)
    let host: string, port: number, username: string, password: string, senderEmail: string;

    if (smtp_config) {
      // Direct test mode - credentials passed directly
      host = smtp_config.host;
      port = parseInt(smtp_config.port, 10);
      username = smtp_config.username;
      password = smtp_config.password;
      senderEmail = smtp_config.sender_email || to;
    } else if (provider_id) {
      // Load from DB
      const { data: provider, error: provErr } = await supabaseAdmin
        .from("email_providers")
        .select("*")
        .eq("id", provider_id)
        .maybeSingle();

      if (provErr || !provider) {
        return new Response(JSON.stringify({ error: "Provider not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const config = provider.encrypted_config || {};
      host = config.host ? await decryptAesCbc(
        new Uint8Array(Deno.env.get("ENCRYPTION_KEY")!.match(/.{2}/g)!.map((b: string) => parseInt(b, 16))),
        new Uint8Array(config.host.split(":")[0].match(/.{2}/g)!.map((b: string) => parseInt(b, 16))),
        new Uint8Array(config.host.split(":")[1].match(/.{2}/g)!.map((b: string) => parseInt(b, 16)))
      ) : "";
      port = config.port ? parseInt(await decryptAesCbc(
        new Uint8Array(Deno.env.get("ENCRYPTION_KEY")!.match(/.{2}/g)!.map((b: string) => parseInt(b, 16))),
        new Uint8Array(config.port.split(":")[0].match(/.{2}/g)!.map((b: string) => parseInt(b, 16))),
        new Uint8Array(config.port.split(":")[1].match(/.{2}/g)!.map((b: string) => parseInt(b, 16)))
      ), 10) : 465;
      username = config.username ? await decryptAesCbc(
        new Uint8Array(Deno.env.get("ENCRYPTION_KEY")!.match(/.{2}/g)!.map((b: string) => parseInt(b, 16))),
        new Uint8Array(config.username.split(":")[0].match(/.{2}/g)!.map((b: string) => parseInt(b, 16))),
        new Uint8Array(config.username.split(":")[1].match(/.{2}/g)!.map((b: string) => parseInt(b, 16)))
      ) : "";
      password = config.password ? await decryptAesCbc(
        new Uint8Array(Deno.env.get("ENCRYPTION_KEY")!.match(/.{2}/g)!.map((b: string) => parseInt(b, 16))),
        new Uint8Array(config.password.split(":")[0].match(/.{2}/g)!.map((b: string) => parseInt(b, 16))),
        new Uint8Array(config.password.split(":")[1].match(/.{2}/g)!.map((b: string) => parseInt(b, 16)))
      ) : "";
      senderEmail = provider.sender_email || username;
    } else {
      return new Response(JSON.stringify({ error: "Missing provider_id or smtp_config" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!host || !port || !username || !password) {
      return new Response(JSON.stringify({ error: "Incomplete SMTP configuration" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── Send via Nodemailer ─────────────────────
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user: username, pass: password },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    });

    await transporter.sendMail({
      from: `${senderEmail}`,
      to,
      subject: subject || "SMTP Test Email",
      html: html || `<h2>✅ SMTP is working correctly</h2><p>This email was sent via your configured SMTP provider.</p><p>Sent at: ${new Date().toISOString()}</p>`,
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("[smtp-relay] Error:", err.message);
    return new Response(
      JSON.stringify({ error: err.message || "SMTP delivery failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
