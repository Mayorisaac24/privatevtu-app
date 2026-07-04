import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { api } from './api';
import { getStableDeviceId } from './device-id';
import { peekNotificationSettings } from './notification-settings-cache';
import { APP_NOTIFICATION_CHANNEL_ID, APP_NOTIFICATION_SOUND } from '../constants/notifications';
import { BRAND } from '../theme/colors/app-colors';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function registerPushNotifications(): Promise<boolean> {
  if (!Device.isDevice) {
    console.warn('[Push] Skipped — not a physical device');
    return false;
  }

  const settings = await Notifications.getPermissionsAsync();
  let finalStatus = settings.status;

  if (finalStatus !== 'granted') {
    const requested = await Notifications.requestPermissionsAsync();
    finalStatus = requested.status;
  }

  if (finalStatus !== 'granted') {
    console.warn('[Push] Permission not granted:', finalStatus);
    return false;
  }

  const cachedSettings = peekNotificationSettings();
  if (
    cachedSettings
    && !cachedSettings.pushNotificationsEnabled
    && !cachedSettings.marketingPushNotificationsEnabled
  ) {
    console.warn('[Push] Skipped — user disabled all push categories');
    return false;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(APP_NOTIFICATION_CHANNEL_ID, {
      name: 'Datamart Alerts',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: BRAND.notificationLight,
      sound: APP_NOTIFICATION_SOUND,
    });
  }

  const projectId = Constants.expoConfig?.extra?.eas?.projectId
    ?? Constants.easConfig?.projectId;

  if (!projectId) {
    console.error('[Push] Missing EAS projectId in app config');
    return false;
  }

  const tokenResult = await Notifications.getExpoPushTokenAsync({ projectId });
  const deviceId = await getStableDeviceId();

  const res = await api.registerDevice({
    deviceId,
    pushToken: tokenResult.data,
    platform: Platform.OS,
    deviceName: Device.modelName || undefined,
    appVersion: Constants.expoConfig?.version,
  });

  if (!res.success) {
    console.error('[Push] Device registration failed:', res.message);
    return false;
  }

  console.log('[Push] Registered token for device', deviceId.slice(0, 8), {
    projectId,
    token: tokenResult.data.slice(0, 28) + '…',
  });
  return true;
}

export function addNotificationListeners(
  onReceived?: (notification: Notifications.Notification) => void,
  onResponse?: (response: Notifications.NotificationResponse) => void,
) {
  const receivedSub = Notifications.addNotificationReceivedListener((notification) => {
    onReceived?.(notification);
  });

  const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
    onResponse?.(response);
  });

  return () => {
    receivedSub.remove();
    responseSub.remove();
  };
}
