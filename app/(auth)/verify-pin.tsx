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
import { Colors, Font, Type, Shadow, Radius } from '@/lib/theme';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';

const PIN_LENGTH = 6;

export default function VerifyPinScreen() {
  const router = useRouter();
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const { signInWithPin } = useAuth();
  const { t } = useTranslation();

  const [pin, setPin] = useState<string[]>(Array(PIN_LENGTH).fill(''));
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState('');
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(null);
  const [lockedUntil, setLockedUntil] = useState<Date | null>(null);
  const [lockCountdown, setLockCountdown] = useState(0);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);

  const inputRefs = useRef<(TextInput | null)[]>([]);

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

  // Lockout countdown timer
  useEffect(() => {
    if (!lockedUntil) return;
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((lockedUntil.getTime() - Date.now()) / 1000));
      setLockCountdown(remaining);
      if (remaining <= 0) {
        setLockedUntil(null);
        setError('');
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [lockedUntil]);

  const triggerShake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const handlePinChange = (text: string, index: number) => {
    if (error && !lockedUntil) setError('');
    const digit = text.replace(/[^0-9]/g, '');

    // Handle paste
    if (digit.length > 1) {
      const digits = digit.slice(0, PIN_LENGTH).split('');
      const newPin = [...pin];
      digits.forEach((d, i) => { if (index + i < PIN_LENGTH) newPin[index + i] = d; });
      setPin(newPin);
      const nextIdx = Math.min(index + digits.length, PIN_LENGTH - 1);
      inputRefs.current[nextIdx]?.focus();
      if (newPin.every(d => d !== '')) {
        Keyboard.dismiss();
        handleVerifyWithCode(newPin.join(''));
      }
      return;
    }

    const newPin = [...pin];
    newPin[index] = digit;
    setPin(newPin);

    if (digit && index < PIN_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    if (digit && index === PIN_LENGTH - 1 && newPin.every(d => d !== '')) {
      Keyboard.dismiss();
      handleVerifyWithCode(newPin.join(''));
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !pin[index] && index > 0) {
      const newPin = [...pin];
      newPin[index - 1] = '';
      setPin(newPin);
      inputRefs.current[index - 1]?.focus();
    }
  };

  const routeFromRider = async (rider: { id: string; status: string | null; hub_id: string | null }) => {
    switch (rider.status) {
      case 'pending_kyc':
        router.replace('/(auth)/kyc/step1' as any);
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
    if (code.length !== PIN_LENGTH || isVerifying || lockedUntil) return;

    setIsVerifying(true);
    setError('');

    try {
      const result = await signInWithPin(phone, code);

      if (result.error) {
        triggerShake();
        setPin(Array(PIN_LENGTH).fill(''));
        setTimeout(() => inputRefs.current[0]?.focus(), 100);

        if (result.locked_until) {
          setLockedUntil(new Date(result.locked_until));
          setError(`Account locked. Try again in ${Math.ceil((result.retry_after_seconds ?? 900) / 60)} minutes.`);
        } else if (result.attempts_remaining !== undefined) {
          setAttemptsRemaining(result.attempts_remaining);
          setError(result.error.message || 'Incorrect access code.');
        } else {
          setError(result.error.message || 'Authentication failed.');
        }

        setIsVerifying(false);
        return;
      }

      if (!result.rider) {
        setError('Authentication failed. Please try again.');
        setIsVerifying(false);
        return;
      }

      setIsVerifying(false);
      await routeFromRider(result.rider);
    } catch {
      setError('Something went wrong. Please try again.');
      setIsVerifying(false);
    }
  };

  const pinCode = pin.join('');
  const maskedPhone = phone
    ? `${phone.slice(0, 2)}${'•'.repeat(6)}${phone.slice(-2)}`
    : '';

  const isLocked = !!lockedUntil && lockCountdown > 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
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
              marginBottom: 28, ...Shadow.sm,
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={20} color={Colors.text} />
          </TouchableOpacity>

          {/* Title */}
          <Text style={{ ...Type.h2, marginBottom: 8 }}>Enter Access Code</Text>
          <Text style={{ ...Type.body, color: Colors.textMuted, marginBottom: 40, lineHeight: 22 }}>
            Enter your Voltfly 6-digit access code for{' '}
            <Text style={{ fontFamily: Font.semibold, color: Colors.text }}>
              +91 {maskedPhone}
            </Text>
          </Text>

          {/* PIN input boxes */}
          <Animated.View
            style={{
              flexDirection: 'row',
              justifyContent: 'center',
              gap: 10,
              marginBottom: 8,
              transform: [{ translateX: shakeAnim }],
            }}
          >
            {Array.from({ length: PIN_LENGTH }).map((_, index) => {
              const isFilled = pin[index] !== '';
              const isActive = focusedIndex === index;
              return (
                <View
                  key={index}
                  style={{
                    flex: 1, maxWidth: 52, height: 58,
                    borderRadius: Radius.md,
                    backgroundColor: Colors.white,
                    alignItems: 'center', justifyContent: 'center',
                    borderWidth: isFilled || isActive ? 2 : error ? 2 : 1.5,
                    borderColor: isLocked ? Colors.textLight
                      : isActive ? Colors.primary
                      : isFilled ? Colors.primary
                      : error ? Colors.danger
                      : Colors.border,
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
                    maxLength={index === 0 ? PIN_LENGTH : 1}
                    value={pin[index]}
                    onChangeText={text => handlePinChange(text, index)}
                    onKeyPress={e => handleKeyPress(e, index)}
                    onFocus={() => setFocusedIndex(index)}
                    onBlur={() => setFocusedIndex(null)}
                    editable={!isVerifying && !isLocked}
                    selectTextOnFocus
                  />
                </View>
              );
            })}
          </Animated.View>

          {/* Error / attempts / lockout */}
          {isLocked ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12 }}>
              <Ionicons name="lock-closed" size={16} color={Colors.danger} style={{ marginRight: 8 }} />
              <Text style={{ fontFamily: Font.medium, fontSize: 13, color: Colors.danger, flex: 1 }}>
                Account locked. Try again in{' '}
                <Text style={{ fontFamily: Font.bold }}>
                  {Math.floor(lockCountdown / 60)}:{String(lockCountdown % 60).padStart(2, '0')}
                </Text>
              </Text>
            </View>
          ) : error ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12, paddingHorizontal: 4 }}>
              <Ionicons name="alert-circle" size={16} color={Colors.danger} style={{ marginRight: 6 }} />
              <Text style={{ fontFamily: Font.regular, fontSize: 13, color: Colors.danger, flex: 1 }}>
                {error}
                {attemptsRemaining !== null && attemptsRemaining > 0
                  ? ` (${attemptsRemaining} ${attemptsRemaining === 1 ? 'attempt' : 'attempts'} remaining)`
                  : ''}
              </Text>
            </View>
          ) : null}

          {/* Verify button */}
          <TouchableOpacity
            style={{
              height: 56,
              borderRadius: Radius.lg,
              alignItems: 'center', justifyContent: 'center',
              flexDirection: 'row',
              marginTop: 28,
              backgroundColor: pinCode.length === PIN_LENGTH && !isVerifying && !isLocked
                ? Colors.primary : `${Colors.primary}50`,
              ...(pinCode.length === PIN_LENGTH && !isVerifying && !isLocked ? Shadow.primary : {}),
            }}
            onPress={() => handleVerifyWithCode(pinCode)}
            disabled={pinCode.length !== PIN_LENGTH || isVerifying || isLocked}
            activeOpacity={0.8}
          >
            {isVerifying ? (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <ActivityIndicator size="small" color={Colors.white} style={{ marginRight: 10 }} />
                <Text style={Type.button}>Verifying...</Text>
              </View>
            ) : (
              <Text style={Type.button}>Continue</Text>
            )}
          </TouchableOpacity>

          {/* Forgot code hint */}
          <Text style={{
            fontFamily: Font.regular, fontSize: 13, color: Colors.textMuted,
            textAlign: 'center', marginTop: 24, lineHeight: 20,
          }}>
            Forgot your code?{' '}
            <Text style={{ fontFamily: Font.semibold, color: Colors.primary }}>
              Contact Voltfly support.
            </Text>
          </Text>
        </Animated.View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
