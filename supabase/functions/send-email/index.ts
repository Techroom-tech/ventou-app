import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── Security: Allowed API domains (anti-SSRF) ──
const ALLOWED_API_DOMAINS = [
  "api.sendgrid.com",
  "api.resend.com",
  "api.mailersend.com",
  "api.smtp2go.com",
  "api.mailgun.net",
  "api.postmarkapp.com",
];

function isAllowedUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === "https:" &&
      ALLOWED_API_DOMAINS.some((d) => parsed.hostname === d || parsed.hostname.endsWith(`.${d}`))
    );
  } catch {
    return false;
  }
}

// ─── Security: Input validation ──────────────────
const EMAIL_REGEX = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
const SLUG_REGEX = /^[a-z0-9_]{2,64}$/;
const MAX_VARIABLES = 20;
const MAX_VARIABLE_LENGTH = 2000;

function sanitizeHtml(text: string): string {
  // Strip script tags and event handlers from user-provided variables
  return text
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, "")
    .replace(/javascript:/gi, "");
}

function validateEmail(email: string): boolean {
  return EMAIL_REGEX.test(email) && email.length <= 254;
}

function validateSlug(slug: string): boolean {
  return SLUG_REGEX.test(slug);
}

function validateVariables(variables: Record<string, unknown>): Record<string, string> {
  const sanitized: Record<string, string> = {};
  const entries = Object.entries(variables);
  
  if (entries.length > MAX_VARIABLES) {
    throw new Error("Too many variables");
  }
  
  for (const [key, value] of entries) {
    if (!/^\w{1,50}$/.test(key)) continue; // skip invalid keys
    const strVal = String(value).slice(0, MAX_VARIABLE_LENGTH);
    sanitized[key] = sanitizeHtml(strVal);
  }
  
  return sanitized;
}

// ─── Master Email Layout ─────────────────────────
function wrapInLayout(body: string, variables: Record<string, string>): string {
  const year = variables.year || new Date().getFullYear().toString();
  const siteName = sanitizeHtml(variables.site_name || "Ventou");
  const logoUrl = variables.logo_url || "";

  // Validate logo URL to prevent XSS
  let logoHtml: string;
  if (logoUrl && /^https:\/\/[a-zA-Z0-9.\-\/]+\.(png|jpg|jpeg|svg|webp)(\?.*)?$/i.test(logoUrl)) {
    logoHtml = `<img src="${logoUrl}" height="40" alt="${siteName}" style="display:block;margin:0 auto;" />`;
  } else {
    logoHtml = `<span style="color:#ffffff;font-size:20px;font-weight:700;letter-spacing:1px;">${siteName}</span>`;
  }

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
function replaceVariables(text: string, variables: Record<string, string>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_, key) => variables[key] ?? "");
}

// ─── Email Senders ───────────────────────────────
async function sendViaSendGrid(config: any, to: string, subject: string, html: string) {
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
    throw new Error(`SendGrid error: ${res.status}`);
  }
  await res.text(); // consume body
}

async function sendViaResend(config: any, to: string, subject: string, html: string) {
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
    throw new Error(`Resend error: ${res.status}`);
  }
  await res.text();
}

async function sendViaMailerSend(config: any, to: string, subject: string, html: string) {
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
    throw new Error(`MailerSend error: ${res.status}`);
  }
  await res.text();
}

async function sendViaSMTP(config: any, to: string, subject: string, html: string) {
  if (!config.http_relay_url) {
    throw new Error("SMTP driver requires http_relay_url in config");
  }

  // Anti-SSRF: validate relay URL against allowlist
  if (!isAllowedUrl(config.http_relay_url)) {
    throw new Error("SMTP relay URL not in allowed domains list");
  }

  const res = await fetch(config.http_relay_url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(config.api_key ? { Authorization: `Bearer ${config.api_key}` } : {}),
    },
    body: JSON.stringify({
      from: config.from_email,
      to,
      subject,
      html,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`SMTP relay error: ${res.status}`);
  }
  await res.text();
}

// ─── Main Handler ────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Only POST allowed
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

    // ─── Auth: validate JWT with getClaims ────────
    const authHeader = req.headers.get("authorization") || "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    let isAuthorized = false;

    // Service role key for internal server-to-server calls
    if (token === Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")) {
      isAuthorized = true;
    } else {
      // Verify JWT via getClaims (no network roundtrip, cryptographic verification)
      const userClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } }
      );

      const { data, error } = await userClient.auth.getClaims(token);
      if (error || !data?.claims) {
        return new Response(JSON.stringify({ error: "Invalid token" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const userId = data.claims.sub;
      // Verify admin role server-side
      const { data: roleData } = await supabaseAdmin
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .in("role", ["super_admin", "manager"])
        .limit(1);

      if (!roleData || roleData.length === 0) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      isAuthorized = true;
    }

    if (!isAuthorized) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── Parse & validate input ──────────────────
    let body: any;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { slug, variables: rawVars = {}, to } = body;

    if (!slug || !to) {
      return new Response(JSON.stringify({ error: "Missing slug or to" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!validateSlug(slug)) {
      return new Response(JSON.stringify({ error: "Invalid slug format" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!validateEmail(to)) {
      return new Response(JSON.stringify({ error: "Invalid email address" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const variables = validateVariables(rawVars);

    // ─── Load active provider ────────────────────
    const { data: provider, error: provErr } = await supabaseAdmin
      .from("email_providers")
      .select("*")
      .eq("is_active", true)
      .maybeSingle();

    if (provErr || !provider) {
      return new Response(
        JSON.stringify({ error: "No active email provider configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── Load template ───────────────────────────
    const { data: template, error: tmplErr } = await supabaseAdmin
      .from("email_templates")
      .select("*")
      .eq("slug", slug)
      .eq("is_active", true)
      .maybeSingle();

    if (tmplErr || !template) {
      return new Response(
        JSON.stringify({ error: `Template '${slug}' not found or inactive` }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── Load platform settings ──────────────────
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

    const allVars: Record<string, string> = { ...systemVars, ...variables };

    // ─── Build email ─────────────────────────────
    const subject = replaceVariables(template.subject, allVars);
    const bodyContent = replaceVariables(template.body, allVars);
    const html = wrapInLayout(bodyContent, allVars);

    // ─── Send via active driver ──────────────────
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
        throw new Error("Unknown driver");
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    // Never leak internal error details to client
    console.error("[send-email] Error:", err.message);
    return new Response(
      JSON.stringify({ error: "Email delivery failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
