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
  "api.brevo.com",
  "api.sendinblue.com",
  "email-smtp.",          // AWS SES endpoints start with email-smtp.
  "mandrillapp.com",
];

function isAllowedUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === "https:" &&
      ALLOWED_API_DOMAINS.some((d) => parsed.hostname === d || parsed.hostname.endsWith(`.${d}`) || parsed.hostname.startsWith(d))
    );
  } catch {
    return false;
  }
}

// ─── Security: Input validation ──────────────────
const EMAIL_REGEX = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
const SLUG_REGEX = /^[a-z0-9_]{2,64}$/;
const MAX_VARIABLES = 30;
const MAX_VARIABLE_LENGTH = 2000;

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

  const bytes = new Uint8Array(decrypted);
  const padLen = bytes[bytes.length - 1];
  return new TextDecoder().decode(bytes.slice(0, bytes.length - padLen));
}

function sanitizeHtml(text: string): string {
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
  if (entries.length > MAX_VARIABLES) throw new Error("Too many variables");
  for (const [key, value] of entries) {
    if (!/^\w{1,50}$/.test(key)) continue;
    const strVal = String(value).slice(0, MAX_VARIABLE_LENGTH);
    sanitized[key] = sanitizeHtml(strVal);
  }
  return sanitized;
}

// ─── Rate Limiting ───────────────────────────────
const RATE_LIMIT_PER_USER = 5;   // per minute
const RATE_LIMIT_GLOBAL = 200;    // per hour

async function checkRateLimit(admin: any, userId?: string): Promise<{ blocked: boolean; reason?: string }> {
  const now = new Date();

  // Per-user rate limit
  if (userId) {
    const windowStart = new Date(now.getTime() - 60000).toISOString();
    const { data: userLimits } = await admin
      .from("email_rate_limits")
      .select("id, count, window_start")
      .eq("user_id", userId)
      .gte("window_start", windowStart)
      .maybeSingle();

    if (userLimits && userLimits.count >= RATE_LIMIT_PER_USER) {
      return { blocked: true, reason: `User rate limit exceeded (${RATE_LIMIT_PER_USER}/min)` };
    }

    if (userLimits) {
      await admin.from("email_rate_limits").update({ count: userLimits.count + 1 }).eq("id", userLimits.id);
    } else {
      await admin.from("email_rate_limits").insert({ user_id: userId, count: 1, window_start: now.toISOString() });
    }
  }

  // Global rate limit
  const hourStart = new Date(now.getTime() - 3600000).toISOString();
  const { count: globalCount } = await admin
    .from("email_logs")
    .select("*", { count: "exact", head: true })
    .gte("created_at", hourStart);

  if ((globalCount ?? 0) >= RATE_LIMIT_GLOBAL) {
    return { blocked: true, reason: `Global rate limit exceeded (${RATE_LIMIT_GLOBAL}/hour)` };
  }

  return { blocked: false };
}

// ─── Notification Preference Mapping ─────────────
const SLUG_TO_PREF: Record<string, string> = {
  new_order_vendor: "order_emails",
  order_confirmation_customer: "order_emails",
  order_cancelled: "order_emails",
  order_refunded: "order_emails",
  order_shipped: "order_emails",
  order_delivered: "order_emails",
  subscription_activated: "subscription_alerts",
  subscription_expiring_7_days: "subscription_alerts",
  subscription_expiring_1_day: "subscription_alerts",
  subscription_expired: "subscription_alerts",
  plan_upgraded: "subscription_alerts",
  plan_downgraded: "subscription_alerts",
  vendor_report_warning: "admin_alerts",
  manual_admin_action: "admin_alerts",
  payment_failed: "admin_alerts",
  payment_success: "admin_alerts",
};

async function checkUserPreference(admin: any, userId: string | undefined, slug: string): Promise<{ disabled: boolean }> {
  if (!userId) return { disabled: false };
  const prefKey = SLUG_TO_PREF[slug];
  if (!prefKey) return { disabled: false }; // Auth/store emails always sent

  const { data } = await admin
    .from("user_notification_settings")
    .select(prefKey)
    .eq("user_id", userId)
    .maybeSingle();

  if (data && data[prefKey] === false) {
    return { disabled: true };
  }
  return { disabled: false };
}

// ─── Logging ─────────────────────────────────────
async function logEmail(admin: any, entry: {
  recipient: string;
  template_slug?: string;
  provider?: string;
  status: string;
  error_message?: string;
  user_id?: string;
  ip_address?: string;
}) {
  await admin.from("email_logs").insert(entry);
}

// ─── Master Email Layout ─────────────────────────
function wrapInLayout(body: string, variables: Record<string, string>, headerHtml?: string, footerHtml?: string): string {
  const year = variables.year || new Date().getFullYear().toString();
  const siteName = sanitizeHtml(variables.platform_name || variables.site_name || "Ventou");
  const logoUrl = variables.logo_url || "";

  let logoHtml: string;
  if (logoUrl && /^https:\/\/[a-zA-Z0-9.\-\/]+\.(png|jpg|jpeg|svg|webp)(\?.*)?$/i.test(logoUrl)) {
    logoHtml = `<img src="${logoUrl}" height="40" alt="${siteName}" style="display:block;margin:0 auto;" />`;
  } else {
    logoHtml = `<span style="color:#ffffff;font-size:20px;font-weight:700;letter-spacing:1px;">${siteName}</span>`;
  }

  const header = headerHtml || `<div style="background:#111827;padding:25px;text-align:center;">${logoHtml}</div>`;
  const footer = footerHtml || `<div style="background:#f9fafb;padding:20px;text-align:center;font-size:12px;color:#6b7280;">© ${year} ${siteName}. Tous droits réservés.</div>`;

  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f6f9;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:20px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:10px;overflow:hidden;font-family:Inter,Arial,sans-serif;">
<tr><td>${header}</td></tr>
<tr><td style="padding:35px;color:#111827;font-size:15px;line-height:1.6;">${body}</td></tr>
<tr><td>${footer}</td></tr>
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
async function sendViaSendGrid(config: any, from: string, fromName: string, to: string, subject: string, html: string) {
  const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: { Authorization: `Bearer ${config.api_key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: from, name: fromName },
      subject,
      content: [{ type: "text/html", value: html }],
    }),
  });
  if (!res.ok) { await res.text(); throw new Error(`SendGrid error: ${res.status}`); }
  await res.text();
}

async function sendViaResend(config: any, from: string, _fromName: string, to: string, subject: string, html: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${config.api_key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [to], subject, html }),
  });
  if (!res.ok) { await res.text(); throw new Error(`Resend error: ${res.status}`); }
  await res.text();
}

async function sendViaMailerSend(config: any, from: string, fromName: string, to: string, subject: string, html: string) {
  const res = await fetch("https://api.mailersend.com/v1/email", {
    method: "POST",
    headers: { Authorization: `Bearer ${config.api_key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: { email: from, name: fromName },
      to: [{ email: to }],
      subject,
      html,
    }),
  });
  if (!res.ok) { await res.text(); throw new Error(`MailerSend error: ${res.status}`); }
  await res.text();
}

async function sendViaMailgun(config: any, from: string, fromName: string, to: string, subject: string, html: string) {
  const domain = config.domain;
  const url = `https://api.mailgun.net/v3/${domain}/messages`;
  const formData = new FormData();
  formData.append("from", `${fromName} <${from}>`);
  formData.append("to", to);
  formData.append("subject", subject);
  formData.append("html", html);

  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Basic ${btoa(`api:${config.api_key}`)}` },
    body: formData,
  });
  if (!res.ok) { await res.text(); throw new Error(`Mailgun error: ${res.status}`); }
  await res.text();
}

async function sendViaPostmark(config: any, from: string, fromName: string, to: string, subject: string, html: string) {
  const res = await fetch("https://api.postmarkapp.com/email", {
    method: "POST",
    headers: {
      "X-Postmark-Server-Token": config.server_token,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      From: `${fromName} <${from}>`,
      To: to,
      Subject: subject,
      HtmlBody: html,
    }),
  });
  if (!res.ok) { await res.text(); throw new Error(`Postmark error: ${res.status}`); }
  await res.text();
}

async function sendViaSendinblue(config: any, from: string, fromName: string, to: string, subject: string, html: string) {
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": config.api_key, "Content-Type": "application/json" },
    body: JSON.stringify({
      sender: { email: from, name: fromName },
      to: [{ email: to }],
      subject,
      htmlContent: html,
    }),
  });
  if (!res.ok) { await res.text(); throw new Error(`Brevo error: ${res.status}`); }
  await res.text();
}

async function sendViaSES(config: any, from: string, fromName: string, to: string, subject: string, html: string) {
  // AWS SES via Simple Email Service REST API (v2)
  const region = config.region || "us-east-1";
  const url = `https://email.${region}.amazonaws.com/v2/email/outbound-emails`;

  // Use SES SMTP interface via HTTP relay as SigV4 is complex in edge runtime
  // Fallback: use SMTP relay URL if provided
  if (config.smtp_relay_url) {
    if (!isAllowedUrl(config.smtp_relay_url)) throw new Error("SES relay URL not allowed");
    const res = await fetch(config.smtp_relay_url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${config.api_key}` },
      body: JSON.stringify({ from: `${fromName} <${from}>`, to, subject, html }),
    });
    if (!res.ok) { await res.text(); throw new Error(`SES relay error: ${res.status}`); }
    await res.text();
    return;
  }

  throw new Error("AWS SES requires smtp_relay_url in config for edge function compatibility");
}

async function sendViaMandrill(config: any, from: string, fromName: string, to: string, subject: string, html: string) {
  const res = await fetch("https://mandrillapp.com/api/1.0/messages/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      key: config.api_key,
      message: {
        from_email: from,
        from_name: fromName,
        to: [{ email: to, type: "to" }],
        subject,
        html,
      },
    }),
  });
  if (!res.ok) { await res.text(); throw new Error(`Mandrill error: ${res.status}`); }
  await res.text();
}

async function sendViaSMTP(provider: any, from: string, _fromName: string, to: string, subject: string, html: string) {
  // SMTP sending via smtp-relay edge function
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const host = provider.mail_host || "";
  const port = String(provider.mail_port || 465);
  const username = provider.mail_username || "";

  // Prefer encrypted credentials, fallback to plaintext
  let password = "";
  const enc = provider.encrypted_config as Record<string, string> | null;
  if (enc?.mail_password) {
    try {
      password = await decryptValue(enc.mail_password);
    } catch {
      password = provider.mail_password || "";
    }
  } else {
    password = provider.mail_password || "";
  }

  if (!host || !username || !password) {
    throw new Error("Incomplete SMTP configuration. Please fill in all SMTP fields in provider settings.");
  }

  const relayRes = await fetch(`${supabaseUrl}/functions/v1/smtp-relay`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${serviceRoleKey}`,
    },
    body: JSON.stringify({
      smtp_config: { host, port, username, password, sender_email: from },
      to,
      subject,
      html,
    }),
  });

  if (!relayRes.ok) {
    const errBody = await relayRes.text();
    throw new Error(`SMTP relay error: ${relayRes.status} - ${errBody}`);
  }
  await relayRes.text();
}

// ─── Main Handler ────────────────────────────────
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

  const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

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
    let callerUserId: string | undefined;

    if (token === Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")) {
      // Service role — internal calls
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

    // ─── Parse & validate input ──────────────────
    let body: any;
    try { body = await req.json(); } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { slug, variables: rawVars = {}, to, user_id: targetUserId, locale } = body;

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

    // ─── Rate limit check ────────────────────────
    const rateCheck = await checkRateLimit(supabaseAdmin, callerUserId || targetUserId);
    if (rateCheck.blocked) {
      await logEmail(supabaseAdmin, {
        recipient: to,
        template_slug: slug,
        status: "blocked",
        error_message: rateCheck.reason,
        user_id: targetUserId || callerUserId,
        ip_address: clientIp,
      });
      return new Response(JSON.stringify({ error: rateCheck.reason }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── User notification preference check ──────
    const prefCheck = await checkUserPreference(supabaseAdmin, targetUserId, slug);
    if (prefCheck.disabled) {
      await logEmail(supabaseAdmin, {
        recipient: to,
        template_slug: slug,
        status: "user_disabled",
        user_id: targetUserId,
        ip_address: clientIp,
      });
      return new Response(JSON.stringify({ success: true, skipped: "user_disabled" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── Load active provider ────────────────────
    const { data: provider, error: provErr } = await supabaseAdmin
      .from("email_providers")
      .select("*")
      .eq("is_active", true)
      .maybeSingle();

    if (provErr || !provider) {
      await logEmail(supabaseAdmin, {
        recipient: to,
        template_slug: slug,
        status: "failed",
        error_message: "No active provider",
        user_id: targetUserId || callerUserId,
        ip_address: clientIp,
      });
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
      await logEmail(supabaseAdmin, {
        recipient: to,
        template_slug: slug,
        provider: provider.driver,
        status: "failed",
        error_message: `Template '${slug}' not found or inactive`,
        user_id: targetUserId || callerUserId,
        ip_address: clientIp,
      });
      return new Response(
        JSON.stringify({ error: `Template '${slug}' not found or inactive` }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── Multi-lang: load translation if available ──
    let templateSubject = template.subject;
    let templateBody = template.body;

    if (template.multi_lang_enabled && locale && locale !== "fr") {
      const { data: translation } = await supabaseAdmin
        .from("email_template_translations")
        .select("subject, body")
        .eq("template_id", template.id)
        .eq("locale", locale)
        .maybeSingle();

      if (translation) {
        templateSubject = translation.subject;
        templateBody = translation.body;
      }
    }

    // ─── Load platform settings ──────────────────
    const { data: settings } = await supabaseAdmin
      .from("platform_settings")
      .select("key, value");

    const systemVars: Record<string, string> = {
      year: new Date().getFullYear().toString(),
      current_year: new Date().getFullYear().toString(),
    };
    if (settings) {
      for (const s of settings) {
        const val = typeof s.value === "string" ? s.value : JSON.stringify(s.value);
        systemVars[s.key] = val.replace(/^"|"$/g, "");
      }
    }
    // Map platform_name from site_name
    if (systemVars.site_name && !systemVars.platform_name) {
      systemVars.platform_name = systemVars.site_name;
    }
    if (systemVars.support_email) {
      systemVars.support_email = systemVars.support_email;
    }

    const allVars: Record<string, string> = { ...systemVars, ...variables };

    // ─── Load default template wrapper ───────────
    let headerHtml: string | undefined;
    let footerHtml: string | undefined;
    const { data: headerSetting } = await supabaseAdmin
      .from("platform_settings")
      .select("value")
      .eq("key", "email_header_html")
      .maybeSingle();
    const { data: footerSetting } = await supabaseAdmin
      .from("platform_settings")
      .select("value")
      .eq("key", "email_footer_html")
      .maybeSingle();

    if (headerSetting?.value) {
      const raw = typeof headerSetting.value === "string" ? headerSetting.value : JSON.stringify(headerSetting.value);
      headerHtml = replaceVariables(raw.replace(/^"|"$/g, ""), allVars);
    }
    if (footerSetting?.value) {
      const raw = typeof footerSetting.value === "string" ? footerSetting.value : JSON.stringify(footerSetting.value);
      footerHtml = replaceVariables(raw.replace(/^"|"$/g, ""), allVars);
    }

    // ─── Build email ─────────────────────────────
    const subject = replaceVariables(templateSubject, allVars);
    const bodyContent = replaceVariables(templateBody, allVars);
    const html = wrapInLayout(bodyContent, allVars, headerHtml, footerHtml);

    // ─── Send via active driver ──────────────────
    const senderEmail = provider.sender_email || "noreply@ventou.shop";
    const senderName = provider.sender_name || "Ventou";

    try {
      switch (provider.driver) {
        case "sendgrid":
          await sendViaSendGrid(provider, senderEmail, senderName, to, subject, html);
          break;
        case "resend":
          await sendViaResend(provider, senderEmail, senderName, to, subject, html);
          break;
        case "mailersend":
          await sendViaMailerSend(provider, senderEmail, senderName, to, subject, html);
          break;
        case "mailgun":
          await sendViaMailgun(provider, senderEmail, senderName, to, subject, html);
          break;
        case "postmark":
          await sendViaPostmark(provider, senderEmail, senderName, to, subject, html);
          break;
        case "sendinblue":
          await sendViaSendinblue(provider, senderEmail, senderName, to, subject, html);
          break;
        case "ses":
          await sendViaSES(provider, senderEmail, senderName, to, subject, html);
          break;
        case "mailchimp":
          await sendViaMandrill(provider, senderEmail, senderName, to, subject, html);
          break;
        case "smtp":
          await sendViaSMTP(provider, senderEmail, senderName, to, subject, html);
          break;
        default:
          throw new Error(`Unknown driver: ${provider.driver}`);
      }

      // Log success
      await logEmail(supabaseAdmin, {
        recipient: to,
        template_slug: slug,
        provider: provider.driver,
        status: "success",
        user_id: targetUserId || callerUserId,
        ip_address: clientIp,
      });

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (sendErr: any) {
      // Log failure
      await logEmail(supabaseAdmin, {
        recipient: to,
        template_slug: slug,
        provider: provider.driver,
        status: "failed",
        error_message: sendErr.message?.slice(0, 500),
        user_id: targetUserId || callerUserId,
        ip_address: clientIp,
      });
      throw sendErr;
    }
  } catch (err: any) {
    console.error("[send-email] Error:", err.message);
    return new Response(
      JSON.stringify({ error: "Email delivery failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
