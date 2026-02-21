import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ─── Master Email Layout ─────────────────────────
function wrapInLayout(body: string, variables: Record<string, string>): string {
  const year = variables.year || new Date().getFullYear().toString();
  const siteName = variables.site_name || "Ventou";
  const logoUrl = variables.logo_url || "";

  const logoHtml = logoUrl
    ? `<img src="${logoUrl}" height="40" alt="${siteName}" style="display:block;margin:0 auto;" />`
    : `<span style="color:#ffffff;font-size:20px;font-weight:700;letter-spacing:1px;">${siteName}</span>`;

  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f6f9;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:20px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:10px;overflow:hidden;font-family:Inter,Arial,sans-serif;">
<tr><td style="background:#111827;padding:25px;text-align:center;">${logoHtml}</td></tr>
<tr><td style="padding:35px;color:#111827;font-size:15px;line-height:1.6;">${body}</td></tr>
<tr><td style="background:#f9fafb;padding:20px;text-align:center;font-size:12px;color:#6b7280;">© ${year} ${siteName}. Tous droits réservés.</td></tr>
</table>
</td></tr>
</table>
</body></html>`;
}

// ─── Template Variable Replacement ───────────────
function replaceVariables(
  text: string,
  variables: Record<string, string>
): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_, key) => variables[key] ?? "");
}

// ─── Email Senders ───────────────────────────────
async function sendViaSendGrid(
  config: any,
  to: string,
  subject: string,
  html: string
) {
  const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.api_key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: config.from_email, name: config.from_name || "Ventou" },
      subject,
      content: [{ type: "text/html", value: html }],
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`SendGrid error: ${err}`);
  }
}

async function sendViaResend(
  config: any,
  to: string,
  subject: string,
  html: string
) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.api_key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: config.from_email,
      to: [to],
      subject,
      html,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Resend error: ${err}`);
  }
}

async function sendViaMailerSend(
  config: any,
  to: string,
  subject: string,
  html: string
) {
  const res = await fetch("https://api.mailersend.com/v1/email", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.api_key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: { email: config.from_email, name: config.from_name || "Ventou" },
      to: [{ email: to }],
      subject,
      html,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`MailerSend error: ${err}`);
  }
}

async function sendViaSMTP(
  config: any,
  to: string,
  subject: string,
  html: string
) {
  // Use a generic SMTP relay HTTP API (e.g., smtp2go, or similar)
  // Since Deno edge functions can't use raw SMTP sockets,
  // we expect the SMTP config to contain an HTTP relay endpoint
  if (config.http_relay_url) {
    const res = await fetch(config.http_relay_url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(config.api_key
          ? { Authorization: `Bearer ${config.api_key}` }
          : {}),
      },
      body: JSON.stringify({
        from: config.from_email,
        to,
        subject,
        html,
        ...(config.extra_params || {}),
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`SMTP relay error: ${err}`);
    }
  } else {
    throw new Error(
      "SMTP driver requires http_relay_url in config (raw SMTP not supported in edge functions)"
    );
  }
}

// ─── Main Handler ────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Auth: accept service_role OR authenticated admin
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";

    let isAuthorized = false;

    // Check if service_role key
    if (token === Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")) {
      isAuthorized = true;
    } else if (token && token !== anonKey) {
      // Verify JWT and check admin role
      const {
        data: { user },
      } = await supabaseAdmin.auth.getUser(token);
      if (user) {
        const { data: roleData } = await supabaseAdmin
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .in("role", ["super_admin", "manager", "support"])
          .maybeSingle();
        if (roleData) isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { slug, variables = {}, to } = await req.json();

    if (!slug || !to) {
      return new Response(
        JSON.stringify({ error: "Missing slug or to" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Load active provider
    const { data: provider, error: provErr } = await supabaseAdmin
      .from("email_providers")
      .select("*")
      .eq("is_active", true)
      .maybeSingle();

    if (provErr || !provider) {
      return new Response(
        JSON.stringify({
          error: "No active email provider configured",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Load template
    const { data: template, error: tmplErr } = await supabaseAdmin
      .from("email_templates")
      .select("*")
      .eq("slug", slug)
      .eq("is_active", true)
      .maybeSingle();

    if (tmplErr || !template) {
      return new Response(
        JSON.stringify({ error: `Template '${slug}' not found or inactive` }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Load platform settings for system variables
    const { data: settings } = await supabaseAdmin
      .from("platform_settings")
      .select("key, value");

    const systemVars: Record<string, string> = {
      year: new Date().getFullYear().toString(),
    };
    if (settings) {
      for (const s of settings) {
        const val = typeof s.value === "string" ? s.value : JSON.stringify(s.value);
        systemVars[s.key] = val.replace(/^"|"$/g, "");
      }
    }

    const allVars: Record<string, string> = { ...systemVars };
    for (const [k, v] of Object.entries(variables)) {
      allVars[k] = String(v);
    }

    // Replace variables in subject and body
    const subject = replaceVariables(template.subject, allVars);
    const bodyContent = replaceVariables(template.body, allVars);
    const html = wrapInLayout(bodyContent, allVars);

    // Send via active driver
    const config = provider.config;
    switch (provider.driver) {
      case "sendgrid":
        await sendViaSendGrid(config, to, subject, html);
        break;
      case "resend":
        await sendViaResend(config, to, subject, html);
        break;
      case "mailersend":
        await sendViaMailerSend(config, to, subject, html);
        break;
      case "smtp":
        await sendViaSMTP(config, to, subject, html);
        break;
      default:
        throw new Error(`Unknown driver: ${provider.driver}`);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message || "Internal error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
