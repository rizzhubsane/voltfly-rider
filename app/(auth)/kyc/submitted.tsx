import { useRef, useEffect } from 'react';
import { View, Text, Animated, TouchableOpacity, Linking } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Font, Type, Shadow, Radius, ButtonPrimary, ButtonOutline } from '@/lib/theme';

export default function KYCSubmitted() {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;
  const cardSlide = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.spring(scaleAnim, { toValue: 1, friction: 5, tension: 50, useNativeDriver: true }),
      Animated.parallel([
        Animated.timing(fadeIn, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(cardSlide, { toValue: 0, duration: 500, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  const STEPS = [
    { icon: 'checkmark-circle', label: 'KYC Submitted', desc: 'Your documents are being reviewed', done: true },
    { icon: 'search', label: 'Under Review', desc: 'Our team will verify your documents', done: false },
    { icon: 'card', label: 'Security Deposit', desc: 'Pay ₹2,000 refundable deposit', done: false },
    { icon: 'bicycle', label: 'Vehicle Collection', desc: 'Visit hub to collect your scooty', done: false },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
      <StatusBar style="dark" />
      <View style={{ flex: 1, paddingHorizontal: 24, justifyContent: 'center' }}>
        {/* Success icon */}
        <View style={{ alignItems: 'center', marginBottom: 28 }}>
          <Animated.View style={{
            transform: [{ scale: scaleAnim }],
            width: 88, height: 88, borderRadius: 44,
            backgroundColor: Colors.successBg,
            alignItems: 'center', justifyContent: 'center',
          }}>
            <View style={{
              width: 64, height: 64, borderRadius: 32,
              backgroundColor: Colors.success,
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Ionicons name="checkmark" size={36} color={Colors.white} />
            </View>
          </Animated.View>
        </View>

        {/* Title */}
        <Text style={{ ...Type.h2, textAlign: 'center', marginBottom: 8 }}>
          KYC Submitted! 🎉
        </Text>
        <Text style={{ ...Type.body, color: Colors.textMuted, textAlign: 'center', lineHeight: 22, marginBottom: 32 }}>
          Your documents have been submitted successfully.{'\n'}
          We'll review them within 24-48 hours.
        </Text>

        {/* Steps timeline */}
        <Animated.View style={{
          opacity: fadeIn,
          transform: [{ translateY: cardSlide }],
          backgroundColor: Colors.white, borderRadius: Radius.xl,
          padding: 20, ...Shadow.md,
        }}>
          {STEPS.map((step, idx) => (
            <View key={idx} style={{ flexDirection: 'row', marginBottom: idx < STEPS.length - 1 ? 20 : 0 }}>
              {/* Timeline */}
              <View style={{ alignItems: 'center', marginRight: 14, width: 28 }}>
                <View style={{
                  width: 28, height: 28, borderRadius: 14,
                  backgroundColor: step.done ? Colors.success : Colors.borderLight,
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  {step.done ? (
                    <Ionicons name="checkmark" size={14} color={Colors.white} />
                  ) : (
                    <Text style={{ fontFamily: Font.semibold, fontSize: 11, color: Colors.textLight }}>
                      {idx + 1}
                    </Text>
                  )}
                </View>
                {idx < STEPS.length - 1 && (
                  <View style={{
                    width: 2, flex: 1, minHeight: 24,
                    backgroundColor: step.done ? Colors.success : Colors.borderLight,
                    marginTop: 4,
                  }} />
                )}
              </View>
              {/* Content */}
              <View style={{ flex: 1, paddingTop: 2 }}>
                <Text style={{
                  fontFamily: Font.semibold, fontSize: 14,
                  color: step.done ? Colors.success : Colors.text,
                }}>
                  {step.label}
                </Text>
                <Text style={{ fontFamily: Font.regular, fontSize: 12, color: Colors.textMuted, marginTop: 2 }}>
                  {step.desc}
                </Text>
              </View>
            </View>
          ))}
        </Animated.View>

        {/* WhatsApp support */}
        <TouchableOpacity
          onPress={() => Linking.openURL('https://wa.me/918800000000')}
          style={{
            ...ButtonOutline, marginTop: 24,
            borderColor: Colors.whatsapp,
            flexDirection: 'row',
          }}
          activeOpacity={0.7}
        >
          <Text style={{ fontSize: 18, marginRight: 8 }}>💬</Text>
          <Text style={{ fontFamily: Font.semibold, fontSize: 14, color: Colors.whatsapp }}>
            Questions? Chat with us
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
