import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from './supabase';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function registerForPushNotificationsAsync() {
  if (Platform.OS === 'web') {
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return null;
  }

  const token = (await Notifications.getExpoPushTokenAsync()).data;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const deviceInfo = `${Platform.OS} ${Platform.Version}`;

  await supabase
    .from('push_tokens')
    .upsert(
      {
        user_id: user.id,
        token,
        device_info: deviceInfo,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'token',
      }
    );

  return token;
}

export async function sendOrderNotification(order: {
  operation: string;
  account_description: string;
  seed_type: string;
  variety: string;
}) {
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  const apiUrl = `${supabaseUrl}/functions/v1/send-order-notification`;

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ order }),
    });

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Failed to send notification:', error);
  }
}
