import { useEffect } from 'react';
import { useAuthStore } from '../stores';
import { addNotificationListeners, registerPushNotifications } from '../lib/push-notifications';

export function usePushNotifications() {
  const { user } = useAuthStore();

  useEffect(() => {
    if (!user) return;

    void registerPushNotifications().catch(() => {});

    return addNotificationListeners();
  }, [user?.id]);
}
