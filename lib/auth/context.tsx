'use client';

import { createContext, useContext, useEffect, useState, useCallback, useMemo, startTransition, type ReactNode } from 'react';
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

export function AuthProvider({
  children,
  initialUser = null,
  initialProfile = null,
}: {
  children: ReactNode;
  initialUser?: User | null;
  initialProfile?: { id: string; email: string | null; full_name: string | null } | null;
}) {
  const [user, setUser] = useState<User | null>(initialUser);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(
    // Prefer the SSR-fetched profile; fall back to constructing one from
    // user_metadata so the navbar always has a name without a client fetch.
    initialProfile ??
    (initialUser
      ? {
          id: initialUser.id,
          email: initialUser.email ?? null,
          full_name:
            initialUser.user_metadata?.full_name ??
            initialUser.user_metadata?.name ??
            null,
        }
      : null)
  );
  const [loyalty, setLoyalty] = useState<LoyaltyInfo | null>(null);
  // If we already have the user from SSR, skip the loading state entirely.
  const [loading, setLoading] = useState(initialUser === null);
  const supabase = useMemo(() => createClient(), []);

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

    // IMPORTANT: onAuthStateChange callbacks run inside Supabase's exclusive
    // Web Lock context.  Any `await` on supabase.from(...) inside this
    // callback will deadlock because PostgREST queries internally call
    // getSession() which tries to acquire the same lock.
    //
    // Therefore this callback MUST be synchronous (no await on Supabase
    // client calls).  Async data fetching is handled by the separate
    // useEffect below that watches the `user` state.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, currentSession: Session | null) => {
        if (cancelled) return;
        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        // INITIAL_SESSION is the first event fired — marks auth as ready
        if (event === 'INITIAL_SESSION') {
          setLoading(false);
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

    // Safety fallback: if INITIAL_SESSION never fires, stop blocking the UI
    const timeout = setTimeout(() => {
      if (!cancelled) setLoading(false);
    }, 5000);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
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
