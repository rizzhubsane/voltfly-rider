import { Tabs } from 'expo-router';
import { View, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Font, Shadow } from '@/lib/theme';
import { useTranslation } from 'react-i18next';
import { usePushNotifications } from '@/hooks/usePushNotifications';

export default function MainLayout() {
  const { t } = useTranslation();
  // Register device for push notifications on login
  usePushNotifications();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textLight,
        tabBarStyle: {
          backgroundColor: Colors.white,
          borderTopWidth: 0,
          paddingBottom: Platform.OS === 'ios' ? 20 : 8,
          paddingTop: 8,
          height: Platform.OS === 'ios' ? 80 : 64,
          ...Shadow.lg,
        },
        tabBarLabelStyle: {
          fontFamily: Font.medium,
          fontSize: 11,
          marginTop: 2,
        },
        headerStyle: {
          backgroundColor: Colors.white,
          ...Shadow.sm,
        },
        headerTitleStyle: {
          fontFamily: Font.semibold,
          color: Colors.text,
          fontSize: 18,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          headerShown: false,
          title: t('tabs.home'),
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? {
              backgroundColor: `${Colors.primary}12`,
              borderRadius: 10, padding: 4,
            } : { padding: 4 }}>
              <Ionicons name={focused ? 'home' : 'home-outline'} size={22} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="payments"
        options={{
          headerShown: false,
          title: t('tabs.payments'),
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? {
              backgroundColor: `${Colors.primary}12`,
              borderRadius: 10, padding: 4,
            } : { padding: 4 }}>
              <Ionicons name={focused ? 'card' : 'card-outline'} size={22} color={color} />
            </View>
          ),
        }}
      />

      <Tabs.Screen
        name="services"
        options={{
          headerShown: false,
          title: t('tabs.services'),
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? {
              backgroundColor: `${Colors.primary}12`,
              borderRadius: 10, padding: 4,
            } : { padding: 4 }}>
              <Ionicons name={focused ? 'construct' : 'construct-outline'} size={22} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          headerShown: false,
          title: t('tabs.profile'),
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? {
              backgroundColor: `${Colors.primary}12`,
              borderRadius: 10, padding: 4,
            } : { padding: 4 }}>
              <Ionicons name={focused ? 'person' : 'person-outline'} size={22} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen name="history" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="service-history" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="support" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="notifications" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="index" options={{ href: null }} />
    </Tabs>
  );
}

