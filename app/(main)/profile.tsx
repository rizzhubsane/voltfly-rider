import { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  Switch, Alert, ActivityIndicator, Platform, RefreshControl,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter, Href } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Colors, Font, Type, Shadow, Radius } from '@/lib/theme';
import { useTranslation } from 'react-i18next';
import { setLanguage, getCurrentLanguage, type SupportedLanguage } from '@/lib/i18n';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { t } = useTranslation();
  const [currentLang, setCurrentLang] = useState<SupportedLanguage>(getCurrentLanguage());
  const [rider, setRider] = useState<any>(null);
  const [kycData, setKycData] = useState<any>(null);
  const [depositData, setDepositData] = useState<any>(null);
  const [vehicle, setVehicle] = useState<any>(null);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    if (!user?.id) return;
    try {
      const [riderRes, kycRes, depositRes, vehicleRes] = await Promise.all([
        supabase
          .from('riders')
          // Fetch all available columns for profile
          .select('name, phone_1, phone_2, status, hub_id, push_notifications_enabled, wallet_balance, payment_status, created_at, daily_deduction_rate, driver_id, gig_company')
          .eq('id', user.id)
          .single(),
        supabase
          .from('kyc')
          .select('kyc_status, address_local, address_village, aadhaar_number')
          .eq('rider_id', user.id)
          .maybeSingle(),
        supabase
          .from('security_deposits')
          .select('amount_paid, status')
          .eq('rider_id', user.id)
          .maybeSingle(),
        supabase
          .from('vehicles')
          .select('vehicle_id, chassis_number, id_status')
          .eq('assigned_rider_id', user.id)
          .maybeSingle(),
      ]);

      if (riderRes.data) {
        setRider(riderRes.data);
        if (riderRes.data.hub_id) {
          const { data: hubRes } = await supabase.from('hubs').select('name').eq('id', riderRes.data.hub_id).single();
          if (hubRes) {
            setRider(r => r ? { ...r, hub: hubRes } : null);
          }
        }
        setPushEnabled(riderRes.data.push_notifications_enabled ?? false);
      }
      if (kycRes.data) setKycData(kycRes.data);
      if (depositRes.data) setDepositData(depositRes.data);
      if (vehicleRes.data) setVehicle(vehicleRes.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();

    if (!user?.id) return;

    // Realtime subscription: auto-update when admin changes KYC status
    const channel = supabase
      .channel('kyc-status-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'kyc',
          filter: `rider_id=eq.${user.id}`,
        },
        (payload) => {
          setKycData((prev: any) => ({ ...prev, ...payload.new }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
  };

  const togglePush = async (val: boolean) => {
    setPushEnabled(val);
    if (user?.id) {
      await supabase.from('riders').update({ push_notifications_enabled: val }).eq('id', user.id);
    }
  };

  const handleSignOut = async () => {
    if (Platform.OS === 'web') {
      await signOut();
      router.replace('/(auth)/phone');
      return;
    }
    Alert.alert(t('profile.signOutTitle'), t('profile.signOutMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('profile.signOut'),
        style: 'destructive',
        onPress: async () => {
          await signOut();
          router.replace('/(auth)/phone');
        },
      },
    ]);
  };



  const handleToggleLanguage = async () => {
    const newLang: SupportedLanguage = currentLang === 'en' ? 'hi' : 'en';
    await setLanguage(newLang);
    setCurrentLang(newLang);
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </SafeAreaView>
    );
  }

  const hub = rider?.hub;
  const kycStatus = kycData?.kyc_status || 'pending';
  const kycIsApproved = kycStatus === 'approved';

  // Subscription info — now based on wallet_balance
  const walletBalance = rider?.wallet_balance ?? 0;
  const dailyRate = rider?.daily_deduction_rate ?? 230;
  const isSubscriptionActive = walletBalance > 0;
  const daysLeft = isSubscriptionActive ? Math.floor(walletBalance / dailyRate) : 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
      <StatusBar style="dark" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        {/* Header */}
        <View style={{ paddingHorizontal: 24, paddingTop: 16, marginBottom: 24 }}>
          <Text style={Type.h2}>{t('profile.title')}</Text>
        </View>

        {/* Profile card */}
        <View style={{ marginHorizontal: 24, backgroundColor: Colors.white, borderRadius: Radius.xl, padding: 20, ...Shadow.md, marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{
              width: 56, height: 56, borderRadius: 16,
              backgroundColor: Colors.primaryBg,
              alignItems: 'center', justifyContent: 'center',
              marginRight: 14,
            }}>
              <Text style={{ fontSize: 26 }}>👤</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: Font.bold, fontSize: 18, color: Colors.text }}>
                {rider?.name || 'Rider'}
              </Text>
              <Text style={{ fontFamily: Font.regular, fontSize: 13, color: Colors.textMuted, marginTop: 2 }}>
                {rider?.phone_1 || '—'}
              </Text>
            </View>
            <View style={{
              backgroundColor: rider?.status === 'active' ? Colors.successBg : Colors.dangerBg,
              paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
            }}>
              <Text style={{
                fontFamily: Font.bold, fontSize: 12, textTransform: 'uppercase',
                color: rider?.status === 'active' ? Colors.successDark : Colors.danger,
              }}>
                {rider?.status || 'Unknown'}
              </Text>
            </View>
          </View>
        </View>

        {/* Wallet status removed per user request */}

        {/* Vehicle Information */}
        <View style={{ marginHorizontal: 24, marginBottom: 24 }}>
          <Text style={{ ...Type.captionMd, color: Colors.textMuted, marginBottom: 10, marginLeft: 4, textTransform: 'uppercase', letterSpacing: 1 }}>
            {t('vehicle.title', 'Vehicle Details')}
          </Text>
          <View style={{ backgroundColor: Colors.white, borderRadius: Radius.xl, overflow: 'hidden', ...Shadow.sm }}>
            {[
              { icon: 'bicycle', label: t('vehicle.evNum', 'Vehicle ID'), value: vehicle?.vehicle_id || '—' },
              { icon: 'barcode', label: t('vehicle.chassis', 'Chassis No.'), value: vehicle?.chassis_number || '—' },
              { icon: 'id-card', label: t('vehicle.driverId', 'Driver ID'), value: rider?.driver_id || '—' },
              { icon: 'location', label: t('profile.hub'), value: hub?.name || t('profile.notAssigned') },
            ].map((item, i, arr) => (
              <View key={i} style={{
                flexDirection: 'row', alignItems: 'center',
                paddingHorizontal: 16, paddingVertical: 14,
                borderBottomWidth: i < arr.length - 1 ? 1 : 0,
                borderBottomColor: Colors.divider,
              }}>
                <Ionicons name={item.icon as any} size={18} color={Colors.primary} style={{ marginRight: 12 }} />
                <Text style={{ fontFamily: Font.regular, fontSize: 13, color: Colors.textMuted, width: 85 }}>{item.label}</Text>
                <Text style={{ fontFamily: Font.bold, fontSize: 14, color: Colors.text, flex: 1 }} numberOfLines={1}>{item.value}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Gig Company Selection */}
        <View style={{ marginHorizontal: 24, marginBottom: 24 }}>
          <Text style={{ ...Type.captionMd, color: Colors.textMuted, marginBottom: 10, marginLeft: 4, textTransform: 'uppercase', letterSpacing: 1 }}>
            {t('profile.gigCompany', 'Gig Company')}
          </Text>
          <View style={{ backgroundColor: Colors.white, borderRadius: Radius.xl, overflow: 'hidden', ...Shadow.sm }}>
            <View style={{
              flexDirection: 'row', flexWrap: 'wrap', gap: 10, padding: 16
            }}>
              {['Zomato', 'Swiggy', 'Zepto', 'Blinkit', 'Rapido', 'Uber', 'Ola', 'Other'].map((company) => (
                <TouchableOpacity
                  key={company}
                  onPress={async () => {
                    setRider(r => ({ ...r, gig_company: company }));
                    if (user?.id) {
                      await supabase.from('riders').update({ gig_company: company }).eq('id', user.id);
                    }
                  }}
                  style={{
                    backgroundColor: rider?.gig_company === company ? Colors.primary : Colors.primaryBg,
                    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20,
                  }}
                >
                  <Text style={{
                    fontFamily: Font.medium, fontSize: 14,
                    color: rider?.gig_company === company ? Colors.white : Colors.primary
                  }}>
                    {company}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Security Deposit removed per user request */}

        {/* Settings */}
        <View style={{ marginHorizontal: 24, marginBottom: 24 }}>
          <Text style={{ ...Type.captionMd, color: Colors.textMuted, marginBottom: 10, marginLeft: 4, textTransform: 'uppercase', letterSpacing: 1 }}>
            {t('profile.settingsSection')}
          </Text>
          <View style={{ backgroundColor: Colors.white, borderRadius: Radius.xl, overflow: 'hidden', ...Shadow.sm }}>
            {/* Push toggle */}
            <View style={{
              flexDirection: 'row', alignItems: 'center',
              paddingHorizontal: 16, paddingVertical: 12,
              borderBottomWidth: 1, borderBottomColor: Colors.divider,
            }}>
              <Ionicons name="notifications" size={18} color={Colors.primary} style={{ marginRight: 12 }} />
              <Text style={{ fontFamily: Font.medium, fontSize: 14, color: Colors.text, flex: 1 }}>{t('profile.pushNotifications')}</Text>
              <Switch
                value={pushEnabled}
                onValueChange={togglePush}
                trackColor={{ false: Colors.border, true: `${Colors.primary}60` }}
                thumbColor={pushEnabled ? Colors.primary : Colors.textLight}
              />
            </View>

            {/* Language Switcher */}
            <TouchableOpacity
              onPress={handleToggleLanguage}
              style={{
                flexDirection: 'row', alignItems: 'center',
                paddingHorizontal: 16, paddingVertical: 14,
                borderBottomWidth: 1, borderBottomColor: Colors.divider,
              }}
            >
              <Ionicons name="language" size={18} color={Colors.primary} style={{ marginRight: 12 }} />
              <Text style={{ fontFamily: Font.medium, fontSize: 14, color: Colors.text, flex: 1 }}>
                {t('profile.language')} / भाषा
              </Text>
              <View style={{
                backgroundColor: Colors.primaryBg,
                paddingHorizontal: 12, paddingVertical: 4,
                borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 4,
              }}>
                <Text style={{ fontFamily: Font.bold, fontSize: 13, color: Colors.primary }}>
                  {currentLang === 'en' ? '🇬🇧 English' : '🇮🇳 हिन्दी'}
                </Text>
                <Ionicons name="swap-horizontal" size={14} color={Colors.primary} />
              </View>
            </TouchableOpacity>

          </View>
        </View>

        {/* Actions */}
        <View style={{ marginHorizontal: 24, gap: 10 }}>
          <TouchableOpacity
            onPress={handleSignOut}
            style={{
              backgroundColor: Colors.white, borderRadius: Radius.lg,
              padding: 16, flexDirection: 'row', alignItems: 'center',
              ...Shadow.sm,
            }}
          >
            <Ionicons name="log-out-outline" size={20} color={Colors.textMuted} style={{ marginRight: 12 }} />
            <Text style={{ fontFamily: Font.medium, fontSize: 15, color: Colors.textSecondary }}>{t('profile.signOut')}</Text>
          </TouchableOpacity>


        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
