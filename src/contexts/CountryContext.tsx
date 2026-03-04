/**
 * CountryContext — V6 Smart Country/Currency System
 *
 * Supported countries with their currency zone and phone prefix.
 * XOF zone: BF, CI, SN, ML, TG, BJ, NE
 * XAF zone: CM, GA
 *
 * Detection order (non-blocking):
 * 1. localStorage "user_country" (never overridden once set by user)
 * 2. X-User-Country custom header (async HEAD fetch to origin, no external API)
 * 3. navigator.language (e.g. fr-BF → BF)
 * 4. Default: BF
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { CurrencyCode } from '@/integrations/supabase/client';

export interface CountryConfig {
  code: string;       // ISO 3166-1 alpha-2
  name: string;
  flag: string;
  currency: CurrencyCode;
  phonePrefix: string;
}

export const COUNTRY_CONFIGS: CountryConfig[] = [
  { code: 'BF', name: 'Burkina Faso',   flag: '🇧🇫', currency: 'XOF', phonePrefix: '+226' },
  { code: 'CI', name: "Côte d'Ivoire",  flag: '🇨🇮', currency: 'XOF', phonePrefix: '+225' },
  { code: 'SN', name: 'Sénégal',        flag: '🇸🇳', currency: 'XOF', phonePrefix: '+221' },
  { code: 'ML', name: 'Mali',           flag: '🇲🇱', currency: 'XOF', phonePrefix: '+223' },
  { code: 'TG', name: 'Togo',           flag: '🇹🇬', currency: 'XOF', phonePrefix: '+228' },
  { code: 'BJ', name: 'Bénin',          flag: '🇧🇯', currency: 'XOF', phonePrefix: '+229' },
  { code: 'NE', name: 'Niger',          flag: '🇳🇪', currency: 'XOF', phonePrefix: '+227' },
  { code: 'CM', name: 'Cameroun',       flag: '🇨🇲', currency: 'XAF', phonePrefix: '+237' },
  { code: 'GA', name: 'Gabon',          flag: '🇬🇦', currency: 'XAF', phonePrefix: '+241' },
  { code: 'FR', name: 'France',         flag: '🇫🇷', currency: 'EUR', phonePrefix: '+33' },
  { code: 'US', name: 'United States',  flag: '🇺🇸', currency: 'USD', phonePrefix: '+1' },
];

const STORAGE_KEY = 'user_country';
const DEFAULT_COUNTRY_CODE = 'BF';

/** Find a CountryConfig by code (case-insensitive). Returns undefined if not found. */
function findCountry(code: string | null | undefined): CountryConfig | undefined {
  if (!code) return undefined;
  return COUNTRY_CONFIGS.find(c => c.code === code.toUpperCase());
}

/** Detect country from navigator.language (e.g. "fr-BF" → "BF") */
function detectFromBrowser(): CountryConfig | undefined {
  try {
    const lang = navigator.language ?? '';
    const parts = lang.split('-');
    if (parts.length >= 2) {
      return findCountry(parts[parts.length - 1]);
    }
  } catch {
    // silent
  }
  return undefined;
}

/**
 * Read localStorage "user_country".
 * Returns the CountryConfig if valid, null if key exists but unknown,
 * or undefined if the key was never set (so we know we can auto-detect).
 */
function readStorage(): { config: CountryConfig; found: true } | { config: null; found: false } | undefined {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return undefined;           // key never set → auto-detect allowed
    const config = findCountry(raw);
    return config ? { config, found: true } : { config: null, found: false };
  } catch {
    return undefined;
  }
}

/** Persist country code to localStorage */
function saveStorage(code: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, code);
  } catch {
    // storage may be blocked
  }
}

/**
 * Resolve initial country synchronously (for useState initialiser).
 * Uses localStorage or navigator.language or default — no async here.
 * Header detection is done in a useEffect after mount.
 */
function resolveInitialCountry(): CountryConfig {
  const stored = readStorage();
  if (stored?.found) return stored.config;              // explicit user choice
  return detectFromBrowser() ?? findCountry(DEFAULT_COUNTRY_CODE)!;
}

/**
 * Attempt to read the X-User-Country header from a lightweight HEAD
 * request to the same origin. No external API, no CORS issues.
 * Resolves to a country code string or null.
 */
async function detectFromHeader(): Promise<string | null> {
  try {
    const res = await fetch(window.location.origin, {
      method: 'HEAD',
      cache: 'no-store',
    });
    const code = res.headers.get('X-User-Country') || res.headers.get('CF-IPCountry');
    return code ? code.toUpperCase() : null;
  } catch {
    return null;
  }
}

interface CountryContextValue {
  country: CountryConfig;
  setCountry: (code: string) => void;
  allCountries: CountryConfig[];
}

const CountryContext = createContext<CountryContextValue | null>(null);

export function CountryProvider({ children }: { children: React.ReactNode }) {
  const [country, setCountryState] = useState<CountryConfig>(resolveInitialCountry);

  /** Explicit user selection — always persists and overrides auto-detect */
  const setCountry = useCallback((code: string) => {
    const found = findCountry(code);
    if (!found) return;
    setCountryState(found);
    saveStorage(code);
  }, []);

  /**
   * On mount: if localStorage was never set, try X-User-Country header
   * asynchronously. This never blocks the initial render.
   */
  useEffect(() => {
    const stored = readStorage();
    if (stored !== undefined) return; // localStorage already has a value → skip

    detectFromHeader().then(headerCode => {
      const fromHeader = findCountry(headerCode);
      if (fromHeader) {
        // Only apply if user hasn't manually chosen since mount
        setCountryState(prev => {
          // If prev is still the auto-detected value (not a user click), apply header result
          const storedNow = readStorage();
          if (storedNow !== undefined) return prev; // user already picked something
          saveStorage(fromHeader.code);
          return fromHeader;
        });
      }
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-sync on external storage changes (multi-tab support)
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        const found = findCountry(e.newValue);
        if (found) setCountryState(found);
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  return (
    <CountryContext.Provider value={{ country, setCountry, allCountries: COUNTRY_CONFIGS }}>
      {children}
    </CountryContext.Provider>
  );
}

export function useCountry(): CountryContextValue {
  const ctx = useContext(CountryContext);
  if (!ctx) throw new Error('useCountry must be used inside <CountryProvider>');
  return ctx;
}

