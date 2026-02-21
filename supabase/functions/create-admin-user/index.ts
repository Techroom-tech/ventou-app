import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Delete existing test user if any
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existing = existingUsers?.users?.find((u: any) => u.email === "admin@ventou.test");
    if (existing) {
      await supabaseAdmin.auth.admin.deleteUser(existing.id);
    }

    // Create user via Admin API (proper password hashing)
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: "admin@ventou.test",
      password: "Admin2025!",
      email_confirm: true,
      user_metadata: { first_name: "Admin", last_name: "Ventou" },
    });

    if (createError) {
      return new Response(JSON.stringify({ error: createError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Assign super_admin role
    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: newUser.user.id, role: "super_admin" }, { onConflict: "user_id,role" });

    return new Response(
      JSON.stringify({
        success: true,
        message: "Admin user created",
        email: "admin@ventou.test",
        password: "Admin2025!",
        role: "super_admin",
        roleError: roleError?.message ?? null,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
