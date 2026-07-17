import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { clearSafetyFileCache } from '@/lib/safety-audit-store';

export type SafetyRole = 'admin' | 'member';

export interface SafetyProfile {
  id: string;
  email: string;
  fullName?: string;
  jobTitle?: string;
  phone?: string;
  signatureDataUrl?: string;
  stampDataUrl?: string;
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
    jobTitle: row.job_title ? String(row.job_title) : undefined,
    phone: row.phone ? String(row.phone) : undefined,
    signatureDataUrl: row.signature_data_url ? String(row.signature_data_url) : undefined,
    stampDataUrl: row.stamp_data_url ? String(row.stamp_data_url) : undefined,
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
  const profileRequest = useRef(0);

  const loadProfile = async (userId?: string) => {
    const request = ++profileRequest.current;
    const id = userId ?? session?.user.id;
    if (!id) {
      setProfile(null);
      setProfileError(null);
      return;
    }
    const { data, error } = await supabase.from('profiles').select('*').eq('id', id).single();
    if (request !== profileRequest.current) return;
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
        clearSafetyFileCache();
        setProfile(null);
        setProfileError(null);
        setLoading(false);
      } else {
        window.setTimeout(() => {
          void loadProfile(nextSession.user.id).finally(() => mounted && setLoading(false));
        }, 0);
      }
    });

    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') {
        void supabase.auth.getSession().then(({ data }) => {
          if (data.session) void loadProfile(data.session.user.id);
        });
      }
    };
    document.addEventListener('visibilitychange', refreshWhenVisible);
    window.addEventListener('focus', refreshWhenVisible);

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
      document.removeEventListener('visibilitychange', refreshWhenVisible);
      window.removeEventListener('focus', refreshWhenVisible);
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
        clearSafetyFileCache();
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
