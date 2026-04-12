import React from 'react';
import { View, Text, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Font, Radius } from '@/lib/theme';

interface Props {
  message: string;
  onDismiss: () => void;
}

/**
 * Inline error banner that works on all platforms (unlike Alert.alert on web).
 * Use this in place of Alert.alert('Error', message) on screens.
 */
export default function InlineErrorBanner({ message, onDismiss }: Props) {
  if (!message) return null;

  return (
    <View style={{
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: Colors.dangerBg,
      borderRadius: Radius.md,
      padding: 12,
      marginBottom: 16,
    }}>
      <Ionicons name="alert-circle" size={18} color={Colors.danger} style={{ marginRight: 8 }} />
      <Text style={{
        fontFamily: Font.regular,
        fontSize: 13,
        color: Colors.danger,
        flex: 1,
        lineHeight: 18,
      }}>
        {message}
      </Text>
      <TouchableOpacity onPress={onDismiss} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Ionicons name="close-circle" size={18} color={Colors.danger} />
      </TouchableOpacity>
    </View>
  );
}
