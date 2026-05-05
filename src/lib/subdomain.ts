/**
 * Hostname suffixes to always ignore (preview/dev hosts are not storefront tenants).
 */
const IGNORED_SUFFIXES = ['.lovable.app', '.lovableproject.com', '.herokuapp.com'];

/**
 * Extract store slug from current hostname using generic host parsing.
 *
 * Examples:
 *   "tuk.ventou.shop"      → "tuk"
 *   "ventou.shop"          → null
 *   "www.ventou.shop"      → null
 *   "my-store.example.com" → "my-store"
 */
export function getStoreSlugFromHostname(): string | null {
  const hostname = window.location.hostname.toLowerCase();

  // Localhost or IPv4 → no subdomain
  if (hostname === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
    return null;
  }

  // Preview / dev domains → no subdomain
  if (IGNORED_SUFFIXES.some((suffix) => hostname.endsWith(suffix))) {
    return null;
  }

  // Generic splitting: requires at least 3 labels (sub.domain.tld)
  const parts = hostname.split('.').filter(Boolean);
  if (parts.length < 3) {
    return null;
  }

  const sub = parts[0];
  if (!sub || sub === 'www') {
    return null;
  }

  return sub;
}


/** @deprecated Use getStoreSlugFromHostname() instead */
export const getSubdomain = getStoreSlugFromHostname;
