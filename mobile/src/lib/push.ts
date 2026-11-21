import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { accountApi } from '@/api';

/**
 * Mobile push (docs/AUTHENTICATION.md#push). Free providers only:
 *  - With an EAS projectId: an Expo push token (iOS + Android) — the backend sends via Expo.
 *  - Without one, on Android: the raw FCM token — the backend sends via FCM HTTP v1 using the
 *    service account saved in Admin, Settings, Mobile app.
 * Remote push needs a development/production build (Expo Go cannot receive it on Android).
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: true }),
});

export async function registerForPush(): Promise<string | null> {
  if (Platform.OS === 'web' || !Device.isDevice) {
    return null;
  }

  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.HIGH,
        lightColor: '#0f2c1e',
        vibrationPattern: [0, 200, 120, 200],
      });
    }

    const current = await Notifications.getPermissionsAsync();
    const status = current.status === 'granted' ? current.status : (await Notifications.requestPermissionsAsync()).status;
    if (status !== 'granted') {
      return null;
    }

    const projectId = (Constants.expoConfig?.extra?.eas as { projectId?: string } | undefined)?.projectId || Constants.easConfig?.projectId;
    const token = projectId
      ? (await Notifications.getExpoPushTokenAsync({ projectId })).data
      : Platform.OS === 'android'
        ? String((await Notifications.getDevicePushTokenAsync()).data)
        : null;

    if (token) {
      await accountApi.registerDevice(token, Platform.OS === 'ios' ? 'ios' : 'android');
    }
    return token;
  } catch {
    // Expo Go / missing Firebase config: the app works without push.
    return null;
  }
}

/** Opens the notifications screen when a push is tapped. */
export function onPushTapped(handler: (data: Record<string, unknown>) => void): () => void {
  const subscription = Notifications.addNotificationResponseReceivedListener((response) => handler(response.notification.request.content.data ?? {}));
  return () => subscription.remove();
}
