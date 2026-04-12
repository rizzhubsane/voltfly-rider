import { useState, useEffect, useRef } from 'react';
import { View, Text, Animated, TouchableOpacity, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Colors, Font, Type, Shadow, Radius, ButtonPrimary } from '@/lib/theme';
import { useTranslation } from 'react-i18next';

export default function WaitingScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [status, setStatus] = useState<any>(null);
  const [hub, setHub] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Pulse animation
  const pulseAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.1, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const fetchStatus = async () => {
    if (!user?.id) return;
    try {
      // Check rider
      const { data: rider } = await supabase
        .from('riders')
        .select('hub_id')
        .eq('id', user.id)
        .maybeSingle();

      if (rider?.hub_id) {
        const { data: hubData } = await supabase
          .from('hubs')
          .select('name, address')
          .eq('id', rider.hub_id)
          .maybeSingle();
        if (hubData) setHub(hubData);
      }

      // Check vehicle
      const { data: vehicleData } = await supabase
        .from('vehicles')
        .select('id, make_model, new_vehicle_id')
        .eq('assigned_rider_id', user.id)
        .limit(1);

      if (vehicleData && vehicleData.length > 0) {
        setStatus({ vehicle: { ...vehicleData[0], vehicle_id: vehicleData[0].new_vehicle_id || vehicleData[0].id.slice(0, 8) }, hub });
      }
    } catch (err) {
      console.error('Error fetching status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 15000); // Poll every 15s
    return () => clearInterval(interval);
  }, [user?.id]);

  // Waiting state
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
      <StatusBar style="dark" />
      <View style={{ flex: 1, padding: 24, justifyContent: 'center', alignItems: 'center' }}>
        {/* Pulsing vehicle icon */}
        <Animated.View style={{
          transform: [{ scale: pulseAnim }],
          width: 100, height: 100, borderRadius: 50,
          backgroundColor: Colors.primaryBg,
          alignItems: 'center', justifyContent: 'center',
          marginBottom: 28,
        }}>
          <View style={{
            width: 72, height: 72, borderRadius: 36,
            backgroundColor: Colors.primaryBg2,
            alignItems: 'center', justifyContent: 'center',
          }}>
            <Text style={{ fontSize: 36 }}>🛵</Text>
          </View>
        </Animated.View>

        {status?.vehicle ? (
          <>
            <Text style={{ ...Type.h2, textAlign: 'center', marginBottom: 8 }}>
              {t('waiting.vehicleReady')}
            </Text>
            <Text style={{ ...Type.body, color: Colors.textMuted, textAlign: 'center', lineHeight: 22, marginBottom: 36 }}>
              {t('waiting.vehicleDetail')} <Text style={{ fontFamily: Font.bold, color: Colors.text }}>{status.vehicle.vehicle_id}</Text> {t('waiting.vehicleAssigned')}
            </Text>
          </>
        ) : (
          <>
            <Text style={{ ...Type.h2, textAlign: 'center', marginBottom: 8 }}>
              {t('waiting.title')}
            </Text>
            <Text style={{ ...Type.body, color: Colors.textMuted, textAlign: 'center', lineHeight: 22, marginBottom: 36 }}>
              {t('waiting.subtitle')}
            </Text>
          </>
        )}

        {/* Status card */}
        <View style={{
          backgroundColor: Colors.white, borderRadius: Radius.xl,
          padding: 20, width: '100%', ...Shadow.md, marginBottom: 24,
        }}>
          {[
            { label: t('waiting.kycLabel'), done: true, note: t('waiting.kycStatus') },
            { label: t('waiting.depositLabel'), done: true, note: t('waiting.depositStatus') },
            { label: t('waiting.hubLabel'), done: true, note: hub?.name || '' },
            { label: t('waiting.vehicleLabel'), done: !!status?.vehicle, note: status?.vehicle ? (status.vehicle.vehicle_id || '') : t('waiting.vehicleInProgress') },
          ].map((step, i) => (
            <View key={i} style={{
              flexDirection: 'row', alignItems: 'center',
              marginBottom: i < 3 ? 14 : 0,
            }}>
              <View style={{
                width: 28, height: 28, borderRadius: 14,
                backgroundColor: step.done ? Colors.successBg : Colors.warningBg,
                alignItems: 'center', justifyContent: 'center',
                marginRight: 12,
              }}>
                {step.done ? (
                  <Ionicons name="checkmark" size={14} color={Colors.success} />
                ) : (
                  <Ionicons name="time" size={14} color={Colors.warning} />
                )}
              </View>
              <Text style={{ fontFamily: Font.medium, fontSize: 14, color: Colors.text, flex: 1 }}>
                {step.label}
              </Text>
              <Text style={{
                fontFamily: Font.medium, fontSize: 12,
                color: step.done ? Colors.success : Colors.warning,
              }}>
                {step.note}
              </Text>
            </View>
          ))}
        </View>

        {/* Refresh */}
        <TouchableOpacity
          onPress={fetchStatus}
          style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 16 }}
          activeOpacity={0.7}
        >
          <Ionicons name="refresh" size={16} color={Colors.primary} style={{ marginRight: 6 }} />
          <Text style={{ fontFamily: Font.medium, fontSize: 13, color: Colors.primary }}>
            {t('waiting.checkStatus')}
          </Text>
        </TouchableOpacity>

        <Text style={{ ...Type.caption, marginTop: 8 }}>
          {t('waiting.autoRefresh')}
        </Text>
      </View>
    </SafeAreaView>
  );
}
