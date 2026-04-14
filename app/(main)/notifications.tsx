import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Colors, Font, Type, Shadow, Radius } from '@/lib/theme';
import { useTranslation } from 'react-i18next';

const TYPE_CONFIG: Record<string, { icon: string; color: string; bg: string }> = {
  payment: { icon: 'card', color: Colors.primary, bg: Colors.primaryBg },
  payment_reminder: { icon: 'wallet-outline', color: Colors.primary, bg: Colors.primaryBg },
  wallet_depleted: { icon: 'alert-circle', color: '#DC2626', bg: '#FEF2F2' },
  admin_broadcast: { icon: 'megaphone-outline', color: '#2563EB', bg: '#EFF6FF' },
  vehicle: { icon: 'bicycle', color: Colors.success, bg: Colors.successBg },
  service: { icon: 'construct', color: '#F59E0B', bg: Colors.warningBg },
  kyc: { icon: 'document-text', color: '#8B5CF6', bg: '#F5F3FF' },
  default: { icon: 'notifications', color: Colors.primary, bg: Colors.primaryBg },
};

function dedupeNotifRows<T extends { type?: string | null; message?: string | null; title?: string | null }>(
  rows: T[],
): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const r of rows) {
    const k = `${r.type ?? ''}\0${r.message ?? ''}\0${r.title ?? ''}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(r);
  }
  return out;
}

export default function NotificationsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadNotifications = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    const { data } = await supabase
      .from('notifications')
      .select('id, type, title, message, created_at')
      .eq('rider_id', user.id)
      .order('created_at', { ascending: false });
    if (data) setNotifications(dedupeNotifRows(data));
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`notifications-screen-${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `rider_id=eq.${user.id}` },
        () => loadNotifications(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, loadNotifications]);

  const formatDate = (d: string) => {
    const date = new Date(d);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHr = Math.floor(diffMs / 3600000);
    const diffDay = Math.floor(diffMs / 86400000);

    if (diffMin < 1) return t('notifications.justNow');
    if (diffMin < 60) return t('notifications.minutesAgo', { count: diffMin });
    if (diffHr < 24) return t('notifications.hoursAgo', { count: diffHr });
    if (diffDay < 7) return t('notifications.daysAgo', { count: diffDay });
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  // Group by date
  const grouped: Record<string, any[]> = {};
  notifications.forEach(n => {
    const date = new Date(n.created_at);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    let key: string;
    if (date.toDateString() === today.toDateString()) key = t('notifications.today');
    else if (date.toDateString() === yesterday.toDateString()) key = t('notifications.yesterday');
    else key = date.toLocaleDateString('en-IN', { day: 'numeric', month: 'long' });

    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(n);
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
      <StatusBar style="dark" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 12, paddingBottom: 40 }}>
        {/* Back */}
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: Colors.white, alignItems: 'center', justifyContent: 'center', marginBottom: 20, ...Shadow.sm }}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={20} color={Colors.text} />
        </TouchableOpacity>

        <Text style={{ ...Type.h2, marginBottom: 4 }}>{t('notifications.title')}</Text>
        <Text style={{ ...Type.body, color: Colors.textMuted, marginBottom: 24 }}>
          {t('notifications.subtitle')}
        </Text>

        {loading ? (
          <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
        ) : notifications.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 60 }}>
            <View style={{
              width: 72, height: 72, borderRadius: 36,
              backgroundColor: Colors.primaryBg,
              alignItems: 'center', justifyContent: 'center',
              marginBottom: 16,
            }}>
              <Ionicons name="notifications-off-outline" size={32} color={Colors.primaryLight} />
            </View>
            <Text style={{ ...Type.subtitle, marginBottom: 6 }}>{t('notifications.noNotifications')}</Text>
            <Text style={{ ...Type.body, color: Colors.textMuted }}>{t('notifications.allCaughtUp')}</Text>
          </View>
        ) : (
          Object.entries(grouped).map(([date, items]) => (
            <View key={date} style={{ marginBottom: 24 }}>
              <Text style={{ ...Type.captionMd, color: Colors.textMuted, marginBottom: 10, marginLeft: 4, textTransform: 'uppercase', letterSpacing: 1 }}>
                {date}
              </Text>
              {items.map(notif => {
                const config = TYPE_CONFIG[notif.type] || TYPE_CONFIG.default;
                return (
                  <View key={notif.id} style={{
                    backgroundColor: Colors.white, borderRadius: Radius.lg,
                    padding: 16, marginBottom: 8,
                    flexDirection: 'row', alignItems: 'flex-start',
                    ...Shadow.sm,
                  }}>
                    <View style={{
                      width: 40, height: 40, borderRadius: 12,
                      backgroundColor: config.bg,
                      alignItems: 'center', justifyContent: 'center',
                      marginRight: 12, marginTop: 2,
                    }}>
                      <Ionicons name={config.icon as any} size={18} color={config.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <Text style={{ fontFamily: Font.semibold, fontSize: 14, color: Colors.text, flex: 1, marginRight: 8 }}>
                          {notif.title}
                        </Text>
                        <Text style={{ fontFamily: Font.regular, fontSize: 11, color: Colors.textLight }}>
                          {formatDate(notif.created_at)}
                        </Text>
                      </View>
                      <Text style={{ fontFamily: Font.regular, fontSize: 13, color: Colors.textMuted, marginTop: 4, lineHeight: 19 }}>
                        {notif.message}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
