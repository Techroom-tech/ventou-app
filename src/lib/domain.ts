/**
 * Domain utilities for multi-tenant wildcard subdomain architecture.
 * All storefront URLs are built dynamically from the current hostname.
 */

const DEFAULT_BASE_DOMAIN = 'ventou.shop';
const PREVIEW_SUFFIXES = ['.lovable.app', '.lovableproject.com'];

function isIpv4(hostname: string): boolean {
  return /^\d+\.\d+\.\d+\.\d+$/.test(hostname);
}

function getCurrentHostname(): string {
  if (typeof window === 'undefined') return DEFAULT_BASE_DOMAIN;
  return window.location.hostname.toLowerCase();
}

function getBaseDomainFromHostname(hostname: string): string {
  if (!hostname || hostname === 'localhost' || isIpv4(hostname)) {
    return DEFAULT_BASE_DOMAIN;
  }

  if (PREVIEW_SUFFIXES.some((suffix) => hostname.endsWith(suffix))) {
    return hostname;
  }

  const parts = hostname.split('.').filter(Boolean);

  if (parts.length <= 2) {
    return hostname;
  }

  if (parts[0] === 'www') {
    return parts.slice(1).join('.');
  }

  return parts.slice(1).join('.');
}

/** The base domain used for tenant subdomains */
export const BASE_DOMAIN = getBaseDomainFromHostname(getCurrentHostname());

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

/** Platform root URL from current hostname context */
export function getPlatformUrl(): string {
  return `https://${BASE_DOMAIN}`;
}

/** Get the SEO-friendly base path */
export function getSeoBasePath(shopSlug: string): string {
  return `${shopSlug}.${BASE_DOMAIN}`;
}

