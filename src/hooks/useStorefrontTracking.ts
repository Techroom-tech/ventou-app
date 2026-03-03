import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Injects Facebook Pixel, TikTok Pixel and GTM scripts into <head>
 * on public storefront pages. Must only be called inside StorefrontContent.
 */
export function useStorefrontTracking(shopId: string | undefined) {
  const { data: settings } = useQuery({
    queryKey: ['storefront-tracking', shopId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tracking_settings')
        .select('*')
        .eq('shop_id', shopId!)
        .maybeSingle();
      if (error) return null;
      return data;
    },
    enabled: !!shopId,
    staleTime: 5 * 60_000,
  });

  // ── Facebook Pixel ──
  useEffect(() => {
    const pixelId = settings?.facebook_pixel?.trim();
    if (!pixelId) return;

    const scriptId = 'ventou-fb-pixel';
    if (document.getElementById(scriptId)) return;

    // Inline init script
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

    // noscript fallback
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

  // ── TikTok Pixel ──
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

  // ── Google Tag Manager ──
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

  // ── Custom Scripts ──
  useEffect(() => {
    const scripts = settings?.custom_scripts?.trim();
    if (!scripts) return;

    const container = document.createElement('div');
    container.id = 'ventou-custom-scripts';
    container.innerHTML = scripts;

    // Move script elements to head so they execute
    const scriptEls = container.querySelectorAll('script');
    const clones: HTMLScriptElement[] = [];
    scriptEls.forEach((orig) => {
      const s = document.createElement('script');
      if (orig.src) s.src = orig.src;
      else s.textContent = orig.textContent;
      s.async = true;
      clones.push(s);
      document.head.appendChild(s);
    });

    return () => {
      clones.forEach((s) => s.remove());
      document.getElementById('ventou-custom-scripts')?.remove();
    };
  }, [settings?.custom_scripts]);

  return settings;
}

// ── Helpers to fire standard e-commerce events ──

export function trackFbEvent(event: string, params?: Record<string, unknown>) {
  if (typeof window !== 'undefined' && (window as any).fbq) {
    (window as any).fbq('track', event, params);
  }
}

export function trackTtEvent(event: string, params?: Record<string, unknown>) {
  if (typeof window !== 'undefined' && (window as any).ttq) {
    (window as any).ttq.track(event, params);
  }
}

/** Fire ViewContent on both FB + TikTok */
export function trackViewContent(params: { content_name: string; content_id: string; value?: number; currency?: string }) {
  trackFbEvent('ViewContent', params);
  trackTtEvent('ViewContent', params);
}

/** Fire AddToCart on both FB + TikTok */
export function trackAddToCart(params: { content_name: string; content_id: string; value?: number; currency?: string }) {
  trackFbEvent('AddToCart', params);
  trackTtEvent('AddToCart', params);
}

/** Fire InitiateCheckout on FB, CompletePayment on TikTok */
export function trackInitiateCheckout(params: { value?: number; currency?: string; num_items?: number }) {
  trackFbEvent('InitiateCheckout', params);
  trackTtEvent('InitiateCheckout', params);
}

/** Fire Purchase on FB, CompletePayment on TikTok */
export function trackPurchase(params: { value: number; currency: string; content_ids?: string[] }) {
  trackFbEvent('Purchase', params);
  trackTtEvent('CompletePayment', params);
}
