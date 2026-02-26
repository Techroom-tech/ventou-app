import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Simple in-memory rate limiter (per isolate lifetime)
const rateLimitMap = new Map<string, { count: number; windowStart: number }>();
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX = 15; // max requests per window per IP

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.set(ip, { count: 1, windowStart: now });
    return false;
  }
  entry.count++;
  return entry.count > RATE_LIMIT_MAX;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Rate limiting by client IP
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    if (isRateLimited(clientIp)) {
      return new Response(
        JSON.stringify({ error: 'Too many requests. Please try again later.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { slug } = await req.json()

    if (!slug || typeof slug !== 'string') {
      return new Response(
        JSON.stringify({ error: 'slug is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Basic slug format validation
    if (slug.length > 63 || !/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(slug)) {
      return new Response(
        JSON.stringify({ error: 'Invalid slug format' }),
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
        JSON.stringify({ error: 'Unable to check slug availability' }),
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
  } catch (_err) {
    return new Response(
      JSON.stringify({ error: 'Invalid request' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
