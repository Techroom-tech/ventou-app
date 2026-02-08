import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://chpplckgndznakuvcqbx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNocHBsY2tnbmR6bmFrdXZjcWJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1ODEyMTAsImV4cCI6MjA4NjE1NzIxMH0.oimHRR-gDoli9w26pif2pcurnrZQlN7mR51rBc_-gek';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
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
