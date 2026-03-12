import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import nodemailer from "npm:nodemailer@6";
import { getCorsHeaders, handleCorsPreflightOrMethod } from "../_shared/cors.ts";

// ─── AES-256-CBC Decrypt using Web Crypto API ────
async function decryptValue(encrypted: string): Promise<string> {
  const keyHex = Deno.env.get("ENCRYPTION_KEY");
  if (!keyHex) throw new Error("ENCRYPTION_KEY not configured");

  const [ivHex, cipherHex] = encrypted.split(":");
  if (!ivHex || !cipherHex) throw new Error("Invalid encrypted format");

  const key = new Uint8Array(keyHex.match(/.{2}/g)!.map((b: string) => parseInt(b, 16)));
  const iv = new Uint8Array(ivHex.match(/.{2}/g)!.map((b: string) => parseInt(b, 16)));
  const cipherData = new Uint8Array(cipherHex.match(/.{2}/g)!.map((b: string) => parseInt(b, 16)));

  const cryptoKey = await crypto.subtle.importKey("raw", key, { name: "AES-CBC" }, false, ["decrypt"]);
  const decrypted = await crypto.subtle.decrypt({ name: "AES-CBC", iv }, cryptoKey, cipherData);

  // Remove PKCS7 padding
  const bytes = new Uint8Array(decrypted);
  const padLen = bytes[bytes.length - 1];
  return new TextDecoder().decode(bytes.slice(0, bytes.length - padLen));
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

    // ─── Parse body ──────────────────────────────
    const body = await req.json();
    const { provider_id, to, subject, html, smtp_config } = body;

    console.log("[smtp-relay] Request received:", { provider_id, to, subject, has_smtp_config: !!smtp_config });

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    let host: string;
    let port: number;
    let username: string;
    let password: string;
    let senderEmail: string;
    let senderName = "";

    if (smtp_config) {
      // Mode 1: Direct SMTP config passed in body (for inline test)
      host = String(smtp_config.host || "").trim();
      port = parseInt(String(smtp_config.port || ""), 10);
      username = String(smtp_config.username || "").trim();
      password = String(smtp_config.password || "");
      senderEmail = String(smtp_config.sender_email || "").trim();
      senderName = String(smtp_config.sender_name || "").trim();
      console.log("[smtp-relay] Using direct smtp_config");
    } else if (provider_id) {
      // Mode 2: Load from DB — prefer encrypted_config over plaintext
      const { data: provider, error: provErr } = await supabaseAdmin
        .from("email_providers")
        .select("mail_host, mail_port, mail_username, mail_password, encrypted_config, sender_email, sender_name")
        .eq("id", provider_id)
        .maybeSingle();

      console.log("[smtp-relay] Provider lookup:", { provider_id, found: !!provider, error: provErr?.message });

      if (provErr || !provider) {
        return new Response(JSON.stringify({ error: "Provider not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      host = String(provider.mail_host || "").trim();
      port = provider.mail_port || 465;
      username = String(provider.mail_username || "").trim();
      senderEmail = String(provider.sender_email || username).trim();
      senderName = String(provider.sender_name || "").trim();

      // Decrypt password from encrypted_config if available, fallback to plaintext
      const enc = provider.encrypted_config as Record<string, string> | null;
      if (enc?.mail_password) {
        try {
          password = await decryptValue(enc.mail_password);
          console.log("[smtp-relay] Using encrypted credentials");
        } catch (decErr: any) {
          console.error("[smtp-relay] Decrypt failed, falling back to plaintext:", decErr.message);
          password = String(provider.mail_password || "");
        }
      } else {
        password = String(provider.mail_password || "");
        console.log("[smtp-relay] Using plaintext credentials (no encrypted_config)");
      }

      console.log("[smtp-relay] Provider config loaded:", { host, port, username: username ? "***" : "(empty)", senderEmail });
    } else {
      return new Response(JSON.stringify({ error: "Missing provider_id or smtp_config" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!to || !emailRegex.test(String(to).trim())) {
      return new Response(JSON.stringify({ error: "Invalid recipient email" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!senderEmail || !emailRegex.test(senderEmail)) {
      return new Response(JSON.stringify({ error: "Invalid sender email" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!host || !Number.isFinite(port) || port < 1 || port > 65535 || !username || !password) {
      console.error("[smtp-relay] Incomplete config:", { host: !!host, port, username: !!username, password: !!password });
      return new Response(JSON.stringify({ error: "Incomplete SMTP configuration. Please fill in all SMTP fields and save before testing." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const fromHeader = senderName ? `${senderName} <${senderEmail}>` : senderEmail;

    // ─── Send via Nodemailer ─────────────────────
    console.log("[smtp-relay] Creating transporter:", { host, port, secure: port === 465 });

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user: username, pass: password },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
      tls: {
        minVersion: "TLSv1.2",
      },
    });

    await transporter.verify();

    const info = await transporter.sendMail({
      from: fromHeader,
      to: String(to).trim(),
      subject: subject || "SMTP Test Email",
      html: html || `<div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;padding:30px;text-align:center;"><h2 style="color:#16a34a;">✅ Test mail réussi avec succès !</h2><p style="color:#374151;font-size:15px;">Votre configuration SMTP fonctionne correctement.</p><p style="color:#6b7280;font-size:13px;">Envoyé le : ${new Date().toISOString()}</p></div>`,
    });

    const accepted = Array.isArray(info.accepted) ? info.accepted.map(String) : [];
    const rejected = Array.isArray(info.rejected) ? info.rejected.map(String) : [];

    console.log("[smtp-relay] Email sent:", {
      to,
      messageId: info.messageId,
      accepted,
      rejected,
      response: info.response,
    });

    if (accepted.length === 0) {
      return new Response(JSON.stringify({ error: "SMTP accepted 0 recipients", delivery: { messageId: info.messageId, accepted, rejected, response: info.response } }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, delivery: { messageId: info.messageId, accepted, rejected, response: info.response } }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("[smtp-relay] Error:", err.message, err.stack);
    return new Response(
      JSON.stringify({ error: err.message || "SMTP delivery failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
