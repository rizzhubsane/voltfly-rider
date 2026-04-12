import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { PhoneAuthProvider, signInWithCredential } from 'firebase/auth';
import { auth } from '@/lib/init-firebase';
import { Platform } from 'react-native';
import { FirebaseRecaptcha, FirebaseRecaptchaRef } from '@/components/FirebaseRecaptcha';

const OTP_SEND_TIMEOUT = 20000; // 20 seconds

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signIn: (phone: string) => Promise<{ error: Error | null }>;
  verifyOtp: (
    phone: string,
    token: string
  ) => Promise<{
    error: Error | null;
    session: Session | null;
    accessToken: string | null;
    rider: { id: string; status: string | null; hub_id: string | null } | null;
  }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  signIn: async () => ({ error: null }),
  verifyOtp: async () => ({ error: null, session: null, accessToken: null, rider: null }),
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // References for Firebase Recaptcha flow
  const recaptchaRef = useRef<FirebaseRecaptchaRef>(null);
  const verificationIdRef = useRef<string | null>(null);
  const signInResolver = useRef<((value: { error: Error | null }) => void) | null>(null);

  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

  useEffect(() => {
    // Get initial Supabase session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Listen for Supabase auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  /**
   * Step 1: Send OTP via Firebase Phone Auth using invisible WebView Recaptcha
   */
  const signIn = async (phone: string): Promise<{ error: Error | null }> => {
    try {
      const formattedPhone = phone.startsWith('+') ? phone : `+91${phone.replace(/^91/, '')}`;
      console.log('[useAuth] Bypassing OTP, sending direct to security key for:', formattedPhone);
      
      // MOCK FIREBASE OTP SEND
      verificationIdRef.current = 'dummy_bypass';
      return { error: null };
      
      /*
      return new Promise((resolve) => {
        // Timeout to prevent hanging forever
        const timeoutId = setTimeout(() => {
          console.error('[useAuth] OTP send timed out after', OTP_SEND_TIMEOUT, 'ms');
          if (signInResolver.current) {
            signInResolver.current({ error: new Error('OTP request timed out. Please check your connection and try again.') });
            signInResolver.current = null;
          }
        }, OTP_SEND_TIMEOUT);

        signInResolver.current = (value) => {
          clearTimeout(timeoutId);
          resolve(value);
        };

        recaptchaRef.current?.sendOtp(formattedPhone);
      });
      */
    } catch (err: any) {
      console.error('[useAuth] signIn error:', err);
      return { error: new Error(err.message || 'Failed to send OTP') };
    }
  };

  /**
   * Step 2: Verify OTP via Firebase JS SDK, then exchange ID token for Supabase session
   */
  const verifyOtp = async (_phone: string, token: string) => {
    try {
      if (!verificationIdRef.current) {
        return {
          error: new Error('No OTP request in progress. Please request a new code.'),
          session: null,
          accessToken: null,
          rider: null,
        };
      }

      if (token !== '123456') {
         return { error: new Error('Invalid security key. Please use the provided password.'), session: null, accessToken: null, rider: null };
      }

      console.log('[useAuth] Exchanging security key for Supabase session...');
      const formattedPhone = _phone.startsWith('+') ? _phone : `+91${_phone.replace(/^91/, '')}`;

      /*
      // 1. Verify OTP with Firebase
      console.log('[useAuth] Verifying OTP with ID:', verificationIdRef.current);
      let userCredential;

      if (Platform.OS === 'web' && typeof window !== 'undefined' && (window as any).firebaseConfirmationResult) {
        // Use Web SDK's preferred method for OTP confirmation
        console.log('[useAuth] Using web confirmationResult.confirm()');
        userCredential = await (window as any).firebaseConfirmationResult.confirm(token);
        (window as any).firebaseConfirmationResult = null; // cleanup
      } else {
        // Use Native fallback or standard credential approach
        const credential = PhoneAuthProvider.credential(verificationIdRef.current, token);
        userCredential = await signInWithCredential(auth, credential);
      }

      // 2. Get Firebase ID token
      const idToken = await userCredential.user.getIdToken();
      console.log('[useAuth] Got Firebase ID token, exchanging for Supabase session...');
      */
      
      const idToken = token;

      // 3. Exchange ID token for Supabase session
      const res = await fetch(`${supabaseUrl}/functions/v1/firebase-verify-token-v2`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({ idToken, phone_number: formattedPhone }),
      });

      const data = await res.json();
      console.log('[useAuth] Firebase verify response:', { ok: res.ok, success: data.success, hasRider: !!data.rider });

      if (!res.ok || !data.success) {
        return {
          error: new Error(data.error || 'Failed to create session'),
          session: null,
          accessToken: null,
          rider: null,
        };
      }

      // 4. Set Supabase session
      const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      });

      if (sessionError) {
        return { error: sessionError, session: null, accessToken: null, rider: null };
      }

      // CRITICAL DIAGNOSTIC: Compare IDs
      const sessionUserId = sessionData.session?.user.id;
      const returnedRiderId = data.rider?.id;
      console.log(`[useAuth] ID COMPARISON: SessionUser=${sessionUserId} | RiderResult=${returnedRiderId}`);
      if (sessionUserId && returnedRiderId && sessionUserId !== returnedRiderId) {
        console.warn(`[useAuth] ID MISMATCH DETECTED! The app is logged in as ${sessionUserId} but the backend created rider ${returnedRiderId}. This will cause count=0 errors.`);
      }

      // Cleanup
      verificationIdRef.current = null;
      await auth.signOut();

      console.log('[useAuth] Authentication complete, rider status:', data.rider?.status);

      return {
        error: null,
        session: sessionData.session,
        accessToken: sessionData.session?.access_token ?? data.session.access_token ?? null,
        rider: data.rider ?? null,
      };
    } catch (err: any) {
      console.error('[useAuth] verifyOtp error:', err.code, err.message);
      const message =
        err.code === 'auth/invalid-verification-code'
          ? 'Invalid OTP. Please check and try again.'
          : err.code === 'auth/session-expired'
          ? 'OTP has expired. Please request a new code.'
          : err.code === 'auth/code-expired'
          ? 'OTP has expired. Please request a new code.'
          : err.message || 'OTP verification failed';
      return { error: new Error(message), session: null, accessToken: null, rider: null };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('[useAuth] Supabase sign out error (likely expired/deleted):', e);
      if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
        // Clear all supabase auth keys as fallback
        Object.keys(localStorage)
          .filter(k => k.startsWith('sb-'))
          .forEach(k => localStorage.removeItem(k));
      }
    }

    // Explicitly clear session immediately — don't wait for onAuthStateChange
    setSession(null);

    try {
      if (auth.currentUser) {
        await auth.signOut();
      }
    } catch (e) {
      console.warn('[useAuth] Firebase sign out error:', e);
    }
  };

  const handleRecaptchaSuccess = (verificationId: string) => {
    console.log('[useAuth] Recaptcha success, verificationId:', verificationId);
    verificationIdRef.current = verificationId;
    if (signInResolver.current) {
      signInResolver.current({ error: null });
      signInResolver.current = null;
    }
  };

  const handleRecaptchaError = (error: string) => {
    console.error('[useAuth] Recaptcha error:', error);
    const message = 
      error.includes('auth/too-many-requests')
        ? 'Too many attempts. Please try again later.'
        : error.includes('auth/invalid-phone-number')
        ? 'Invalid phone number format.'
        : error.includes('auth/network-request-failed')
        ? 'Network error. Please check your connection.'
        : error;

    if (signInResolver.current) {
      signInResolver.current({ error: new Error(message) });
      signInResolver.current = null;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        loading,
        signIn,
        verifyOtp,
        signOut,
      }}
    >
      {children}
      <FirebaseRecaptcha 
        ref={recaptchaRef}
        onSuccess={handleRecaptchaSuccess}
        onError={handleRecaptchaError}
      />
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
