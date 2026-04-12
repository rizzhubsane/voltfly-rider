import { useState, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Device from 'expo-device';
import * as Application from 'expo-application';
import { supabase } from '@/lib/supabase';
import { Colors, Font } from '@/lib/theme';
import { useTranslation } from 'react-i18next';

export const TNC_TEXT = `नियम एवं शर्तें (Terms & Conditions) – VOLTFLY EV LLP

मैं VOLTFLY EV LLP कंपनी से इलेक्ट्रिक स्कूटी साप्ताहिक किराये (Weekly Rental Basis) पर ले रहा/रही हूँ। इस स्कूटी पर मेरा कोई स्वामित्व (Ownership) अधिकार नहीं होगा।

कार्य समाप्त होने पर मैं स्कूटी तथा उसके साथ दिए गए सभी एक्सेसरीज़ (Accessories) सही स्थिति में कंपनी को वापस करूंगा/करूंगी। ऐसा न करने पर इसे चोरी माना जाएगा।

स्कूटी, बैटरी या उससे संबंधित किसी भी उपकरण में किसी प्रकार की क्षति, दुर्घटना या नुकसान होने पर उसकी पूरी जिम्मेदारी मेरी होगी तथा मैं उसकी आर्थिक भरपाई करूंगा/करूंगी।

कंपनी को मेरा पुलिस वेरिफिकेशन कराने का पूर्ण अधिकार होगा।

चोरी, धोखाधड़ी या किसी भी आपराधिक गतिविधि के मामले में कंपनी मेरे खिलाफ कानूनी कार्यवाही कर सकती है, जिस पर मुझे कोई आपत्ति नहीं होगी।

मैं स्कूटी का उपयोग केवल स्वयं करूंगा/करूंगी और इसे किसी अन्य व्यक्ति को उपयोग के लिए नहीं दूंगा/दूंगी।

मैं इस वाहन का उपयोग किसी भी गैरकानूनी कार्य के लिए नहीं करूंगा/करूंगी।

वाहन में किसी भी प्रकार की छेड़छाड़, नुकसान या तोड़-फोड़ होने पर कंपनी अधिकतम ₹20,000 तक का शुल्क वसूल सकती है।

मेरी किसी भी प्रकार की लापरवाही की स्थिति में कंपनी मेरे खिलाफ कानूनी कार्यवाही कर सकती है, और मैं इसके लिए सहमत हूँ।

मैं वाहन उपयोग हेतु ₹2000/- की सिक्योरिटी डिपॉजिट राशि जमा करने के लिए सहमत हूँ, जो शर्तों के अनुसार रिफंडेबल होगी।

यदि मैं निर्धारित कार्य/टारगेट पूरा नहीं करता/करती हूँ, तो तय शुल्क मेरी साप्ताहिक आय से काटा जा सकता है।

यदि मैं न्यूनतम निर्धारित अवधि (2 माह) पूर्ण होने से पहले वाहन जमा करता/करती हूँ, तो मेरी सिक्योरिटी डिपॉजिट वापस नहीं की जाएगी।

मैं सभी ट्रैफिक नियमों का पालन करूंगा/करूंगी। मेरे कारण यदि कोई चालान (Challan) होता है, तो उसका भुगतान मैं स्वयं करूंगा/करूंगी।

मैं वाहन को उसी स्थान पर वापस करूंगा/करूंगी जहां से मैंने इसे लिया था। ऐसा न करने पर कंपनी रिकवरी कार्यवाही कर सकती है और उसका ₹2000/- शुल्क मुझसे लिया जाएगा।

वाहन के उपयोग के दौरान किसी भी प्रकार के बीमा (Insurance) क्लेम की स्थिति में, आवश्यक सहयोग प्रदान करना मेरी जिम्मेदारी होगी।

मैं वाहन का नियमित रूप से उचित रखरखाव (Maintenance) करूंगा/करूंगी और किसी भी तकनीकी समस्या की जानकारी तुरंत कंपनी को दूंगा/दूंगी।

कंपनी को किसी भी समय बिना पूर्व सूचना के वाहन की जांच (Inspection) करने का अधिकार होगा।

वाहन के उपयोग के दौरान किसी भी प्रकार के नियम उल्लंघन, अनुशासनहीनता या अनुबंध का उल्लंघन होने पर कंपनी वाहन को तुरंत वापस लेने का अधिकार रखती है।

किसी भी विवाद की स्थिति में, संबंधित क्षेत्र के न्यायालय (Jurisdiction) का निर्णय अंतिम और मान्य होगा।

मैं यह घोषित करता/करती हूँ कि मैंने सभी नियम एवं शर्तें ध्यानपूर्वक पढ़ ली हैं और मैं इनसे पूर्णतः सहमत हूँ।

नोट:
वाहन को सही स्थिति में लौटाना अनिवार्य है।
नियमों के उल्लंघन की स्थिति में कंपनी कानूनी कार्यवाही करने के लिए स्वतंत्र होगी।`;

interface TnCModalProps {
  visible: boolean;
  phone: string;
  onClose: () => void;
  onConsentRecorded: () => void;
}

export default function TnCModal({ visible, phone, onClose, onConsentRecorded }: TnCModalProps) {
  const { t } = useTranslation();
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [checked, setChecked] = useState(false);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (hasScrolledToBottom) return;
    const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
    const distanceFromBottom = contentSize.height - (contentOffset.y + layoutMeasurement.height);
    if (distanceFromBottom <= 20) {
      setHasScrolledToBottom(true);
    }
  };

  const handleClose = () => {
    setHasScrolledToBottom(false);
    setChecked(false);
    setLoading(false);
    onClose();
  };

  const handleAgree = async () => {
    if (!hasScrolledToBottom || !checked) return;
    setLoading(true);

    try {
      const { error } = await supabase.rpc('record_consent', {
        p_phone: `+91${phone}`,
        p_device_platform: Platform.OS,
        p_device_os_version: Device.osVersion ?? 'unknown',
        p_app_version: Application.nativeApplicationVersion ?? 'unknown',
      });

      if (error) {
        throw new Error(error.message);
      }

      setHasScrolledToBottom(false);
      setChecked(false);
      onConsentRecorded();
    } catch (err: any) {
      Alert.alert('Could not record consent. Please try again.', err?.message ?? '');
    } finally {
      setLoading(false);
    }
  };

  const canAgree = hasScrolledToBottom && checked;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={() => {/* intentionally non-dismissable via back button */}}
    >
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' }}>
        <View style={{
          height: '87%',
          backgroundColor: '#FFF',
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          overflow: 'hidden',
        }}>
          {/* Drag handle */}
          <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 4 }}>
            <View style={{ width: 44, height: 5, borderRadius: 3, backgroundColor: '#E5E7EB' }} />
          </View>

          {/* Header */}
          <View style={{
            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
            paddingHorizontal: 20, paddingVertical: 16,
            borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
          }}>
            <Text style={{ fontFamily: Font.bold, fontSize: 18, color: '#111827' }}>
              {t('tnc.title')}
            </Text>
            <TouchableOpacity
              onPress={handleClose}
              style={{
                width: 34, height: 34, borderRadius: 17,
                backgroundColor: '#F3F4F6',
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Ionicons name="close" size={18} color="#374151" />
            </TouchableOpacity>
          </View>

          {/* T&C ScrollView */}
          <ScrollView
            ref={scrollRef}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24 }}
            showsVerticalScrollIndicator={true}
            style={{ flex: 1 }}
          >
            <Text style={{ fontFamily: Font.regular, fontSize: 13, lineHeight: 22, color: '#374151' }}>
              {TNC_TEXT}
            </Text>
          </ScrollView>

          {/* Bottom action area */}
          <View style={{
            paddingHorizontal: 20, paddingTop: 16, paddingBottom: 28,
            borderTopWidth: 1, borderTopColor: '#F3F4F6',
            backgroundColor: '#FFF',
          }}>
            {!hasScrolledToBottom ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                <Ionicons name="chevron-down" size={16} color="#9CA3AF" style={{ marginRight: 6 }} />
                <Text style={{ fontFamily: Font.medium, fontSize: 13, color: '#9CA3AF' }}>
                  {t('tnc.scrollPrompt')}
                </Text>
              </View>
            ) : (
              <TouchableOpacity
                onPress={() => setChecked(!checked)}
                style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 20 }}
                activeOpacity={0.7}
              >
                <View style={{
                  width: 22, height: 22,
                  borderRadius: 4,
                  borderWidth: 2,
                  borderColor: checked ? '#1A56DB' : '#1A56DB',
                  backgroundColor: checked ? '#1A56DB' : 'transparent',
                  alignItems: 'center', justifyContent: 'center',
                  marginRight: 12, marginTop: 1, flexShrink: 0,
                }}>
                  {checked && (
                    <Text style={{ color: '#FFF', fontSize: 13, fontFamily: Font.bold, lineHeight: 16 }}>✓</Text>
                  )}
                </View>
                <Text style={{ fontFamily: Font.medium, fontSize: 13, color: '#374151', flex: 1, lineHeight: 20 }}>
                  {t('tnc.agreeCheckbox')}
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={handleAgree}
              disabled={!canAgree || loading}
              style={{
                height: 52,
                borderRadius: 12,
                backgroundColor: canAgree ? '#1A56DB' : '#9CA3AF',
                alignItems: 'center', justifyContent: 'center',
                flexDirection: 'row',
              }}
              activeOpacity={0.85}
            >
              {loading ? (
                <>
                  <ActivityIndicator size="small" color="#FFF" style={{ marginRight: 10 }} />
                  <Text style={{ fontFamily: Font.bold, fontSize: 15, color: '#FFF' }}>
                    {t('tnc.recordingConsent')}
                  </Text>
                </>
              ) : (
                <Text style={{ fontFamily: Font.bold, fontSize: 15, color: '#FFF' }}>
                  {t('tnc.agreeBtn')}
                </Text>
              )}
            </TouchableOpacity>

            <Text style={{
              fontFamily: Font.regular, fontSize: 11, color: '#9CA3AF',
              textAlign: 'center', marginTop: 12, lineHeight: 16,
            }}>
              {t('tnc.consentFooter')}
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}
