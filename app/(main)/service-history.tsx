import { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, ActivityIndicator, RefreshControl, TouchableOpacity, Image } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Colors, Font, Type, Shadow } from '@/lib/theme';

const STATUS_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  open: { bg: '#FEF3C7', text: '#B45309', label: 'Open' },
  in_progress: { bg: '#DBEAFE', text: '#1D4ED8', label: 'In Progress' },
  resolved: { bg: '#D1FAE5', text: '#047857', label: 'Resolved' },
  closed: { bg: '#F3F4F6', text: '#4B5563', label: 'Closed' },
};

export default function ServiceHistoryScreen() {
  const router = useRouter();
  const { user } = useAuth();
  
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchRequests = async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase
        .from('service_requests')
        .select('id, created_at, issue_description, status, resolution_notes, photo_url, resolved_at, parts_selected, payment_status, total_parts_cost')
        .eq('rider_id', user.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setRequests(data);
      }
    } catch (e) {
      console.error('[service-history] unexpected error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchRequests(); }, [user?.id]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchRequests();
  };

  const parseDescription = (desc: string) => {
    let title = "Service Request";
    let notes = "";
    if (desc) {
      if (desc.includes('Notes:')) {
        const parts = desc.split('Notes:');
        title = parts[0].trim();
        notes = parts[1].trim();
      } else if (desc.includes('—')) {
        const parts = desc.split('—');
        title = parts[0].trim();
        notes = parts[1].trim();
      } else {
        if (desc.startsWith('Requested Spare Parts:')) {
          title = desc;
          notes = "";
        } else {
          title = "Service Request";
          notes = desc;
        }
      }
    }
    return { title, notes };
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <StatusBar style="dark" />
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingTop: 16, paddingBottom: 16 }}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 16 }}>
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={{ fontFamily: Font.bold, fontSize: 24, color: '#0F172A' }}>Service History</Text>
      </View>

      <ScrollView
        style={{ flex: 1, paddingHorizontal: 24 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        {loading ? (
          <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
        ) : requests.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 60 }}>
            <View style={{ width: 100, height: 100, borderRadius: 50, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
              <Ionicons name="construct-outline" size={40} color="#94A3B8" />
            </View>
            <Text style={{ fontFamily: Font.bold, fontSize: 18, color: '#0F172A' }}>No History Yet</Text>
            <Text style={{ fontFamily: Font.medium, fontSize: 14, color: '#64748B', marginTop: 8, textAlign: 'center' }}>
              When you report issues or order parts, they will appear here.
            </Text>
          </View>
        ) : (
          requests.map(req => {
            const s = STATUS_CONFIG[req.status] || STATUS_CONFIG.open;
            const formattedDate = req.created_at
              ? new Date(req.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
              : '';
            
            const hasParts = req.parts_selected && Array.isArray(req.parts_selected) && req.parts_selected.length > 0;
            const { title, notes } = parseDescription(req.issue_description);
            const isParts = title.includes('Spare Parts');
            const isResolved = req.status === 'resolved' || req.status === 'closed';

            return (
              <View key={req.id} style={{
                backgroundColor: '#FFF', borderRadius: 24,
                padding: 20, marginBottom: 16,
                shadowColor: '#1E3A8A', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.04, shadowRadius: 16, elevation: 3,
                borderWidth: 1, borderColor: '#F8FAFC'
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: (notes || hasParts || req.photo_url || req.resolution_notes) ? 16 : 0 }}>
                  <View style={{
                    width: 46, height: 46, borderRadius: 14,
                    backgroundColor: isResolved ? '#ECFDF5' : (isParts ? '#F0FDF4' : '#EFF6FF'),
                    alignItems: 'center', justifyContent: 'center', marginRight: 16, marginTop: 2
                  }}>
                    <Ionicons
                      name={isResolved ? "checkmark-circle" : (isParts ? "build" : "construct")}
                      size={24}
                      color={isResolved ? '#059669' : (isParts ? '#16A34A' : '#2563EB')}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: Font.bold, fontSize: 16, color: '#0F172A', marginBottom: 4 }}>
                      {isParts ? "Spare Parts Order" : title}
                    </Text>
                    <Text style={{ fontFamily: Font.medium, fontSize: 13, color: '#64748B' }}>
                      {formattedDate}
                    </Text>
                  </View>
                  <View style={{
                    backgroundColor: s.bg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start'
                  }}>
                    <Text style={{ fontFamily: Font.bold, fontSize: 11, color: s.text, textTransform: 'uppercase' }}>
                      {s.label}
                    </Text>
                  </View>
                </View>

                {(notes || hasParts || req.photo_url || req.resolution_notes) && (
                  <View style={{ borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 16 }}>
                    {!!notes && !isParts && (
                      <Text style={{ fontFamily: Font.regular, fontSize: 14, color: '#475569', lineHeight: 22, marginBottom: 12 }}>
                        "{notes}"
                      </Text>
                    )}

                    {hasParts && (
                      <View style={{ backgroundColor: '#F8FAFC', padding: 14, borderRadius: 12, marginBottom: 12 }}>
                        <Text style={{ fontFamily: Font.bold, fontSize: 11, color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Items Purchased</Text>
                        {req.parts_selected.map((part: any, i: number) => (
                          <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                             <Text style={{ fontFamily: Font.medium, fontSize: 14, color: '#334155' }}>{part.name}</Text>
                             <Text style={{ fontFamily: Font.bold, fontSize: 14, color: '#0F172A' }}>₹{part.price}</Text>
                          </View>
                        ))}
                        <View style={{ borderTopWidth: 1, borderTopColor: '#E2E8F0', paddingTop: 8, marginTop: 8, flexDirection: 'row', justifyContent: 'space-between' }}>
                           <Text style={{ fontFamily: Font.bold, fontSize: 14, color: '#0F172A' }}>Total</Text>
                           <Text style={{ fontFamily: Font.bold, fontSize: 16, color: Colors.primary }}>₹{req.total_parts_cost}</Text>
                        </View>
                      </View>
                    )}

                    {req.photo_url && (
                      <Image
                        source={{ uri: req.photo_url }}
                        style={{ width: '100%', height: 140, borderRadius: 12, resizeMode: 'cover', marginBottom: 12 }}
                      />
                    )}

                    {req.resolution_notes && (
                      <View style={{ backgroundColor: '#ECFDF5', padding: 12, borderRadius: 12 }}>
                        <Text style={{ fontFamily: Font.bold, fontSize: 11, color: '#059669', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Resolution</Text>
                        <Text style={{ fontFamily: Font.regular, fontSize: 13, color: '#047857', lineHeight: 18 }}>
                          {req.resolution_notes}
                        </Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
