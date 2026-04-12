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
import { saveKyc, saveRiderProfile } from '@/lib/kyc';
import { Colors, Font, Type, Shadow, Radius, InputStyle, ButtonPrimary } from '@/lib/theme';
import KYCProgressBar from '@/components/KYCProgressBar';
import InlineErrorBanner from '@/components/InlineErrorBanner';
import { useTranslation } from 'react-i18next';

const schema = z.object({
  fullName: z.string().min(3, 'Full name must be at least 3 characters'),
  altPhone: z.string().optional().refine(
    val => !val || /^[0-9]{10}$/.test(val),
    'Must be a valid 10-digit phone number'
  ),
});

type FormData = z.infer<typeof schema>;

export default function KYCStep1() {
  const router = useRouter();
  const { user, session } = useAuth();
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);
  const [apiError, setApiError] = useState('');

  const { control, handleSubmit, formState: { errors }, setValue } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { fullName: '', altPhone: '' },
  });

  // Load existing data via centralized KYC hook
  const { data: kycData } = useKYC();

  useEffect(() => {
    if (kycData.name) setValue('fullName', kycData.name);
    if (kycData.phone_2) setValue('altPhone', kycData.phone_2);
  }, [kycData]);

  const onSubmit = async (formData: FormData) => {
    if (!user?.id) return;
    setSaving(true);
    setApiError('');
    try {
      const phone = user.phone || user.user_metadata?.phone || '';

      await saveRiderProfile({
        phone_1: phone,
        name: formData.fullName.trim(),
        phone_2: formData.altPhone?.trim() || null,
        status: 'pending_kyc',
      }, session?.access_token);

      // Ensure KYC record exists for subsequent steps
      await saveKyc({}, session?.access_token);

      router.push('/(auth)/kyc/step2' as Href);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save. Please try again.';
      console.error('[KYC Step1] Save error:', message);
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
          {/* Back button */}
          <TouchableOpacity
            onPress={() => router.back()}
            style={{
              width: 44, height: 44, borderRadius: 14,
              backgroundColor: Colors.white,
              alignItems: 'center', justifyContent: 'center',
              marginBottom: 20, ...Shadow.sm,
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={20} color={Colors.text} />
          </TouchableOpacity>

          <KYCProgressBar currentStep={1} />

          <InlineErrorBanner message={apiError} onDismiss={() => setApiError('')} />

          {/* Header */}
          <Text style={{ ...Type.h3, marginBottom: 4 }}>{t('kyc.step1.title')}</Text>
          <Text style={{ ...Type.body, color: Colors.textMuted, marginBottom: 28 }}>
            {t('kyc.step1.subtitle')}
          </Text>

          {/* Form Card */}
          <View style={{
            backgroundColor: Colors.white, borderRadius: Radius.xl,
            padding: 20, ...Shadow.md,
          }}>
            {/* Full Name */}
            <Text style={{ ...Type.label, marginBottom: 8 }}>
              {t('kyc.step1.fullNameLabel')} <Text style={{ color: Colors.danger }}>*</Text>
            </Text>
            <Controller
              control={control}
              name="fullName"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  style={{
                    ...InputStyle,
                    borderColor: errors.fullName ? Colors.danger : Colors.border,
                  }}
                  placeholder={t('kyc.step1.fullNamePlaceholder')}
                  placeholderTextColor={Colors.textPlaceholder}
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  editable={!saving}
                  autoCapitalize="words"
                />
              )}
            />
            {errors.fullName && (
              <Text style={{ fontFamily: Font.regular, fontSize: 12, color: Colors.danger, marginTop: 6, marginLeft: 4 }}>
                {errors.fullName.message}
              </Text>
            )}

            {/* Alt Phone */}
            <Text style={{ ...Type.label, marginBottom: 8, marginTop: 20 }}>
              {t('kyc.step1.altPhoneLabel')} <Text style={{ color: Colors.textLight }}>{t('kyc.step1.altPhoneOptional')}</Text>
            </Text>
            <Controller
              control={control}
              name="altPhone"
              render={({ field: { onChange, onBlur, value } }) => (
                <View style={{
                  flexDirection: 'row', alignItems: 'center',
                  ...InputStyle,
                  borderColor: errors.altPhone ? Colors.danger : Colors.border,
                  paddingHorizontal: 0,
                }}>
                  <View style={{
                    paddingHorizontal: 14,
                    borderRightWidth: 1, borderRightColor: Colors.borderLight,
                    marginRight: 10,
                  }}>
                    <Text style={{ fontFamily: Font.medium, fontSize: 14, color: Colors.textMuted }}>+91</Text>
                  </View>
                  <TextInput
                    style={{
                      flex: 1, fontFamily: Font.regular, fontSize: 15,
                      color: Colors.text, paddingRight: 14,
                    }}
                    placeholder="0000000000"
                    placeholderTextColor={Colors.textPlaceholder}
                    keyboardType="number-pad"
                    maxLength={10}
                    value={value}
                    onChangeText={text => onChange(text.replace(/[^0-9]/g, ''))}
                    onBlur={onBlur}
                    editable={!saving}
                  />
                </View>
              )}
            />
            {errors.altPhone && (
              <Text style={{ fontFamily: Font.regular, fontSize: 12, color: Colors.danger, marginTop: 6, marginLeft: 4 }}>
                {errors.altPhone.message}
              </Text>
            )}
          </View>

          {/* Continue button */}
          <TouchableOpacity
            style={{ ...ButtonPrimary, marginTop: 28 }}
            onPress={handleSubmit(onSubmit)}
            disabled={saving}
            activeOpacity={0.8}
          >
            {saving ? (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <ActivityIndicator size="small" color={Colors.white} style={{ marginRight: 10 }} />
                <Text style={Type.button}>{t('kyc.step1.savingBtn')}</Text>
              </View>
            ) : (
              <Text style={Type.button}>{t('kyc.step1.continueBtn')}</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
