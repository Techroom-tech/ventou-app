import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreflightOrMethod } from "../_shared/cors.ts";
import { checkPersistentRateLimit } from "../_shared/persistentRateLimit.ts";

const MAX_ATTEMPTS = 5;
const LOCK_DURATION_MINUTES = 15;
const OTP_EXPIRY_MINUTES = 10;
const RESEND_COOLDOWN_SECONDS = 60;
const RESET_PROOF_TTL_SECONDS = 5 * 60;

const encoder = new TextEncoder();

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(input: string): Uint8Array {
  const base64 = input.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (input.length % 4)) % 4);
  const binary = atob(base64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

async function signProofPayload(payloadB64: string): Promise<string> {
  const secret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!secret) throw new Error("Signing secret unavailable");
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(payloadB64));
  return toBase64Url(new Uint8Array(sig));
}

async function createResetProof(userId: string, verificationId: string): Promise<string> {
  const payload = {
    uid: userId,
    vid: verificationId,
    exp: Math.floor(Date.now() / 1000) + RESET_PROOF_TTL_SECONDS,
  };
  const payloadB64 = toBase64Url(encoder.encode(JSON.stringify(payload)));
  const sig = await signProofPayload(payloadB64);
  return `${payloadB64}.${sig}`;
}

async function verifyResetProof(resetProof: string, userId: string): Promise<{ ok: boolean; verificationId?: string }> {
  const [payloadB64, providedSig] = resetProof.split(".");
  if (!payloadB64 || !providedSig) return { ok: false };

  const expectedSig = await signProofPayload(payloadB64);
  if (expectedSig !== providedSig) return { ok: false };

  let payload: { uid?: string; vid?: string; exp?: number };
  try {
    const raw = new TextDecoder().decode(fromBase64Url(payloadB64));
    payload = JSON.parse(raw);
  } catch {
    return { ok: false };
  }

  if (!payload?.uid || !payload?.vid || !payload?.exp) return { ok: false };
  if (payload.uid !== userId) return { ok: false };
  if (payload.exp < Math.floor(Date.now() / 1000)) return { ok: false };

  return { ok: true, verificationId: payload.vid };
}

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

    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const emailKey = typeof body?.email === "string" ? body.email.toLowerCase().trim() : "none";
    const userKey = typeof body?.user_id === "string" ? body.user_id : "none";
    const limitKey = `verify-otp:${action}:${clientIp}:${emailKey}:${userKey}`;

    const rl = await checkPersistentRateLimit(
      admin,
      limitKey,
      action === "verify" ? 30 : 12,
      60_000,
      15 * 60_000,
    );

    if (rl.blocked) {
      return new Response(JSON.stringify({ error: "rate_limited", retry_after: rl.retryAfterSeconds ?? 60 }), {
        status: 429,
        headers: jsonHeaders,
      });
    }

    // ─── GENERATE ────────────────────────────────
    if (action === "generate") {
      let { email, type = "signup", user_id } = body;
      if (!email) {
        return new Response(JSON.stringify({ error: "email required" }), { status: 400, headers: jsonHeaders });
      }

      // For password_reset, look up user by email if user_id is email
      if (type === "password_reset" && (!user_id || user_id === email)) {
        // Search by email
        const { data: users } = await admin.auth.admin.listUsers();
        const foundUser = users?.users?.find((u: any) => u.email === email);
        if (!foundUser) {
          // Don't reveal if user exists — return success anyway
          return new Response(JSON.stringify({ success: true }), { headers: jsonHeaders });
        }
        user_id = foundUser.id;
      }

      if (!user_id) {
        return new Response(JSON.stringify({ error: "user_id required" }), { status: 400, headers: jsonHeaders });
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
        ...(record.type === "password_reset" ? { reset_proof: await createResetProof(record.user_id, record.id) } : {}),
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

    // ─── UPDATE PASSWORD ─────────────────────────
    if (action === "update_password") {
      const { user_id, password, reset_proof } = body;
      if (!user_id || !password || !reset_proof) {
        return new Response(JSON.stringify({ error: "user_id, password and reset_proof required" }), { status: 400, headers: jsonHeaders });
      }

      const proof = await verifyResetProof(String(reset_proof), String(user_id));
      if (!proof.ok || !proof.verificationId) {
        return new Response(JSON.stringify({ error: "invalid_reset_proof" }), { status: 401, headers: jsonHeaders });
      }

      const { data: verification, error: verifErr } = await admin
        .from("email_verifications")
        .select("id, user_id, type, used, expires_at")
        .eq("id", proof.verificationId)
        .eq("user_id", user_id)
        .eq("type", "password_reset")
        .eq("used", true)
        .maybeSingle();

      if (verifErr || !verification) {
        return new Response(JSON.stringify({ error: "invalid_or_expired" }), { status: 401, headers: jsonHeaders });
      }

      if (new Date(verification.expires_at).getTime() < Date.now()) {
        return new Response(JSON.stringify({ error: "expired" }), { status: 401, headers: jsonHeaders });
      }

      const { error: updateError } = await admin.auth.admin.updateUserById(user_id, { password });
      if (updateError) {
        console.error("Update password error:", updateError);
        return new Response(JSON.stringify({ error: "Failed to update password" }), { status: 500, headers: jsonHeaders });
      }

      await admin.from("email_verifications").delete().eq("id", verification.id);

      return new Response(JSON.stringify({ success: true }), { headers: jsonHeaders });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), { status: 400, headers: jsonHeaders });
  } catch (err) {
    console.error("verify-otp error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500, headers: jsonHeaders });
  }
});
