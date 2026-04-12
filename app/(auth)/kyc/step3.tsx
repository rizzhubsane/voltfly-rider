import { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  Alert, ActivityIndicator, Image, Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter, Href } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '@/hooks/useAuth';
import { useKYC } from '@/hooks/useKYC';
import { supabase } from '@/lib/supabase';
import { saveKyc } from '@/lib/kyc';
import { Colors, Font, Type, Shadow, Radius, ButtonPrimary } from '@/lib/theme';
import KYCProgressBar from '@/components/KYCProgressBar';
import InlineErrorBanner from '@/components/InlineErrorBanner';
import { useTranslation } from 'react-i18next';

interface DocItem {
  key: string;
  label: string;
  icon: string;
  dbField: string;
}

const DOCS: DocItem[] = [
  { key: 'aadhaar_front', label: 'Aadhaar Front', icon: 'card-outline', dbField: 'aadhaar_front_url' },
  { key: 'aadhaar_back', label: 'Aadhaar Back', icon: 'card-outline', dbField: 'aadhaar_back_url' },
  { key: 'pan', label: 'PAN Card', icon: 'document-text-outline', dbField: 'pan_url' },
  { key: 'pcc', label: 'Police Clearance', icon: 'shield-checkmark-outline', dbField: 'pcc_url' },
  { key: 'selfie', label: 'Selfie Photo', icon: 'camera-outline', dbField: 'photo_url' },
];

export default function KYCStep3() {
  const router = useRouter();
  const { user, session } = useAuth();
  const { t } = useTranslation();
  const [uploads, setUploads] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [apiError, setApiError] = useState('');

  const DOCS: DocItem[] = [
    { key: 'aadhaar_front', label: t('kyc.step3.aadhaarFront'), icon: 'card-outline', dbField: 'aadhaar_front_url' },
    { key: 'aadhaar_back', label: t('kyc.step3.aadhaarBack'), icon: 'card-outline', dbField: 'aadhaar_back_url' },
    { key: 'pan', label: t('kyc.step3.panCard'), icon: 'document-text-outline', dbField: 'pan_url' },
    { key: 'pcc', label: t('kyc.step3.policeCheck'), icon: 'shield-checkmark-outline', dbField: 'pcc_url' },
    { key: 'selfie', label: t('kyc.step3.selfie'), icon: 'camera-outline', dbField: 'photo_url' },
  ];

  // Load existing data via centralized KYC hook
  const { data: kycData } = useKYC();

  useEffect(() => {
    const loaded: Record<string, string> = {};
    DOCS.forEach(doc => {
      const val = (kycData as any)[doc.dbField];
      if (val) loaded[doc.key] = val;
    });
    if (Object.keys(loaded).length > 0) setUploads(loaded);
  }, [kycData]);

  const pickAndUpload = async (doc: DocItem) => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.3, // Compressed to keep Base64 size safe for DB
        base64: true, // Natively returns base64 string
      });

      if (result.canceled || !result.assets[0].base64) return;

      setUploading(doc.key);
      
      // We skip Supabase Storage entirely. The Storage RLS policy actively blocks uploads, 
      // so we convert the image directly to a Base64 string and save it straight into the database URL column.
      const base64Url = `data:image/jpeg;base64,${result.assets[0].base64}`;

      await saveKyc({ [doc.dbField]: base64Url } as any);

      setUploads(prev => ({ ...prev, [doc.key]: base64Url }));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Please try again.';
      console.error('[KYC Step3] Local Save error:', message);
      setApiError(`Save failed: ${message}`);
    } finally {
      setUploading(null);
    }
  };

  const allUploaded = DOCS.every(doc => uploads[doc.key]);

  const handleContinue = async () => {
    if (!allUploaded) {
      setApiError(t('kyc.step3.missingDocs'));
      return;
    }
    router.push('/(auth)/kyc/step4' as Href);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 12, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: Colors.white, alignItems: 'center', justifyContent: 'center', marginBottom: 20, ...Shadow.sm }}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={20} color={Colors.text} />
        </TouchableOpacity>

        <KYCProgressBar currentStep={3} />

        <InlineErrorBanner message={apiError} onDismiss={() => setApiError('')} />

        <Text style={{ ...Type.h3, marginBottom: 4 }}>{t('kyc.step3.title')}</Text>
        <Text style={{ ...Type.body, color: Colors.textMuted, marginBottom: 24 }}>
          {t('kyc.step3.subtitle')}
        </Text>

        {/* Document cards */}
        {DOCS.map((doc, idx) => {
          const isUploaded = !!uploads[doc.key];
          const isCurrentlyUploading = uploading === doc.key;
          return (
            <TouchableOpacity
              key={doc.key}
              onPress={() => pickAndUpload(doc)}
              disabled={isCurrentlyUploading}
              activeOpacity={0.8}
              style={{
                backgroundColor: Colors.white,
                borderRadius: Radius.lg,
                padding: 16,
                marginBottom: 12,
                flexDirection: 'row',
                alignItems: 'center',
                borderWidth: 1.5,
                borderColor: isUploaded ? Colors.success : Colors.border,
                borderStyle: isUploaded ? 'solid' : 'dashed',
                ...Shadow.sm,
              }}
            >
              {/* Thumbnail or icon */}
              {isUploaded ? (
                <Image
                  source={{ uri: uploads[doc.key] }}
                  style={{ width: 48, height: 48, borderRadius: 10, marginRight: 14, backgroundColor: Colors.borderLight }}
                />
              ) : (
                <View style={{
                  width: 48, height: 48, borderRadius: 10,
                  backgroundColor: Colors.primaryBg,
                  alignItems: 'center', justifyContent: 'center',
                  marginRight: 14,
                }}>
                  <Ionicons name={doc.icon as any} size={22} color={Colors.primary} />
                </View>
              )}

              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: Font.semibold, fontSize: 14, color: Colors.text }}>
                  {doc.label}
                </Text>
                <Text style={{
                  fontFamily: Font.regular, fontSize: 12,
                  color: isUploaded ? Colors.success : Colors.textLight,
                  marginTop: 2,
                }}>
                  {isCurrentlyUploading ? t('kyc.step3.uploading') : isUploaded ? t('kyc.step3.uploaded') : t('kyc.step3.tapToUpload')}
                </Text>
              </View>

              {isCurrentlyUploading ? (
                <ActivityIndicator size="small" color={Colors.primary} />
              ) : isUploaded ? (
                <View style={{
                  width: 28, height: 28, borderRadius: 14,
                  backgroundColor: Colors.successBg,
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Ionicons name="checkmark" size={16} color={Colors.success} />
                </View>
              ) : (
                <Ionicons name="cloud-upload-outline" size={20} color={Colors.textLight} />
              )}
            </TouchableOpacity>
          );
        })}

        {/* Progress summary */}
        <View style={{
          backgroundColor: allUploaded ? Colors.successBg : Colors.primaryBg,
          borderRadius: Radius.md, padding: 12, marginTop: 8, marginBottom: 4,
          flexDirection: 'row', alignItems: 'center',
        }}>
          <Ionicons
            name={allUploaded ? 'checkmark-circle' : 'information-circle'}
            size={18}
            color={allUploaded ? Colors.success : Colors.primary}
            style={{ marginRight: 8 }}
          />
          <Text style={{
            fontFamily: Font.medium, fontSize: 13,
            color: allUploaded ? Colors.successDark : Colors.primary,
          }}>
            {Object.keys(uploads).length} {t('kyc.step3.docsOf')} {DOCS.length} {t('kyc.step3.docsUploaded')}
          </Text>
        </View>

        <TouchableOpacity
          style={{ ...ButtonPrimary, marginTop: 24, backgroundColor: allUploaded ? Colors.primary : `${Colors.primary}50` }}
          onPress={handleContinue}
          disabled={!allUploaded || saving}
          activeOpacity={0.8}
        >
          <Text style={Type.button}>{t('kyc.step3.continueBtn')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
