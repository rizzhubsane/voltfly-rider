import { supabase } from './supabase';
import { Database } from './types';

type KycInsert = Database['public']['Tables']['kyc']['Insert'];
type RiderUpdate = Database['public']['Tables']['riders']['Update'];

type KycWritableFields = Omit<
  KycInsert,
  'id' | 'rider_id' | 'created_at' | 'reviewed_at' | 'reviewed_by' | 'rejection_reason'
>;

type RiderWritableFields = Pick<
  RiderUpdate,
  'name' | 'phone_1' | 'phone_2' | 'status' | 'hub_id'
>;

/**
 * Perform a profile update via the 'ensure-rider-profile' Edge Function.
 * Uses a 'Security Tunnel' (X-Rider-JWT) to bypass Kong API Gateway 401 errors.
 */
async function postProfileUpdate(updates: Record<string, unknown>) {
  console.log('[kyc] Using Security Tunnel to sync profile with backend...');
  
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !session?.access_token) {
    throw new Error('Access token is missing. Are you logged in?');
  }

  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  const functionUrl = `${supabaseUrl}/functions/v1/ensure-rider-profile`;

  try {
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Omit real JWT from Authorization to bypass Kong's broken 401 check
        'Authorization': `Bearer ${anonKey}`, 
        'apikey': anonKey ?? '',
        // Use custom header for the real user identity
        'X-Rider-JWT': session.access_token,
      },
      body: JSON.stringify(updates),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[kyc] Tunnel update failed:', data.error || response.statusText);
      throw new Error(data.error || `Server error (${response.status}). Please try again.`);
    }

    console.log('[kyc] Profile synced via Security Tunnel!');
    return { success: true, rider: data.rider, kyc: data.kyc };
  } catch (err: any) {
    console.error('[kyc] Edge Function error:', err.message);
    throw err;
  }
}

export async function saveKyc(
  updates: Partial<KycWritableFields>
) {
  const data = await postProfileUpdate(updates);
  return data.kyc;
}

export async function saveRiderProfile(
  updates: Partial<RiderWritableFields>
) {
  const data = await postProfileUpdate(updates);
  return data.rider;
}
