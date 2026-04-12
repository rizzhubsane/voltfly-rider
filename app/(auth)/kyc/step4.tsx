import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { saveKyc } from '@/lib/kyc';
import { Colors, Font, Type, Shadow, Radius, InputStyle, ButtonPrimary } from '@/lib/theme';
import KYCProgressBar from '@/components/KYCProgressBar';
import InlineErrorBanner from '@/components/InlineErrorBanner';
import { useTranslation } from 'react-i18next';

const schema = z.object({
  addressLocal: z.string().min(10, 'Please enter your full Delhi address (at least 10 characters)'),
  addressVillage: z.string().min(10, 'Please enter your full hometown address (at least 10 characters)'),
});

type FormData = z.infer<typeof schema>;

export default function KYCStep4() {
  const router = useRouter();
  const { user, session } = useAuth();
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);
  const [apiError, setApiError] = useState('');

  const { control, handleSubmit, formState: { errors }, setValue } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { addressLocal: '', addressVillage: '' },
  });

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const { data } = await supabase
        .from('kyc')
        .select('address_local, address_village')
        .eq('rider_id', user.id)
        .maybeSingle();
      if (data) {
        if (data.address_local) setValue('addressLocal', data.address_local);
        if (data.address_village) setValue('addressVillage', data.address_village);
      }
    })();
  }, [user?.id]);

  const onSubmit = async (formData: FormData) => {
    if (!user?.id) return;
    setSaving(true);
    setApiError('');
    try {
      await saveKyc({
        address_local: formData.addressLocal.trim(),
        address_village: formData.addressVillage.trim(),
      }, session?.access_token);
      router.push('/(auth)/kyc/step5' as any);
    } catch (err: any) {
      const message = err?.message || 'Failed to save. Please try again.';
      console.error('[KYC Step4] Save error:', message);
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
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: Colors.white, alignItems: 'center', justifyContent: 'center', marginBottom: 20, ...Shadow.sm }}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={20} color={Colors.text} />
          </TouchableOpacity>

          <KYCProgressBar currentStep={4} />

          <InlineErrorBanner message={apiError} onDismiss={() => setApiError('')} />

          <Text style={{ ...Type.h3, marginBottom: 4 }}>{t('kyc.step4.title')}</Text>
          <Text style={{ ...Type.body, color: Colors.textMuted, marginBottom: 28 }}>
            {t('kyc.step4.subtitle')}
          </Text>

          {/* Current Address Card */}
          <View style={{ backgroundColor: Colors.white, borderRadius: Radius.xl, padding: 20, marginBottom: 16, ...Shadow.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
              <View style={{
                width: 36, height: 36, borderRadius: 10,
                backgroundColor: Colors.primaryBg,
                alignItems: 'center', justifyContent: 'center', marginRight: 10,
              }}>
                <Ionicons name="location" size={18} color={Colors.primary} />
              </View>
              <Text style={{ ...Type.subtitle, flex: 1 }}>{t('kyc.step4.currentAddressLabel')}</Text>
            </View>

            <Controller
              control={control}
              name="addressLocal"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  style={{
                    ...InputStyle,
                    minHeight: 100,
                    textAlignVertical: 'top',
                    borderColor: errors.addressLocal ? Colors.danger : Colors.border,
                  }}
                  placeholder={t('kyc.step4.currentAddressPlaceholder')}
                  placeholderTextColor={Colors.textPlaceholder}
                  multiline
                  numberOfLines={4}
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  editable={!saving}
                />
              )}
            />
            {errors.addressLocal && (
              <Text style={{ fontFamily: Font.regular, fontSize: 12, color: Colors.danger, marginTop: 6, marginLeft: 4 }}>
                {errors.addressLocal.message}
              </Text>
            )}
          </View>

          {/* Permanent Address Card */}
          <View style={{ backgroundColor: Colors.white, borderRadius: Radius.xl, padding: 20, ...Shadow.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
              <View style={{
                width: 36, height: 36, borderRadius: 10,
                backgroundColor: '#F5F3FF',
                alignItems: 'center', justifyContent: 'center', marginRight: 10,
              }}>
                <Ionicons name="home" size={18} color="#8B5CF6" />
              </View>
              <Text style={{ ...Type.subtitle, flex: 1 }}>{t('kyc.step4.permanentAddressLabel')}</Text>
            </View>

            <Controller
              control={control}
              name="addressVillage"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  style={{
                    ...InputStyle,
                    minHeight: 100,
                    textAlignVertical: 'top',
                    borderColor: errors.addressVillage ? Colors.danger : Colors.border,
                  }}
                  placeholder={t('kyc.step4.permanentAddressPlaceholder')}
                  placeholderTextColor={Colors.textPlaceholder}
                  multiline
                  numberOfLines={4}
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  editable={!saving}
                />
              )}
            />
            {errors.addressVillage && (
              <Text style={{ fontFamily: Font.regular, fontSize: 12, color: Colors.danger, marginTop: 6, marginLeft: 4 }}>
                {errors.addressVillage.message}
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
                <Text style={Type.button}>{t('kyc.step4.savingBtn')}</Text>
              </View>
            ) : (
              <Text style={Type.button}>{t('kyc.step4.continueBtn')}</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
