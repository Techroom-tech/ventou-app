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

// ─── Main Handler ────────────────────────────────────────────

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin') || '';
    const pathname = url.pathname;

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

    // ── Only proxy specific paths ──
    if (!shouldProxy(pathname)) {
      // Let Cloudflare handle normally (serves HTML from origin)
      return fetch(request);
    }

    // ── Build origin request ──
    const originUrl = `${ORIGIN_URL}${pathname}${url.search}`;

    const originHeaders = new Headers(request.headers);
    // Critical: set Host to the registered custom domain so Lovable serves the correct assets
    originHeaders.set('Host', ORIGIN_HOST);
    // Remove headers that might confuse the origin
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
      // Only override if origin returned a generic/wrong type
      if (!currentType || currentType.includes('text/plain') || currentType.includes('application/octet-stream')) {
        responseHeaders.set('Content-Type', correctMime);
      }
    }

    // Set proper caching
    if (response.ok) {
      responseHeaders.set('Cache-Control', getCacheControl(pathname));
    }

    // Add CORS headers
    const corsHeaders = getCorsHeaders(origin);
    for (const [key, value] of Object.entries(corsHeaders)) {
      responseHeaders.set(key, value);
    }

    // Security headers
    responseHeaders.set('X-Content-Type-Options', 'nosniff');

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  },
};
