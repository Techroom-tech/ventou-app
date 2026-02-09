import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { slug } = await req.json()

    if (!slug || typeof slug !== 'string') {
      return new Response(
        JSON.stringify({ error: 'slug is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data, error } = await supabase
      .from('shops')
      .select('slug')
      .eq('slug', slug)
      .maybeSingle()

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const available = !data

    // Generate suggestions if not available
    let suggestions: string[] = []
    if (!available) {
      const candidates = [
        `${slug}-shop`,
        `${slug}-store`,
        `${slug}-${Math.floor(Math.random() * 99) + 1}`,
        `my-${slug}`,
        `${slug}-online`,
      ]

      // Check which suggestions are available
      const { data: existing } = await supabase
        .from('shops')
        .select('slug')
        .in('slug', candidates)

      const takenSlugs = new Set((existing || []).map((r: { slug: string }) => r.slug))
      suggestions = candidates.filter(s => !takenSlugs.has(s)).slice(0, 3)
    }

    return new Response(
      JSON.stringify({ available, suggestions }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Invalid request' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
