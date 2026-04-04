import { useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// ── Types ─────────────────────────────────────────────────────────────────────

interface VentouTrackerAPI {
  trackPageView: () => void;
  trackViewContent: (p: TrackEventParams) => void;
  trackAddToCart: (p: TrackEventParams) => void;
  trackInitiateCheckout: (p: TrackEventParams) => void;
  trackPurchase: (p: PurchaseParams) => void;
}

interface TrackEventParams {
  content_name?: string;
  content_id?: string;
  content_ids?: string[];
  value?: number;
  currency?: string;
  num_items?: number;
}

interface PurchaseParams {
  value: number;
  currency: string;
  content_ids?: string[];
  order_id?: string;
  shop_id?: string;
  user_email?: string;
  user_phone?: string;
}

declare global {
  interface Window {
    VentouTracker?: VentouTrackerAPI;
    fbq?: (...args: unknown[]) => void;
    ttq?: { track: (event: string, params?: Record<string, unknown>) => void; page: () => void };
    dataLayer?: Record<string, unknown>[];
  }
}

// ── Sanitizer ─────────────────────────────────────────────────────────────────

const DANGEROUS_PATTERNS = [
  /<iframe[\s\S]*?>/gi,
  /<\/iframe>/gi,
  /eval\s*\(/gi,
  /document\.write\s*\(/gi,
  /document\.writeln\s*\(/gi,
  /Function\s*\(/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
];

function sanitizeScript(raw: string): string {
  let clean = raw;
  for (const pattern of DANGEROUS_PATTERNS) {
    clean = clean.replace(pattern, '/* BLOCKED */');
  }
  return clean;
}

// ── Event helpers ─────────────────────────────────────────────────────────────

function genEventId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function fireFbq(event: string, params?: any, eventId?: string) {
  if (!window.fbq) return;
  const opts = eventId ? { eventID: eventId } : undefined;
  window.fbq('track', event, params, opts);
}

function fireTtq(event: string, params?: any, eventId?: string) {
  if (!window.ttq) return;
  const p = eventId ? { ...params, event_id: eventId } : params;
  window.ttq.track(event, p);
}

function fireGtag(event: string, params?: any, eventId?: string) {
  if (!window.dataLayer) return;
  window.dataLayer.push({ event, ...params, event_id: eventId });
}

function fireAll(event: string, ttEvent: string, params?: any) {
  const eventId = genEventId();
  fireFbq(event, params, eventId);
  fireTtq(ttEvent, params, eventId);
  fireGtag(event, params, eventId);
  return eventId;
}

// ── Event queue for pre-init buffering ────────────────────────────────────────

type QueuedEvent = { method: keyof VentouTrackerAPI; args: any[] };
const eventQueue: QueuedEvent[] = [];

function flushQueue() {
  while (eventQueue.length > 0) {
    const evt = eventQueue.shift()!;
    const tracker = window.VentouTracker;
    if (!tracker) break;
    (tracker[evt.method] as Function)(...evt.args);
  }
}

// ── Server-side CAPI relay ────────────────────────────────────────────────────

async function sendCAPI(eventName: string, eventId: string, shopId: string, customData?: Record<string, unknown>, userData?: Record<string, unknown>) {
  try {
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    if (!projectId) return;
    const url = `https://${projectId}.supabase.co/functions/v1/track-event`;
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_name: eventName,
        event_id: eventId,
        shop_id: shopId,
        custom_data: customData,
        user_data: userData,
        event_source_url: window.location.href,
      }),
      keepalive: true,
    });
  } catch {
    // silent — CAPI is best-effort
  }
}

// ── Main hook ─────────────────────────────────────────────────────────────────

export function useStorefrontTracking(shopId: string | undefined) {
  const { data: settings } = useQuery({
    queryKey: ['storefront-tracking', shopId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tracking_settings_public')
        .select('shop_id, facebook_pixel, tiktok_pixel, gtm_id, custom_scripts')
        .eq('shop_id', shopId!)
        .maybeSingle();
      if (error) return null;
      return data;
    },
    enabled: !!shopId,
    staleTime: 5 * 60_000,
  });

  // ── Facebook Pixel injection ──
  useEffect(() => {
    const pixelId = settings?.facebook_pixel?.trim();
    if (!pixelId) return;

    const scriptId = 'ventou-fb-pixel';
    if (document.getElementById(scriptId)) return;

    const initScript = document.createElement('script');
    initScript.id = scriptId;
    initScript.textContent = `
      !function(f,b,e,v,n,t,s)
      {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
      n.callMethod.apply(n,arguments):n.queue.push(arguments)};
      if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
      n.queue=[];t=b.createElement(e);t.async=!0;
      t.src=v;s=b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t,s)}(window, document,'script',
      'https://connect.facebook.net/en_US/fbevents.js');
      fbq('init', '${pixelId}');
      fbq('track', 'PageView');
    `;
    document.head.appendChild(initScript);

    const ns = document.createElement('noscript');
    ns.id = 'ventou-fb-pixel-ns';
    const img = document.createElement('img');
    img.height = 1;
    img.width = 1;
    img.style.display = 'none';
    img.src = `https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1`;
    ns.appendChild(img);
    document.head.appendChild(ns);

    return () => {
      document.getElementById(scriptId)?.remove();
      document.getElementById('ventou-fb-pixel-ns')?.remove();
    };
  }, [settings?.facebook_pixel]);

  // ── TikTok Pixel injection ──
  useEffect(() => {
    const pixelId = settings?.tiktok_pixel?.trim();
    if (!pixelId) return;

    const scriptId = 'ventou-tt-pixel';
    if (document.getElementById(scriptId)) return;

    const initScript = document.createElement('script');
    initScript.id = scriptId;
    initScript.textContent = `
      !function (w, d, t) {
        w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e};ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=i,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};var o=document.createElement("script");o.type="text/javascript",o.async=!0,o.src=i+"?sdkid="+e+"&lib="+t;var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};
        ttq.load('${pixelId}');
        ttq.page();
      }(window, document, 'ttq');
    `;
    document.head.appendChild(initScript);

    return () => {
      document.getElementById(scriptId)?.remove();
    };
  }, [settings?.tiktok_pixel]);

  // ── Google Tag Manager injection ──
  useEffect(() => {
    const gtmId = settings?.gtm_id?.trim();
    if (!gtmId) return;

    const scriptId = 'ventou-gtm';
    if (document.getElementById(scriptId)) return;

    const initScript = document.createElement('script');
    initScript.id = scriptId;
    initScript.textContent = `
      (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
      new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
      j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
      'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
      })(window,document,'script','dataLayer','${gtmId}');
    `;
    document.head.appendChild(initScript);

    return () => {
      document.getElementById(scriptId)?.remove();
    };
  }, [settings?.gtm_id]);

  // ── Custom Scripts (sanitized) ──
  useEffect(() => {
    const scripts = settings?.custom_scripts?.trim();
    if (!scripts) return;

    const sanitized = sanitizeScript(scripts);
    const parser = new DOMParser();
    const doc = parser.parseFromString(sanitized, 'text/html');
    const scriptEls = doc.querySelectorAll('script');

    const clones: HTMLScriptElement[] = [];
    scriptEls.forEach((orig) => {
      const s = document.createElement('script');
      if (orig.src) {
        s.src = orig.src;
      } else {
        s.textContent = sanitizeScript(orig.textContent || '');
      }
      s.async = true;
      s.dataset.ventouCustom = 'true';
      clones.push(s);
      document.head.appendChild(s);
    });

    return () => {
      clones.forEach((s) => s.remove());
    };
  }, [settings?.custom_scripts]);

  // ── Install global VentouTracker ──
  const currentShopId = shopId;
  useEffect(() => {
    if (!settings) return;

    window.VentouTracker = {
      trackPageView() {
        const eventId = genEventId();
        fireFbq('PageView', undefined, eventId);
        if (window.ttq) window.ttq.page();
        fireGtag('page_view', undefined, eventId);
      },
      trackViewContent(p) {
        fireAll('ViewContent', 'ViewContent', p);
      },
      trackAddToCart(p) {
        fireAll('AddToCart', 'AddToCart', p);
      },
      trackInitiateCheckout(p) {
        fireAll('InitiateCheckout', 'InitiateCheckout', p);
      },
      trackPurchase(p) {
        const eventId = fireAll('Purchase', 'CompletePayment', {
          value: p.value,
          currency: p.currency,
          content_ids: p.content_ids,
        });
        if (currentShopId) {
          sendCAPI('Purchase', eventId, currentShopId, {
            value: p.value,
            currency: p.currency,
            content_ids: p.content_ids,
            order_id: p.order_id,
          }, {
            em: p.user_email,
            ph: p.user_phone,
          });
        }
      },
    };

    // Flush any events that were queued before tracker was ready
    flushQueue();

    return () => {
      delete window.VentouTracker;
    };
  }, [settings, currentShopId]);

  return settings;
}

// ── Convenience exports (with queue + direct fbq fallback) ────────────────────

export function trackViewContent(params: TrackEventParams) {
  if (window.VentouTracker) {
    window.VentouTracker.trackViewContent(params);
  } else {
    // Direct fallback — fbq uses internal queue, works even before script loads
    fireFbq('ViewContent', params);
    fireTtq('ViewContent', params);
    fireGtag('ViewContent', params);
    eventQueue.push({ method: 'trackViewContent', args: [params] });
  }
}

export function trackAddToCart(params: TrackEventParams) {
  if (window.VentouTracker) {
    window.VentouTracker.trackAddToCart(params);
  } else {
    fireFbq('AddToCart', params);
    fireTtq('AddToCart', params);
    fireGtag('AddToCart', params);
    eventQueue.push({ method: 'trackAddToCart', args: [params] });
  }
}

export function trackInitiateCheckout(params: TrackEventParams) {
  if (window.VentouTracker) {
    window.VentouTracker.trackInitiateCheckout(params);
  } else {
    fireFbq('InitiateCheckout', params);
    fireTtq('InitiateCheckout', params);
    fireGtag('InitiateCheckout', params);
    eventQueue.push({ method: 'trackInitiateCheckout', args: [params] });
  }
}

export function trackPurchase(params: PurchaseParams) {
  if (window.VentouTracker) {
    window.VentouTracker.trackPurchase(params);
  } else {
    fireFbq('Purchase', { value: params.value, currency: params.currency, content_ids: params.content_ids });
    fireTtq('CompletePayment', { value: params.value, currency: params.currency, content_ids: params.content_ids });
    fireGtag('Purchase', { value: params.value, currency: params.currency, content_ids: params.content_ids });
    eventQueue.push({ method: 'trackPurchase', args: [params] });
  }
}
