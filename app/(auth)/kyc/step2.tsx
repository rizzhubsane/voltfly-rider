import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter, Href } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/hooks/useAuth';
import { useKYC } from '@/hooks/useKYC';
import { saveKyc } from '@/lib/kyc';
import { Colors, Font, Type, Shadow, Radius, InputStyle, ButtonPrimary } from '@/lib/theme';
import KYCProgressBar from '@/components/KYCProgressBar';
import InlineErrorBanner from '@/components/InlineErrorBanner';
import { useTranslation } from 'react-i18next';

const schema = z.object({
  aadhaar: z.string().regex(/^[0-9]{12}$/, 'Must be a valid 12-digit Aadhaar number'),
  pan: z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/, 'Must be a valid PAN (e.g. ABCDE1234F)'),
});

type FormData = z.infer<typeof schema>;

export default function KYCStep2() {
  const router = useRouter();
  const { user, session } = useAuth();
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);
  const [apiError, setApiError] = useState('');

  const { control, handleSubmit, formState: { errors }, setValue } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { aadhaar: '', pan: '' },
  });

  // Load existing data via centralized KYC hook
  const { data: kycData } = useKYC();

  useEffect(() => {
    if (kycData.aadhaar_number) setValue('aadhaar', kycData.aadhaar_number);
    if (kycData.pan_number) setValue('pan', kycData.pan_number);
  }, [kycData]);

  const onSubmit = async (formData: FormData) => {
    if (!user?.id) return;
    setSaving(true);
    setApiError('');
    try {
      await saveKyc({
        aadhaar_number: formData.aadhaar,
        pan_number: formData.pan.toUpperCase(),
      }, session?.access_token);
      router.push('/(auth)/kyc/step3' as Href);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save. Please try again.';
      console.error('[KYC Step2] Save error:', message);
      setApiError(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 12, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Back */}
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: Colors.white, alignItems: 'center', justifyContent: 'center', marginBottom: 20, ...Shadow.sm }}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={20} color={Colors.text} />
          </TouchableOpacity>

          <KYCProgressBar currentStep={2} />

          <InlineErrorBanner message={apiError} onDismiss={() => setApiError('')} />

          <Text style={{ ...Type.h3, marginBottom: 4 }}>{t('kyc.step2.title')}</Text>
          <Text style={{ ...Type.body, color: Colors.textMuted, marginBottom: 28 }}>
            {t('kyc.step2.subtitle')}
          </Text>

          <View style={{ backgroundColor: Colors.white, borderRadius: Radius.xl, padding: 20, ...Shadow.md }}>
            {/* Aadhaar */}
            <Text style={{ ...Type.label, marginBottom: 8 }}>
              {t('kyc.step2.aadhaarLabel')} <Text style={{ color: Colors.danger }}>*</Text>
            </Text>
            <Controller
              control={control}
              name="aadhaar"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  style={{ ...InputStyle, borderColor: errors.aadhaar ? Colors.danger : Colors.border, letterSpacing: 2 }}
                  placeholder={t('kyc.step2.aadhaarPlaceholder')}
                  placeholderTextColor={Colors.textPlaceholder}
                  keyboardType="number-pad"
                  maxLength={12}
                  value={value}
                  onChangeText={text => onChange(text.replace(/[^0-9]/g, ''))}
                  onBlur={onBlur}
                  editable={!saving}
                />
              )}
            />
            {errors.aadhaar && (
              <Text style={{ fontFamily: Font.regular, fontSize: 12, color: Colors.danger, marginTop: 6, marginLeft: 4 }}>
                {errors.aadhaar.message}
              </Text>
            )}

            {/* Info */}
            <View style={{
              flexDirection: 'row', alignItems: 'center',
              backgroundColor: Colors.primaryBg, borderRadius: Radius.sm,
              padding: 10, marginTop: 12, marginBottom: 8,
            }}>
              <Ionicons name="shield-checkmark" size={16} color={Colors.primary} style={{ marginRight: 8 }} />
              <Text style={{ fontFamily: Font.regular, fontSize: 11, color: Colors.primary, flex: 1 }}>
                {t('kyc.step2.aadhaarSecure')}
              </Text>
            </View>

            {/* PAN */}
            <Text style={{ ...Type.label, marginBottom: 8, marginTop: 16 }}>
              {t('kyc.step2.panLabel')} <Text style={{ color: Colors.danger }}>*</Text>
            </Text>
            <Controller
              control={control}
              name="pan"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  style={{ ...InputStyle, borderColor: errors.pan ? Colors.danger : Colors.border, letterSpacing: 2 }}
                  placeholder={t('kyc.step2.panPlaceholder')}
                  placeholderTextColor={Colors.textPlaceholder}
                  maxLength={10}
                  autoCapitalize="characters"
                  value={value}
                  onChangeText={text => onChange(text.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                  onBlur={onBlur}
                  editable={!saving}
                />
              )}
            />
            {errors.pan && (
              <Text style={{ fontFamily: Font.regular, fontSize: 12, color: Colors.danger, marginTop: 6, marginLeft: 4 }}>
                {errors.pan.message}
              </Text>
            )}
          </View>

          <TouchableOpacity
            style={{ ...ButtonPrimary, marginTop: 28 }}
            onPress={handleSubmit(onSubmit)}
            disabled={saving}
            activeOpacity={0.8}
          >
            {saving ? (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <ActivityIndicator size="small" color={Colors.white} style={{ marginRight: 10 }} />
                <Text style={Type.button}>{t('kyc.step2.savingBtn')}</Text>
              </View>
            ) : (
              <Text style={Type.button}>{t('kyc.step2.continueBtn')}</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
