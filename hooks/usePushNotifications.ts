import { useState, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

// Configure foreground notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export function usePushNotifications() {
  const { user } = useAuth();
  const [expoPushToken, setExpoPushToken] = useState<string | undefined>();
  const [notification, setNotification] = useState<Notifications.Notification | undefined>();

  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();

  useEffect(() => {
    if (!user?.id) return;

    registerForPushNotificationsAsync().then(token => {
      if (token) {
        setExpoPushToken(token);
        // Sync the token securely to the rider's profile in Supabase
        syncTokenToSupabase(user.id, token);
      }
    });

    // Listener for when a notification is received while the app is foregrounded
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      setNotification(notification);
    });

    // Listener for when a user taps on a notification
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('User reacted to notification:', response.notification.request.content);
      // TODO: Handle deep linking based on payload in the future
    });

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, [user?.id]);

  async function syncTokenToSupabase(riderId: string, token: string) {
    try {
      const { data: row } = await supabase
        .from('riders')
        .select('push_notifications_enabled')
        .eq('id', riderId)
        .maybeSingle();

      const patch: Record<string, unknown> = { expo_push_token: token };
      if (row?.push_notifications_enabled == null) {
        patch.push_notifications_enabled = true;
      }

      const { error } = await supabase.from('riders').update(patch).eq('id', riderId);

      if (error) {
        console.error('[PushNotif] Error saving push token to Supabase:', error);
      } else {
        console.log('[PushNotif] Token synced to Supabase successfully.');
      }
    } catch (err) {
      console.error('[PushNotif] Unexpected error syncing push token:', err);
    }
  }

  async function registerForPushNotificationsAsync(): Promise<string | undefined> {
    let token;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#1D4ED8',
      });
    }

    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        console.warn('[PushNotif] Failed to get push token for push notification (user denied permission).');
        return;
      }

      // Automatically try to extract EAS Project ID from app.config.js / app.json
      const projectId = Constants.expoConfig?.extra?.eas?.projectId;

      try {
        if (projectId) {
            token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
        } else {
            console.warn('[PushNotif] Project ID not found in app.json. Ensure eas init has been run. Trying to generate token without projectId...');
            // Fallback for bare workflows or local dev if lucky
            token = (await Notifications.getExpoPushTokenAsync()).data;
        }
        console.log('[PushNotif] Successfully generated Expo Push Token:', token);
      } catch (e) {
        console.error('[PushNotif] Error getting Expo Push Token. Note: Push tokens do not work in web environments', e);
      }
    } else {
      console.log('[PushNotif] Must use physical device for Push Notifications');
    }

    return token;
  }

  return { expoPushToken, notification };
}
