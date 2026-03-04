import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ success: false, error_code: 'METHOD_NOT_ALLOWED' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const authHeader = req.headers.get('authorization') ?? req.headers.get('Authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
      return new Response(JSON.stringify({ success: false, error_code: 'AUTH_REQUIRED' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: authData, error: authError } = await authClient.auth.getUser();
    if (authError || !authData?.user?.id) {
      return new Response(JSON.stringify({ success: false, error_code: 'AUTH_REQUIRED' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();

    const admin = createClient(supabaseUrl, serviceRoleKey);
    const { data, error } = await admin.rpc('create_shop_with_validation', {
      _name: body?.name ?? null,
      _slug: body?.slug ?? null,
      _description: body?.description ?? null,
      _category: body?.category ?? null,
      _country: body?.country ?? null,
      _city: body?.city ?? null,
      _whatsapp: body?.whatsapp ?? null,
      _primary_color: body?.primary_color ?? null,
    }).single();

    const result = data ?? { success: false, error_code: 'INTERNAL_ERROR' };

    console.log(
      JSON.stringify({
        event: 'create_shop_attempt',
        user_id: authData.user.id,
        subdomain: body?.slug ?? null,
        normalized_slug: result?.normalized_slug ?? null,
        stores_count: result?.stores_count ?? null,
        store_limit: result?.store_limit ?? null,
        creation_attempt: true,
        success: result?.success ?? false,
        error_code: result?.error_code ?? null,
      })
    );

    if (error) {
      return new Response(JSON.stringify({ success: false, error_code: 'INTERNAL_ERROR' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!result.success) {
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch {
    return new Response(JSON.stringify({ success: false, error_code: 'INTERNAL_ERROR' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
