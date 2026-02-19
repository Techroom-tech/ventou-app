/**
 * CountryContext — V6 Smart Country/Currency System
 *
 * Supported countries with their currency zone and phone prefix.
 * XOF zone: BF, CI, SN, ML, TG, BJ, NE
 * XAF zone: CM, GA
 *
 * Detection order:
 * 1. localStorage (user explicit choice)
 * 2. navigator.language (e.g. fr-CI → CI)
 * 3. Default: CI
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
  { code: 'CI', name: "Côte d'Ivoire", flag: '🇨🇮', currency: 'XOF', phonePrefix: '+225' },
  { code: 'SN', name: 'Sénégal',        flag: '🇸🇳', currency: 'XOF', phonePrefix: '+221' },
  { code: 'BF', name: 'Burkina Faso',   flag: '🇧🇫', currency: 'XOF', phonePrefix: '+226' },
  { code: 'ML', name: 'Mali',           flag: '🇲🇱', currency: 'XOF', phonePrefix: '+223' },
  { code: 'TG', name: 'Togo',           flag: '🇹🇬', currency: 'XOF', phonePrefix: '+228' },
  { code: 'BJ', name: 'Bénin',          flag: '🇧🇯', currency: 'XOF', phonePrefix: '+229' },
  { code: 'NE', name: 'Niger',          flag: '🇳🇪', currency: 'XOF', phonePrefix: '+227' },
  { code: 'CM', name: 'Cameroun',       flag: '🇨🇲', currency: 'XAF', phonePrefix: '+237' },
  { code: 'GA', name: 'Gabon',          flag: '🇬🇦', currency: 'XAF', phonePrefix: '+241' },
];

const STORAGE_KEY = 'ventou-country';
const DEFAULT_COUNTRY_CODE = 'CI';

/** Detect country from navigator.language (e.g. "fr-CI" → "CI") */
function detectFromBrowser(): string | null {
  try {
    const lang = navigator.language || '';
    const parts = lang.split('-');
    if (parts.length >= 2) {
      const regionCode = parts[parts.length - 1].toUpperCase();
      if (COUNTRY_CONFIGS.find(c => c.code === regionCode)) return regionCode;
    }
  } catch {
    // silent
  }
  return null;
}

function resolveInitialCountry(): CountryConfig {
  // 1. localStorage
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const found = COUNTRY_CONFIGS.find(c => c.code === stored);
      if (found) return found;
    }
  } catch {
    // storage may be blocked
  }

  // 2. navigator.language
  const detected = detectFromBrowser();
  if (detected) {
    const found = COUNTRY_CONFIGS.find(c => c.code === detected);
    if (found) return found;
  }

  // 3. default
  return COUNTRY_CONFIGS.find(c => c.code === DEFAULT_COUNTRY_CODE)!;
}

interface CountryContextValue {
  country: CountryConfig;
  setCountry: (code: string) => void;
  allCountries: CountryConfig[];
}

const CountryContext = createContext<CountryContextValue | null>(null);

export function CountryProvider({ children }: { children: React.ReactNode }) {
  const [country, setCountryState] = useState<CountryConfig>(resolveInitialCountry);

  const setCountry = useCallback((code: string) => {
    const found = COUNTRY_CONFIGS.find(c => c.code === code);
    if (!found) return;
    setCountryState(found);
    try {
      localStorage.setItem(STORAGE_KEY, code);
    } catch {
      // storage may be blocked
    }
  }, []);

  // Re-sync on external storage changes (multi-tab)
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        const found = COUNTRY_CONFIGS.find(c => c.code === e.newValue);
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
