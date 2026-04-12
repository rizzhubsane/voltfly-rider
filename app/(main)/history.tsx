import { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, ActivityIndicator, RefreshControl, TouchableOpacity } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Colors, Font, Type, Shadow } from '@/lib/theme';
import { useTranslation } from 'react-i18next';

export default function HistoryScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useTranslation();
  
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    if (!user?.id) return;
    try {
      const { data } = await supabase
        .from('payments')
        .select('id, created_at, plan_type, amount, method, status, paid_at')
        .eq('rider_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (data) setHistory(data);
    } catch (e) {
      console.error('[history] fetchData error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchData(); }, [user?.id]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
  };

  const formatDate = useCallback((d: string) => {
    try { return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); }
    catch { return d; }
  }, []);

  const renderHistoryItem = (p: any) => (
    <View key={p.id} style={{
      backgroundColor: '#FFF', borderRadius: 24,
      padding: 20, marginBottom: 16, flexDirection: 'row',
      alignItems: 'center', shadowColor: '#1E3A8A', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.04, shadowRadius: 16, elevation: 3,
      borderWidth: 1, borderColor: '#F8FAFC'
    }}>
      <View style={{
        width: 48, height: 48, borderRadius: 16,
        backgroundColor: (p.status === 'completed' || p.status === 'paid') ? '#ECFDF5' : '#FEF3C7',
        alignItems: 'center', justifyContent: 'center', marginRight: 16,
      }}>
        <Ionicons
          name={(p.status === 'completed' || p.status === 'paid') ? 'checkmark-circle' : 'time'}
          size={24}
          color={(p.status === 'completed' || p.status === 'paid') ? '#059669' : '#D97706'}
        />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: Font.bold, fontSize: 16, color: '#0F172A' }}>
          {p.plan_type === 'service' ? t('payments.spareParts', 'Spare Parts') : p.plan_type === 'custom' ? t('payments.customPlan', 'Custom Plan') : p.plan_type ? `${p.plan_type.charAt(0).toUpperCase() + p.plan_type.slice(1)} ${t('payments.plan', 'Plan')}` : t('payments.payment', 'Payment')}
        </Text>
        <Text style={{ fontFamily: Font.medium, fontSize: 13, color: '#64748B', marginTop: 4 }}>
          {p.paid_at ? formatDate(p.paid_at) : formatDate(p.created_at)}
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={{ fontFamily: Font.bold, fontSize: 18, color: '#0F172A' }}>
          ₹{p.amount?.toLocaleString('en-IN')}
        </Text>
        <View style={{
          backgroundColor: (p.status === 'paid' || p.status === 'completed') ? '#D1FAE5' : '#FEF3C7',
          paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginTop: 6,
        }}>
          <Text style={{
            fontFamily: Font.bold, fontSize: 11,
            color: (p.status === 'paid' || p.status === 'completed') ? '#047857' : '#B45309'
          }}>
            {p.status?.toUpperCase()}
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <StatusBar style="dark" />
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingTop: 16, paddingBottom: 16 }}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 16 }}>
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={{ fontFamily: Font.bold, fontSize: 24, color: '#0F172A' }}>{t('payments.history', 'Payment History')}</Text>
      </View>

      <ScrollView
        style={{ flex: 1, paddingHorizontal: 24 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        {loading ? (
          <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
        ) : history.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 60 }}>
            <View style={{ width: 100, height: 100, borderRadius: 50, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
              <Ionicons name="receipt-outline" size={40} color="#94A3B8" />
            </View>
            <Text style={{ fontFamily: Font.bold, fontSize: 18, color: '#0F172A' }}>{t('payments.noHistory', 'No History Yet')}</Text>
            <Text style={{ fontFamily: Font.medium, fontSize: 14, color: '#64748B', marginTop: 8 }}>
              {t('payments.selectPlan', 'Once you make a payment, it will appear here.')}
            </Text>
          </View>
        ) : (
          history.map(renderHistoryItem)
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
