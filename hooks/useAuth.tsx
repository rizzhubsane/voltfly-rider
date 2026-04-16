import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { Platform } from 'react-native';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RiderMeta {
  id: string;
  status: string | null;
  hub_id: string | null;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  /** Check if a phone number is registered and whether a PIN has been set */
  checkPhone: (phone: string) => Promise<{
    error: Error | null;
    exists?: boolean;
    needs_pin_setup?: boolean;
    tnc_accepted?: boolean;
    status?: string;
  }>;
  /** First-time: accept TnC + set PIN → creates auth user → issues session */
  setupPin: (phone: string, pin: string) => Promise<{
    error: Error | null;
    rider: RiderMeta | null;
  }>;
  /** Returning rider: phone + PIN → verify → issues session */
  signInWithPin: (phone: string, pin: string) => Promise<{
    error: Error | null;
    locked_until?: string;
    retry_after_seconds?: number;
    attempts_remaining?: number;
    rider: RiderMeta | null;
  }>;
  signOut: () => Promise<void>;
}

// ─── Context defaults ─────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  checkPhone: async () => ({ error: null }),
  setupPin: async () => ({ error: null, rider: null }),
  signInWithPin: async () => ({ error: null, rider: null }),
  signOut: async () => {},
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`;
  return phone.startsWith('+') ? phone : `+91${phone}`;
}

async function callEdgeFunction(
  functionName: string,
  body: Record<string, unknown>,
): Promise<{ ok: boolean; data: any }> {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${functionName}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, data };
}

// ─── AuthProvider ─────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // ─── checkPhone ────────────────────────────────────────────────────────────

  const checkPhone = async (phone: string) => {
    try {
      const { ok, data } = await callEdgeFunction('check-rider-phone', {
        phone_number: normalizePhone(phone),
      });

      if (!ok) {
        return { error: new Error(data?.error || 'Failed to verify phone number') };
      }

      return {
        error: null,
        exists: data.exists as boolean,
        needs_pin_setup: data.needs_pin_setup as boolean,
        tnc_accepted: data.tnc_accepted as boolean,
        status: data.status as string | undefined,
      };
    } catch (err: any) {
      console.error('[useAuth] checkPhone error:', err);
      return { error: new Error(err.message || 'Network error. Check your connection.') };
    }
  };

  // ─── setupPin ──────────────────────────────────────────────────────────────

  const setupPin = async (phone: string, pin: string) => {
    try {
      const { ok, data } = await callEdgeFunction('setup-rider-pin', {
        phone_number: normalizePhone(phone),
        pin,
        tnc_accepted: true,
      });

      if (!ok || !data.success) {
        return { error: new Error(data?.error || 'Failed to set up access code'), rider: null };
      }

      // Set Supabase session in the client
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      });

      if (sessionError) {
        return { error: sessionError, rider: null };
      }

      return { error: null, rider: data.rider as RiderMeta };
    } catch (err: any) {
      console.error('[useAuth] setupPin error:', err);
      return { error: new Error(err.message || 'Network error. Check your connection.'), rider: null };
    }
  };

  // ─── signInWithPin ─────────────────────────────────────────────────────────

  const signInWithPin = async (phone: string, pin: string) => {
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/rider-auth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ phone_number: normalizePhone(phone), pin }),
      });

      const data = await res.json().catch(() => ({}));

      // Lockout
      if (res.status === 429) {
        return {
          error: new Error(data?.error || 'Account locked. Try again later.'),
          locked_until: data.locked_until,
          retry_after_seconds: data.retry_after_seconds,
          rider: null,
        };
      }

      // Wrong PIN — return attempts remaining
      if (res.status === 401) {
        return {
          error: new Error(data?.error || 'Incorrect access code.'),
          attempts_remaining: data.attempts_remaining,
          rider: null,
        };
      }

      if (!res.ok || !data.success) {
        return { error: new Error(data?.error || 'Authentication failed.'), rider: null };
      }

      // Set Supabase session
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      });

      if (sessionError) {
        return { error: sessionError, rider: null };
      }

      return { error: null, rider: data.rider as RiderMeta };
    } catch (err: any) {
      console.error('[useAuth] signInWithPin error:', err);
      return { error: new Error(err.message || 'Network error. Check your connection.'), rider: null };
    }
  };

  // ─── signOut ───────────────────────────────────────────────────────────────

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('[useAuth] Supabase sign out error:', e);
      if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
        Object.keys(localStorage)
          .filter(k => k.startsWith('sb-'))
          .forEach(k => localStorage.removeItem(k));
      }
    }
    setSession(null);
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        loading,
        checkPhone,
        setupPin,
        signInWithPin,
        signOut,
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
