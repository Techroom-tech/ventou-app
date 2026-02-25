import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import nodemailer from "npm:nodemailer@6";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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
      // Mode 2: Load from DB flat columns
      const { data: provider, error: provErr } = await supabaseAdmin
        .from("email_providers")
        .select("mail_host, mail_port, mail_username, mail_password, sender_email, sender_name")
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
      password = String(provider.mail_password || "");
      senderEmail = String(provider.sender_email || username).trim();
      senderName = String(provider.sender_name || "").trim();

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
      html: html || `<h2>✅ SMTP is working correctly</h2><p>This email was sent via your configured SMTP provider.</p><p>Sent at: ${new Date().toISOString()}</p>`,
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
