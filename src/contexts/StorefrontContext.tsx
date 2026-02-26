import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { getStoreSlugFromHostname } from '@/lib/subdomain';

interface StorefrontContextValue {
  slug: string;
  source: 'hostname' | 'route';
}

const StorefrontContext = createContext<StorefrontContextValue | undefined>(undefined);

interface StorefrontProviderProps {
  /** Slug from route param (fallback). Hostname always takes priority. */
  routeSlug?: string;
  children: ReactNode;
}

export function StorefrontProvider({ routeSlug, children }: StorefrontProviderProps) {
  const value = useMemo<StorefrontContextValue>(() => {
    const hostnameSlug = getStoreSlugFromHostname();
    if (hostnameSlug) {
      return { slug: hostnameSlug, source: 'hostname' };
    }
    return { slug: routeSlug ?? '', source: 'route' };
  }, [routeSlug]);

  return (
    <StorefrontContext.Provider value={value}>
      {children}
    </StorefrontContext.Provider>
  );
}

export function useStorefront(): StorefrontContextValue {
  const ctx = useContext(StorefrontContext);
  if (!ctx) {
    throw new Error('useStorefront must be used within a StorefrontProvider');
  }
  return ctx;
}
