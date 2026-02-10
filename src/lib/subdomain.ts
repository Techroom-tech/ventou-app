/**
 * Extract shop slug from the current hostname.
 * Returns the slug if on a subdomain (e.g. "tuk" from "tuk.ventou.shop"),
 * or null if on the main domain / localhost / preview.
 */
export function getSubdomain(): string | null {
  const hostname = window.location.hostname;

  // Localhost or IP → no subdomain
  if (hostname === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
    return null;
  }

  // Lovable preview domains (*.lovable.app) → no subdomain
  if (hostname.endsWith('.lovable.app')) {
    return null;
  }

  // Main domain patterns to ignore
  const mainDomains = ['ventou.shop', 'www.ventou.shop'];
  if (mainDomains.includes(hostname)) {
    return null;
  }

  // Extract subdomain: "tuk.ventou.shop" → "tuk"
  if (hostname.endsWith('.ventou.shop')) {
    const sub = hostname.replace('.ventou.shop', '');
    // Ignore "www" or empty
    if (sub && sub !== 'www') {
      return sub;
    }
  }

  return null;
}
