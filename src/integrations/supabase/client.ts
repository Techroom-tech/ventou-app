import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://chpplckgndznakuvcqbx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNocHBsY2tnbmR6bmFrdXZjcWJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1ODEyMTAsImV4cCI6MjA4NjE1NzIxMH0.oimHRR-gDoli9w26pif2pcurnrZQlN7mR51rBc_-gek';

// Use a consistent storage key so all *.ventou.shop origins share the same token
const STORAGE_KEY = 'ventou-auth-token';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storageKey: STORAGE_KEY,
    flowType: 'pkce',
  },
});

// Types for the database
export interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

// Available currencies for sellers
export const CURRENCIES = [
  { code: 'XOF', symbol: 'FCFA', name: 'Franc CFA (BCEAO)' },
  { code: 'XAF', symbol: 'FCFA', name: 'Franc CFA (BEAC)' },
  { code: 'GHS', symbol: '₵', name: 'Cedi ghanéen' },
  { code: 'NGN', symbol: '₦', name: 'Naira nigérian' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'USD', symbol: '$', name: 'Dollar US' },
] as const;

export type CurrencyCode = typeof CURRENCIES[number]['code'];

export const DEFAULT_CURRENCY: CurrencyCode = 'XOF';

export const formatCurrency = (amount: number, currencyCode: CurrencyCode = 'XOF'): string => {
  const currency = CURRENCIES.find(c => c.code === currencyCode);
  if (!currency) return `${amount} ${currencyCode}`;
  
  // Format with thousand separators
  const formatted = new Intl.NumberFormat('fr-FR').format(amount);
  
  // FCFA currencies go after the number
  if (currencyCode === 'XOF' || currencyCode === 'XAF') {
    return `${formatted} ${currency.symbol}`;
  }
  
  return `${currency.symbol}${formatted}`;
};
