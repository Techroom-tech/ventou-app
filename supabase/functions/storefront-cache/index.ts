import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders, handleCorsPreflightOrMethod } from '../_shared/cors.ts'

// ── In-memory TTL cache (per Deno isolate) ──
const cache = new Map<string, { data: unknown; expiry: number }>();

function getCache(key: string): unknown | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiry) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key: string, data: unknown, ttlMs: number) {
  cache.set(key, { data, expiry: Date.now() + ttlMs });
}

const SHOP_TTL = 5 * 60_000;    // 5 minutes
const PRODUCTS_TTL = 2 * 60_000; // 2 minutes

Deno.serve(async (req) => {
  const methodResponse = handleCorsPreflightOrMethod(req, 'POST');
  if (methodResponse) return methodResponse;
  const corsHeaders = getCorsHeaders(req);
  const jsonHeaders = { ...corsHeaders, 'Content-Type': 'application/json' };

  try {
    const body = await req.json();
    const { action } = body;

    if (action === 'shop') {
      const { slug } = body;
      if (!slug || typeof slug !== 'string') {
        return new Response(JSON.stringify({ error: 'slug is required' }), { status: 400, headers: jsonHeaders });
      }

      const cacheKey = `shop:${slug}`;
      const cached = getCache(cacheKey);
      if (cached !== null) {
        return new Response(JSON.stringify({ data: cached, cached: true }), { headers: jsonHeaders });
      }

      const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
      const { data, error } = await sb
        .from('shops')
        .select('*')
        .eq('slug', slug)
        .eq('is_active', true)
        .maybeSingle();

      if (error) {
        return new Response(JSON.stringify({ error: 'Failed to fetch shop' }), { status: 500, headers: jsonHeaders });
      }

      setCache(cacheKey, data, SHOP_TTL);
      return new Response(JSON.stringify({ data, cached: false }), { headers: jsonHeaders });
    }

    if (action === 'products') {
      const { shop_id, sort } = body;
      if (!shop_id || typeof shop_id !== 'string') {
        return new Response(JSON.stringify({ error: 'shop_id is required' }), { status: 400, headers: jsonHeaders });
      }

      const cacheKey = `products:${shop_id}:${sort ?? 'recent'}`;
      const cached = getCache(cacheKey);
      if (cached !== null) {
        return new Response(JSON.stringify({ data: cached, cached: true }), { headers: jsonHeaders });
      }

      const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
      let query = sb
        .from('products')
        .select('*')
        .eq('shop_id', shop_id)
        .eq('is_active', true);

      if (sort === 'alpha') query = query.order('name', { ascending: true });
      else if (sort === 'price_asc') query = query.order('price', { ascending: true });
      else if (sort === 'price_desc') query = query.order('price', { ascending: false });
      else query = query.order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) {
        return new Response(JSON.stringify({ error: 'Failed to fetch products' }), { status: 500, headers: jsonHeaders });
      }

      setCache(cacheKey, data, PRODUCTS_TTL);
      return new Response(JSON.stringify({ data, cached: false }), { headers: jsonHeaders });
    }

    if (action === 'invalidate') {
      const { shop_id, slug } = body;
      let cleared = 0;

      for (const key of cache.keys()) {
        if (
          (slug && key === `shop:${slug}`) ||
          (shop_id && key.startsWith(`products:${shop_id}:`))
        ) {
          cache.delete(key);
          cleared++;
        }
      }

      return new Response(JSON.stringify({ cleared }), { headers: jsonHeaders });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400, headers: jsonHeaders });
  } catch (_err) {
    return new Response(JSON.stringify({ error: 'Invalid request' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
