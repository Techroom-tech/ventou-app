import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, Profile, VentouStorage } from '@/integrations/supabase/client';
import { validatePassword } from '@/lib/security';

const STORAGE_KEY = 'sb-chpplckgndznakuvcqbx-auth-token';
const TTL_REMEMBER = 72 * 60 * 60 * 1000; // 72 hours
const TTL_DEFAULT = 12 * 60 * 60 * 1000;  // 12 hours

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
  signUp: (email: string, password: string, metadata: { first_name: string; last_name: string }) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string, rememberMe?: boolean) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  updatePassword: (password: string) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_FALLBACK: AuthContextType = {
  user: null,
  session: null,
  profile: null,
  isLoading: true,
  signUp: async () => ({ error: new Error('No AuthProvider') }),
  signIn: async () => ({ error: new Error('No AuthProvider') }),
  signOut: async () => {},
  resetPassword: async () => ({ error: new Error('No AuthProvider') }),
  updatePassword: async () => ({ error: new Error('No AuthProvider') }),
};

function isSessionExpired(): boolean {
  if (typeof window === 'undefined') return false;
  const start = sessionStorage.getItem('ventou_session_start');
  if (!start) return false;
  const rememberMe = sessionStorage.getItem('ventou_remember_me') === 'true';
  const ttl = rememberMe ? TTL_REMEMBER : TTL_DEFAULT;
  return Date.now() - Number(start) > ttl;
}

function clearSessionFlags() {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem('ventou_remember_me');
  sessionStorage.removeItem('ventou_session_start');
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (error) {
      if (import.meta.env.DEV) {
        console.error('Error fetching profile:', error);
      }
      return null;
    }
    return data;
  };

  const doSignOut = async () => {
    clearSessionFlags();
    VentouStorage.removeItem(STORAGE_KEY);
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
  };

  useEffect(() => {
    let mounted = true;
    let initialSessionHandled = false;
    let profileFetched = false;

    // Check TTL on mount — if expired, sign out immediately
    if (isSessionExpired()) {
      if (import.meta.env.DEV) console.log('[Auth] Session TTL expired — signing out');
      doSignOut().then(() => { if (mounted) setIsLoading(false); });
      return () => { mounted = false; };
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        if (import.meta.env.DEV) {
          console.log('[Auth] onAuthStateChange:', event, currentSession?.user?.id ?? 'no user');
        }
        if (!mounted) return;
        initialSessionHandled = true;

        const shouldFetchProfile = (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && !profileFetched;

        // Protect against spurious SIGNED_OUT from failed token refresh (429)
        if (event === 'SIGNED_OUT' && !currentSession) {
          const storedSession = VentouStorage.getItem(STORAGE_KEY);
          if (storedSession) {
            if (import.meta.env.DEV) console.log('[Auth] SIGNED_OUT fired but storage still has token — ignoring');
            return;
          }
          // Genuine logout
          setSession(null);
          setUser(null);
          setProfile(null);
          profileFetched = false;
          clearSessionFlags();
          setIsLoading(false);
          return;
        }

        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (currentSession?.user && shouldFetchProfile) {
          profileFetched = true;
          setTimeout(async () => {
            if (!mounted) return;
            try {
              const profileData = await fetchProfile(currentSession.user.id);
              if (mounted) setProfile(profileData);
            } catch (e) {
              if (import.meta.env.DEV) {
                console.error('[Auth] Profile fetch failed (non-fatal):', e);
              }
              if (mounted) setProfile(null);
            }
          }, 0);
        }

        setIsLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      if (!mounted) return;
      if (!initialSessionHandled) {
        setSession(initialSession);
        setUser(initialSession?.user ?? null);
        if (initialSession?.user && !profileFetched) {
          profileFetched = true;
          fetchProfile(initialSession.user.id)
            .then((p) => { if (mounted) setProfile(p); })
            .catch((e) => {
              if (import.meta.env.DEV) {
                console.error('[Auth] Profile fetch failed (non-fatal):', e);
              }
              if (mounted) setProfile(null);
            });
        }
        setIsLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (
    email: string,
    password: string,
    metadata: { first_name: string; last_name: string }
  ) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
        emailRedirectTo: window.location.origin,
      },
    });
    return { error: error as Error | null };
  };

  const signIn = async (email: string, password: string, rememberMe = false) => {
    // Set storage flags BEFORE signIn so the storage adapter routes correctly
    sessionStorage.setItem('ventou_remember_me', String(rememberMe));
    sessionStorage.setItem('ventou_session_start', String(Date.now()));

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      // Clean flags on failure
      clearSessionFlags();
    }

    return { error: error as Error | null };
  };

  const signOut = async () => {
    await doSignOut();
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { error: error as Error | null };
  };

  const updatePassword = async (password: string) => {
    const validation = validatePassword(password);
    if (!validation.isValid) {
      return { error: new Error(validation.errors[0] || 'Mot de passe invalide') };
    }

    const { error } = await supabase.auth.updateUser({ password });
    return { error: error as Error | null };
  };

  return (
    <AuthContext.Provider
      value={{ user, session, profile, isLoading, signUp, signIn, signOut, resetPassword, updatePassword }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    if (import.meta.env.DEV) {
      console.warn('useAuth called outside AuthProvider — returning fallback');
    }
    return AUTH_FALLBACK;
  }
  return context;
}
