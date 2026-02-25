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

    let host: string, port: number, username: string, password: string, senderEmail: string;

    if (smtp_config) {
      // Mode 1: Direct SMTP config passed in body (for inline test)
      host = smtp_config.host;
      port = parseInt(smtp_config.port, 10);
      username = smtp_config.username;
      password = smtp_config.password;
      senderEmail = smtp_config.sender_email || to;
      console.log("[smtp-relay] Using direct smtp_config");
    } else if (provider_id) {
      // Mode 2: Load from DB flat columns
      const { data: provider, error: provErr } = await supabaseAdmin
        .from("email_providers")
        .select("mail_host, mail_port, mail_username, mail_password, sender_email")
        .eq("id", provider_id)
        .maybeSingle();

      console.log("[smtp-relay] Provider lookup:", { provider_id, found: !!provider, error: provErr?.message });

      if (provErr || !provider) {
        return new Response(JSON.stringify({ error: "Provider not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      host = provider.mail_host || "";
      port = provider.mail_port || 465;
      username = provider.mail_username || "";
      password = provider.mail_password || "";
      senderEmail = provider.sender_email || username;

      console.log("[smtp-relay] Provider config loaded:", { host, port, username: username ? "***" : "(empty)", senderEmail });
    } else {
      return new Response(JSON.stringify({ error: "Missing provider_id or smtp_config" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!host || !port || !username || !password) {
      console.error("[smtp-relay] Incomplete config:", { host: !!host, port: !!port, username: !!username, password: !!password });
      return new Response(JSON.stringify({ error: "Incomplete SMTP configuration. Please fill in all SMTP fields and save before testing." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
    });

    await transporter.sendMail({
      from: senderEmail,
      to,
      subject: subject || "SMTP Test Email",
      html: html || `<h2>✅ SMTP is working correctly</h2><p>This email was sent via your configured SMTP provider.</p><p>Sent at: ${new Date().toISOString()}</p>`,
    });

    console.log("[smtp-relay] Email sent successfully to:", to);

    return new Response(JSON.stringify({ success: true }), {
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
