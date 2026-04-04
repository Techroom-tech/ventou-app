/**
 * Cloudflare Worker — Ventou Wildcard Subdomain Proxy
 * ====================================================
 * 
 * PURPOSE:
 * Routes *.ventou.shop requests to the Lovable origin (ventouci.lovable.app)
 * which only serves assets for the registered custom domain (ventou.shop).
 * 
 * This worker ensures:
 * 1. Static assets (JS, CSS, fonts, images) are fetched from origin with correct Host header
 * 2. Analytics/tracking requests are proxied with proper CORS
 * 3. All other requests (HTML SPA) pass through normally
 * 4. Correct MIME types and caching headers are preserved
 * 5. SSR OG meta tags for product pages when bot crawlers are detected
 * 
 * DEPLOYMENT:
 * 1. Go to Cloudflare Dashboard → Workers & Pages → Create Worker
 * 2. Paste this code
 * 3. Deploy
 * 4. Go to Workers → Triggers → Add Route:
 *    Route pattern: *.ventou.shop/*
 *    Zone: ventou.shop
 * 5. IMPORTANT: Do NOT add a route for ventou.shop/* (root domain works fine without worker)
 *    Only subdomains need the proxy.
 * 
 * ENVIRONMENT VARIABLES (set in Cloudflare dashboard → Worker Settings → Variables):
 * - SUPABASE_URL = https://chpplckgndznakuvcqbx.supabase.co
 * - SUPABASE_ANON_KEY = your anon key
 * 
 * DNS REQUIREMENTS (already configured):
 * - *.ventou.shop → CNAME → ventouci.lovable.app (Proxied through Cloudflare)
 * - SSL/TLS mode: Full (not Strict)
 */

// ─── Configuration ───────────────────────────────────────────
const ORIGIN_HOST = 'ventou.shop';
const ORIGIN_URL = `https://${ORIGIN_HOST}`;

// MIME type mapping for static assets (Lovable origin may return text/plain for unknown subdomains)
const MIME_TYPES = {
  '.js':    'application/javascript',
  '.mjs':   'application/javascript',
  '.css':   'text/css',
  '.html':  'text/html',
  '.json':  'application/json',
  '.svg':   'image/svg+xml',
  '.png':   'image/png',
  '.jpg':   'image/jpeg',
  '.jpeg':  'image/jpeg',
  '.gif':   'image/gif',
  '.webp':  'image/webp',
  '.ico':   'image/x-icon',
  '.woff':  'font/woff',
  '.woff2': 'font/woff2',
  '.ttf':   'font/ttf',
  '.otf':   'font/otf',
  '.map':   'application/json',
  '.webm':  'video/webm',
  '.mp4':   'video/mp4',
  '.mp3':   'audio/mpeg',
  '.wav':   'audio/wav',
  '.txt':   'text/plain',
  '.xml':   'application/xml',
  '.wasm':  'application/wasm',
};

// Paths that must be proxied to the origin domain
const PROXY_PATH_PREFIXES = [
  '/assets/',       // Vite build output (JS, CSS, images)
  '/~api/',         // Lovable analytics API
  '/~flock.js',     // Lovable analytics script
  '/favicon.ico',   // Favicon
  '/robots.txt',    // SEO
  '/sitemap',       // SEO sitemaps
  '/manifest',      // PWA manifest
];

// CORS: allowed origin pattern for *.ventou.shop
const ALLOWED_ORIGIN_RE = /^https:\/\/([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)*ventou\.shop$/i;

// Bot user-agent patterns for SSR OG meta tag injection
const BOT_UA_RE = /facebookexternalhit|WhatsApp|Twitterbot|TelegramBot|LinkedInBot|Googlebot|bingbot|Slackbot|Discordbot|PinterestBot|Applebot/i;

// Product page pattern: /p/{slug}
const PRODUCT_PAGE_RE = /^\/p\/([a-z0-9][a-z0-9-]*[a-z0-9]?)$/i;

// Store page pattern: /page/{slug}
const STORE_PAGE_RE = /^\/page\/([a-z0-9][a-z0-9-]*[a-z0-9]?)$/i;

// ─── Helpers ─────────────────────────────────────────────────

function shouldProxy(pathname) {
  return PROXY_PATH_PREFIXES.some(prefix => pathname.startsWith(prefix));
}

function getMimeType(pathname) {
  const ext = pathname.slice(pathname.lastIndexOf('.')).toLowerCase();
  return MIME_TYPES[ext] || null;
}

function getCorsHeaders(origin) {
  if (!origin || !ALLOWED_ORIGIN_RE.test(origin)) {
    return {};
  }
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, HEAD, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
}

function getCacheControl(pathname) {
  // Vite hashed assets are immutable (filename contains content hash)
  if (pathname.startsWith('/assets/') && /\.[a-zA-Z0-9]{8,}\.(js|css|woff2?|ttf|otf|png|jpg|jpeg|gif|webp|svg|ico)$/.test(pathname)) {
    return 'public, max-age=31536000, immutable';
  }
  // Analytics scripts: short cache
  if (pathname.startsWith('/~')) {
    return 'public, max-age=60';
  }
  // Everything else: moderate cache
  return 'public, max-age=3600, s-maxage=86400';
}

function applySecurityHeaders(headers) {
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('X-Frame-Options', 'DENY');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');

  // Keep CSP permissive enough for current third-party scripts while blocking risky primitives.
  if (!headers.has('Content-Security-Policy')) {
    headers.set(
      'Content-Security-Policy',
      "default-src 'self' https: data: blob: 'unsafe-inline' 'unsafe-eval'; object-src 'none'; frame-ancestors 'none'; base-uri 'self'",
    );
  }
}

function isBot(userAgent) {
  return BOT_UA_RE.test(userAgent || '');
}

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function stripHtmlTags(str) {
  if (!str) return '';
  return str.replace(/<[^>]*>/g, '').trim();
}

/**
 * Extract a plain-text description from product description field.
 * The description can be a JSON TipTap document or a plain string.
 */
function extractDescription(desc) {
  if (!desc) return '';
  if (typeof desc === 'string') return stripHtmlTags(desc).slice(0, 200);
  // TipTap JSON: extract text from content nodes recursively
  try {
    const texts = [];
    function walk(node) {
      if (node.text) texts.push(node.text);
      if (node.content) node.content.forEach(walk);
    }
    walk(desc);
    return texts.join(' ').slice(0, 200);
  } catch {
    return '';
  }
}

// ─── SSR OG Meta Tags for Product Pages ─────────────────────

async function handleProductOG(request, env, shopSlug, productSlug) {
  const supabaseUrl = env.SUPABASE_URL;
  const supabaseKey = env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    // No Supabase config → fall through to normal proxy
    return null;
  }

  const headers = {
    'apikey': supabaseKey,
    'Authorization': `Bearer ${supabaseKey}`,
    'Content-Type': 'application/json',
  };

  // Fetch shop + product + product image in parallel
  const [shopRes, productRes] = await Promise.all([
    fetch(`${supabaseUrl}/rest/v1/shops?slug=eq.${encodeURIComponent(shopSlug)}&is_active=eq.true&deleted_at=is.null&select=id,name,slug,logo_url,description,currency&limit=1`, { headers }),
    fetch(`${supabaseUrl}/rest/v1/products?slug=eq.${encodeURIComponent(productSlug)}&is_active=eq.true&select=id,name,slug,price,compare_at_price,image_url,description,meta_title,meta_description,shop_id&limit=10`, { headers }),
  ]);

  if (!shopRes.ok || !productRes.ok) return null;

  const shops = await shopRes.json();
  const products = await productRes.json();

  if (!shops.length) return null;
  const shop = shops[0];

  // Find the product that belongs to this shop
  const product = products.find(p => p.shop_id === shop.id);
  if (!product) return null;

  // Fetch first product image for better quality OG image
  let ogImage = product.image_url || '';
  try {
    const imgRes = await fetch(
      `${supabaseUrl}/rest/v1/product_images?product_id=eq.${product.id}&order=position.asc&limit=1&select=image_url`,
      { headers }
    );
    if (imgRes.ok) {
      const imgs = await imgRes.json();
      if (imgs.length && imgs[0].image_url) ogImage = imgs[0].image_url;
    }
  } catch { /* ignore */ }

  // Build meta values
  const title = escapeHtml(product.meta_title || product.name);
  const description = escapeHtml(
    product.meta_description || extractDescription(product.description) || `${product.name} - ${shop.name}`
  );
  const currency = shop.currency || 'XOF';
  const price = product.price;
  const canonicalUrl = `https://${shopSlug}.ventou.shop/p/${product.slug}`;
  const shopName = escapeHtml(shop.name);
  const safeImage = escapeHtml(ogImage);

  // JSON-LD structured data
  const jsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: stripHtmlTags(product.meta_description || extractDescription(product.description) || ''),
    image: ogImage || undefined,
    url: canonicalUrl,
    brand: { '@type': 'Brand', name: shop.name },
    offers: {
      '@type': 'Offer',
      price: price,
      priceCurrency: currency,
      availability: 'https://schema.org/InStock',
      url: canonicalUrl,
    },
  });

  // Build the OG meta tags block
  const ogMetaBlock = `
    <title>${title} | ${shopName}</title>
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:type" content="product" />
    <meta property="og:url" content="${canonicalUrl}" />
    <meta property="og:site_name" content="${shopName}" />
    ${safeImage ? `<meta property="og:image" content="${safeImage}" />` : ''}
    ${safeImage ? `<meta property="og:image:width" content="1200" />` : ''}
    ${safeImage ? `<meta property="og:image:height" content="630" />` : ''}
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${description}" />
    ${safeImage ? `<meta name="twitter:image" content="${safeImage}" />` : ''}
    <meta name="description" content="${description}" />
    <link rel="canonical" href="${canonicalUrl}" />
    <meta property="product:price:amount" content="${price}" />
    <meta property="product:price:currency" content="${currency}" />
    <script type="application/ld+json">${jsonLd}</script>`;

  // Fetch the origin HTML
  const originUrl = `${ORIGIN_URL}/p/${productSlug}`;
  const originHeaders = new Headers(request.headers);
  originHeaders.set('Host', ORIGIN_HOST);
  originHeaders.delete('CF-Connecting-IP');
  originHeaders.delete('CF-RAY');

  let originResponse;
  try {
    originResponse = await fetch(originUrl, {
      method: 'GET',
      headers: originHeaders,
      redirect: 'follow',
    });
  } catch {
    return null;
  }

  let html = await originResponse.text();

  // Replace existing meta tags in <head> — remove old OG/twitter tags then inject new ones
  // Remove existing og:, twitter:, and description meta tags
  html = html.replace(/<meta\s+(?:property|name)="(?:og:|twitter:|description)[^"]*"\s+content="[^"]*"\s*\/?>/gi, '');
  // Remove existing <title> tag
  html = html.replace(/<title>[^<]*<\/title>/i, '');

  // Inject our OG block right after <head>
  html = html.replace(/<head>/i, `<head>${ogMetaBlock}`);

  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=300, s-maxage=3600',
      'X-Robots-Tag': 'index, follow',
    },
  });
}

// ─── SSR OG Meta Tags for Store Pages (/page/:slug) ─────────

async function handleStorePageOG(request, env, shopSlug, pageSlug) {
  const supabaseUrl = env.SUPABASE_URL;
  const supabaseKey = env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) return null;

  const headers = {
    'apikey': supabaseKey,
    'Authorization': `Bearer ${supabaseKey}`,
    'Content-Type': 'application/json',
  };

  const [shopRes, pageRes] = await Promise.all([
    fetch(`${supabaseUrl}/rest/v1/shops?slug=eq.${encodeURIComponent(shopSlug)}&is_active=eq.true&deleted_at=is.null&select=id,name,slug,logo_url,description&limit=1`, { headers }),
    fetch(`${supabaseUrl}/rest/v1/store_pages?slug=eq.${encodeURIComponent(pageSlug)}&status=eq.published&select=id,title,description,slug,shop_id&limit=10`, { headers }),
  ]);

  if (!shopRes.ok || !pageRes.ok) return null;

  const shops = await shopRes.json();
  const storePages = await pageRes.json();
  if (!shops.length) return null;
  const shop = shops[0];

  const storePage = storePages.find(p => p.shop_id === shop.id);
  if (!storePage) return null;

  const title = escapeHtml(storePage.title);
  const description = escapeHtml(storePage.description || `${storePage.title} — ${shop.name}`);
  const canonicalUrl = `https://${shopSlug}.ventou.shop/page/${storePage.slug}`;
  const shopName = escapeHtml(shop.name);
  const logoImage = escapeHtml(shop.logo_url || '');

  const ogMetaBlock = `
    <title>${title} | ${shopName}</title>
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${canonicalUrl}" />
    <meta property="og:site_name" content="${shopName}" />
    ${logoImage ? `<meta property="og:image" content="${logoImage}" />` : ''}
    <meta name="twitter:card" content="summary" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${description}" />
    ${logoImage ? `<meta name="twitter:image" content="${logoImage}" />` : ''}
    <meta name="description" content="${description}" />
    <link rel="canonical" href="${canonicalUrl}" />`;

  const originUrl = `${ORIGIN_URL}/page/${pageSlug}`;
  const originHeaders = new Headers(request.headers);
  originHeaders.set('Host', ORIGIN_HOST);
  originHeaders.delete('CF-Connecting-IP');
  originHeaders.delete('CF-RAY');

  let originResponse;
  try {
    originResponse = await fetch(originUrl, { method: 'GET', headers: originHeaders, redirect: 'follow' });
  } catch { return null; }

  let html = await originResponse.text();
  html = html.replace(/<meta\s+(?:property|name)="(?:og:|twitter:|description)[^"]*"\s+content="[^"]*"\s*\/?>/gi, '');
  html = html.replace(/<title>[^<]*<\/title>/i, '');
  html = html.replace(/<head>/i, `<head>${ogMetaBlock}`);

  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=300, s-maxage=3600',
      'X-Robots-Tag': 'index, follow',
    },
  });
}

// ─── Main Handler ────────────────────────────────────────────

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin') || '';
    const pathname = url.pathname;
    const userAgent = request.headers.get('User-Agent') || '';

    // Detect country from Cloudflare (preserves your old Worker's feature)
    const country = request.cf?.country || 'BF';

    // ── CORS Preflight ──
    if (request.method === 'OPTIONS') {
      const corsHeaders = getCorsHeaders(origin);
      if (Object.keys(corsHeaders).length === 0) {
        return new Response(null, { status: 403 });
      }
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    // ── SSR OG Meta Tags for bot crawlers on product pages ──
    const productMatch = pathname.match(PRODUCT_PAGE_RE);
    if (productMatch && isBot(userAgent) && request.method === 'GET') {
      const hostname = url.hostname; // e.g. "myshop.ventou.shop"
      const shopSlug = hostname.split('.')[0]; // first label = shop slug
      const productSlug = productMatch[1];

      try {
        const ogResponse = await handleProductOG(request, env, shopSlug, productSlug);
        if (ogResponse) {
          // Add country + security headers
          ogResponse.headers.set('X-User-Country', country);
          applySecurityHeaders(ogResponse.headers);
          return ogResponse;
        }
      } catch (err) {
        console.error('SSR OG error:', err.message);
      }
    }

    // ── SSR OG Meta Tags for bot crawlers on store pages ──
    const storePageMatch = pathname.match(STORE_PAGE_RE);
    if (storePageMatch && isBot(userAgent) && request.method === 'GET') {
      const hostname = url.hostname;
      const shopSlug = hostname.split('.')[0];
      const pageSlug = storePageMatch[1];

      try {
        const ogResponse = await handleStorePageOG(request, env, shopSlug, pageSlug);
        if (ogResponse) {
          ogResponse.headers.set('X-User-Country', country);
          applySecurityHeaders(ogResponse.headers);
          return ogResponse;
        }
      } catch (err) {
        console.error('SSR Store Page OG error:', err.message);
      }
    }

    // ── ALL requests must be proxied to the real origin ──
    // Because the wildcard DNS points to a dummy IP (192.0.2.1),
    // we must rewrite every request to the actual origin (ventou.shop).
    const originUrl = `${ORIGIN_URL}${pathname}${url.search}`;
    const isAssetPath = shouldProxy(pathname);

    const originHeaders = new Headers(request.headers);
    // Critical: set Host to the registered custom domain so Lovable serves the correct assets
    originHeaders.set('Host', ORIGIN_HOST);
    originHeaders.delete('CF-Connecting-IP');
    originHeaders.delete('CF-RAY');

    let response;
    try {
      response = await fetch(originUrl, {
        method: request.method,
        headers: originHeaders,
        body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
        redirect: 'follow',
      });
    } catch (err) {
      return new Response(`Origin unreachable: ${err.message}`, {
        status: 502,
        headers: { 'Content-Type': 'text/plain' },
      });
    }

    // ── Build response with correct headers ──
    const responseHeaders = new Headers(response.headers);

    // Fix MIME type if origin returned wrong type
    const correctMime = getMimeType(pathname);
    if (correctMime) {
      const currentType = responseHeaders.get('Content-Type') || '';
      if (!currentType || currentType.includes('text/plain') || currentType.includes('application/octet-stream')) {
        responseHeaders.set('Content-Type', correctMime);
      }
    }

    // Set proper caching (only for asset paths)
    if (response.ok && isAssetPath) {
      responseHeaders.set('Cache-Control', getCacheControl(pathname));
    }

    // Add CORS headers
    const corsHeaders = getCorsHeaders(origin);
    for (const [key, value] of Object.entries(corsHeaders)) {
      responseHeaders.set(key, value);
    }

    // Inject country header + security
    responseHeaders.set('X-User-Country', country);
    applySecurityHeaders(responseHeaders);

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  },
};
