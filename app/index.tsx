import { useEffect, useRef, useState } from 'react';
import { View, Text, Animated, Platform, Image } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Colors, Font } from '@/lib/theme';
import { LinearGradient } from 'expo-linear-gradient';

type BootstrapTarget =
  | '/(auth)/phone'
  | '/(auth)/kyc/step1'
  | '/(auth)/kyc/submitted'
  | '/(auth)/approved'
  | '/(auth)/hub-select'
  | '/(auth)/waiting'
  | '/(main)';

export default function SplashScreen() {
  const router = useRouter();
  const { session, loading, signOut } = useAuth();
  const [routing, setRouting] = useState(true);

  const logoScale = useRef(new Animated.Value(0.3)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const titleY = useRef(new Animated.Value(30)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const dotOpacity = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(logoScale, { toValue: 1, friction: 5, tension: 80, useNativeDriver: true }),
        Animated.timing(logoOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(titleY, { toValue: 0, duration: 350, useNativeDriver: true }),
        Animated.timing(titleOpacity, { toValue: 1, duration: 350, useNativeDriver: true }),
      ]),
      Animated.timing(subtitleOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.timing(dotOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
  }, []);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  useEffect(() => {
    if (loading) return;

    let cancelled = false;

    const routeFromState = async () => {
      // Wait for 2.5 seconds to let the premium splash animation play out
      await new Promise(resolve => setTimeout(resolve, 2500));
      if (cancelled) return;

      const navigate = async (target: BootstrapTarget) => {
        if (cancelled) return;
        setRouting(false);
        router.replace(target as any);
      };

      if (!session?.user?.id) {
        await navigate('/(auth)/phone');
        return;
      }

      const userId = session.user.id;

      const { data: rider, error: riderError } = await supabase
        .from('riders')
        .select('id, status, hub_id')
        .eq('id', userId)
        .maybeSingle();

      if (cancelled) return;

      // On web, a persisted stale session is more harmful than helpful during onboarding.
      // If we cannot resolve a rider record, reset back to phone auth.
      if (riderError || !rider) {
        if (Platform.OS === 'web') {
          await signOut();
        }
        await navigate('/(auth)/phone');
        return;
      }

      switch (rider.status) {
        case 'pending_kyc':
        case 'kyc_rejected':
          await navigate('/(auth)/kyc/step1');
          return;
        case 'kyc_submitted':
          await navigate('/(auth)/kyc/submitted');
          return;
        case 'kyc_approved':
          await navigate('/(auth)/approved');
          return;
        case 'active': {
          if (!rider.hub_id) {
            await navigate('/(auth)/hub-select');
            return;
          }

          const { data: assignedVehicle } = await supabase
            .from('vehicles')
            .select('id')
            .eq('assigned_rider_id', rider.id)
            .limit(1);

          if (cancelled) return;

          if (assignedVehicle && assignedVehicle.length > 0) {
            await navigate('/(main)');
          } else {
            await navigate('/(auth)/waiting');
          }
          return;
        }
        default:
          await navigate('/(main)');
      }
    };

    routeFromState();

    return () => {
      cancelled = true;
    };
  }, [loading, router, session, signOut]);

  if (!routing && !loading) {
    return null;
  }

  return (
    <View style={{ flex: 1 }}>
      <StatusBar style="light" />
      <LinearGradient
        colors={[Colors.primaryDark, Colors.primary, Colors.primaryLight]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
      >
        <View style={{ position: 'absolute', top: -80, right: -80, width: 250, height: 250, borderRadius: 125, backgroundColor: 'rgba(255,255,255,0.06)' }} />
        <View style={{ position: 'absolute', bottom: -60, left: -60, width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.04)' }} />
        <View style={{ position: 'absolute', top: '30%', left: -30, width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.03)' }} />

        <Animated.View
          style={{
            opacity: logoOpacity,
            transform: [{ scale: logoScale }],
            marginBottom: 20,
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <Image
            source={require('@/assets/images/logo.png')}
            style={{ width: 220, height: 100, resizeMode: 'contain' }}
          />
        </Animated.View>

        <Animated.View style={{ position: 'absolute', bottom: 60, opacity: dotOpacity }}>
          <Animated.View style={{ flexDirection: 'row', gap: 8, opacity: pulseAnim }}>
            {[0, 1, 2].map(i => (
              <View key={i} style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.5)' }} />
            ))}
          </Animated.View>
        </Animated.View>
      </LinearGradient>
    </View>
  );
}
