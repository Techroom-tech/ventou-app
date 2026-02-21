import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const migrations: string[] = [
    // ─── Orders table ────────────────────────────────
    `CREATE TABLE IF NOT EXISTS public.orders (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
      customer_name text NOT NULL,
      phone text,
      city text,
      quartier text,
      notes text,
      location_url text,
      items jsonb DEFAULT '[]'::jsonb,
      total numeric(12,2) DEFAULT 0,
      total_amount numeric(12,2),
      status text NOT NULL DEFAULT 'pending',
      payment_method text,
      order_number text,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );`,

    `ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;`,

    `DROP POLICY IF EXISTS "owner_read_orders" ON public.orders;`,
    `DROP POLICY IF EXISTS "owner_update_orders" ON public.orders;`,
    `DROP POLICY IF EXISTS "anon_insert_orders" ON public.orders;`,
    `DROP POLICY IF EXISTS "public_insert_orders" ON public.orders;`,

    `CREATE POLICY "owner_read_orders" ON public.orders
      FOR SELECT USING (
        shop_id IN (SELECT id FROM public.shops WHERE owner_id = auth.uid())
      );`,

    `CREATE POLICY "owner_update_orders" ON public.orders
      FOR UPDATE USING (
        shop_id IN (SELECT id FROM public.shops WHERE owner_id = auth.uid())
      ) WITH CHECK (
        shop_id IN (SELECT id FROM public.shops WHERE owner_id = auth.uid())
      );`,

    `CREATE POLICY "public_insert_orders" ON public.orders
      FOR INSERT WITH CHECK (true);`,

    `CREATE INDEX IF NOT EXISTS idx_orders_shop_id_created_at
      ON public.orders(shop_id, created_at DESC);`,

    `CREATE INDEX IF NOT EXISTS idx_orders_status
      ON public.orders(status);`,

    // ─── Shops columns ───────────────────────────────
    `ALTER TABLE public.shops
      ADD COLUMN IF NOT EXISTS identity_display_mode text DEFAULT 'logo-name',
      ADD COLUMN IF NOT EXISTS title_size_px integer DEFAULT 22,
      ADD COLUMN IF NOT EXISTS body_size_px integer DEFAULT 14,
      ADD COLUMN IF NOT EXISTS letter_spacing_px numeric DEFAULT 0,
      ADD COLUMN IF NOT EXISTS line_height_pct integer DEFAULT 160;`,

    // ─── Profiles columns ────────────────────────────
    `ALTER TABLE public.profiles
      ADD COLUMN IF NOT EXISTS phone text,
      ADD COLUMN IF NOT EXISTS language text DEFAULT 'fr',
      ADD COLUMN IF NOT EXISTS timezone text DEFAULT 'Africa/Abidjan';`,

    // ─── Avatars bucket ──────────────────────────────
    `INSERT INTO storage.buckets (id, name, public)
      VALUES ('avatars', 'avatars', true)
      ON CONFLICT (id) DO NOTHING;`,

    `DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'Avatar images are publicly accessible') THEN
        CREATE POLICY "Avatar images are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
      END IF;
    END $$;`,

    `DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'Users can upload their own avatar') THEN
        CREATE POLICY "Users can upload their own avatar" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
      END IF;
    END $$;`,

    `DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'Users can update their own avatar') THEN
        CREATE POLICY "Users can update their own avatar" ON storage.objects FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
      END IF;
    END $$;`,

    `DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'Users can delete their own avatar') THEN
        CREATE POLICY "Users can delete their own avatar" ON storage.objects FOR DELETE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
      END IF;
    END $$;`,

    // ════════════════════════════════════════════════════
    // SUPER ADMIN SYSTEM MIGRATIONS
    // ════════════════════════════════════════════════════

    // ─── Role System ─────────────────────────────────
    `DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
        CREATE TYPE public.app_role AS ENUM ('super_admin', 'manager', 'support', 'vendor');
      END IF;
    END $$;`,

    `CREATE TABLE IF NOT EXISTS public.user_roles (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
      role app_role NOT NULL,
      UNIQUE (user_id, role)
    );`,

    `ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;`,

    `CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
    RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
      SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
    $$;`,

    `CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
    RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
      SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('super_admin', 'manager', 'support'))
    $$;`,

    `DROP POLICY IF EXISTS "Users can read own roles" ON public.user_roles;`,
    `CREATE POLICY "Users can read own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());`,

    `DROP POLICY IF EXISTS "Super admins manage roles" ON public.user_roles;`,
    `CREATE POLICY "Super admins manage roles" ON public.user_roles FOR ALL TO authenticated
      USING (public.has_role(auth.uid(), 'super_admin'))
      WITH CHECK (public.has_role(auth.uid(), 'super_admin'));`,

    // ─── Subscription System ─────────────────────────
    `CREATE TABLE IF NOT EXISTS public.subscription_plans (
      id text PRIMARY KEY,
      name text NOT NULL,
      max_stores integer NOT NULL DEFAULT 1,
      max_products integer NOT NULL DEFAULT 50,
      price_monthly numeric(10,2) NOT NULL DEFAULT 0,
      features jsonb DEFAULT '[]'::jsonb,
      requires_approval boolean DEFAULT false,
      created_at timestamptz DEFAULT now()
    );`,

    `INSERT INTO public.subscription_plans (id, name, max_stores, max_products, price_monthly, requires_approval) VALUES
      ('free', 'Gratuit', 1, 50, 0, false),
      ('pro', 'Pro', 3, 500, 9900, false),
      ('business', 'Business', 10, 5000, 29900, true)
    ON CONFLICT (id) DO NOTHING;`,

    `CREATE TABLE IF NOT EXISTS public.vendor_subscriptions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
      plan_id text REFERENCES public.subscription_plans(id) NOT NULL DEFAULT 'free',
      status text NOT NULL DEFAULT 'trial' CHECK (status IN ('trial', 'active', 'expired', 'cancelled')),
      trial_ends_at timestamptz DEFAULT (now() + interval '7 days'),
      current_period_start timestamptz DEFAULT now(),
      current_period_end timestamptz,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    );`,

    `ALTER TABLE public.vendor_subscriptions ENABLE ROW LEVEL SECURITY;`,

    `DROP POLICY IF EXISTS "Vendors read own subscription" ON public.vendor_subscriptions;`,
    `CREATE POLICY "Vendors read own subscription" ON public.vendor_subscriptions FOR SELECT TO authenticated
      USING (user_id = auth.uid() OR public.is_admin(auth.uid()));`,

    `DROP POLICY IF EXISTS "Admins manage subscriptions" ON public.vendor_subscriptions;`,
    `CREATE POLICY "Admins manage subscriptions" ON public.vendor_subscriptions FOR ALL TO authenticated
      USING (public.is_admin(auth.uid()))
      WITH CHECK (public.is_admin(auth.uid()));`,

    // ─── Multi-Store Support ─────────────────────────
    `ALTER TABLE public.shops DROP CONSTRAINT IF EXISTS shops_owner_id_key;`,

    `ALTER TABLE public.shops
      ADD COLUMN IF NOT EXISTS is_suspended boolean DEFAULT false,
      ADD COLUMN IF NOT EXISTS suspended_reason text;`,

    // ─── Reports / Moderation ────────────────────────
    `CREATE TABLE IF NOT EXISTS public.reports (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      reporter_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
      target_type text NOT NULL CHECK (target_type IN ('product', 'store')),
      target_id uuid NOT NULL,
      shop_id uuid REFERENCES public.shops(id) ON DELETE CASCADE,
      reason text NOT NULL,
      details text,
      status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'ignored', 'actioned')),
      admin_note text,
      resolved_by uuid REFERENCES auth.users(id),
      created_at timestamptz DEFAULT now(),
      resolved_at timestamptz,
      UNIQUE (reporter_id, target_type, target_id)
    );`,

    `ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;`,

    `DROP POLICY IF EXISTS "Admins manage reports" ON public.reports;`,
    `CREATE POLICY "Admins manage reports" ON public.reports FOR ALL TO authenticated
      USING (public.is_admin(auth.uid()))
      WITH CHECK (public.is_admin(auth.uid()));`,

    `DROP POLICY IF EXISTS "Users can submit reports" ON public.reports;`,
    `CREATE POLICY "Users can submit reports" ON public.reports FOR INSERT TO authenticated
      WITH CHECK (reporter_id = auth.uid());`,

    // ─── Admin Audit Log ─────────────────────────────
    `CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      admin_id uuid REFERENCES auth.users(id) NOT NULL,
      action text NOT NULL,
      target_type text,
      target_id text,
      details jsonb,
      created_at timestamptz DEFAULT now()
    );`,

    `ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;`,

    `DROP POLICY IF EXISTS "Admins can read logs" ON public.admin_audit_logs;`,
    `CREATE POLICY "Admins can read logs" ON public.admin_audit_logs FOR SELECT TO authenticated
      USING (public.is_admin(auth.uid()));`,

    `DROP POLICY IF EXISTS "Admins can insert logs" ON public.admin_audit_logs;`,
    `CREATE POLICY "Admins can insert logs" ON public.admin_audit_logs FOR INSERT TO authenticated
      WITH CHECK (public.is_admin(auth.uid()));`,

    // ─── Admin RLS on existing tables ────────────────
    `DROP POLICY IF EXISTS "Admins can read all shops" ON public.shops;`,
    `CREATE POLICY "Admins can read all shops" ON public.shops FOR SELECT TO authenticated
      USING (public.is_admin(auth.uid()));`,

    `DROP POLICY IF EXISTS "Admins can update all shops" ON public.shops;`,
    `CREATE POLICY "Admins can update all shops" ON public.shops FOR UPDATE TO authenticated
      USING (public.is_admin(auth.uid()))
      WITH CHECK (public.is_admin(auth.uid()));`,

    `DROP POLICY IF EXISTS "Admins can read all orders" ON public.orders;`,
    `CREATE POLICY "Admins can read all orders" ON public.orders FOR SELECT TO authenticated
      USING (public.is_admin(auth.uid()));`,

    `DROP POLICY IF EXISTS "Admins can read all products" ON public.products;`,
    `CREATE POLICY "Admins can read all products" ON public.products FOR SELECT TO authenticated
      USING (public.is_admin(auth.uid()));`,

    `DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;`,
    `CREATE POLICY "Admins can read all profiles" ON public.profiles FOR SELECT TO authenticated
      USING (public.is_admin(auth.uid()));`,
  ];

  const results: Array<{ sql: string; ok: boolean; error?: string }> = [];

  for (const sql of migrations) {
    const { error } = await supabase.rpc("exec_sql", { sql }).maybeSingle();

    if (error && error.message?.includes("exec_sql")) {
      results.push({ sql: sql.slice(0, 80) + "...", ok: false, error: "exec_sql RPC not available — run manually" });
    } else if (error) {
      results.push({ sql: sql.slice(0, 80) + "...", ok: false, error: error.message });
    } else {
      results.push({ sql: sql.slice(0, 80) + "...", ok: true });
    }
  }

  return new Response(
    JSON.stringify({
      message: "If exec_sql RPC is unavailable, run the SQL below manually in Supabase SQL Editor → New Query",
      results,
      manual_sql: migrations.join("\n\n"),
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
