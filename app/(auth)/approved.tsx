import { useRef, useEffect } from 'react';
import { View, Text, Animated, TouchableOpacity } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Font, Type, Shadow, Radius, ButtonPrimary } from '@/lib/theme';
import { useTranslation } from 'react-i18next';

export default function ApprovedScreen() {
  const router = useRouter();
  const { t } = useTranslation();

  // Animations
  const iconScale = useRef(new Animated.Value(0)).current;
  const iconRotate = useRef(new Animated.Value(0)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;
  const confetti = useRef([...Array(6)].map(() => ({
    x: new Animated.Value(0),
    y: new Animated.Value(0),
    opacity: new Animated.Value(1),
  }))).current;

  useEffect(() => {
    // Main animation
    Animated.sequence([
      Animated.parallel([
        Animated.spring(iconScale, { toValue: 1, friction: 4, tension: 60, useNativeDriver: true }),
        Animated.timing(iconRotate, { toValue: 1, duration: 600, useNativeDriver: true }),
      ]),
      Animated.timing(fadeIn, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();

    // Confetti burst
    confetti.forEach((c, i) => {
      const angle = (i / 6) * Math.PI * 2;
      const dist = 60 + Math.random() * 40;
      Animated.parallel([
        Animated.timing(c.x, { toValue: Math.cos(angle) * dist, duration: 700, useNativeDriver: true }),
        Animated.timing(c.y, { toValue: Math.sin(angle) * dist - 20, duration: 700, useNativeDriver: true }),
        Animated.timing(c.opacity, { toValue: 0, duration: 900, delay: 200, useNativeDriver: true }),
      ]).start();
    });
  }, []);

  const spin = iconRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const EMOJIS = ['⚡', '🎉', '✨', '🏆', '🎊', '⭐'];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
      <StatusBar style="dark" />
      <View style={{ flex: 1, paddingHorizontal: 24, justifyContent: 'center', alignItems: 'center' }}>

        {/* Confetti particles */}
        <View style={{ position: 'absolute', top: '35%' }}>
          {confetti.map((c, i) => (
            <Animated.Text
              key={i}
              style={{
                position: 'absolute',
                fontSize: 20,
                opacity: c.opacity,
                transform: [{ translateX: c.x }, { translateY: c.y }],
              }}
            >
              {EMOJIS[i]}
            </Animated.Text>
          ))}
        </View>

        {/* Success badge */}
        <Animated.View style={{
          transform: [{ scale: iconScale }, { rotate: spin }],
          width: 100, height: 100, borderRadius: 50,
          backgroundColor: Colors.successBg,
          alignItems: 'center', justifyContent: 'center',
          marginBottom: 28,
        }}>
          <View style={{
            width: 76, height: 76, borderRadius: 38,
            backgroundColor: Colors.success,
            alignItems: 'center', justifyContent: 'center',
            ...Shadow.lg,
          }}>
            <Ionicons name="checkmark-done" size={40} color={Colors.white} />
          </View>
        </Animated.View>

        {/* Title */}
        <Text style={{ ...Type.h1, textAlign: 'center', marginBottom: 8 }}>
          {t('approved.title')}
        </Text>
        <Text style={{ ...Type.body, color: Colors.textMuted, textAlign: 'center', lineHeight: 22, marginBottom: 36, maxWidth: 300 }}>
          {t('approved.subtitle')}
        </Text>

        {/* Next steps card */}
        <Animated.View style={{
          opacity: fadeIn,
          width: '100%',
          backgroundColor: Colors.white,
          borderRadius: Radius.xl,
          padding: 20,
          ...Shadow.md,
          marginBottom: 32,
        }}>
          <Text style={{ ...Type.subtitle, marginBottom: 14 }}>{t('approved.whatsNext')}</Text>

          {[
            { icon: 'card', label: t('approved.step1'), color: Colors.primary },
            { icon: 'location', label: t('approved.step2'), color: '#8B5CF6' },
            { icon: 'bicycle', label: t('approved.step3'), color: Colors.success },
          ].map((item, i) => (
            <View key={i} style={{
              flexDirection: 'row', alignItems: 'center',
              marginBottom: i < 2 ? 14 : 0,
            }}>
              <View style={{
                width: 32, height: 32, borderRadius: 8,
                backgroundColor: `${item.color}15`,
                alignItems: 'center', justifyContent: 'center',
                marginRight: 12,
              }}>
                <Ionicons name={item.icon as any} size={16} color={item.color} />
              </View>
              <Text style={{ fontFamily: Font.medium, fontSize: 14, color: Colors.text, flex: 1 }}>
                {item.label}
              </Text>
            </View>
          ))}
        </Animated.View>

        {/* CTA */}
        <TouchableOpacity
          style={{ ...ButtonPrimary, width: '100%' }}
          onPress={() => router.replace('/(auth)/deposit' as any)}
          activeOpacity={0.8}
        >
          <Text style={Type.button}>{t('approved.payDepositBtn')}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
