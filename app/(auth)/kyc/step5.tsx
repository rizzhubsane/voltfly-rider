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
import { saveKyc, saveRiderProfile } from '@/lib/kyc';
import { Colors, Font, Type, Shadow, Radius, InputStyle, ButtonPrimary } from '@/lib/theme';
import KYCProgressBar from '@/components/KYCProgressBar';
import InlineErrorBanner from '@/components/InlineErrorBanner';
import { useTranslation } from 'react-i18next';

const refSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  phone: z.string().regex(/^[0-9]{10}$/, 'Must be 10 digits'),
});

const schema = z.object({
  ref1: refSchema,
  ref2: refSchema,
  ref3: refSchema,
});

type FormData = z.infer<typeof schema>;

export default function KYCStep5() {
  const router = useRouter();
  const { user, session } = useAuth();
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);
  const [apiError, setApiError] = useState('');

  const { control, handleSubmit, formState: { errors }, setValue } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      ref1: { name: '', phone: '' },
      ref2: { name: '', phone: '' },
      ref3: { name: '', phone: '' },
    },
  });

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const { data } = await supabase
        .from('kyc')
        .select('ref1_name, ref1_phone, ref2_name, ref2_phone, ref3_name, ref3_phone')
        .eq('rider_id', user.id)
        .maybeSingle();
      if (data) {
        if (data.ref1_name) setValue('ref1.name', data.ref1_name);
        if (data.ref1_phone) setValue('ref1.phone', data.ref1_phone);
        if (data.ref2_name) setValue('ref2.name', data.ref2_name);
        if (data.ref2_phone) setValue('ref2.phone', data.ref2_phone);
        if (data.ref3_name) setValue('ref3.name', data.ref3_name);
        if (data.ref3_phone) setValue('ref3.phone', data.ref3_phone);
      }
    })();
  }, [user?.id]);

  const onSubmit = async (formData: FormData) => {
    if (!user?.id) return;
    setSaving(true);
    setApiError('');
    try {
      await saveKyc({
        ref1_name: formData.ref1.name.trim(),
        ref1_phone: formData.ref1.phone,
        ref2_name: formData.ref2.name.trim(),
        ref2_phone: formData.ref2.phone,
        ref3_name: formData.ref3.name.trim(),
        ref3_phone: formData.ref3.phone,
        kyc_status: 'submitted',
      }, session?.access_token);

      await saveRiderProfile({
        status: 'kyc_submitted',
      }, session?.access_token);

      router.replace('/(auth)/kyc/submitted' as any);
    } catch (err: any) {
      const message = err?.message || 'Failed to save. Please try again.';
      console.error('[KYC Step5] Save error:', message);
      setApiError(message);
    } finally {
      setSaving(false);
    }
  };

  const REFS = [
    { key: 'ref1' as const, label: `${t('kyc.step5.reference')} 1`, color: Colors.primary, bg: Colors.primaryBg },
    { key: 'ref2' as const, label: `${t('kyc.step5.reference')} 2`, color: '#8B5CF6', bg: '#F5F3FF' },
    { key: 'ref3' as const, label: `${t('kyc.step5.reference')} 3`, color: '#F59E0B', bg: Colors.warningBg },
  ];

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

          <KYCProgressBar currentStep={5} />

          <InlineErrorBanner message={apiError} onDismiss={() => setApiError('')} />

          <Text style={{ ...Type.h3, marginBottom: 4 }}>{t('kyc.step5.title')}</Text>
          <Text style={{ ...Type.body, color: Colors.textMuted, marginBottom: 28 }}>
            {t('kyc.step5.subtitle')}
          </Text>

          {REFS.map(({ key, label, color, bg }) => {
            const e = errors[key];
            return (
              <View key={key} style={{
                backgroundColor: Colors.white, borderRadius: Radius.xl,
                padding: 20, marginBottom: 16, ...Shadow.md,
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
                  <View style={{
                    width: 36, height: 36, borderRadius: 10,
                    backgroundColor: bg,
                    alignItems: 'center', justifyContent: 'center', marginRight: 10,
                  }}>
                    <Ionicons name="person" size={18} color={color} />
                  </View>
                  <Text style={{ ...Type.subtitle }}>{label}</Text>
                </View>

                <Text style={{ ...Type.label, marginBottom: 6 }}>
                  {t('kyc.step5.fullNameLabel')} <Text style={{ color: Colors.danger }}>*</Text>
                </Text>
                <Controller
                  control={control}
                  name={`${key}.name`}
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      style={{ ...InputStyle, marginBottom: 4, borderColor: e?.name ? Colors.danger : Colors.border }}
                      placeholder={t('kyc.step5.fullNamePlaceholder')}
                      placeholderTextColor={Colors.textPlaceholder}
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      autoCapitalize="words"
                      editable={!saving}
                    />
                  )}
                />
                {e?.name && (
                  <Text style={{ fontFamily: Font.regular, fontSize: 12, color: Colors.danger, marginBottom: 8, marginLeft: 4 }}>
                    {e.name.message}
                  </Text>
                )}

                <Text style={{ ...Type.label, marginBottom: 6, marginTop: 10 }}>
                  {t('kyc.step5.phoneLabel')} <Text style={{ color: Colors.danger }}>*</Text>
                </Text>
                <Controller
                  control={control}
                  name={`${key}.phone`}
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      style={{ ...InputStyle, borderColor: e?.phone ? Colors.danger : Colors.border }}
                      placeholder={t('kyc.step5.phonePlaceholder')}
                      placeholderTextColor={Colors.textPlaceholder}
                      keyboardType="number-pad"
                      maxLength={10}
                      value={value}
                      onChangeText={text => onChange(text.replace(/[^0-9]/g, ''))}
                      onBlur={onBlur}
                      editable={!saving}
                    />
                  )}
                />
                {e?.phone && (
                  <Text style={{ fontFamily: Font.regular, fontSize: 12, color: Colors.danger, marginTop: 6, marginLeft: 4 }}>
                    {e.phone.message}
                  </Text>
                )}
              </View>
            );
          })}

          {/* Warning */}
          <View style={{
            backgroundColor: Colors.warningBg, borderRadius: Radius.md,
            padding: 12, flexDirection: 'row', alignItems: 'flex-start',
            marginBottom: 8,
          }}>
            <Ionicons name="alert-circle" size={16} color={Colors.warning} style={{ marginRight: 8, marginTop: 1 }} />
            <Text style={{ fontFamily: Font.regular, fontSize: 12, color: Colors.warningDark, flex: 1, lineHeight: 18 }}>
              {t('kyc.step5.finalWarning')}
            </Text>
          </View>

          <TouchableOpacity
            style={{ ...ButtonPrimary, marginTop: 20, backgroundColor: saving ? `${Colors.primary}80` : Colors.primary }}
            onPress={handleSubmit(onSubmit)}
            disabled={saving}
            activeOpacity={0.8}
          >
            {saving ? (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <ActivityIndicator size="small" color={Colors.white} style={{ marginRight: 10 }} />
                <Text style={Type.button}>{t('kyc.step5.submittingBtn')}</Text>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="checkmark-circle" size={20} color={Colors.white} style={{ marginRight: 8 }} />
                <Text style={Type.button}>{t('kyc.step5.submitBtn')}</Text>
              </View>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
