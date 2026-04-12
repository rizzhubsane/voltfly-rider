import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  Alert, ActivityIndicator, Image, RefreshControl,
  Linking, Modal, TouchableWithoutFeedback
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { processPayment } from '@/lib/razorpay';
import { Colors, Font, Type, Shadow, Radius, InputStyle, ButtonPrimary } from '@/lib/theme';

const SPARE_PARTS = [
  { item: "FRONT VISOR", price: 280 },
  { item: "Front panel", price: 800 },
  { item: "Front panel eye", price: 150 },
  { item: "VISOR JALI", price: 80 },
  { item: "BODY panel (L)", price: 550 },
  { item: "BODY panel (R)", price: 550 },
  { item: "SIDE RAIL L", price: 250 },
  { item: "SIDE RAIL R", price: 250 },
  { item: "Front fender", price: 220 },
  { item: "FCC", price: 250 },
  { item: "FCC JALI", price: 80 },
  { item: "TAIL LIGHT COVER", price: 220 },
  { item: "METER COVER", price: 220 },
  { item: "METER COVER DECORATION", price: 150 },
  { item: "Wheel Cover Set", price: 250 },
  { item: "Tool box", price: 600 },
  { item: "Front inner Cover", price: 350 },
  { item: "Floor Board Under Cover", price: 220 },
  { item: "FLOOR Board", price: 600 },
  { item: "FLOOR Board cover", price: 90 },
  { item: "CHARGING SHOCKET COVER", price: 180 },
  { item: "LUGGAGE BOX", price: 500 },
  { item: "LUGGAGE BOX COVER", price: 100 },
  { item: "Rear fender", price: 250 },
  { item: "Rear LOWER fender", price: 100 },
  { item: "Controller under Cover", price: 175 },
  { item: "Body cover attachment set", price: 250 },
  { item: "BEG Hook", price: 80 },
  { item: "VIN cover", price: 30 },
  { item: "Head Lamp Assy. Without Bulb", price: 650 },
  { item: "Tail Lamp Assy. Without Bulb", price: 730 },
  { item: "Front Indicator set", price: 300 },
  { item: "Reflector 1 Set (2 round, 1 rectangle)", price: 80 }
];

const SERVICE_TYPES = [
  { id: 'puncture', label: 'Puncture / Tyre Issue', icon: 'radio-button-off' },
  { id: 'power', label: 'Power / Startup', icon: 'flash' },
  { id: 'brake', label: 'Brakes', icon: 'speedometer' },
  { id: 'electrical', label: 'Electrical', icon: 'flash' },
  { id: 'other', label: 'Other', icon: 'construct' },
];

const STATUS_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  open: { bg: '#FEF3C7', text: '#B45309', label: 'Open' },
  in_progress: { bg: '#DBEAFE', text: '#1D4ED8', label: 'In Progress' },
  resolved: { bg: '#D1FAE5', text: '#047857', label: 'Resolved' },
  closed: { bg: '#F3F4F6', text: '#4B5563', label: 'Closed' },
};

export default function ServicesScreen() {
  const { user } = useAuth();
  const router = useRouter();
  
  // General State
  const [showForm, setShowForm] = useState(false);
  const [formMode, setFormMode] = useState<'spares' | 'general' | 'contact'>('spares');
  const [isDescFocused, setIsDescFocused] = useState(false);
  
  // Form State
  const [selectedParts, setSelectedParts] = useState<string[]>([]);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const togglePart = (item: string) => {
    if (selectedParts.includes(item)) {
      setSelectedParts(selectedParts.filter(p => p !== item));
    } else {
      setSelectedParts([...selectedParts, item]);
    }
  };

  const calculateTotal = () => {
    return selectedParts.reduce((total, partName) => {
      const part = SPARE_PARTS.find(p => p.item === partName);
      return total + (part?.price || 0);
    }, 0);
  };

  const resetForm = () => {
    setShowForm(false);
    setSelectedParts([]);
    setSelectedType(null);
    setDescription('');
    setPhotoUri(null);
    setFormMode('spares');
  };

  const handleSubmit = async () => {
    const totalAmount = calculateTotal();
    
    if (formMode === 'spares' && selectedParts.length === 0) {
      Alert.alert('Required', 'Please select at least one spare part, or switch to General Issue.');
      return;
    }
    if (formMode === 'general' && !description.trim() && !selectedType) {
      Alert.alert('Required', 'Please describe your issue or select an issue type.');
      return;
    }
    
    if (!user?.id) return;
    setSubmitting(true);

    let razorpay_payment_id = null;
    let payment_status = 'n/a';

    if (formMode === 'spares' && totalAmount > 0) {
      try {
        const result = await processPayment(totalAmount, {
          receipt: `spares_${user.id}_${Date.now()}`,
          description: `Voltfly Spare Parts`,
          notes: { 
            type: 'spare_parts', 
            rider_id: user.id,
            parts: selectedParts.join(', ')
          },
        });
        razorpay_payment_id = result !== 'web_simulated' ? (result as any).razorpay_payment_id : null;
        payment_status = 'paid';
      } catch (err: any) {
        setSubmitting(false);
        if (err.message !== 'PAYMENT_CANCELLED') {
          Alert.alert('Payment Failed', err.message);
        }
        return;
      }
    }

    try {
      let photo_url: string | null = null;
      if (photoUri) {
        try {
          const resp = await fetch(photoUri);
          const blob = await resp.blob();
          const arr = await new Response(blob).arrayBuffer();
          const ext = photoUri.split('.').pop() ?? 'jpg';
          const path = `service/${user.id}/${Date.now()}.${ext}`;
          await supabase.storage.from('service-photos').upload(path, arr, { contentType: blob.type || 'image/jpeg' });
          const { data: urlData } = supabase.storage.from('service-photos').getPublicUrl(path);
          photo_url = urlData.publicUrl;
        } catch (photoErr) {
          console.warn('[services] Photo upload failed, continuing without:', photoErr);
        }
      }

      const { data: vehicleData } = await supabase
        .from('vehicles')
        .select('id')
        .eq('assigned_rider_id', user.id)
        .limit(1)
        .maybeSingle();

      const typeLabel = selectedType ? SERVICE_TYPES.find(t => t.id === selectedType)?.label : null;
      let fullDescription = '';
      
      if (formMode === 'spares') {
        fullDescription = `Requested Spare Parts: ${selectedParts.join(', ')}`;
        if (description.trim()) {
           fullDescription += `\nNotes: ${description.trim()}`;
        }
      } else {
        fullDescription = [
          typeLabel ? `[${typeLabel}]` : null,
          description.trim() || null,
        ].filter(Boolean).join(' — ');
      }

      const partsJson = selectedParts.map(pName => {
        const p = SPARE_PARTS.find(s => s.item === pName);
        return { name: p?.item, price: p?.price };
      });

      const insertPayload: Record<string, any> = {
        rider_id: user.id,
        vehicle_id: vehicleData?.id || null,
        status: 'open',
        issue_description: fullDescription || 'No description provided',
        parts_selected: formMode === 'spares' && partsJson.length > 0 ? partsJson : null,
        total_parts_cost: formMode === 'spares' ? totalAmount : 0,
        payment_status: payment_status,
        razorpay_payment_id: razorpay_payment_id
      };
      
      if (photo_url) insertPayload.photo_url = photo_url;

      const { error: insertError } = await supabase.from('service_requests').insert(insertPayload);

      if (insertError) {
        throw new Error(insertError.message);
      }

      if (formMode === 'spares' && totalAmount > 0 && payment_status === 'paid') {
        const { error: paymentError } = await supabase.from('payments').insert({
          rider_id: user.id,
          amount: totalAmount,
          plan_type: 'service',
          method: 'upi',
          status: 'paid',
          due_date: new Date().toISOString().split('T')[0],
          razorpay_payment_id: razorpay_payment_id,
          paid_at: new Date().toISOString(),
          notes: `Paid for Spares: ${selectedParts.join(', ')}`
        });
        if (paymentError) {
          console.warn('[services] Failed to log spare parts payment:', paymentError);
        }
      }

      Alert.alert('Request Submitted ✓', 'Your request has been successfully submitted.');
      resetForm();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const SUPPORT_PHONE = '+919899089969';
  const SUPPORT_EMAIL = 'gsanghi@voltflyev.com';

  const handleCall = () => {
    const url = `tel:${SUPPORT_PHONE}`;
    Linking.canOpenURL(url).then(supported => {
      if (supported) Linking.openURL(url);
      else Alert.alert('Error', 'Unable to make a call from this device.');
    });
  };

  const handleWhatsApp = () => {
    const url = `https://wa.me/${SUPPORT_PHONE}`;
    Linking.canOpenURL(url).then(supported => {
      if (supported) Linking.openURL(url);
      else Alert.alert('Error', 'WhatsApp is not installed on this device.');
    });
  };

  const handleEmail = () => {
    const url = `mailto:${SUPPORT_EMAIL}`;
    Linking.canOpenURL(url).then(supported => {
      if (supported) Linking.openURL(url);
      else Alert.alert('Error', 'No email app found on this device.');
    });
  };

  const handleContactUs = () => {
    Alert.alert(
      'Contact Support',
      'Choose how you\'d like to reach us:',
      [
        { text: 'Call', onPress: handleCall },
        { text: 'WhatsApp', onPress: handleWhatsApp },
        { text: 'Email', onPress: handleEmail },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
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
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
      <StatusBar style="dark" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 100 }}
      >
        {/* Header */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <View>
            <Text style={{ ...Type.h2, fontSize: 26, fontFamily: Font.bold }}>Services</Text>
            <Text style={{ ...Type.body, color: Colors.textMuted, marginTop: 4 }}>Manage repairs and spares</Text>
          </View>
          <TouchableOpacity 
            onPress={() => router.push('/(main)/service-history' as any)}
            style={{ 
              backgroundColor: '#EFF6FF', paddingHorizontal: 16, paddingVertical: 10, 
              borderRadius: 14, flexDirection: 'row', alignItems: 'center'
            }}
          >
            <Ionicons name="receipt-outline" size={20} color="#1D4ED8" style={{ marginRight: 8 }} />
            <Text style={{ fontFamily: Font.bold, fontSize: 15, color: '#1D4ED8' }}>History</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Action Cards */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginBottom: 32 }}>
          <TouchableOpacity
            style={{
              flex: 1, minWidth: '45%', backgroundColor: '#EFF6FF',
              padding: 24, borderRadius: 24, borderWidth: 1, borderColor: '#BFDBFE',
              alignItems: 'flex-start', shadowColor: '#1D4ED8', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
              minHeight: 160, justifyContent: 'center'
            }}
            onPress={() => { setFormMode('general'); setShowForm(true); }}
            activeOpacity={0.8}
          >
            <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: '#3B82F6', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
              <Ionicons name="construct" size={28} color="#FFF" />
            </View>
            <Text style={{ fontFamily: Font.bold, fontSize: 18, color: '#1E3A8A' }}>Request Repair</Text>
            <Text style={{ fontFamily: Font.medium, fontSize: 13, color: '#3B82F6', marginTop: 6 }}>Report bike issue</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{
              flex: 1, minWidth: '45%', backgroundColor: '#F0FDF4',
              padding: 24, borderRadius: 24, borderWidth: 1, borderColor: '#BBF7D0',
              alignItems: 'flex-start', shadowColor: '#16A34A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
              minHeight: 160, justifyContent: 'center'
            }}
            onPress={() => { setFormMode('spares'); setShowForm(true); }}
            activeOpacity={0.8}
          >
            <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: '#22C55E', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
              <Ionicons name="build" size={28} color="#FFF" />
            </View>
            <Text style={{ fontFamily: Font.bold, fontSize: 18, color: '#14532D' }}>Buy Spares</Text>
            <Text style={{ fontFamily: Font.medium, fontSize: 13, color: '#22C55E', marginTop: 6 }}>Order parts</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={{
              width: '100%', backgroundColor: '#FFF',
              padding: 20, borderRadius: 20, borderWidth: 1, borderColor: '#E5E7EB',
              flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
              shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1
            }}
            onPress={() => { setFormMode('contact'); setShowForm(true); }}
            activeOpacity={0.8}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center', marginRight: 16 }}>
                <Ionicons name="headset" size={24} color="#4B5563" />
              </View>
              <View>
                <Text style={{ fontFamily: Font.bold, fontSize: 16, color: '#111827' }}>Contact Support</Text>
                <Text style={{ fontFamily: Font.medium, fontSize: 13, color: '#6B7280', marginTop: 2 }}>Call or WhatsApp Hub</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#9CA3AF" />
          </TouchableOpacity>
        </View>


      </ScrollView>



      {/* "New Request" Bottom Sheet Modal */}
      <Modal
        visible={showForm}
        transparent={true}
        animationType="slide"
        onRequestClose={resetForm}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <TouchableWithoutFeedback onPress={resetForm}>
            <View style={{ flex: 1 }} />
          </TouchableWithoutFeedback>
          
          <View style={{ 
            height: '85%', backgroundColor: '#FFF', 
            borderTopLeftRadius: 32, borderTopRightRadius: 32,
            paddingTop: 8, paddingHorizontal: 0, 
            shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 10 
          }}>
            {/* Drag Handle */}
            <View style={{ width: 48, height: 6, borderRadius: 3, backgroundColor: '#E5E7EB', alignSelf: 'center', marginBottom: 20, marginTop: 4 }} />
            
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, marginBottom: 24 }}>
              <Text style={{ ...Type.h2, fontSize: 24, fontFamily: Font.bold }}>New Request</Text>
              <TouchableOpacity onPress={resetForm} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="close" size={20} color={Colors.text} />
              </TouchableOpacity>
            </View>

            {/* Segmented Control */}
            <View style={{ 
              flexDirection: 'row', backgroundColor: '#F3F4F6', 
              borderRadius: 100, padding: 6, marginHorizontal: 24, marginBottom: 30 
            }}>
              {[
                { id: 'spares', label: 'Spare Parts' },
                { id: 'general', label: 'General' },
                { id: 'contact', label: 'Contact Us' }
              ].map(tab => {
                const isActive = formMode === tab.id;
                return (
                  <TouchableOpacity
                    key={tab.id}
                    style={{
                      flex: 1, paddingVertical: 12, borderRadius: 100, alignItems: 'center',
                      backgroundColor: isActive ? '#FFF' : 'transparent',
                      shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: isActive ? 0.05 : 0, shadowRadius: 4, elevation: isActive ? 2 : 0
                    }}
                    onPress={() => setFormMode(tab.id as any)}
                  >
                    <Text style={{ fontFamily: isActive ? Font.bold : Font.medium, fontSize: 13, color: isActive ? Colors.primary : Colors.textMuted }}>{tab.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
              {formMode === 'contact' ? (
                <View style={{ alignItems: 'center', paddingTop: 40 }}>
                  <View style={{ width: 100, height: 100, borderRadius: 50, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
                    <Ionicons name="headset" size={48} color={Colors.primary} />
                  </View>
                  <Text style={{ fontFamily: Font.bold, fontSize: 24, color: Colors.text, textAlign: 'center', marginBottom: 12 }}>Need direct help?</Text>
                  <Text style={{ fontFamily: Font.regular, fontSize: 16, color: Colors.textMuted, textAlign: 'center', paddingHorizontal: 20, lineHeight: 24, marginBottom: 32 }}>
                    Our hub managers are available to assist you with critical or urgent service requests straight away.
                  </Text>

                  {/* Contact Info Cards */}
                  <View style={{ width: '100%', backgroundColor: '#F9FAFB', borderRadius: 20, padding: 20, marginBottom: 28, borderWidth: 1, borderColor: '#F3F4F6' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                      <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center', marginRight: 14 }}>
                        <Ionicons name="call" size={18} color={Colors.primary} />
                      </View>
                      <View>
                        <Text style={{ fontFamily: Font.medium, fontSize: 12, color: Colors.textMuted, marginBottom: 2 }}>Phone / WhatsApp</Text>
                        <Text style={{ fontFamily: Font.bold, fontSize: 16, color: Colors.text }}>+91 98990 89969</Text>
                      </View>
                    </View>
                    <View style={{ height: 1, backgroundColor: '#F3F4F6', marginBottom: 16 }} />
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center', marginRight: 14 }}>
                        <Ionicons name="mail" size={18} color={Colors.primary} />
                      </View>
                      <View>
                        <Text style={{ fontFamily: Font.medium, fontSize: 12, color: Colors.textMuted, marginBottom: 2 }}>Email</Text>
                        <Text style={{ fontFamily: Font.bold, fontSize: 15, color: Colors.text }}>gsanghi@voltflyev.com</Text>
                      </View>
                    </View>
                  </View>

                  {/* Action Buttons */}
                  <TouchableOpacity
                    style={{ 
                      backgroundColor: Colors.primary, width: '100%', paddingVertical: 16, 
                      borderRadius: Radius.xl, flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
                      marginBottom: 12,
                      shadowColor: Colors.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4
                    }}
                    onPress={handleCall}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="call" size={20} color={Colors.white} style={{ marginRight: 10 }} />
                    <Text style={{ fontFamily: Font.bold, fontSize: 16, color: Colors.white }}>Call Now</Text>
                  </TouchableOpacity>

                  <View style={{ flexDirection: 'row', gap: 12, width: '100%' }}>
                    <TouchableOpacity
                      style={{ 
                        flex: 1, paddingVertical: 16, borderRadius: Radius.xl,
                        flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
                        backgroundColor: '#25D366',
                      }}
                      onPress={handleWhatsApp}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="logo-whatsapp" size={20} color="#FFF" style={{ marginRight: 8 }} />
                      <Text style={{ fontFamily: Font.bold, fontSize: 15, color: '#FFF' }}>WhatsApp</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={{ 
                        flex: 1, paddingVertical: 16, borderRadius: Radius.xl,
                        flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
                        backgroundColor: '#F3F4F6',
                      }}
                      onPress={handleEmail}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="mail" size={20} color={Colors.text} style={{ marginRight: 8 }} />
                      <Text style={{ fontFamily: Font.bold, fontSize: 15, color: Colors.text }}>Email</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View>
                  {/* Spare Parts List */}
                  {formMode === 'spares' && (
                    <View style={{ marginBottom: 30 }}>
                      <Text style={{ fontFamily: Font.bold, fontSize: 16, color: Colors.text, marginBottom: 16 }}>Select Parts to Purchase</Text>
                      <View style={{ height: 260, borderRadius: 20, overflow: 'hidden' }}>
                        <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={true} contentContainerStyle={{ paddingBottom: 10 }}>
                          {SPARE_PARTS.map((part, idx) => {
                            const isSelected = selectedParts.includes(part.item);
                            return (
                              <TouchableOpacity
                                key={idx}
                                onPress={() => togglePart(part.item)}
                                style={{
                                  flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                                  padding: 16, marginBottom: 10, borderRadius: 16,
                                  backgroundColor: isSelected ? '#EFF6FF' : '#FFF',
                                  borderWidth: 1, borderColor: isSelected ? '#BFDBFE' : '#F3F4F6',
                                }}
                              >
                                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                                  <Ionicons 
                                    name={isSelected ? "checkmark-circle" : "ellipse-outline"} 
                                    size={24} 
                                    color={isSelected ? Colors.primary : '#D1D5DB'} 
                                    style={{ marginRight: 14 }}
                                  />
                                  <Text style={{ fontFamily: isSelected ? Font.bold : Font.medium, fontSize: 15, color: isSelected ? Colors.primary : Colors.text, flex: 1, marginRight: 8 }}>
                                    {part.item}
                                  </Text>
                                </View>
                                <Text style={{ fontFamily: Font.bold, fontSize: 16, color: isSelected ? Colors.primary : Colors.text }}>₹{part.price}</Text>
                              </TouchableOpacity>
                            )
                          })}
                        </ScrollView>
                      </View>
                    </View>
                  )}

                  {/* General Issue Type */}
                  {formMode === 'general' && (
                    <View style={{ marginBottom: 28 }}>
                      <Text style={{ fontFamily: Font.bold, fontSize: 16, color: Colors.text, marginBottom: 16 }}>Issue Category</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingBottom: 4 }}>
                        {SERVICE_TYPES.map(t => {
                          const isSelected = selectedType === t.id;
                          return (
                            <TouchableOpacity
                              key={t.id}
                              onPress={() => setSelectedType(isSelected ? null : t.id)}
                              style={{
                                flexDirection: 'row', alignItems: 'center',
                                paddingHorizontal: 18, paddingVertical: 12, borderRadius: 100,
                                backgroundColor: isSelected ? Colors.primary : '#F3F4F6',
                              }}
                            >
                              <Ionicons name={t.icon as any} size={16} color={isSelected ? Colors.white : Colors.textSecondary} style={{ marginRight: 8 }} />
                              <Text style={{ fontFamily: Font.bold, fontSize: 14, color: isSelected ? Colors.white : Colors.textSecondary }}>
                                {t.label}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>
                    </View>
                  )}

                  {/* Shared Description */}
                  <Text style={{ fontFamily: Font.bold, fontSize: 16, color: Colors.text, marginBottom: 12 }}>
                    {formMode === 'spares' ? "Additional Notes" : "Description"}
                    <Text style={{ color: Colors.textMuted, fontFamily: Font.regular, fontSize: 14 }}> (Optional)</Text>
                  </Text>
                  <TextInput
                    onFocus={() => setIsDescFocused(true)}
                    onBlur={() => setIsDescFocused(false)}
                    style={{
                      ...InputStyle,
                      borderRadius: Radius.xl, minHeight: 120, textAlignVertical: 'top',
                      backgroundColor: isDescFocused ? '#FFF' : '#F9FAFB',
                      borderColor: isDescFocused ? Colors.primary : '#E5E7EB',
                      borderWidth: isDescFocused ? 1.5 : 1,
                      padding: 16, fontSize: 15,
                      marginBottom: 24,
                    }}
                    placeholder={formMode === 'spares' ? "e.g. Need installation help?" : "Describe your issue in detail..."}
                    placeholderTextColor={Colors.textPlaceholder}
                    multiline
                    numberOfLines={4}
                    value={description}
                    onChangeText={setDescription}
                    editable={!submitting}
                  />

                  {/* Shared Photo Input */}
                  <Text style={{ fontFamily: Font.bold, fontSize: 16, color: Colors.text, marginBottom: 12 }}>Upload Photo</Text>
                  <TouchableOpacity
                    onPress={pickPhoto}
                    style={{
                      borderRadius: Radius.xl, borderWidth: 1.5,
                      borderColor: photoUri ? Colors.primary : '#D1D5DB',
                      borderStyle: 'dashed',
                      padding: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                      marginBottom: 32,
                      backgroundColor: photoUri ? '#EFF6FF' : '#F9FAFB',
                    }}
                  >
                    {photoUri ? (
                      <>
                        <Image source={{ uri: photoUri }} style={{ width: 44, height: 44, borderRadius: 10, marginRight: 16 }} />
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontFamily: Font.bold, fontSize: 15, color: Colors.primary }}>Photo attached</Text>
                          <Text style={{ fontFamily: Font.regular, fontSize: 13, color: Colors.textMuted, marginTop: 2 }}>Tap to replace</Text>
                        </View>
                        <Ionicons name="checkmark-circle" size={24} color={Colors.primary} />
                      </>
                    ) : (
                      <View style={{ alignItems: 'center' }}>
                        <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                           <Ionicons name="camera" size={24} color={Colors.textSecondary} />
                        </View>
                        <Text style={{ fontFamily: Font.bold, fontSize: 15, color: Colors.textSecondary }}>
                          Tap to attach a photo
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>

                  {/* Submit Button */}
                  <TouchableOpacity
                    style={{ 
                      backgroundColor: Colors.primary, paddingVertical: 18, borderRadius: Radius.xl, 
                      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                      opacity: submitting ? 0.7 : 1, shadowColor: Colors.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4
                    }}
                    onPress={handleSubmit}
                    disabled={submitting}
                    activeOpacity={0.8}
                  >
                    {submitting ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <ActivityIndicator size="small" color={Colors.white} style={{ marginRight: 12 }} />
                        <Text style={{ fontFamily: Font.bold, fontSize: 16, color: Colors.white }}>Processing Request...</Text>
                      </View>
                    ) : (
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        {formMode === 'spares' && calculateTotal() > 0 ? (
                           <>
                             <Ionicons name="card" size={20} color={Colors.white} style={{ marginRight: 10 }} />
                             <Text style={{ fontFamily: Font.bold, fontSize: 16, color: Colors.white }}>Pay ₹{calculateTotal().toLocaleString('en-IN')} & Submit</Text>
                           </>
                        ) : (
                             <Text style={{ fontFamily: Font.bold, fontSize: 16, color: Colors.white }}>Submit Service Request</Text>
                        )}
                      </View>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}
