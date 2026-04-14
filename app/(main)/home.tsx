import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  Animated, RefreshControl, Platform, Image,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter, Href } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Colors, Font, Type, Shadow, Radius } from '@/lib/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [rider, setRider] = useState<any>(null);
  const [vehicle, setVehicle] = useState<any>(null);
  const [lastPayment, setLastPayment] = useState<any>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [notifCount, setNotifCount] = useState(0);

  // Pulse animation for overdue
  const pulseAnim = useRef(new Animated.Value(1)).current;

  /** Same logical alert (e.g. push + SMS) creates two rows — show one in previews. */
  const dedupeNotifs = (rows: { type?: string; message?: string; title?: string }[]) => {
    const seen = new Set<string>();
    return rows.filter((r) => {
      const k = `${r.type ?? ''}\0${r.message ?? ''}\0${r.title ?? ''}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  };

  const fetchData = useCallback(async () => {
    if (!user?.id) return;
    try {
      const [riderRes, vehicleRes, notifRes, paymentsRes] = await Promise.all([
        supabase
          .from('riders')
          .select('name, status, payment_status, wallet_balance, outstanding_balance, daily_deduction_rate')
          .eq('id', user.id)
          .single(),
        supabase
          .from('vehicles')
          .select('make_model, vehicle_id, new_vehicle_id, chassis_number, id_status')
          .eq('assigned_rider_id', user.id)
          .limit(1)
          .maybeSingle(),
        supabase
          .from('notifications')
          .select('id, type, title, message, created_at')
          .eq('rider_id', user.id)
          .order('created_at', { ascending: false })
          .limit(3),
        supabase
          .from('payments')
          .select('amount, plan_type, status, paid_at, due_date, created_at')
          .eq('rider_id', user.id)
          .eq('status', 'paid')
          .in('plan_type', ['daily', 'weekly', 'monthly', 'custom'])
          .order('created_at', { ascending: false })
          .limit(1),
      ]);

      if (riderRes.data) {
        const wBalance = riderRes.data.wallet_balance ?? 0;
        const rate = riderRes.data.daily_deduction_rate ?? 230;
        const isOverdue = wBalance <= 0;
        let isBlocked = riderRes.data.status === 'suspended';
        
        const payment_status = isOverdue ? 'overdue' : 'paid';
        // Approximate days remaining based on rider's particular rate
        const approximateDays = Math.max(0, Math.floor(wBalance / rate));
        
        setRider({
          ...riderRes.data,
          payment_status,
          wallet_balance: wBalance,
          approximateDays,
          isBlocked
        });
      }

      if (vehicleRes.data) {
        setVehicle(vehicleRes.data);
      }

      if (notifRes.data) {
        const merged = dedupeNotifs(notifRes.data);
        setNotifications(merged);
        const oneDayAgo = new Date(Date.now() - 86400000).toISOString();
        const unread = merged.filter((n: any) => n.created_at && n.created_at > oneDayAgo);
        setNotifCount(unread.length);
      }

      // Store latest payment info
      const latestPaid = paymentsRes.data?.[0] ?? null;
      if (latestPaid) setLastPayment(latestPaid);
    } catch (e) {
      console.error('[home] fetchData error:', e);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`home-notifications-${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `rider_id=eq.${user.id}` },
        () => fetchData(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, fetchData]);

  useEffect(() => {
    if (rider?.payment_status === 'overdue') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.03, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      ).start();
    }
  }, [rider?.payment_status]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const firstName = rider?.name?.split(' ')[0] || t('tabs.home');
  const isOverdue = rider?.payment_status === 'overdue';

  const formatDate = (d: string) => {
    try { return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }); }
    catch { return d; }
  };

  const getVehicleId = (v: any) => {
    if (!v) return '';
    return v.vehicle_id || v.new_vehicle_id || v.chassis_number?.slice(0, 10) || t('vehicle.noVehicle');
  };

  const getVehicleModel = (v: any) => {
    if (!v) return t('home.noVehicle');
    return v.make_model || t('home.smartScooter');
  };

  const hour = new Date().getHours();
  const greeting = hour < 12 ? t('home.goodMorning') : hour < 17 ? t('home.goodAfternoon') : t('home.goodEvening');

  // ── Remaining Credit Calculation ─────────────────────────────────────────
  const dailyRate = rider?.daily_deduction_rate ?? 230;
  const wBalance = rider?.wallet_balance ?? 0;


  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
      <StatusBar style="light" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        {/* Dynamic Header */}
        <LinearGradient
          colors={['#1D4ED8', '#1E40AF', '#1E3A8A']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 80, borderBottomLeftRadius: 40, borderBottomRightRadius: 40 }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Image 
                source={require('@/assets/images/logo.png')}
                style={{ width: 140, height: 42, resizeMode: 'contain', 
                         tintColor: 'white' // Assuming logo needs to be white over blue gradient
                      }}
              />
            </View>
            <TouchableOpacity
              onPress={() => router.push('/(main)/notifications' as Href)}
              style={{
                width: 46, height: 46, borderRadius: 23,
                backgroundColor: 'rgba(255,255,255,0.18)',
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Ionicons name="notifications-outline" size={24} color={Colors.white} />
              {notifCount > 0 && (
                <View style={{
                  position: 'absolute', top: 6, right: 8,
                  width: 12, height: 12, borderRadius: 6,
                  backgroundColor: '#EF4444',
                  borderWidth: 2, borderColor: '#1D4ED8',
                }} />
              )}
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* Content Area with Negative Margin for Overlap */}
        <View style={{ paddingHorizontal: 24, marginTop: -20 }}>
          
          {/* ── New Ultra-Simple Wallet Hero Card ─────────────────────── */}
          {(() => {
            const days = rider?.approximateDays ?? 0;
            const ringColor = days <= 2 ? '#EF4444' : days <= 5 ? '#F59E0B' : '#10B981';
            const ringBg = days <= 2 ? '#FEF2F2' : days <= 5 ? '#FFFBEB' : '#F0FDF4';
            const RING = 120, STROKE = 10, R = (RING - STROKE) / 2;
            const circ = 2 * Math.PI * R;
            // Progress: cap to 30 days worth as "full"
            const pct = isOverdue ? 0 : Math.min(1, days / 30);
            const segments = 30;

            return (
              <View style={{
                backgroundColor: isOverdue || rider?.isBlocked ? '#DC2626' : '#059669',
                borderRadius: 24,
                padding: 24,
                marginBottom: 28,
                shadowColor: isOverdue || rider?.isBlocked ? '#DC2626' : '#059669', 
                shadowOffset: { width: 0, height: 16 },
                shadowOpacity: 0.2, shadowRadius: 32, elevation: 12,
              }}>

                {/* Status chip */}
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 24, justifyContent: 'center' }}>
                  <View style={{
                    flexDirection: 'row', alignItems: 'center',
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    paddingHorizontal: 24, paddingVertical: 12, borderRadius: 16,
                  }}>
                    <View style={{
                      width: 12, height: 12, borderRadius: 6, marginRight: 12,
                      backgroundColor: '#FFF',
                    }} />
                    <Text style={{ fontFamily: Font.bold, fontSize: 22, textTransform: 'uppercase', color: '#FFF', letterSpacing: 1.5 }}>
                      {rider?.isBlocked ? t('home.batteryBlockedLabel', 'RESTRICTED') : isOverdue ? t('home.walletEmptyLabel', 'OVERDUE') : t('home.activeLabel', 'ACTIVE')}
                    </Text>
                  </View>
                </View>

                {isOverdue || rider?.isBlocked ? (
                  /* ── BLOCKED / OVERDUE state ── */
                  <Animated.View style={{ transform: [{ scale: pulseAnim }], alignItems: 'center', marginBottom: 24 }}>
                    <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                      <Text style={{ fontSize: 40 }}>🔒</Text>
                    </View>
                    <Text style={{ fontFamily: Font.bold, fontSize: 24, color: '#FFF', textAlign: 'center' }}>
                      {t('home.swapBlockedHeadline', 'Swaps Blocked')}
                    </Text>
                    <Text style={{ fontFamily: Font.medium, fontSize: 16, color: 'rgba(255,255,255,0.85)', marginTop: 8, textAlign: 'center', paddingHorizontal: 20 }}>
                      {t('home.addMoneyToUnlock', 'Add money to your wallet to immediately unlock battery swaps.')}
                    </Text>
                  </Animated.View>
                ) : (
                  /* ── ACTIVE state: Massive Wallet Balance ── */
                  <View style={{ alignItems: 'center', marginBottom: 28 }}>
                    <Text 
                      style={{ fontFamily: Font.bold, fontSize: 62, color: '#FFF', lineHeight: 72, letterSpacing: -2 }}
                      numberOfLines={1}
                      adjustsFontSizeToFit={true}
                    >
                      ₹{Math.abs(wBalance).toLocaleString('en-IN')}
                    </Text>
                    <Text style={{ fontFamily: Font.bold, fontSize: 14, color: 'rgba(255,255,255,0.85)', textTransform: 'uppercase', letterSpacing: 1.5, marginTop: 4 }}>
                      {t('home.yourMoneyLeft', 'Wallet Balance')}
                    </Text>
                  </View>
                )}

                {/* ── Days Left Box ── */}
                <View style={{
                  backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 16,
                  paddingVertical: 16, paddingHorizontal: 20,
                  alignItems: 'center', marginBottom: 24,
                }}>
                  <Text style={{ fontFamily: Font.bold, fontSize: 32, color: '#FFF', letterSpacing: -1 }}>
                    {days} Days
                  </Text>
                  <Text style={{ fontFamily: Font.medium, fontSize: 13, color: 'rgba(255,255,255,0.85)', marginTop: 4 }}>
                    {t('home.daysLeftLabel', 'Approximate Days Remaining')}
                  </Text>
                </View>

                {/* ── ADD MONEY Huge Button ── */}
                <TouchableOpacity
                  onPress={() => router.push('/(main)/payments' as Href)}
                  activeOpacity={0.8}
                  style={{
                    backgroundColor: '#FFF',
                    borderRadius: 20, paddingVertical: 20,
                    alignItems: 'center', marginBottom: 8,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 6,
                  }}
                >
                   <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                     <Ionicons name="add-circle" size={26} color={isOverdue || rider?.isBlocked ? '#DC2626' : '#059669'} style={{ marginRight: 10 }} />
                     <Text style={{ fontFamily: Font.bold, fontSize: 18, color: isOverdue || rider?.isBlocked ? '#DC2626' : '#059669', letterSpacing: 0.5, textTransform: 'uppercase' }}>
                       {isOverdue ? t('home.payNowBtn', 'Clear Dues') : t('home.addMoneyBtn', 'Add Money')}
                     </Text>
                   </View>
                </TouchableOpacity>
              </View>
            );
          })()}
          {/* ── End Wallet Hero Card ───────────────────────────────────── */}






        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
