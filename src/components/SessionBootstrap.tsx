import { useEffect } from 'react';
import { AppState } from 'react-native';
import { router, useSegments } from 'expo-router';
import { api } from '../lib/api';
import { prefetchAppData } from '../lib/dashboard-data';
import { hydrateNotificationSettingsCache } from '../lib/notification-settings-cache';
import { preloadBiometricSettings } from '../lib/biometric-settings-cache';
import { refreshUserProfile } from '../lib/profile-sync';
import {
  registerSessionExpiredHandler,
  setSuppressSessionExpiryUi,
  type SessionLogoutReason,
} from '../lib/session';
import { refreshServiceCatalogSilently } from '../lib/service-catalog-cache';
import { syncCatalogRevision } from '../lib/catalog-revision-sync';
import { useAuthStore } from '../stores';
import { useNotificationsStore } from '../stores/notifications-store';
import { useServiceAvailabilityStore } from '../stores/service-availability-store';
import { showToast } from './ui/Toast';

function sessionLogoutCopy(reason: SessionLogoutReason) {
  if (reason === 'revoked') {
    return {
      text1: 'Signed out',
      text2: 'Your account was opened on another device.',
    };
  }
  return {
    text1: 'Session expired',
    text2: 'Please sign in again to continue.',
  };
}

export function SessionBootstrap() {
  const segments = useSegments();
  const onAuthRoute = segments[0] === 'auth';
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const fetchUnreadCount = useNotificationsStore((s) => s.fetchUnreadCount);
  const fetchNotifications = useNotificationsStore((s) => s.fetchNotifications);

  useEffect(() => {
    setSuppressSessionExpiryUi(onAuthRoute);
  }, [onAuthRoute]);

  useEffect(() => {
    if (!isAuthenticated || onAuthRoute) return;

    void (async () => {
      await prefetchAppData();
      void syncCatalogRevision();
      void hydrateNotificationSettingsCache();
      preloadBiometricSettings();
      void fetchNotifications({ page: 1 });
      void fetchUnreadCount();
    })();
  }, [fetchNotifications, fetchUnreadCount, isAuthenticated, onAuthRoute]);

  useEffect(() => {
    if (!isAuthenticated || onAuthRoute) return;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void api.getValidToken({ logoutOnAuthFailure: true });
        void fetchUnreadCount();
        void refreshUserProfile();
        void syncCatalogRevision();
        void useServiceAvailabilityStore.getState().refresh();
        refreshServiceCatalogSilently();
      }
    });
    return () => sub.remove();
  }, [fetchUnreadCount, isAuthenticated, onAuthRoute]);

  useEffect(() => {
    registerSessionExpiredHandler(async (reason) => {
      await useAuthStore.getState().logout();
      if (onAuthRoute) return;
      const copy = sessionLogoutCopy(reason);
      showToast({ type: 'info', ...copy });
      router.replace('/auth/login');
    });
  }, [onAuthRoute]);

  return null;
}
