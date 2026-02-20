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
    // Ensure orders table exists with correct schema
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

    // Enable RLS
    `ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;`,

    // DROP old policies if they exist (idempotent)
    `DROP POLICY IF EXISTS "owner_read_orders" ON public.orders;`,
    `DROP POLICY IF EXISTS "owner_update_orders" ON public.orders;`,
    `DROP POLICY IF EXISTS "anon_insert_orders" ON public.orders;`,
    `DROP POLICY IF EXISTS "public_insert_orders" ON public.orders;`,

    // Vendors can READ orders from their own shop
    `CREATE POLICY "owner_read_orders" ON public.orders
      FOR SELECT
      USING (
        shop_id IN (
          SELECT id FROM public.shops WHERE owner_id = auth.uid()
        )
      );`,

    // Vendors can UPDATE (status changes) orders from their own shop
    `CREATE POLICY "owner_update_orders" ON public.orders
      FOR UPDATE
      USING (
        shop_id IN (
          SELECT id FROM public.shops WHERE owner_id = auth.uid()
        )
      )
      WITH CHECK (
        shop_id IN (
          SELECT id FROM public.shops WHERE owner_id = auth.uid()
        )
      );`,

    // Anyone (including anonymous storefront customers) can INSERT orders
    `CREATE POLICY "public_insert_orders" ON public.orders
      FOR INSERT
      WITH CHECK (true);`,

    // Performance indexes
    `CREATE INDEX IF NOT EXISTS idx_orders_shop_id_created_at
      ON public.orders(shop_id, created_at DESC);`,

    `CREATE INDEX IF NOT EXISTS idx_orders_status
      ON public.orders(status);`,

    // Appearance V3 — new columns on shops table
    `ALTER TABLE public.shops
      ADD COLUMN IF NOT EXISTS identity_display_mode text DEFAULT 'logo-name',
      ADD COLUMN IF NOT EXISTS title_size_px integer DEFAULT 22,
      ADD COLUMN IF NOT EXISTS body_size_px integer DEFAULT 14,
      ADD COLUMN IF NOT EXISTS letter_spacing_px numeric DEFAULT 0,
      ADD COLUMN IF NOT EXISTS line_height_pct integer DEFAULT 160;`,
  ];

  const results: Array<{ sql: string; ok: boolean; error?: string }> = [];

  for (const sql of migrations) {
    const { error } = await supabase.rpc("exec_sql", { sql }).maybeSingle();

    // If rpc not available, use postgres directly via supabase-js raw
    if (error && error.message?.includes("exec_sql")) {
      // Fallback: direct query via the REST API pg executor
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
