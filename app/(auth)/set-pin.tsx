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
  ScrollView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { Colors, Font, Type, Shadow, Radius } from '@/lib/theme';
import TnCModal from '@/components/TnCModal';

const PIN_LENGTH = 6;

const BLOCKED_PINS = new Set([
  '111111','222222','333333','444444','555555',
  '666666','777777','888888','999999','000000',
  '123456','654321','112233','123123','121212',
]);

export default function SetPinScreen() {
  const router = useRouter();
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const { setupPin } = useAuth();

  const [pin, setPin] = useState<string[]>(Array(PIN_LENGTH).fill(''));
  const [confirmPin, setConfirmPin] = useState<string[]>(Array(PIN_LENGTH).fill(''));
  const [activeField, setActiveField] = useState<'pin' | 'confirm'>('pin');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [showTnc, setShowTnc] = useState(true); // Show TnC immediately on mount
  const [tncAccepted, setTncAccepted] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);

  const pinRefs = useRef<(TextInput | null)[]>([]);
  const confirmRefs = useRef<(TextInput | null)[]>([]);

  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(30)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideUp, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, []);

  // Auto-focus first PIN box after TnC is accepted
  useEffect(() => {
    if (tncAccepted) {
      setTimeout(() => pinRefs.current[0]?.focus(), 300);
    }
  }, [tncAccepted]);

  const triggerShake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const handleDigitChange = (
    text: string,
    index: number,
    field: 'pin' | 'confirm',
  ) => {
    if (error) setError('');
    const setter = field === 'pin' ? setPin : setConfirmPin;
    const refs = field === 'pin' ? pinRefs : confirmRefs;
    const current = field === 'pin' ? pin : confirmPin;

    const digit = text.replace(/[^0-9]/g, '');

    // Handle paste
    if (digit.length > 1) {
      const digits = digit.slice(0, PIN_LENGTH).split('');
      const newArr = [...current];
      digits.forEach((d, i) => { if (index + i < PIN_LENGTH) newArr[index + i] = d; });
      setter(newArr);
      const nextIdx = Math.min(index + digits.length, PIN_LENGTH - 1);
      refs.current[nextIdx]?.focus();
      if (newArr.every(d => d !== '') && field === 'pin') {
        setTimeout(() => { setActiveField('confirm'); confirmRefs.current[0]?.focus(); }, 100);
      }
      return;
    }

    const newArr = [...current];
    newArr[index] = digit;
    setter(newArr);

    if (digit && index < PIN_LENGTH - 1) {
      refs.current[index + 1]?.focus();
    }

    // Auto-advance to confirm when PIN is full
    if (digit && index === PIN_LENGTH - 1 && newArr.every(d => d !== '') && field === 'pin') {
      setTimeout(() => { setActiveField('confirm'); confirmRefs.current[0]?.focus(); }, 100);
    }
  };

  const handleKeyPress = (e: any, index: number, field: 'pin' | 'confirm') => {
    if (e.nativeEvent.key === 'Backspace') {
      const current = field === 'pin' ? pin : confirmPin;
      const setter = field === 'pin' ? setPin : setConfirmPin;
      const refs = field === 'pin' ? pinRefs : confirmRefs;
      if (!current[index] && index > 0) {
        const newArr = [...current];
        newArr[index - 1] = '';
        setter(newArr);
        refs.current[index - 1]?.focus();
      }
    }
  };

  const pinCode = pin.join('');
  const confirmCode = confirmPin.join('');
  const allFilled = pinCode.length === PIN_LENGTH && confirmCode.length === PIN_LENGTH;

  const handleSetPin = async () => {
    if (!allFilled || isSaving) return;

    if (pinCode !== confirmCode) {
      setError('Access codes do not match. Please try again.');
      triggerShake();
      setConfirmPin(Array(PIN_LENGTH).fill(''));
      confirmRefs.current[0]?.focus();
      return;
    }

    if (BLOCKED_PINS.has(pinCode)) {
      setError('This code is too simple. Please choose a less predictable one.');
      triggerShake();
      setPin(Array(PIN_LENGTH).fill(''));
      setConfirmPin(Array(PIN_LENGTH).fill(''));
      pinRefs.current[0]?.focus();
      return;
    }

    Keyboard.dismiss();
    setIsSaving(true);
    setError('');

    try {
      const { error: setupError, rider } = await setupPin(phone, pinCode);

      if (setupError) {
        setError(setupError.message || 'Failed to set access code. Please try again.');
        triggerShake();
        return;
      }

      if (!rider) {
        setError('Account setup failed. Please try again.');
        return;
      }

      // Route based on rider status (same pattern as otp.tsx routeFromRider)
      switch (rider.status) {
        case 'pending_kyc':
          router.replace('/(auth)/kyc/step1' as any);
          break;
        case 'kyc_approved':
          router.replace('/(auth)/approved' as any);
          break;
        case 'active':
          router.replace('/(main)' as any);
          break;
        default:
          router.replace('/(auth)/kyc/step1' as any);
      }
    } catch {
      setError('Something went wrong. Please check your connection.');
    } finally {
      setIsSaving(false);
    }
  };

  const maskedPhone = phone
    ? `${phone.slice(0, 2)}${'•'.repeat(6)}${phone.slice(-2)}`
    : '';

  const renderPinBoxes = (
    values: string[],
    field: 'pin' | 'confirm',
    refs: React.MutableRefObject<(TextInput | null)[]>,
  ) => (
    <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 10 }}>
      {Array.from({ length: PIN_LENGTH }).map((_, index) => {
        const isFilled = values[index] !== '';
        const isActive = activeField === field && focusedIndex === index;
        return (
          <View
            key={index}
            style={{
              flex: 1, maxWidth: 52, height: 58,
              borderRadius: Radius.md,
              backgroundColor: Colors.white,
              alignItems: 'center', justifyContent: 'center',
              borderWidth: isFilled || isActive ? 2 : 1.5,
              borderColor: isActive ? Colors.primary : isFilled ? Colors.primary : error ? Colors.danger : Colors.border,
              ...Shadow.sm,
            }}
          >
            <TextInput
              ref={ref => { refs.current[index] = ref; }}
              style={{
                width: '100%', height: '100%', textAlign: 'center',
                fontFamily: Font.bold, fontSize: 22,
                color: Colors.text,
              }}
              keyboardType="number-pad"
              maxLength={index === 0 ? PIN_LENGTH : 1}
              value={values[index]}
              onChangeText={text => handleDigitChange(text, index, field)}
              onKeyPress={e => handleKeyPress(e, index, field)}
              onFocus={() => { setActiveField(field); setFocusedIndex(index); }}
              onBlur={() => setFocusedIndex(null)}
              editable={!isSaving && tncAccepted}
              selectTextOnFocus
            />
          </View>
        );
      })}
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
      <StatusBar style="dark" />

      {/* TnC Modal — shown immediately, blocks access until accepted */}
      <TnCModal
        visible={showTnc}
        phone={phone}
        onClose={() => router.back()} // If they decline, go back to phone screen
        onConsentRecorded={() => {
          setTncAccepted(true);
          setShowTnc(false);
        }}
      />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingTop: 12 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={{ opacity: fadeIn, transform: [{ translateY: slideUp }] }}>
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

            {/* Header */}
            <Text style={{ ...Type.h2, marginBottom: 8 }}>Set Your Access Code</Text>
            <Text style={{ ...Type.body, color: Colors.textMuted, marginBottom: 36, lineHeight: 22 }}>
              Choose a 6-digit code for{' '}
              <Text style={{ fontFamily: Font.semibold, color: Colors.text }}>
                +91 {maskedPhone}
              </Text>
              {'\n'}You'll use this every time you log in.
            </Text>

            {/* PIN entry */}
            <Text style={{ fontFamily: Font.semibold, fontSize: 13, color: Colors.textMuted, marginBottom: 12, letterSpacing: 0.5 }}>
              CREATE ACCESS CODE
            </Text>
            <Animated.View style={{ transform: [{ translateX: activeField === 'pin' ? shakeAnim : 0 }], marginBottom: 24 }}>
              {renderPinBoxes(pin, 'pin', pinRefs)}
            </Animated.View>

            {/* Confirm PIN entry */}
            <Text style={{ fontFamily: Font.semibold, fontSize: 13, color: Colors.textMuted, marginBottom: 12, letterSpacing: 0.5 }}>
              CONFIRM ACCESS CODE
            </Text>
            <Animated.View style={{ transform: [{ translateX: activeField === 'confirm' ? shakeAnim : 0 }], marginBottom: 8 }}>
              {renderPinBoxes(confirmPin, 'confirm', confirmRefs)}
            </Animated.View>

            {/* Error */}
            {error ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12, paddingHorizontal: 4 }}>
                <Ionicons name="alert-circle" size={16} color={Colors.danger} style={{ marginRight: 6 }} />
                <Text style={{ fontFamily: Font.regular, fontSize: 13, color: Colors.danger, flex: 1 }}>
                  {error}
                </Text>
              </View>
            ) : null}

            {/* Hint */}
            {!error && (
              <Text style={{ fontFamily: Font.regular, fontSize: 12, color: Colors.textLight, textAlign: 'center', marginTop: 16, lineHeight: 18 }}>
                Don't share this code with anyone.{'\n'}Contact Voltfly if you forget it.
              </Text>
            )}

            {/* Submit button */}
            <TouchableOpacity
              style={{
                height: 56,
                borderRadius: Radius.lg,
                alignItems: 'center', justifyContent: 'center',
                marginTop: 32,
                backgroundColor: allFilled && !isSaving ? Colors.primary : `${Colors.primary}50`,
                ...(allFilled && !isSaving ? Shadow.primary : {}),
              }}
              onPress={handleSetPin}
              disabled={!allFilled || isSaving}
              activeOpacity={0.8}
            >
              {isSaving ? (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <ActivityIndicator size="small" color={Colors.white} style={{ marginRight: 10 }} />
                  <Text style={{ fontFamily: Font.bold, fontSize: 16, color: Colors.white }}>Setting up...</Text>
                </View>
              ) : (
                <Text style={{ fontFamily: Font.bold, fontSize: 16, color: Colors.white }}>
                  Create Access Code
                </Text>
              )}
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
