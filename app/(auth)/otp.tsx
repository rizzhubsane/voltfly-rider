import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated,
  Keyboard,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Colors, Font, Type, Shadow, Radius } from '@/lib/theme';
import { useTranslation } from 'react-i18next';

const OTP_LENGTH = 6;
const RESEND_COOLDOWN = 30;

export default function OtpScreen() {
  const router = useRouter();
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const { verifyOtp, signIn } = useAuth();
  const { t } = useTranslation();

  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState('');
  const [resendTimer, setResendTimer] = useState(RESEND_COOLDOWN);
  const [isResending, setIsResending] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);

  const inputRefs = useRef<(TextInput | null)[]>([]);

  // Animations
  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(30)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideUp, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
    setTimeout(() => inputRefs.current[0]?.focus(), 400);
  }, []);

  // Resend countdown
  useEffect(() => {
    if (resendTimer <= 0) return;
    const interval = setInterval(() => setResendTimer(prev => prev - 1), 1000);
    return () => clearInterval(interval);
  }, [resendTimer]);

  const triggerShake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const handleOtpChange = (text: string, index: number) => {
    if (error) setError('');
    const digit = text.replace(/[^0-9]/g, '');

    // Handle paste of full OTP
    if (digit.length > 1) {
      const digits = digit.slice(0, OTP_LENGTH).split('');
      const newOtp = [...otp];
      digits.forEach((d, i) => {
        if (index + i < OTP_LENGTH) newOtp[index + i] = d;
      });
      setOtp(newOtp);
      const nextIndex = Math.min(index + digits.length, OTP_LENGTH - 1);
      inputRefs.current[nextIndex]?.focus();

      // Auto-verify if all filled
      if (newOtp.every(d => d !== '')) {
        Keyboard.dismiss();
        handleVerifyWithCode(newOtp.join(''));
      }
      return;
    }

    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);

    if (digit && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-verify when last digit entered
    if (digit && index === OTP_LENGTH - 1 && newOtp.every(d => d !== '')) {
      Keyboard.dismiss();
      handleVerifyWithCode(newOtp.join(''));
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      const newOtp = [...otp];
      newOtp[index - 1] = '';
      setOtp(newOtp);
      inputRefs.current[index - 1]?.focus();
    }
  };

  const otpCode = otp.join('');
  const fullPhone = `+91${phone}`;

  const routeFromRider = async (rider: { id: string; status: string | null; hub_id: string | null }) => {
    switch (rider.status) {
      case 'pending_kyc':
      case 'kyc_rejected':
        router.replace('/(auth)/kyc/step1' as any);
        return;
      case 'kyc_submitted':
        router.replace('/(auth)/kyc/submitted' as any);
        return;
      case 'kyc_approved':
        router.replace('/(auth)/approved' as any);
        return;
      case 'active': {
        if (!rider.hub_id) {
          router.replace('/(auth)/hub-select' as any);
          return;
        }

        const { data: assignedVehicle } = await supabase
          .from('vehicles')
          .select('id')
          .eq('assigned_rider_id', rider.id)
          .limit(1);

        if (assignedVehicle && assignedVehicle.length > 0) {
          router.replace('/(main)' as any);
        } else {
          router.replace('/(auth)/waiting' as any);
        }
        return;
      }
      default:
        router.replace('/(main)' as any);
    }
  };

  const handleVerifyWithCode = async (code: string) => {
    if (code.length !== OTP_LENGTH) {
      setError('Please enter the complete 6-digit OTP');
      return;
    }
    if (isVerifying) return;

    setIsVerifying(true);
    setError('');

    try {
      const { error: verifyError, rider } = await verifyOtp(fullPhone, code);
      if (verifyError) {
        setError(verifyError.message || 'OTP verification failed. Please try again.');
        triggerShake();
        setIsVerifying(false);
        return;
      }

      if (!rider) {
        setError('Account setup failed. Please try again.');
        setIsVerifying(false);
        return;
      }

      setIsVerifying(false);
      await routeFromRider(rider);
    } catch {
      setError('Something went wrong. Please try again.');
      setIsVerifying(false);
    }
  };

  const handleVerify = () => handleVerifyWithCode(otpCode);

  const handleResend = async () => {
    if (resendTimer > 0 || isResending) return;
    setIsResending(true);
    setError('');
    try {
      const { error: resendError } = await signIn(fullPhone);
      if (resendError) {
        setError('Failed to resend OTP. Please try again.');
      } else {
        setResendTimer(RESEND_COOLDOWN);
        setOtp(Array(OTP_LENGTH).fill(''));
        inputRefs.current[0]?.focus();
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsResending(false);
    }
  };

  const maskedPhone = phone
    ? `${phone.slice(0, 2)}${'•'.repeat(6)}${phone.slice(-2)}`
    : '';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Animated.View
          style={{
            flex: 1, paddingHorizontal: 24, paddingTop: 12,
            opacity: fadeIn, transform: [{ translateY: slideUp }],
          }}
        >
          {/* Back button */}
          <TouchableOpacity
            onPress={() => router.back()}
            style={{
              width: 44, height: 44, borderRadius: 14,
              backgroundColor: Colors.white,
              alignItems: 'center', justifyContent: 'center',
              marginBottom: 28,
              ...Shadow.sm,
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={20} color={Colors.text} />
          </TouchableOpacity>

          {/* Title */}
          <Text style={{ ...Type.h2, marginBottom: 8 }}>
            {t('otp.title')}
          </Text>
          <Text style={{ ...Type.body, color: Colors.textMuted, marginBottom: 40, lineHeight: 22 }}>
            {t('otp.subtitle')}{' '}
            <Text style={{ fontFamily: Font.semibold, color: Colors.text }}>
              +91 {maskedPhone}
            </Text>
          </Text>

          {/* OTP input boxes */}
          <Animated.View
            style={{
              flexDirection: 'row',
              justifyContent: 'center',
              gap: 10,
              marginBottom: 8,
              transform: [{ translateX: shakeAnim }],
            }}
          >
            {Array.from({ length: OTP_LENGTH }).map((_, index) => {
              const isFilled = otp[index] !== '';
              const isActive = focusedIndex === index;
              return (
                <View
                  key={index}
                  style={{
                    flex: 1,
                    maxWidth: 52,
                    height: 58,
                    borderRadius: Radius.md,
                    backgroundColor: Colors.white,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: isFilled || isActive ? 2 : error ? 2 : 1.5,
                    borderColor: isActive ? Colors.primary : isFilled ? Colors.primary : error ? Colors.danger : Colors.border,
                    ...Shadow.sm,
                  }}
                >
                  <TextInput
                    ref={ref => { inputRefs.current[index] = ref; }}
                    style={{
                      width: '100%', height: '100%', textAlign: 'center',
                      fontFamily: Font.bold, fontSize: 22, color: Colors.text,
                    }}
                    keyboardType="number-pad"
                    maxLength={index === 0 ? OTP_LENGTH : 1}
                    value={otp[index]}
                    onChangeText={text => handleOtpChange(text, index)}
                    onKeyPress={e => handleKeyPress(e, index)}
                    onFocus={() => setFocusedIndex(index)}
                    onBlur={() => setFocusedIndex(null)}
                    editable={!isVerifying}
                    selectTextOnFocus
                  />
                </View>
              );
            })}
          </Animated.View>

          {/* Error message */}
          {error ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12, paddingHorizontal: 4 }}>
              <Ionicons name="alert-circle" size={16} color={Colors.danger} style={{ marginRight: 6 }} />
              <Text style={{ fontFamily: Font.regular, fontSize: 13, color: Colors.danger, flex: 1 }}>
                {error}
              </Text>
            </View>
          ) : null}

          {/* Verify button */}
          <TouchableOpacity
            style={{
              height: 56,
              borderRadius: Radius.lg,
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'row',
              marginTop: 28,
              backgroundColor: otpCode.length === OTP_LENGTH && !isVerifying
                ? Colors.primary : `${Colors.primary}50`,
              ...(otpCode.length === OTP_LENGTH && !isVerifying ? Shadow.primary : {}),
            }}
            onPress={handleVerify}
            disabled={otpCode.length !== OTP_LENGTH || isVerifying}
            activeOpacity={0.8}
          >
            {isVerifying ? (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <ActivityIndicator size="small" color={Colors.white} style={{ marginRight: 10 }} />
                <Text style={Type.button}>{t('otp.verifyingBtn')}</Text>
              </View>
            ) : (
              <Text style={Type.button}>{t('otp.verifyBtn')}</Text>
            )}
          </TouchableOpacity>

          {/* Resend OTP */}
          <View style={{ alignItems: 'center', marginTop: 28 }}>
            {resendTimer > 0 ? (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ fontFamily: Font.regular, fontSize: 14, color: Colors.textLight }}>
                  {t('otp.resendIn')}{' '}
                </Text>
                <View style={{
                  backgroundColor: Colors.primaryBg,
                  paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8,
                }}>
                  <Text style={{ fontFamily: Font.bold, fontSize: 14, color: Colors.primary }}>
                    {resendTimer}s
                  </Text>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                onPress={handleResend}
                disabled={isResending}
                style={{ paddingVertical: 6, paddingHorizontal: 16 }}
                activeOpacity={0.7}
              >
                {isResending ? (
                  <ActivityIndicator size="small" color={Colors.primary} />
                ) : (
                  <Text style={{ fontFamily: Font.semibold, fontSize: 15, color: Colors.primary }}>
                    {t('otp.resendBtn')}
                  </Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
