import { useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  Alert, ActivityIndicator, Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter, Href } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { processPayment } from '@/lib/razorpay';
import { Colors, Font, Type, Shadow, Radius, ButtonPrimary } from '@/lib/theme';
import { LinearGradient } from 'expo-linear-gradient';

// ─── Payment Breakdown ───────────────────────────────────────────────────────
// The ₹3,800 onboarding payment is structured as:
//   ₹2,000  – Refundable security deposit (stored in security_deposits)
//   ₹   10  – Handling & operations charge (non-refundable)
//   ₹  180  – Verification cost (non-refundable)
//   ₹1,610  – First week's rent pre-deposit (recorded as paid weekly payment)

const SECURITY_DEPOSIT   = 2000;  // stored in security_deposits table
const HANDLING_FEE       =   10;  // non-refundable
const VERIFICATION_FEE   =  180;  // non-refundable
const FIRST_WEEK_RENT    = 1610;  // recorded as first payment
const ONBOARDING_FEE     = HANDLING_FEE + VERIFICATION_FEE; // 190 — non-refundable fees
const TOTAL_AMOUNT       = SECURITY_DEPOSIT + ONBOARDING_FEE + FIRST_WEEK_RENT; // 3800

const BREAKDOWN: { label: string; amount: number; note?: string; icon: any; color: string }[] = [
  { icon: 'shield-checkmark', label: 'Security Deposit',      amount: SECURITY_DEPOSIT, note: '100% refundable on exit',     color: Colors.primary   },
  { icon: 'settings',         label: 'Handling & Operations', amount: HANDLING_FEE,     note: 'One-time, non-refundable',    color: '#8B5CF6'         },
  { icon: 'document-text',    label: 'Verification Cost',     amount: VERIFICATION_FEE, note: 'KYC & onboarding, non-refundable', color: Colors.warning },
  { icon: 'bicycle',          label: 'First Week Rent',       amount: FIRST_WEEK_RENT,  note: 'Pre-deposits applied to Week 1',  color: Colors.success },
];

/** Cross-platform alert */
function showError(setError: (msg: string) => void, title: string, message: string) {
  if (Platform.OS === 'web') {
    setError(`${title}: ${message}`);
  } else {
    Alert.alert(title, message);
  }
}

export default function DepositScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [paying, setPaying]   = useState(false);
  const [error, setError]     = useState('');
  const [expanded, setExpanded] = useState(false);

  const handlePay = async () => {
    if (!user?.id) return;
    setPaying(true);
    setError('');

    const { data: { session: currentSession }, error: authErr } = await supabase.auth.getSession();
    if (authErr || !currentSession) {
      setPaying(false);
      showError(setError, 'Session Expired', 'Please log in again to continue.');
      router.replace('/(auth)/phone' as Href);
      return;
    }

    try {
      // ── 1. Collect ₹3,800 via Razorpay ────────────────────────────────
      const result = await processPayment(TOTAL_AMOUNT, {
        receipt:     `onboarding_${user.id}_${Date.now()}`,
        description: 'Voltfly Onboarding Payment',
        notes: {
          type:     'onboarding',
          rider_id: user.id,
          breakdown: `deposit:${SECURITY_DEPOSIT},handling:${HANDLING_FEE},verification:${VERIFICATION_FEE},rent:${FIRST_WEEK_RENT}`,
        },
        prefill: { contact: (user as any).phone || (user as any).user_metadata?.phone || '' },
      });

      // ── 2. Record payment server-side via Edge Function ───────────────
      // Security Tunnel: Authorization = anon key (bypasses Kong),
      //                  X-Rider-JWT  = real user JWT (verified server-side).
      const { data: { session: refreshedSession } } = await supabase.auth.getSession();
      if (!refreshedSession?.access_token) {
        throw new Error('Session expired. Please log in again.');
      }

      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
      const anonKey     = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

      const fnRes = await fetch(`${supabaseUrl}/functions/v1/record-deposit`, {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${anonKey}`,
          'apikey':         anonKey,
          'X-Rider-JWT':   refreshedSession.access_token,
        },
        body: JSON.stringify({
          razorpay_payment_id:     result.razorpay_payment_id,
          security_deposit_amount: SECURITY_DEPOSIT,
          onboarding_fee_amount:   ONBOARDING_FEE,
          weekly_rent_amount:      FIRST_WEEK_RENT,
        }),
      });
      // Only block the rider on hard failures (4xx / 5xx).
      // 207 Multi-Status = partial success — rider is still activated, continue.
      if (fnRes.status >= 400) {
        let errMsg = `Server error (${fnRes.status})`;
        try { errMsg = (await fnRes.json()).error ?? errMsg; } catch { /* ignore */ }
        throw new Error(errMsg);
      }

      // Log any partial errors for debugging — do NOT block navigation.
      try {
        const fnData = await fnRes.json();
        if (fnData?.errors?.length) {
          console.warn('[deposit] record-deposit partial errors:', fnData.errors);
        }
      } catch { /* empty body or already consumed */ }

      // ── 3. Navigate forward ───────────────────────────────────────────────

      router.replace('/(auth)/hub-select' as Href);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Please try again.';
      if (message !== 'PAYMENT_CANCELLED') {
        showError(setError, 'Payment Failed', message);
      }
    } finally {
      setPaying(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 48 }}>

        {/* Back */}
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: Colors.white, alignItems: 'center', justifyContent: 'center', marginBottom: 24, ...Shadow.sm }}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={20} color={Colors.text} />
        </TouchableOpacity>

        {/* Header */}
        <Text style={{ ...Type.h2, marginBottom: 4 }}>Onboarding Payment</Text>
        <Text style={{ ...Type.body, color: Colors.textMuted, marginBottom: 28 }}>
          One-time payment to activate your Voltfly account
        </Text>

        {/* Error banner */}
        {error ? (
          <View style={{
            flexDirection: 'row', alignItems: 'center',
            backgroundColor: Colors.dangerBg, borderRadius: Radius.md,
            padding: 12, marginBottom: 16,
          }}>
            <Ionicons name="alert-circle" size={18} color={Colors.danger} style={{ marginRight: 8 }} />
            <Text style={{ fontFamily: Font.regular, fontSize: 13, color: Colors.danger, flex: 1 }}>
              {error}
            </Text>
            <TouchableOpacity onPress={() => setError('')}>
              <Ionicons name="close-circle" size={18} color={Colors.danger} />
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Total amount card */}
        <LinearGradient
          colors={[Colors.primaryDark, Colors.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ borderRadius: Radius.xl, padding: 24, marginBottom: 20, ...Shadow.lg }}
        >
          <Text style={{ fontFamily: Font.medium, fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 2 }}>
            Total Onboarding Payment
          </Text>
          <Text style={{ fontFamily: Font.bold, fontSize: 46, color: Colors.white, letterSpacing: -1, marginBottom: 8 }}>
            ₹{TOTAL_AMOUNT.toLocaleString()}
          </Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{
              backgroundColor: 'rgba(255,255,255,0.2)',
              paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6,
            }}>
              <Text style={{ fontFamily: Font.medium, fontSize: 11, color: Colors.white }}>
                ₹2,000 Refundable
              </Text>
            </View>
            <View style={{
              backgroundColor: 'rgba(255,255,255,0.15)',
              paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6,
            }}>
              <Text style={{ fontFamily: Font.medium, fontSize: 11, color: Colors.white }}>
                Incl. 1st Week Rent
              </Text>
            </View>
          </View>
        </LinearGradient>

        {/* Breakdown card */}
        <View style={{ backgroundColor: Colors.white, borderRadius: Radius.xl, padding: 20, ...Shadow.md, marginBottom: 16 }}>
          {/* Header row */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setExpanded(v => !v)}
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: expanded ? 16 : 0 }}
          >
            <Text style={{ ...Type.subtitle }}>Payment Breakdown</Text>
            <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={Colors.textMuted} />
          </TouchableOpacity>

          {/* Line items — always visible */}
          {BREAKDOWN.map((item, i) => (
            <View
              key={i}
              style={{
                flexDirection: 'row', alignItems: 'center',
                paddingVertical: 10,
                borderTopWidth: i === 0 && expanded ? 1 : i > 0 ? 1 : 0,
                borderTopColor: '#F1F5F9',
              }}
            >
              <View style={{
                width: 36, height: 36, borderRadius: 10,
                backgroundColor: `${item.color}15`,
                alignItems: 'center', justifyContent: 'center',
                marginRight: 12, flexShrink: 0,
              }}>
                <Ionicons name={item.icon} size={18} color={item.color} />
              </View>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={{ fontFamily: Font.medium, fontSize: 13, color: Colors.text }}>{item.label}</Text>
                {expanded && item.note ? (
                  <Text style={{ fontFamily: Font.regular, fontSize: 11, color: Colors.textMuted, marginTop: 1 }}>
                    {item.note}
                  </Text>
                ) : null}
              </View>
              <Text style={{ fontFamily: Font.bold, fontSize: 14, color: Colors.text }}>
                ₹{item.amount.toLocaleString()}
              </Text>
            </View>
          ))}

          {/* Divider + total */}
          <View style={{ height: 1, backgroundColor: '#E2E8F0', marginTop: 4, marginBottom: 12 }} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontFamily: Font.semibold, fontSize: 14, color: Colors.text }}>Total</Text>
            <Text style={{ fontFamily: Font.bold, fontSize: 18, color: Colors.primary }}>₹{TOTAL_AMOUNT.toLocaleString()}</Text>
          </View>
        </View>

        {/* Refund info box */}
        <View style={{
          flexDirection: 'row', alignItems: 'flex-start',
          backgroundColor: '#EFF6FF', borderRadius: Radius.md,
          borderLeftWidth: 3, borderLeftColor: Colors.primary,
          padding: 12, marginBottom: 16,
        }}>
          <Ionicons name="information-circle" size={18} color={Colors.primary} style={{ marginRight: 8, marginTop: 1 }} />
          <Text style={{ fontFamily: Font.regular, fontSize: 12, color: '#1E40AF', flex: 1, lineHeight: 18 }}>
            <Text style={{ fontFamily: Font.semibold }}>₹2,000</Text> is fully refundable when you exit the program. The remaining ₹1,800 covers onboarding fees and your first week's rent.
          </Text>
        </View>

        {/* Security note */}
        <View style={{
          flexDirection: 'row', alignItems: 'center',
          backgroundColor: Colors.primaryBg, borderRadius: Radius.md,
          padding: 12, marginBottom: 28,
        }}>
          <Ionicons name="lock-closed" size={15} color={Colors.primary} style={{ marginRight: 8 }} />
          <Text style={{ fontFamily: Font.regular, fontSize: 12, color: Colors.primary, flex: 1 }}>
            Payments are secured via Razorpay. Your card details are never stored.
          </Text>
        </View>

        {/* Pay button */}
        <TouchableOpacity
          style={{ ...ButtonPrimary, backgroundColor: paying ? `${Colors.primary}80` : Colors.primary }}
          onPress={handlePay}
          disabled={paying}
          activeOpacity={0.8}
        >
          {paying ? (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <ActivityIndicator size="small" color={Colors.white} style={{ marginRight: 10 }} />
              <Text style={Type.button}>Processing…</Text>
            </View>
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="card" size={20} color={Colors.white} style={{ marginRight: 8 }} />
              <Text style={Type.button}>Pay ₹{TOTAL_AMOUNT.toLocaleString()}</Text>
            </View>
          )}
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}
