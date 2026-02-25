import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, Profile } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
  signUp: (email: string, password: string, metadata: { first_name: string; last_name: string }) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  updatePassword: (password: string) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Fallback for components rendered outside AuthProvider (e.g. storefront)
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
      console.error('Error fetching profile:', error);
      return null;
    }

    return data;
  };

  useEffect(() => {
    let initialSessionHandled = false;
    let mounted = true;
    let profileFetched = false; // Prevent duplicate profile fetches

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        console.log('[Auth] onAuthStateChange:', event, currentSession?.user?.id ?? 'no user');
        console.log('[Auth] Session:', currentSession ? 'exists' : 'null');

        if (!mounted) return;
        initialSessionHandled = true;

        // Only fetch profile on SIGNED_IN or INITIAL_SESSION, NOT on TOKEN_REFRESHED
        const shouldFetchProfile = (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && !profileFetched;

        // Protect against spurious SIGNED_OUT from failed token refresh (429)
        if (event === 'SIGNED_OUT' && !currentSession) {
          const storedSession = localStorage.getItem('ventou-auth-token');
          if (storedSession) {
            console.log('[Auth] SIGNED_OUT fired but storage still has token — ignoring');
            // Don't clear state, don't logout — the token may still be valid
            return;
          }
          // Genuine logout
          console.log('[Auth] Genuine logout');
          setSession(null);
          setUser(null);
          setProfile(null);
          profileFetched = false;
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
              if (mounted) {
                console.log('[Auth] Profile:', profileData);
                setProfile(profileData);
              }
            } catch (e) {
              // NEVER logout on profile error
              console.error('[Auth] Profile fetch failed (non-fatal):', e);
              if (mounted) setProfile(null);
            }
          }, 0);
        }

        setIsLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      console.log('[Auth] getSession:', initialSession?.user?.id ?? 'no session');

      if (!mounted) return;
      if (!initialSessionHandled) {
        setSession(initialSession);
        setUser(initialSession?.user ?? null);

        if (initialSession?.user && !profileFetched) {
          profileFetched = true;
          fetchProfile(initialSession.user.id)
            .then((p) => { if (mounted) setProfile(p); })
            .catch((e) => {
              console.error('[Auth] Profile fetch failed (non-fatal):', e);
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

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    return { error: error as Error | null };
  };

  const updatePassword = async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    return { error: error as Error | null };
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        isLoading,
        signUp,
        signIn,
        signOut,
        resetPassword,
        updatePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    // Graceful fallback instead of crash — allows storefront/public pages to render
    console.warn('useAuth called outside AuthProvider — returning fallback');
    return AUTH_FALLBACK;
  }
  return context;
}
