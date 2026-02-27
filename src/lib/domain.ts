/**
 * Domain utilities for multi-tenant wildcard subdomain architecture.
 * All storefront URLs are built dynamically — never hardcoded.
 */

/** The base domain used for tenant subdomains */
export const BASE_DOMAIN = 'ventou.shop';

/** Build the full storefront URL for a given shop slug */
export function getStorefrontUrl(slug: string): string {
  return `https://${slug}.${BASE_DOMAIN}`;
}

/** Build a display-friendly domain string (no protocol) */
export function getStorefrontDomain(slug: string): string {
  return `${slug}.${BASE_DOMAIN}`;
}

/** Build product URL for a given shop slug and product slug */
export function getProductUrl(shopSlug: string, productSlug: string): string {
  return `https://${shopSlug}.${BASE_DOMAIN}/produit/${productSlug}`;
}

/** Get the SEO-friendly base path */
export function getSeoBasePath(shopSlug: string): string {
  return `${shopSlug}.${BASE_DOMAIN}`;
}
