'use client';

import { createContext, useContext, useEffect, useState, useCallback, useRef, startTransition, type ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useCartStore } from '@/store/cart-store';
import type { User, Session, AuthChangeEvent } from '@supabase/supabase-js';

interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
}

interface LoyaltyInfo {
  total_points: number;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  lifetime_points: number;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loyalty: LoyaltyInfo | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  refreshLoyalty: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  profile: null,
  loyalty: null,
  loading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
  refreshLoyalty: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loyalty, setLoyalty] = useState<LoyaltyInfo | null>(null);
  const [loading, setLoading] = useState(true);
  
  const supabase = useRef(createClient()).current;

  // NOTE: Dev-mode auth clearing removed — it was wiping Supabase session
  // cookies/localStorage and breaking login.  If you need a fresh state,
  // clear cookies manually via browser DevTools → Application → Cookies.

  const refreshProfile = useCallback(async () => {
    if (!user) {
      setProfile(null);
      return;
    }

    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (data) {
      setProfile(data);
    }
  }, [user, supabase]);

  const refreshLoyalty = useCallback(async () => {
    if (!user) {
      setLoyalty(null);
      return;
    }

    const { data } = await supabase
      .from('loyalty_points')
      .select('total_points, tier, lifetime_points')
      .eq('user_id', user.id)
      .maybeSingle();

    if (data) {
      setLoyalty(data as LoyaltyInfo);
    }
  }, [user, supabase]);

  const handleSignOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setLoyalty(null);
  }, [supabase]);

  useEffect(() => {
    let cancelled = false;

    // Get initial session
    const initializeAuth = async () => {
      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        
        if (!cancelled && initialSession) {
          setSession(initialSession);
          setUser(initialSession.user);
        }
      } catch (err) {
        // AbortError from Supabase Web Locks is harmless — suppress it
        if (err instanceof DOMException && err.name === 'AbortError') return;
        console.warn('[AuthProvider] Failed to get initial session:', err);
        if (!cancelled) {
          setSession(null);
          setUser(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, currentSession: Session | null) => {
        if (cancelled) return;
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        
        if (event === 'SIGNED_IN' && currentSession?.user) {
          const authUser = currentSession.user;
          const authName = authUser.user_metadata?.full_name || authUser.user_metadata?.name || null;

          try {
            // Fetch profile and loyalty on sign in
            const [profileResult, loyaltyResult] = await Promise.all([
              supabase
                .from('profiles')
                .select('*')
                .eq('id', authUser.id)
                .maybeSingle(),
              supabase
                .from('loyalty_points')
                .select('total_points, tier, lifetime_points')
                .eq('user_id', authUser.id)
                .maybeSingle(),
            ]);

            if (cancelled) return;

            if (profileResult.data) {
              // Sync profile name from Google OAuth if it changed
              if (authName && profileResult.data.full_name !== authName) {
                await supabase
                  .from('profiles')
                  .update({ full_name: authName })
                  .eq('id', authUser.id);
                setProfile({ ...profileResult.data, full_name: authName });
              } else {
                setProfile(profileResult.data);
              }
            }
            if (loyaltyResult.data) setLoyalty(loyaltyResult.data as LoyaltyInfo);
          } catch (err) {
            if (err instanceof DOMException && err.name === 'AbortError') return;
            console.warn('[AuthProvider] Failed to fetch profile on sign-in:', err);
          }
        }

        if (event === 'SIGNED_OUT') {
          setProfile(null);
          setLoyalty(null);
          // Clear cart and checkout state on logout
          useCartStore.getState().clearCart();
          try { sessionStorage.removeItem('donut-checkout-machine'); } catch { /* SSR/private browsing */ }
        }
      }
    );

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [supabase]);

  // Fetch profile and loyalty when user changes
  useEffect(() => {
    if (user && !profile) {
      startTransition(() => {
        void refreshProfile();
        void refreshLoyalty();
      });
    }
  }, [user, profile, refreshProfile, refreshLoyalty]);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loyalty,
        loading,
        signOut: handleSignOut,
        refreshProfile,
        refreshLoyalty,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
