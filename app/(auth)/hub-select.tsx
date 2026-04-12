import { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  Alert, ActivityIndicator, FlatList,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { saveRiderProfile } from '@/lib/kyc';
import { Colors, Font, Type, Shadow, Radius, ButtonPrimary } from '@/lib/theme';
import { useTranslation } from 'react-i18next';

interface Hub {
  id: string;
  name: string;
  address: string | null;
}

export default function HubSelectScreen() {
  const router = useRouter();
  const { user, session } = useAuth();
  const { t } = useTranslation();
  const [hubs, setHubs] = useState<Hub[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from('hubs').select('id, name, address');
      if (data) setHubs(data);
      if (error) Alert.alert(t('common.error'), t('hubSelect.errorLoad'));
      setLoading(false);
    })();
  }, []);

  const handleConfirm = async () => {
    if (!selected || !user?.id) return;
    setSaving(true);
    try {
      await saveRiderProfile({ hub_id: selected }, session?.access_token);
      router.replace('/(auth)/waiting' as any);
    } catch (err: any) {
      Alert.alert(t('common.error'), err?.message || t('hubSelect.errorSave'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
      <StatusBar style="dark" />
      <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 16 }}>
        {/* Back */}
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: Colors.white, alignItems: 'center', justifyContent: 'center', marginBottom: 24, ...Shadow.sm }}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={20} color={Colors.text} />
        </TouchableOpacity>

        <Text style={{ ...Type.h2, marginBottom: 4 }}>{t('hubSelect.title')}</Text>
        <Text style={{ ...Type.body, color: Colors.textMuted, marginBottom: 24 }}>
          {t('hubSelect.subtitle')}
        </Text>

        {loading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={{ ...Type.body, color: Colors.textMuted, marginTop: 12 }}>{t('hubSelect.loadingHubs')}</Text>
          </View>
        ) : (
          <FlatList
            data={hubs}
            keyExtractor={item => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 100 }}
            renderItem={({ item }) => {
              const isSelected = selected === item.id;
              return (
                <TouchableOpacity
                  onPress={() => setSelected(item.id)}
                  activeOpacity={0.8}
                  style={{
                    backgroundColor: Colors.white,
                    borderRadius: Radius.xl,
                    padding: 18,
                    marginBottom: 12,
                    flexDirection: 'row',
                    alignItems: 'center',
                    borderWidth: 2,
                    borderColor: isSelected ? Colors.primary : 'transparent',
                    ...Shadow.md,
                  }}
                >
                  <View style={{
                    width: 48, height: 48, borderRadius: 14,
                    backgroundColor: isSelected ? Colors.primaryBg : Colors.borderLight,
                    alignItems: 'center', justifyContent: 'center',
                    marginRight: 14,
                  }}>
                    <Ionicons
                      name="location"
                      size={22}
                      color={isSelected ? Colors.primary : Colors.textLight}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{
                      fontFamily: Font.semibold, fontSize: 15,
                      color: isSelected ? Colors.primary : Colors.text,
                    }}>
                      {item.name}
                    </Text>
                    {item.address && (
                      <Text style={{ fontFamily: Font.regular, fontSize: 12, color: Colors.textMuted, marginTop: 3 }}>
                        {item.address}
                      </Text>
                    )}
                  </View>
                  {isSelected && (
                    <View style={{
                      width: 28, height: 28, borderRadius: 14,
                      backgroundColor: Colors.primary,
                      alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Ionicons name="checkmark" size={16} color={Colors.white} />
                    </View>
                  )}
                </TouchableOpacity>
              );
            }}
          />
        )}

        {/* Confirm button — fixed at bottom */}
        <View style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          paddingHorizontal: 24, paddingBottom: 24, paddingTop: 12,
          backgroundColor: Colors.background,
        }}>
          <TouchableOpacity
            style={{ ...ButtonPrimary, backgroundColor: selected && !saving ? Colors.primary : `${Colors.primary}50` }}
            onPress={handleConfirm}
            disabled={!selected || saving}
            activeOpacity={0.8}
          >
            {saving ? (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <ActivityIndicator size="small" color={Colors.white} style={{ marginRight: 10 }} />
                <Text style={Type.button}>{t('hubSelect.savingBtn')}</Text>
              </View>
            ) : (
              <Text style={Type.button}>{t('hubSelect.confirmBtn')}</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
