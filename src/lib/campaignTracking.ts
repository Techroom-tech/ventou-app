/**
 * Campaign Attribution Tracking — client-side helper.
 * Manages visitor_id, campaign session, and fires events to edge functions.
 */
import { supabase } from '@/integrations/supabase/client';

// ── Types ────────────────────────────────────────────────────────────────────

interface CampaignSession {
  click_id: string;
  link_id: string;
  shop_id: string;
  visitor_id: string;
}

// ── Visitor ID ───────────────────────────────────────────────────────────────

function getVisitorId(shopId: string): string {
  const key = `ventou-visitor-${shopId}`;
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}

// ── Campaign Session ─────────────────────────────────────────────────────────

function sessionKey(shopId: string) {
  return `ventou-campaign-${shopId}`;
}

export function getCampaignSession(shopId: string): CampaignSession | null {
  try {
    const raw = localStorage.getItem(sessionKey(shopId));
    if (!raw) return null;
    return JSON.parse(raw) as CampaignSession;
  } catch {
    return null;
  }
}

function saveCampaignSession(session: CampaignSession) {
  try {
    localStorage.setItem(sessionKey(session.shop_id), JSON.stringify(session));
  } catch {
    // ignore
  }
}

// ── Device / Browser detection ───────────────────────────────────────────────

function detectDevice(): string {
  if (typeof navigator === 'undefined') return 'unknown';
  const ua = navigator.userAgent;
  if (/tablet|ipad/i.test(ua)) return 'tablet';
  if (/mobile|iphone|android.*mobile/i.test(ua)) return 'mobile';
  return 'desktop';
}

function detectBrowser(): string {
  if (typeof navigator === 'undefined') return 'unknown';
  const ua = navigator.userAgent;
  if (/edg\//i.test(ua)) return 'Edge';
  if (/chrome/i.test(ua) && !/edg/i.test(ua)) return 'Chrome';
  if (/firefox/i.test(ua)) return 'Firefox';
  if (/safari/i.test(ua) && !/chrome/i.test(ua)) return 'Safari';
  if (/opera|opr/i.test(ua)) return 'Opera';
  return 'Other';
}

// ── Track Click (called on ?ref= landing) ────────────────────────────────────

export async function trackCampaignClick(shopId: string, refCode: string) {
  const params = new URLSearchParams(window.location.search);
  const visitor_id = getVisitorId(shopId);

  try {
    const { data } = await supabase.functions.invoke('track-link-click', {
      body: {
        ref_code: refCode,
        visitor_id,
        device: detectDevice(),
        browser: detectBrowser(),
        fbclid: params.get('fbclid') || null,
        ttclid: params.get('ttclid') || null,
        // ip/country/city could be resolved server-side in future
        ip_address: null,
        country: null,
        city: null,
      },
    });

    if (data?.click_id && data?.link_id) {
      saveCampaignSession({
        click_id: data.click_id,
        link_id: data.link_id,
        shop_id: data.shop_id || shopId,
        visitor_id,
      });
    }
  } catch (err) {
    console.warn('[CampaignTracking] click error:', err);
  }
}

// ── Track Event ──────────────────────────────────────────────────────────────

export async function trackCampaignEvent(
  shopId: string,
  eventType: 'view_product' | 'add_to_cart' | 'checkout_started' | 'purchase',
  extra?: { product_id?: string; order_id?: string; revenue?: number }
) {
  const session = getCampaignSession(shopId);
  if (!session) return; // No active campaign session

  try {
    await supabase.functions.invoke('track-campaign-event', {
      body: {
        visitor_id: session.visitor_id,
        link_id: session.link_id,
        click_id: session.click_id,
        shop_id: session.shop_id,
        event_type: eventType,
        product_id: extra?.product_id || null,
        order_id: extra?.order_id || null,
        revenue: extra?.revenue ?? null,
      },
    });
  } catch (err) {
    console.warn('[CampaignTracking] event error:', err);
  }
}
