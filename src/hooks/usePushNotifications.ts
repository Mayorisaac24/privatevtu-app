import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import { useAuthStore } from '../stores';
import { addNotificationListeners, registerPushNotifications } from '../lib/push-notifications';
import { navigateFromNotificationData } from '../lib/notification-navigation';
import { isKycReviewNotification, refreshKycStatusFromReviewUpdate } from '../lib/kyc-status-cache';
import { useNotificationsStore } from '../stores/notifications-store';

export function usePushNotifications() {
  const { user } = useAuthStore();
  const unreadCount = useNotificationsStore((s) => s.unreadCount);
  const fetchUnreadCount = useNotificationsStore((s) => s.fetchUnreadCount);
  const resetNotifications = useNotificationsStore((s) => s.reset);

  useEffect(() => {
    if (!user) {
      resetNotifications();
      void Notifications.setBadgeCountAsync(0);
      return;
    }

    void registerPushNotifications().catch(() => {});
    void fetchUnreadCount();

    return addNotificationListeners(
      (notification) => {
        void fetchUnreadCount();
        const data = notification.request.content.data as Record<string, unknown> | undefined;
        if (isKycReviewNotification(data)) {
          void refreshKycStatusFromReviewUpdate();
        }
      },
      (response) => {
        void fetchUnreadCount();
        const data = response.notification.request.content.data as Record<string, unknown> | undefined;
        if (isKycReviewNotification(data)) {
          void refreshKycStatusFromReviewUpdate();
        }
        navigateFromNotificationData(data);
      },
    );
  }, [fetchUnreadCount, resetNotifications, user?.id]);

  useEffect(() => {
    if (!user) return;
    void Notifications.setBadgeCountAsync(unreadCount);
  }, [unreadCount, user?.id]);
}
