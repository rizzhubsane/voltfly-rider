import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  Alert, ActivityIndicator, Platform, RefreshControl, TextInput
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { processPayment } from '@/lib/razorpay';
import { Colors, Font, Type, Shadow, Radius, ButtonPrimary } from '@/lib/theme';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';

const CUSTOM_DAILY_RATE = 230;
const PRICING = { daily: 230, weekly: 1610, monthly: 6900 };

export default function PaymentsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useTranslation();
  
  const [selectedPlanId, setSelectedPlanId] = useState('weekly');
  const [customDays, setCustomDays] = useState('2');
  
  const [paying, setPaying] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [validUntil, setValidUntil] = useState<string | null>(null);
  const [depositInfo, setDepositInfo] = useState<any>(null);
  const [outstandingBalance, setOutstandingBalance] = useState(0);
  const [riderDailyRate, setRiderDailyRate] = useState(230);

  const PREDEFINED_PLANS = [
    { id: 'daily', label: t('payments.daily'), amount: PRICING.daily, desc: t('payments.daily_desc'), days: 1 },
    { id: 'weekly', label: t('payments.weekly'), amount: PRICING.weekly, desc: t('payments.weekly_desc'), badge: t('payments.popular'), days: 7 },
    { id: 'monthly', label: t('payments.monthly'), amount: PRICING.monthly, desc: t('payments.monthly_desc'), badge: t('payments.bestValue'), days: 30 },
  ];

  const fetchData = async () => {
    if (!user?.id) return;
    try {
      const [paymentsRes, riderRes, depositRes] = await Promise.all([
        supabase
          .from('payments')
          .select('id, created_at, plan_type, amount, method, status, paid_at, due_date')
          .eq('rider_id', user.id)
          .order('created_at', { ascending: false })
          .limit(20),
        supabase
          .from('riders')
          .select('wallet_balance, outstanding_balance, daily_deduction_rate')
          .eq('id', user.id)
          .single(),
        supabase
          .from('security_deposits')
          .select('amount_paid, status, created_at')
          .eq('rider_id', user.id)
          .maybeSingle(),
      ]);

      if (paymentsRes.data) setHistory(paymentsRes.data);
      
      if (riderRes.data) {
        // Source of truth is now wallet_balance
        const wBalance = riderRes.data.wallet_balance ?? 0;
        // If balance is < 0, it means they have outstanding debt.
        if (wBalance < 0) {
          setOutstandingBalance(Math.abs(wBalance));
        } else {
          setOutstandingBalance(0);
        }
        // Save raw balance for UI
        setValidUntil(wBalance.toString());
        setRiderDailyRate(riderRes.data.daily_deduction_rate ?? 230);
      }
      
      if (depositRes.data) setDepositInfo(depositRes.data);
    } catch (e) {
      console.error('[payments] fetchData error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchData(); }, [user?.id]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
  };

  const getActivePaymentConfig = () => {
    if (selectedPlanId === 'custom') {
      const days = parseInt(customDays) || 1;
      return {
        id: `custom_${days}`,
        label: `${days} ${t('payments.daysCustom')}`,
        amount: days * CUSTOM_DAILY_RATE,
        days: days,
      };
    }
    return PREDEFINED_PLANS.find(p => p.id === selectedPlanId) || PREDEFINED_PLANS[1];
  };

  const handlePay = async () => {
    if (!user?.id) return;
    const plan = getActivePaymentConfig();
    
    if (plan.days < 1) {
      Alert.alert(t('payments.invalidDuration'), t('payments.enterValidDays'));
      return;
    }

    setPaying(true);

    const { data: { session: currentSession }, error: authErr } = await supabase.auth.getSession();
    if (authErr || !currentSession) {
      setPaying(false);
      Alert.alert(t('payments.sessionExpired'), t('payments.loginAgain'));
      router.replace('/(auth)/phone' as any);
      return;
    }

    try {
      const now = new Date();

      const { data: riderData } = await supabase
        .from('riders')
        .select('wallet_balance')
        .eq('id', user.id)
        .single();

      const currentWallet = riderData?.wallet_balance ?? 0;
      const totalAmountPaid = plan.amount + outstandingBalance;
      const newWalletBalance = currentWallet + totalAmountPaid;

      const result = await processPayment(totalAmountPaid, {
        receipt: `plan_${plan.id}_${user.id}_${Date.now()}`,
        description: outstandingBalance > 0 
          ? `Voltfly Top-Up + ₹${outstandingBalance} Outstanding Clearance`
          : `Voltfly Top-Up`,
        notes: { type: 'top_up', plan: plan.id, days: plan.days.toString(), rider_id: user.id },
        prefill: { contact: (user as any).phone || '' },
      });

      // Insert generic payment record
      await supabase.from('payments').insert({
        rider_id: user.id,
        plan_type: plan.id.startsWith('custom') ? 'custom' : plan.id,
        amount: plan.amount,
        razorpay_payment_id: result !== 'web_simulated' ? (result as any).razorpay_payment_id : null,
        method: 'razorpay_online',
        status: 'paid',
        paid_at: now.toISOString(),
      });

      if (outstandingBalance > 0) {
        // Log the clearance portion separately if needed
        await supabase.from('payments').insert({
          rider_id: user.id,
          plan_type: 'outstanding_clearance',
          amount: outstandingBalance,
          method: 'razorpay_online',
          status: 'paid',
          paid_at: now.toISOString(),
        });
      }

      const newRate = (totalAmountPaid === 1610 || totalAmountPaid === 6900) ? 230 : 230;
      await supabase.from('riders').update({
        wallet_balance: newWalletBalance,
        payment_status: 'paid', // optional fallback
        outstanding_balance: 0, // deprecating this
        daily_deduction_rate: newRate,
      }).eq('id', user.id);

      setOutstandingBalance(0);

      let unblockMessage = '';
      const { data: batteryData } = await supabase
        .from('batteries')
        .select('driver_id, status')
        .eq('current_rider_id', user.id)
        .limit(1)
        .maybeSingle();

      if (batteryData?.status === 'blocked') {
        try {
          const { error: fnError } = await supabase.functions.invoke('battery-unblock', {
            body: {
              driverId: batteryData.driver_id,
              riderId: user.id,
              triggerType: 'auto_payment',
              reason: 'Payment successful — auto-unblocked',
              triggeredBy: null,
            },
          });
          if (!fnError) {
            await supabase
              .from('riders')
              .update({ status: 'active' })
              .eq('id', user.id);
          }
          unblockMessage = fnError ? `\n\n${t('payments.contactSupport')}` : `\n\n${t('payments.batteryUnblocked')}`;
        } catch {
          unblockMessage = `\n\n${t('payments.contactSupport')}`;
        }
      }

      Alert.alert(
        t('payments.success'),
        `${plan.label} ${t('payments.activated')}${unblockMessage}`
      );

      setValidUntil(newWalletBalance.toString());
      await fetchData();
    } catch (err: unknown) {
      if (err instanceof Error && err.message !== 'PAYMENT_CANCELLED') {
        Alert.alert(t('payments.failed'), err.message);
      } else if (!(err instanceof Error)) {
        Alert.alert(t('payments.failed'), t('payments.tryAgain'));
      }
    } finally {
      setPaying(false);
    }
  };

  const formatDate = useCallback((d: string) => {
    try { return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); }
    catch { return d; }
  }, []);



  const rawWalletBalance = validUntil ? parseInt(validUntil, 10) : 0;
  const isSubscriptionActive = rawWalletBalance > 0;
  const daysLeft = isSubscriptionActive ? Math.ceil(rawWalletBalance / riderDailyRate) : 0;

  // ── Remaining Credit Calculation ─────────────────────────────────────────
  const PLAN_DAYS_MAP: Record<string, number> = { daily: 1, weekly: 7, monthly: 30 };
  const latestPlan = history.find(p => ['daily','weekly','monthly','custom'].includes(p.plan_type));
  const latestPlanDays = latestPlan?.plan_type ? (PLAN_DAYS_MAP[latestPlan.plan_type] ?? 7) : 7;
  const latestDailyRate = latestPlan?.amount ? Math.round(latestPlan.amount / latestPlanDays) : riderDailyRate;
  const remainingCredit = rawWalletBalance > 0 ? rawWalletBalance : 0;
  const totalPlanValue = latestPlan?.amount ?? 0;
  const usedCredit = Math.max(0, totalPlanValue - remainingCredit);
  const creditProgressPct = totalPlanValue > 0 ? Math.min(1, usedCredit / totalPlanValue) : 0;

  const currentConfig = getActivePaymentConfig();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }} edges={['top']}>
      <StatusBar style="dark" />
      
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingTop: 16, paddingBottom: 12 }}>
          <View>
            <Text style={{ ...Type.h2 }}>{t('payments.title')}</Text>
            <Text style={{ ...Type.body, color: Colors.textMuted, marginTop: 4 }}>{t('payments.subtitle')}</Text>
          </View>
          <TouchableOpacity 
            onPress={() => router.push('/(main)/history' as any)}
            style={{ 
              backgroundColor: '#EFF6FF', paddingHorizontal: 16, paddingVertical: 10, 
              borderRadius: 14, flexDirection: 'row', alignItems: 'center'
            }}
          >
            <Ionicons name="receipt-outline" size={20} color="#1D4ED8" style={{ marginRight: 8 }} />
            <Text style={{ fontFamily: Font.bold, fontSize: 15, color: '#1D4ED8' }}>History</Text>
          </TouchableOpacity>
        </View>

        {outstandingBalance > 0 && (
          <View style={{
            marginHorizontal: 24, marginBottom: 8, marginTop: 4,
            backgroundColor: '#FEF2F2', borderRadius: 20, padding: 18,
            borderWidth: 1, borderColor: '#FECACA',
            flexDirection: 'row', alignItems: 'center',
          }}>
            <View style={{
              width: 40, height: 40, borderRadius: 12, backgroundColor: '#FEE2E2',
              alignItems: 'center', justifyContent: 'center', marginRight: 14,
            }}>
              <Ionicons name="alert-circle" size={22} color="#EF4444" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: Font.bold, fontSize: 14, color: '#991B1B' }}>
                {t('payments.outstanding')}: ₹{outstandingBalance.toLocaleString('en-IN')}
              </Text>
              <Text style={{ fontFamily: Font.regular, fontSize: 12, color: '#B91C1C', marginTop: 2 }}>
                {t('payments.addedToNext')}
              </Text>
            </View>
          </View>
        )}

        <View style={{ paddingHorizontal: 24, marginTop: 8, paddingBottom: 20 }}>
          <Text style={{ fontFamily: Font.bold, fontSize: 18, color: '#0F172A', marginBottom: 16 }}>
            {t('payments.selectPlan', 'Select Top-Up Amount')}
          </Text>

          <View style={{ gap: 12 }}>
            {PREDEFINED_PLANS.map(plan => {
              const isSelected = selectedPlanId === plan.id;
              return (
                <TouchableOpacity
                  key={plan.id}
                  onPress={() => setSelectedPlanId(plan.id)}
                  activeOpacity={0.8}
                  style={{
                    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                    backgroundColor: isSelected ? '#EFF6FF' : '#FFF',
                    borderRadius: 16, padding: 16,
                    borderWidth: 2, borderColor: isSelected ? '#3B82F6' : '#F1F5F9',
                    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    <Ionicons 
                      name={isSelected ? "radio-button-on" : "radio-button-off"} 
                      size={24} 
                      color={isSelected ? "#3B82F6" : "#CBD5E1"} 
                      style={{ marginRight: 16 }}
                    />
                    <View>
                      <Text style={{ fontFamily: Font.bold, fontSize: 16, color: '#0F172A' }}>{plan.label}</Text>
                      <Text style={{ fontFamily: Font.medium, fontSize: 13, color: '#64748B', marginTop: 2 }}>{plan.desc}</Text>
                    </View>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ fontFamily: Font.bold, fontSize: 18, color: isSelected ? '#1D4ED8' : '#0F172A' }}>₹{plan.amount}</Text>
                    {plan.badge && (
                      <View style={{ backgroundColor: isSelected ? '#1D4ED8' : '#F1F5F9', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginTop: 4 }}>
                        <Text style={{ fontFamily: Font.bold, fontSize: 10, color: isSelected ? '#FFF' : '#475569', textTransform: 'uppercase' }}>{plan.badge}</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity
              onPress={() => setSelectedPlanId('custom')}
              activeOpacity={0.8}
              style={{
                backgroundColor: selectedPlanId === 'custom' ? '#EFF6FF' : '#FFF',
                borderRadius: 16, padding: 16,
                borderWidth: 2, borderColor: selectedPlanId === 'custom' ? '#3B82F6' : '#F1F5F9',
                shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                  <Ionicons 
                    name={selectedPlanId === 'custom' ? "radio-button-on" : "radio-button-off"} 
                    size={24} 
                    color={selectedPlanId === 'custom' ? "#3B82F6" : "#CBD5E1"} 
                    style={{ marginRight: 16 }}
                  />
                  <View>
                    <Text style={{ fontFamily: Font.bold, fontSize: 16, color: '#0F172A' }}>{t('payments.customDays', 'Custom Days')}</Text>
                    <Text style={{ fontFamily: Font.medium, fontSize: 13, color: '#64748B', marginTop: 2 }}>₹{CUSTOM_DAILY_RATE} {t('payments.perDay', 'per day')}</Text>
                  </View>
                </View>
              </View>

              {selectedPlanId === 'custom' && (
                <View style={{ marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#DBEAFE' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={{ fontFamily: Font.medium, fontSize: 14, color: '#0F172A' }}>{t('payments.howManyDays', 'Enter Details')}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 12, borderWidth: 1, borderColor: '#BFDBFE', padding: 2 }}>
                      <TouchableOpacity
                        onPress={() => {
                          const val = parseInt(customDays) || 1;
                          if (val > 1) setCustomDays((val - 1).toString());
                        }}
                        style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <Ionicons name="remove" size={20} color="#0F172A" />
                      </TouchableOpacity>
                      
                      <TextInput
                        style={{ fontFamily: Font.bold, fontSize: 18, color: '#1D4ED8', width: 50, textAlign: 'center' }}
                        keyboardType="number-pad"
                        value={customDays}
                        onChangeText={(t) => setCustomDays(t.replace(/[^0-9]/g, ''))}
                        maxLength={3}
                      />

                      <TouchableOpacity
                        onPress={() => {
                          const val = parseInt(customDays) || 0;
                          setCustomDays((val + 1).toString());
                        }}
                        style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#3B82F6', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <Ionicons name="add" size={20} color="#FFF" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>


      </ScrollView>

      {/* Sticky Checkout Bar (Fixed via Flex layout) */}
      <View style={{
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1, borderTopColor: '#F1F5F9',
        paddingHorizontal: 24, paddingTop: 20, paddingBottom: Platform.OS === 'ios' ? 34 : 24,
        shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 16,
        zIndex: 100,
      }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Text style={{ fontFamily: Font.medium, fontSize: 13, color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>{t('payments.amountLabel')}</Text>
            <Text style={{ fontFamily: Font.bold, fontSize: 32, color: '#0F172A' }}>₹{(currentConfig.amount + outstandingBalance).toLocaleString('en-IN')}</Text>
            {outstandingBalance > 0 && (
              <Text style={{ fontFamily: Font.medium, fontSize: 11, color: '#EF4444', marginTop: 2 }}>
                {t('payments.addedToNext')}
              </Text>
            )}
          </View>
          
          <TouchableOpacity
            style={{ 
              backgroundColor: '#1D4ED8', paddingHorizontal: 32, paddingVertical: 18, 
              borderRadius: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
              opacity: paying ? 0.7 : 1, shadowColor: '#1D4ED8', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4
            }}
            onPress={handlePay}
            disabled={paying}
            activeOpacity={0.8}
          >
            {paying ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <>
                <Ionicons name="lock-closed" size={18} color="#FFF" style={{ marginRight: 8 }} />
                <Text style={{ fontFamily: Font.bold, fontSize: 16, color: '#FFF' }}>{t('payments.payNow')}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
