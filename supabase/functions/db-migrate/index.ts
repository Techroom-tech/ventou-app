import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const results: string[] = []

  try {
    // 1. Add description_json column
    const { error: e1 } = await supabase.rpc('run_migration', {
      sql: `ALTER TABLE public.products ADD COLUMN IF NOT EXISTS description_json jsonb;`
    }).maybeSingle()
    // rpc might not exist — use direct SQL via pg
    
    // We'll use a workaround: try inserting with the column and catch
    // Instead, let's just report what needs to be done
    
    return new Response(
      JSON.stringify({ 
        message: 'Run these SQL statements in your Supabase dashboard SQL editor',
        sql: [
          'ALTER TABLE public.products ADD COLUMN IF NOT EXISTS description_json jsonb;',
          'ALTER TABLE public.products ADD COLUMN IF NOT EXISTS category_id uuid;',
          `CREATE TABLE IF NOT EXISTS public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (shop_id, slug)
);`,
          'ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;',
          `CREATE POLICY IF NOT EXISTS "owner_manage_categories" ON public.categories FOR ALL USING (shop_id IN (SELECT id FROM public.shops WHERE owner_id = auth.uid())) WITH CHECK (shop_id IN (SELECT id FROM public.shops WHERE owner_id = auth.uid()));`,
          `CREATE POLICY IF NOT EXISTS "public_read_categories" ON public.categories FOR SELECT USING (true);`,
          `INSERT INTO storage.buckets (id, name, public) VALUES ('product-images', 'product-images', true) ON CONFLICT (id) DO UPDATE SET public = true;`,
        ]
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
