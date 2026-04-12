import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';

export interface KYCData {
  // From riders table (step1)
  name: string | null;
  phone_2: string | null;
  // From kyc table (step2+)
  aadhaar_number: string | null;
  pan_number: string | null;
  aadhaar_front_url: string | null;
  aadhaar_back_url: string | null;
  pan_url: string | null;
  pcc_url: string | null;
  photo_url: string | null;
  address_local: string | null;
  address_village: string | null;
  ref1_name: string | null;
  ref1_phone: string | null;
  ref2_name: string | null;
  ref2_phone: string | null;
  ref3_name: string | null;
  ref3_phone: string | null;
  kyc_status: string | null;
}

const EMPTY_KYC: KYCData = {
  name: null, phone_2: null,
  aadhaar_number: null, pan_number: null,
  aadhaar_front_url: null, aadhaar_back_url: null,
  pan_url: null, pcc_url: null, photo_url: null,
  address_local: null, address_village: null,
  ref1_name: null, ref1_phone: null,
  ref2_name: null, ref2_phone: null,
  ref3_name: null, ref3_phone: null,
  kyc_status: null,
};

/**
 * Centralized hook for fetching KYC + rider data.
 * Consolidates the duplicated Supabase queries from step1/step2/step3.
 */
export function useKYC() {
  const { user } = useAuth();
  const [data, setData] = useState<KYCData>(EMPTY_KYC);
  const [loading, setLoading] = useState(true);

  const fetchKYC = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const [riderRes, kycRes] = await Promise.all([
        supabase
          .from('riders')
          .select('name, phone_2')
          .eq('id', user.id)
          .maybeSingle(),
        supabase
          .from('kyc')
          .select('aadhaar_number, pan_number, aadhaar_front_url, aadhaar_back_url, pan_url, pcc_url, photo_url, address_local, address_village, ref1_name, ref1_phone, ref2_name, ref2_phone, ref3_name, ref3_phone, kyc_status')
          .eq('rider_id', user.id)
          .maybeSingle(),
      ]);

      setData({
        name: riderRes.data?.name ?? null,
        phone_2: riderRes.data?.phone_2 ?? null,
        aadhaar_number: kycRes.data?.aadhaar_number ?? null,
        pan_number: kycRes.data?.pan_number ?? null,
        aadhaar_front_url: kycRes.data?.aadhaar_front_url ?? null,
        aadhaar_back_url: kycRes.data?.aadhaar_back_url ?? null,
        pan_url: kycRes.data?.pan_url ?? null,
        pcc_url: kycRes.data?.pcc_url ?? null,
        photo_url: kycRes.data?.photo_url ?? null,
        address_local: kycRes.data?.address_local ?? null,
        address_village: kycRes.data?.address_village ?? null,
        ref1_name: kycRes.data?.ref1_name ?? null,
        ref1_phone: kycRes.data?.ref1_phone ?? null,
        ref2_name: kycRes.data?.ref2_name ?? null,
        ref2_phone: kycRes.data?.ref2_phone ?? null,
        ref3_name: kycRes.data?.ref3_name ?? null,
        ref3_phone: kycRes.data?.ref3_phone ?? null,
        kyc_status: kycRes.data?.kyc_status ?? null,
      });
    } catch {
      // Silently fail — individual screens handle their own error states
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { fetchKYC(); }, [fetchKYC]);

  return { data, loading, refetch: fetchKYC };
}
