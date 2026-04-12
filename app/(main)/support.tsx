import { useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  Linking,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Font, Type, Shadow, Radius } from '@/lib/theme';
import { useTranslation } from 'react-i18next';

const FAQS = [
  { q: 'How do I swap my battery?', a: 'Visit your assigned hub during operating hours (6 AM - 10 PM). Show your rider ID and our staff will swap your battery within 5 minutes.' },
  { q: 'What if my scooty breaks down?', a: 'Submit a service request in the Services tab. For emergencies, call our helpline. We\'ll arrange a pickup within 2 hours in most areas.' },
  { q: 'How does the payment work?', a: 'Choose a daily, weekly, or monthly plan. Payments are made via Razorpay. Your ride access is active as long as your plan is current.' },
  { q: 'Can I change my hub?', a: 'Contact support via WhatsApp to request a hub change. Changes are processed within 24 hours subject to availability.' },
  { q: 'How do I exit and get my deposit back?', a: 'Go to Profile → Exit Voltfly. Return your vehicle to the hub and your deposit will be refunded within 7 working days.' },
];

function FAQItem({ faq }: { faq: { q: string; a: string } }) {
  const [open, setOpen] = useState(false);
  return (
    <TouchableOpacity
      onPress={() => setOpen(!open)}
      activeOpacity={0.8}
      style={{
        backgroundColor: Colors.white,
        borderRadius: Radius.lg,
        padding: 16, marginBottom: 10,
        ...Shadow.sm,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Text style={{ fontFamily: Font.semibold, fontSize: 14, color: Colors.text, flex: 1 }}>
          {faq.q}
        </Text>
        <Ionicons
          name={open ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={Colors.textMuted}
        />
      </View>
      {open && (
        <Text style={{
          fontFamily: Font.regular, fontSize: 13, color: Colors.textMuted,
          marginTop: 10, lineHeight: 20,
        }}>
          {faq.a}
        </Text>
      )}
    </TouchableOpacity>
  );
}

export default function SupportScreen() {
  const router = useRouter();
  const { t } = useTranslation();

  const CONTACTS = [
    {
      icon: 'logo-whatsapp', label: t('support.whatsapp'),
      desc: t('support.whatsappDesc'), color: Colors.whatsapp,
      onPress: () => Linking.openURL('https://wa.me/918800000000'),
    },
    {
      icon: 'call', label: t('support.call'),
      desc: '+91 88000 00000', color: Colors.primary,
      onPress: () => Linking.openURL('tel:+918800000000'),
    },
    {
      icon: 'mail', label: t('support.email'),
      desc: 'support@voltfly.in', color: '#F59E0B',
      onPress: () => Linking.openURL('mailto:support@voltfly.in'),
    },
  ];

  const FAQS: { q: string; a: string }[] = t('support.faqs', { returnObjects: true }) as { q: string; a: string }[];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
      <StatusBar style="dark" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 40 }}>
        {/* Back */}
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: Colors.white, alignItems: 'center', justifyContent: 'center', marginBottom: 20, ...Shadow.sm }}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={20} color={Colors.text} />
        </TouchableOpacity>

        <Text style={Type.h2}>{t('support.title')}</Text>
        <Text style={{ ...Type.body, color: Colors.textMuted, marginTop: 4, marginBottom: 24 }}>
          {t('support.subtitle')}
        </Text>

        {/* Contact cards */}
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 28 }}>
          {CONTACTS.map((c, i) => (
            <TouchableOpacity
              key={i}
              onPress={c.onPress}
              activeOpacity={0.8}
              style={{
                flex: 1, backgroundColor: Colors.white,
                borderRadius: Radius.xl, padding: 16,
                alignItems: 'center', ...Shadow.md,
              }}
            >
              <View style={{
                width: 44, height: 44, borderRadius: 12,
                backgroundColor: `${c.color}15`,
                alignItems: 'center', justifyContent: 'center',
                marginBottom: 10,
              }}>
                <Ionicons name={c.icon as any} size={22} color={c.color} />
              </View>
              <Text style={{ fontFamily: Font.semibold, fontSize: 13, color: Colors.text, marginBottom: 2 }}>
                {c.label}
              </Text>
              <Text style={{ fontFamily: Font.regular, fontSize: 11, color: Colors.textMuted, textAlign: 'center' }}>
                {c.desc}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* FAQs */}
        <Text style={{ ...Type.subtitle, marginBottom: 14 }}>{t('support.faqTitle')}</Text>
        {FAQS.map((faq, i) => (
          <FAQItem key={i} faq={faq} />
        ))}        
      </ScrollView>
    </SafeAreaView>
  );
}
