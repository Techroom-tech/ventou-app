/**
 * Configurable list of main domains that should NOT be treated as subdomains.
 * Add any future production domains here.
 */
export const MAIN_DOMAINS = ['ventou.shop', 'www.ventou.shop'];

/** Hostname suffixes to always ignore (previews, local dev) */
const IGNORED_SUFFIXES = ['.lovable.app', '.lovableproject.com'];

/**
 * Extract store slug from the current hostname using generic splitting.
 *
 * Examples:
 *   "tuk.ventou.shop"   → "tuk"
 *   "ventou.shop"       → null
 *   "www.ventou.shop"   → null
 *   "localhost"          → null
 *   "my-store.example.com" → "my-store"  (future custom domains)
 */
export function getStoreSlugFromHostname(): string | null {
  const hostname = window.location.hostname;

  // Localhost or IP → no subdomain
  if (hostname === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
    return null;
  }

  // Preview / dev domains → no subdomain
  if (IGNORED_SUFFIXES.some(suffix => hostname.endsWith(suffix))) {
    return null;
  }

  // Exact main domains → no subdomain
  if (MAIN_DOMAINS.includes(hostname)) {
    return null;
  }

  // Generic splitting: "sub.domain.tld" → parts.length >= 3 → first part
  const parts = hostname.split('.');
  if (parts.length >= 3) {
    const sub = parts[0];
    if (sub && sub !== 'www') {
      return sub;
    }
  }

  return null;
}

/** @deprecated Use getStoreSlugFromHostname() instead */
export const getSubdomain = getStoreSlugFromHostname;
