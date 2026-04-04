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
        .is('deleted_at', null)
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
        .eq('is_active', true)
        .eq('status', 'published');

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
      const authHeader = req.headers.get('authorization') || '';
      if (!authHeader.startsWith('Bearer ')) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: jsonHeaders });
      }

      const userClient = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_ANON_KEY')!,
        { global: { headers: { Authorization: authHeader } } }
      );

      const { data: authData, error: authError } = await userClient.auth.getUser();
      if (authError || !authData?.user?.id) {
        return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401, headers: jsonHeaders });
      }

      const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
      let targetShopId = shop_id as string | undefined;
      let ownerId: string | null = null;

      if (targetShopId) {
        const { data: shopData } = await admin
          .from('shops')
          .select('id, owner_id')
          .eq('id', targetShopId)
          .maybeSingle();
        ownerId = shopData?.owner_id ?? null;
      } else if (slug) {
        const { data: shopData } = await admin
          .from('shops')
          .select('id, owner_id')
          .eq('slug', slug)
          .maybeSingle();
        targetShopId = shopData?.id;
        ownerId = shopData?.owner_id ?? null;
      }

      if (!targetShopId && !slug) {
        return new Response(JSON.stringify({ error: 'shop_id or slug required' }), { status: 400, headers: jsonHeaders });
      }

      const { data: roleData } = await admin
        .from('user_roles')
        .select('role')
        .eq('user_id', authData.user.id)
        .in('role', ['super_admin', 'manager'])
        .limit(1);
      const isPlatformAdmin = !!roleData && roleData.length > 0;

      if (!isPlatformAdmin && ownerId !== authData.user.id) {
        return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: jsonHeaders });
      }

      let cleared = 0;

      for (const key of cache.keys()) {
        if (
          (slug && key === `shop:${slug}`) ||
          (targetShopId && key.startsWith(`products:${targetShopId}:`))
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
