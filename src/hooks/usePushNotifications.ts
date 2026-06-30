import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { useAuthStore } from '../stores';
import { addNotificationListeners, registerPushNotifications } from '../lib/push-notifications';
import { navigateFromNotificationData } from '../lib/notification-navigation';
import { isKycReviewNotification, refreshKycStatusFromReviewUpdate } from '../lib/kyc-status-cache';
import { useNotificationsStore } from '../stores/notifications-store';

function refreshInboxFromPush() {
  const { fetchUnreadCount, fetchNotifications } = useNotificationsStore.getState();
  void fetchUnreadCount();
  void fetchNotifications({ refresh: true, silent: true, page: 1 });
}

export function usePushNotifications() {
  const { user } = useAuthStore();
  const unreadCount = useNotificationsStore((s) => s.unreadCount);
  const fetchUnreadCount = useNotificationsStore((s) => s.fetchUnreadCount);
  const fetchNotifications = useNotificationsStore((s) => s.fetchNotifications);
  const resetNotifications = useNotificationsStore((s) => s.reset);
  const handledColdStartRef = useRef(false);

  useEffect(() => {
    if (!user) {
      handledColdStartRef.current = false;
      resetNotifications();
      void Notifications.setBadgeCountAsync(0);
      return;
    }

    void registerPushNotifications().catch(() => {});
    void fetchUnreadCount();
    void fetchNotifications({ page: 1 });

    if (!handledColdStartRef.current) {
      handledColdStartRef.current = true;
      void Notifications.getLastNotificationResponseAsync().then((response) => {
        if (!response) return;
        const data = response.notification.request.content.data as Record<string, unknown> | undefined;
        refreshInboxFromPush();
        if (isKycReviewNotification(data)) {
          void refreshKycStatusFromReviewUpdate();
        }
        navigateFromNotificationData(data);
      });
    }

    return addNotificationListeners(
      (notification) => {
        refreshInboxFromPush();
        const data = notification.request.content.data as Record<string, unknown> | undefined;
        if (isKycReviewNotification(data)) {
          void refreshKycStatusFromReviewUpdate();
        }
      },
      (response) => {
        refreshInboxFromPush();
        const data = response.notification.request.content.data as Record<string, unknown> | undefined;
        if (isKycReviewNotification(data)) {
          void refreshKycStatusFromReviewUpdate();
        }
        navigateFromNotificationData(data);
      },
    );
  }, [fetchNotifications, fetchUnreadCount, resetNotifications, user?.id]);

  useEffect(() => {
    if (!user) return;
    void Notifications.setBadgeCountAsync(unreadCount);
  }, [unreadCount, user?.id]);
}
