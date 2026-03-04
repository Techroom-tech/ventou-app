import { supabase } from '@/integrations/supabase/client';

/**
 * Fire-and-forget cache invalidation for the storefront edge function.
 * Called after vendor mutations (products, shop settings).
 */
export function invalidateStorefrontCache(shopId: string, slug?: string) {
  supabase.functions.invoke('storefront-cache', {
    body: { action: 'invalidate', shop_id: shopId, slug },
  }).catch(() => {
    // Silent fail — cache will expire naturally via TTL
  });
}
