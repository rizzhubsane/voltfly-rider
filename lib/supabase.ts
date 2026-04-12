import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import { Database } from './types';

// Platform-aware storage adapter
// - Native (iOS/Android): uses expo-secure-store for encrypted token storage
// - Web/SSR: falls back to localStorage (or no-op in SSR)
const createStorageAdapter = () => {
  if (Platform.OS !== 'web') {
    // Native — use secure store
    const SecureStore = require('expo-secure-store');
    return {
      getItem: (key: string) => SecureStore.getItemAsync(key),
      setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
      removeItem: (key: string) => SecureStore.deleteItemAsync(key),
    };
  }

  // Web — use localStorage if available (SSR-safe)
  if (typeof window !== 'undefined' && window.localStorage) {
    return {
      getItem: (key: string) => Promise.resolve(window.localStorage.getItem(key)),
      setItem: (key: string, value: string) => {
        window.localStorage.setItem(key, value);
        return Promise.resolve();
      },
      removeItem: (key: string) => {
        window.localStorage.removeItem(key);
        return Promise.resolve();
      },
    };
  }

  // SSR fallback — no-op
  return {
    getItem: (_key: string) => Promise.resolve(null),
    setItem: (_key: string, _value: string) => Promise.resolve(),
    removeItem: (_key: string) => Promise.resolve(),
  };
};

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const missingEnvVars: string[] = [];
if (!supabaseUrl) missingEnvVars.push('EXPO_PUBLIC_SUPABASE_URL');
if (!supabaseAnonKey) missingEnvVars.push('EXPO_PUBLIC_SUPABASE_ANON_KEY');

if (missingEnvVars.length > 0) {
  throw new Error(
    `[voltfly-rider] Missing required Supabase env vars: ${missingEnvVars.join(', ')}`
  );
}

// At this point we know both env vars are present, but TypeScript doesn't narrow
// `process.env` values automatically.
const supabaseUrlSafe = supabaseUrl as string;
const supabaseAnonKeySafe = supabaseAnonKey as string;

export const supabase = createClient<Database>(supabaseUrlSafe, supabaseAnonKeySafe, {
  auth: {
    storage: createStorageAdapter(),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
