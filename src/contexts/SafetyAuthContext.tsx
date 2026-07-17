import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export type SafetyRole = 'admin' | 'member';

export interface SafetyProfile {
  id: string;
  email: string;
  fullName?: string;
  role: SafetyRole;
  isActive: boolean;
  createdAt: string;
}

interface SafetyAuthValue {
  session: Session | null;
  user: User | null;
  profile: SafetyProfile | null;
  loading: boolean;
  profileError: string | null;
  isAdmin: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const SafetyAuthContext = createContext<SafetyAuthValue | null>(null);

function mapProfile(row: Record<string, unknown>): SafetyProfile {
  return {
    id: String(row.id),
    email: String(row.email ?? ''),
    fullName: row.full_name ? String(row.full_name) : undefined,
    role: row.role === 'admin' ? 'admin' : 'member',
    isActive: Boolean(row.is_active),
    createdAt: String(row.created_at),
  };
}

export function SafetyAuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<SafetyProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);

  const loadProfile = async (userId?: string) => {
    const id = userId ?? session?.user.id;
    if (!id) {
      setProfile(null);
      setProfileError(null);
      return;
    }
    const { data, error } = await supabase.from('profiles').select('*').eq('id', id).single();
    if (error) {
      setProfile(null);
      setProfileError(
        error.code === '42P01'
          ? 'מסד הנתונים טרם הוגדר. יש להריץ את קובץ ההתקנה של Supabase.'
          : error.message,
      );
      return;
    }
    setProfile(mapProfile(data));
    setProfileError(null);
  };

  useEffect(() => {
    let mounted = true;
    void supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      if (data.session) await loadProfile(data.session.user.id);
      if (mounted) setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return;
      setSession(nextSession);
      if (!nextSession) {
        setProfile(null);
        setProfileError(null);
        setLoading(false);
      } else {
        window.setTimeout(() => {
          void loadProfile(nextSession.user.id).finally(() => mounted && setLoading(false));
        }, 0);
      }
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
    // Session changes are handled by the Supabase listener.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo<SafetyAuthValue>(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      loading,
      profileError,
      isAdmin: profile?.role === 'admin' && profile.isActive,
      refreshProfile: () => loadProfile(),
      signOut: async () => {
        await supabase.auth.signOut();
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [session, profile, loading, profileError],
  );

  return <SafetyAuthContext.Provider value={value}>{children}</SafetyAuthContext.Provider>;
}

export function useSafetyAuth(): SafetyAuthValue {
  const value = useContext(SafetyAuthContext);
  if (!value) throw new Error('useSafetyAuth must be used inside SafetyAuthProvider');
  return value;
}
