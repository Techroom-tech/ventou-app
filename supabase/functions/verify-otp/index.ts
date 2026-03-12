import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreflightOrMethod } from "../_shared/cors.ts";

const MAX_ATTEMPTS = 5;
const LOCK_DURATION_MINUTES = 15;
const OTP_EXPIRY_MINUTES = 10;
const RESEND_COOLDOWN_SECONDS = 60;

function generateOTP(): string {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return String(array[0] % 100000).padStart(5, "0");
}

Deno.serve(async (req) => {
  const methodResponse = handleCorsPreflightOrMethod(req, "POST");
  if (methodResponse) return methodResponse;
  const corsHeaders = getCorsHeaders(req);
  const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

  try {
    const body = await req.json();
    const { action } = body;

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // ─── GENERATE ────────────────────────────────
    if (action === "generate") {
      const { email, type = "signup", user_id } = body;
      if (!email || !user_id) {
        return new Response(JSON.stringify({ error: "email and user_id required" }), { status: 400, headers: jsonHeaders });
      }

      // Invalidate previous unused OTPs
      await admin
        .from("email_verifications")
        .update({ used: true })
        .eq("user_id", user_id)
        .eq("type", type)
        .eq("used", false);

      const otp = generateOTP();
      const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000).toISOString();

      const { data: verification, error: insertError } = await admin
        .from("email_verifications")
        .insert({
          user_id,
          email,
          otp_code: otp,
          type,
          expires_at: expiresAt,
        })
        .select("token")
        .single();

      if (insertError) {
        console.error("Insert error:", insertError);
        return new Response(JSON.stringify({ error: "Failed to generate OTP" }), { status: 500, headers: jsonHeaders });
      }

      // Determine base URL for link
      const origin = req.headers.get("origin") || "https://ventou.shop";
      const linkPath = type === "password_reset" ? "/reset-password" : "/verify-email";
      const verifyLink = `${origin}${linkPath}?token=${verification.token}&email=${encodeURIComponent(email)}`;

      // Send email via send-email function
      const templateSlug = type === "password_reset" ? "otp_password_reset" : "otp_signup";
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

      const emailRes = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serviceRoleKey}`,
        },
        body: JSON.stringify({
          slug: templateSlug,
          to: email,
          variables: {
            otp_code: otp,
            verify_link: verifyLink,
            expiry_minutes: String(OTP_EXPIRY_MINUTES),
          },
          user_id,
        }),
      });

      if (!emailRes.ok) {
        const errText = await emailRes.text();
        console.error("Email send failed:", errText);
        // Don't fail the whole request — OTP is stored, user can still enter it
      }

      return new Response(JSON.stringify({ success: true }), { headers: jsonHeaders });
    }

    // ─── VERIFY ──────────────────────────────────
    if (action === "verify") {
      const { email, otp, token, type = "signup" } = body;

      if (!email || (!otp && !token)) {
        return new Response(JSON.stringify({ error: "email and otp or token required" }), { status: 400, headers: jsonHeaders });
      }

      // Find verification record
      let query = admin
        .from("email_verifications")
        .select("*")
        .eq("email", email)
        .eq("type", type)
        .eq("used", false)
        .order("created_at", { ascending: false })
        .limit(1);

      if (token) {
        query = admin
          .from("email_verifications")
          .select("*")
          .eq("token", token)
          .eq("type", type)
          .eq("used", false)
          .limit(1);
      }

      const { data: records, error: queryError } = await query;
      if (queryError || !records?.length) {
        return new Response(JSON.stringify({ error: "invalid_or_expired" }), { status: 400, headers: jsonHeaders });
      }

      const record = records[0];

      // Check lock
      if (record.locked_until && new Date(record.locked_until) > new Date()) {
        const minutesLeft = Math.ceil((new Date(record.locked_until).getTime() - Date.now()) / 60000);
        return new Response(JSON.stringify({ error: "locked", minutes_left: minutesLeft }), { status: 429, headers: jsonHeaders });
      }

      // Check expiry
      if (new Date(record.expires_at) < new Date()) {
        return new Response(JSON.stringify({ error: "expired" }), { status: 400, headers: jsonHeaders });
      }

      // If verifying by OTP (not token link)
      if (!token && otp) {
        if (record.otp_code !== otp) {
          const newAttempts = (record.attempts || 0) + 1;
          const updateData: any = { attempts: newAttempts };

          if (newAttempts >= MAX_ATTEMPTS) {
            updateData.locked_until = new Date(Date.now() + LOCK_DURATION_MINUTES * 60 * 1000).toISOString();
          }

          await admin.from("email_verifications").update(updateData).eq("id", record.id);

          return new Response(JSON.stringify({
            error: "wrong_code",
            attempts_remaining: Math.max(0, MAX_ATTEMPTS - newAttempts),
          }), { status: 400, headers: jsonHeaders });
        }
      }

      // Mark as used
      await admin.from("email_verifications").update({ used: true }).eq("id", record.id);

      // Confirm user email via admin API
      if (type === "signup") {
        const { error: confirmError } = await admin.auth.admin.updateUserById(record.user_id, {
          email_confirm: true,
        });
        if (confirmError) {
          console.error("Confirm email error:", confirmError);
        }
      }

      return new Response(JSON.stringify({
        success: true,
        user_id: record.user_id,
        type: record.type,
      }), { headers: jsonHeaders });
    }

    // ─── RESEND ──────────────────────────────────
    if (action === "resend") {
      const { email, type = "signup", user_id } = body;
      if (!email || !user_id) {
        return new Response(JSON.stringify({ error: "email and user_id required" }), { status: 400, headers: jsonHeaders });
      }

      // Check cooldown
      const { data: lastVerification } = await admin
        .from("email_verifications")
        .select("created_at")
        .eq("user_id", user_id)
        .eq("type", type)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (lastVerification) {
        const elapsed = (Date.now() - new Date(lastVerification.created_at).getTime()) / 1000;
        if (elapsed < RESEND_COOLDOWN_SECONDS) {
          const wait = Math.ceil(RESEND_COOLDOWN_SECONDS - elapsed);
          return new Response(JSON.stringify({ error: "cooldown", wait_seconds: wait }), { status: 429, headers: jsonHeaders });
        }
      }

      // Invalidate old, generate new (reuse generate logic)
      await admin
        .from("email_verifications")
        .update({ used: true })
        .eq("user_id", user_id)
        .eq("type", type)
        .eq("used", false);

      const otp = generateOTP();
      const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000).toISOString();

      const { data: verification, error: insertError } = await admin
        .from("email_verifications")
        .insert({
          user_id,
          email,
          otp_code: otp,
          type,
          expires_at: expiresAt,
        })
        .select("token")
        .single();

      if (insertError) {
        return new Response(JSON.stringify({ error: "Failed to generate OTP" }), { status: 500, headers: jsonHeaders });
      }

      const origin = req.headers.get("origin") || "https://ventou.shop";
      const linkPath = type === "password_reset" ? "/reset-password" : "/verify-email";
      const verifyLink = `${origin}${linkPath}?token=${verification.token}&email=${encodeURIComponent(email)}`;

      const templateSlug = type === "password_reset" ? "otp_password_reset" : "otp_signup";
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

      await fetch(`${supabaseUrl}/functions/v1/send-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serviceRoleKey}`,
        },
        body: JSON.stringify({
          slug: templateSlug,
          to: email,
          variables: {
            otp_code: otp,
            verify_link: verifyLink,
            expiry_minutes: String(OTP_EXPIRY_MINUTES),
          },
          user_id,
        }),
      });

      return new Response(JSON.stringify({ success: true }), { headers: jsonHeaders });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), { status: 400, headers: jsonHeaders });
  } catch (err) {
    console.error("verify-otp error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500, headers: jsonHeaders });
  }
});
