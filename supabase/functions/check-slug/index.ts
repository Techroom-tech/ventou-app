import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders } from '../_shared/cors.ts'
import { checkPersistentRateLimit } from '../_shared/persistentRateLimit.ts'

function normalizeSubdomain(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (!['GET', 'POST'].includes(req.method)) {
    return new Response(JSON.stringify({ error_code: 'METHOD_NOT_ALLOWED' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Persistent rate limiting by client IP
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const rateLimit = await checkPersistentRateLimit(supabase, `check-slug:${clientIp}`, 20, 60_000, 10 * 60_000);
    if (rateLimit.blocked) {
      return new Response(
        JSON.stringify({
          error_code: 'RATE_LIMITED',
          error: 'Too many requests. Please try again later.',
          retry_after_seconds: rateLimit.retryAfterSeconds ?? 60,
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const rawSlug = req.method === 'GET'
      ? new URL(req.url).searchParams.get('name')
      : (await req.json())?.slug;

    if (!rawSlug || typeof rawSlug !== 'string') {
      return new Response(
        JSON.stringify({ error_code: 'INVALID_SUBDOMAIN', available: false, error: 'slug is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const slug = normalizeSubdomain(rawSlug);

    // Basic slug format validation
    if (slug.length < 3 || slug.length > 40 || !/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(slug)) {
      console.log(JSON.stringify({ checking_subdomain: rawSlug, normalized_slug: slug, found_store: null, available: false, error_code: 'INVALID_SUBDOMAIN' }));
      return new Response(
        JSON.stringify({ error_code: 'INVALID_SUBDOMAIN', available: false, normalized_slug: slug }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data, error } = await supabase
      .from('shops')
      .select('id, slug')
      .eq('slug', slug)
      .is('deleted_at', null)
      .maybeSingle()

    if (error) {
      return new Response(
        JSON.stringify({ error_code: 'INTERNAL_ERROR', available: false, error: 'Unable to check slug availability' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const available = !data

    console.log(JSON.stringify({ checking_subdomain: slug, found_store: data?.id ?? null, available }));

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
        .is('deleted_at', null)

      const takenSlugs = new Set((existing || []).map((r: { slug: string }) => r.slug))
      suggestions = candidates.filter(s => !takenSlugs.has(s)).slice(0, 3)
    }

    return new Response(
      JSON.stringify({ available, normalized_slug: slug, suggestions, error_code: available ? null : 'SUBDOMAIN_TAKEN' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (_err) {
    return new Response(
      JSON.stringify({ error_code: 'INTERNAL_ERROR', available: false, error: 'Invalid request' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
