

## Plan: SSR OG Meta Tags via Cloudflare Worker

### Problem

WhatsApp, Facebook, Telegram crawlers do not execute JavaScript. The current `ProductSEO.tsx` injects meta tags client-side via `useEffect`, so crawlers only see the generic `index.html` tags ("Lovable App").

### Solution

Intercept product page requests (`/p/{slug}`) in the Cloudflare Worker. When the request comes from a known bot user-agent, fetch product + shop data from Supabase, then rewrite the HTML `<head>` to inject the correct OG/Twitter/JSON-LD tags before returning it.

### Architecture

```text
Bot request: test.ventou.shop/p/airpods-pro
    │
    ├─ User-Agent = WhatsApp/Facebook/Telegram/Twitter bot?
    │   YES ──► Worker fetches product from Supabase (slug + shop slug)
    │           ──► Fetches HTML from origin
    │           ──► Rewrites <head> with OG tags + JSON-LD
    │           ──► Returns modified HTML
    │
    │   NO ───► Normal proxy (SPA loads, client-side SEO works)
```

### Changes

**`cloudflare-worker/ventou-wildcard-proxy.js`**

1. Add bot detection function matching user-agents: `facebookexternalhit`, `WhatsApp`, `Twitterbot`, `TelegramBot`, `LinkedInBot`, `Googlebot`, `bingbot`, `Slackbot`.

2. Add a `handleProductOG` async function that:
   - Extracts shop slug from hostname (first label) and product slug from pathname (`/p/:slug`)
   - Queries Supabase REST API directly (using `SUPABASE_URL` and `SUPABASE_ANON_KEY` as Worker env vars) to fetch product + shop data in two parallel requests
   - Fetches the origin HTML
   - Uses string replacement on `<head>` to inject: `<title>`, `og:title`, `og:description`, `og:image`, `og:url`, `og:type`, `twitter:card`, `twitter:title`, `twitter:description`, `twitter:image`, and a `<script type="application/ld+json">` block
   - Returns the modified HTML response

3. In the main `fetch` handler, before the normal proxy logic, check: if pathname matches `/p/` and user-agent is a bot → call `handleProductOG` and return early.

4. Worker environment variables needed (set in Cloudflare dashboard):
   - `SUPABASE_URL` = `https://chpplckgndznakuvcqbx.supabase.co`
   - `SUPABASE_ANON_KEY` = the anon key

**`index.html`** — Update the default OG tags to use Ventou branding instead of "Lovable App" (fallback for non-product pages).

| File | Change |
|------|--------|
| `cloudflare-worker/ventou-wildcard-proxy.js` | Add bot detection + SSR OG meta injection for `/p/{slug}` |
| `index.html` | Update default OG meta tags to Ventou branding |

