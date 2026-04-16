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
  Image,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/hooks/useAuth';
import { Colors, Font, Type, Shadow, Radius } from '@/lib/theme';
import { useTranslation } from 'react-i18next';

export default function PhoneScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { checkPhone } = useAuth();
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Animations
  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(40)).current;
  const inputScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideUp, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
  }, []);

  const handlePhoneChange = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '').slice(0, 10);
    setPhone(cleaned);
    if (error) setError('');
  };

  const handleFocus = () => {
    Animated.spring(inputScale, { toValue: 1.02, friction: 8, useNativeDriver: true }).start();
  };

  const handleBlur = () => {
    Animated.spring(inputScale, { toValue: 1, friction: 8, useNativeDriver: true }).start();
  };

  const handleContinue = async () => {
    if (phone.length !== 10) {
      setError('Please enter a valid 10-digit mobile number');
      return;
    }
    Keyboard.dismiss();
    setError('');
    setIsLoading(true);

    try {
      const result = await checkPhone(phone);

      if (result.error) {
        setError(result.error.message || 'Something went wrong. Please try again.');
        return;
      }

      if (!result.exists) {
        setError('This number is not registered with Voltfly. Contact your fleet manager.');
        return;
      }

      if (result.needs_pin_setup) {
        // First-time rider: go to set-pin screen
        router.push({ pathname: '/(auth)/set-pin' as any, params: { phone } });
      } else {
        // Returning rider: go to verify-pin screen
        router.push({ pathname: '/(auth)/verify-pin' as any, params: { phone } });
      }
    } catch {
      setError('Something went wrong. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const isValid = phone.length === 10;

  // Format phone for display: 00000 00000
  const formatPhone = (p: string) => {
    if (p.length <= 5) return p;
    return `${p.slice(0, 5)} ${p.slice(5)}`;
  };

  return (
    <LinearGradient
      colors={['#007DDA', '#63C193', '#B1E727']}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={{ flex: 1 }}>
        <StatusBar style="light" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Animated.View
          style={{
            flex: 1,
            paddingHorizontal: 24,
            paddingTop: 32,
            opacity: fadeIn,
            transform: [{ translateY: slideUp }],
          }}
        >
          {/* Logo */}
          <View style={{ alignItems: 'center', marginTop: 50, marginBottom: 64 }}>
            <Image
              source={require('@/assets/images/logo.png')}
              style={{ width: 200, height: 65, resizeMode: 'contain' }}
            />
          </View>

          {/* Phone input label */}
          <Text style={{ ...Type.body, color: Colors.white, marginBottom: 12, marginLeft: 4, fontSize: 16, fontFamily: Font.medium }}>
            Enter your mobile number
          </Text>
          <Animated.View style={{ transform: [{ scale: inputScale }] }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: Colors.white,
                borderRadius: Radius.lg,
                paddingHorizontal: 16,
                height: 60,
                borderWidth: error ? 2 : 1.5,
                borderColor: error ? Colors.danger : isValid ? Colors.primary : Colors.border,
                ...Shadow.md,
              }}
            >
              {/* Country code */}
              <View style={{
                flexDirection: 'row', alignItems: 'center',
                marginRight: 12, paddingRight: 12,
                borderRightWidth: 1, borderRightColor: Colors.borderLight,
              }}>
                <Text style={{ fontSize: 20, marginRight: 6 }}>🇮🇳</Text>
                <Text style={{ fontFamily: Font.semibold, fontSize: 16, color: Colors.text }}>
                  +91
                </Text>
              </View>

              {/* Phone number input */}
              <TextInput
                style={{
                  flex: 1, height: '100%',
                  fontFamily: Font.medium, fontSize: 18,
                  color: Colors.text, letterSpacing: 1,
                }}
                placeholder={t('phone.placeholder')}
                placeholderTextColor={Colors.textPlaceholder}
                keyboardType="number-pad"
                maxLength={10}
                value={phone}
                onChangeText={handlePhoneChange}
                onFocus={handleFocus}
                onBlur={handleBlur}
                editable={!isLoading}
              />

              {/* Check mark when valid */}
              {isValid && (
                <View style={{
                  width: 28, height: 28, borderRadius: 14,
                  backgroundColor: Colors.successBg,
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Text style={{ fontSize: 14, color: Colors.success }}>✓</Text>
                </View>
              )}
            </View>
          </Animated.View>

          {/* Error message */}
          {error ? (
            <View style={{
              flexDirection: 'row', alignItems: 'center',
              marginTop: 10, paddingHorizontal: 4,
            }}>
              <View style={{
                width: 18, height: 18, borderRadius: 9,
                backgroundColor: Colors.dangerBg,
                alignItems: 'center', justifyContent: 'center',
                marginRight: 8,
              }}>
                <Text style={{ fontSize: 10, color: Colors.danger, fontWeight: '700' }}>!</Text>
              </View>
              <Text style={{ fontFamily: Font.regular, fontSize: 13, color: Colors.danger, flex: 1 }}>
                {error}
              </Text>
            </View>
          ) : null}

          {/* Continue button */}
          <TouchableOpacity
            style={{
              height: 56,
              borderRadius: Radius.lg,
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: 28,
              backgroundColor: isValid && !isLoading ? Colors.primary : `${Colors.primary}60`,
              ...(isValid && !isLoading ? Shadow.primary : {}),
            }}
            onPress={handleContinue}
            disabled={!isValid || isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <ActivityIndicator size="small" color={Colors.white} style={{ marginRight: 10 }} />
                <Text style={Type.button}>Checking...</Text>
              </View>
            ) : (
              <Text style={Type.button}>{t('phone.continueBtn')}</Text>
            )}
          </TouchableOpacity>

          {/* Footer */}
          <View style={{ flex: 1 }} />
          <View style={{ alignItems: 'center', paddingBottom: 16 }}>
            <Text style={{ fontFamily: Font.regular, fontSize: 12, color: 'rgba(0,0,0,0.6)', textAlign: 'center', lineHeight: 18 }}>
              {t('phone.termsPrefix')}{' '}
              <Text style={{ color: '#000', fontFamily: Font.medium }}>{t('phone.termsOfService')}</Text>
              {' '}{t('common.and')}{' '}
              <Text style={{ color: '#000', fontFamily: Font.medium }}>{t('phone.privacyPolicy')}</Text>
            </Text>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
      </SafeAreaView>

    </LinearGradient>
  );
}
