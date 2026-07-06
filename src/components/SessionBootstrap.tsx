import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { useRootNavigationState, useSegments } from 'expo-router';
import { api } from '../lib/api';
import { prefetchAppData } from '../lib/dashboard-data';
import { hydrateNotificationSettingsCache } from '../lib/notification-settings-cache';
import { preloadBiometricSettings } from '../lib/biometric-settings-cache';
import { preloadProgramsData } from '../lib/programs-cache';
import { preloadApiAccessData } from '../lib/api-access-cache';
import { preloadReferralSummaryData } from '../lib/referral-summary-cache';
import { refreshUserProfile } from '../lib/profile-sync';
import {
  registerSessionExpiredHandler,
  setSuppressSessionExpiryUi,
  type SessionLogoutReason,
} from '../lib/session';
import { refreshServiceCatalogSilently } from '../lib/service-catalog-cache';
import { syncCatalogRevision } from '../lib/catalog-revision-sync';
import { safeReplace, setRootNavigationReady } from '../lib/navigation';
import { isBootComplete } from '../lib/boot-state';
import { useAuthStore, useSecurityStore } from '../stores';
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

const PUBLIC_ROUTE_ROOTS = new Set(['index', 'auth', 'onboarding']);

export function SessionBootstrap() {
  const segments = useSegments();
  const rootNavigationState = useRootNavigationState();
  const isNavigationReady = Boolean(rootNavigationState?.key);
  const segmentsRef = useRef(segments);
  segmentsRef.current = segments;

  const onAuthRoute = segments[0] === 'auth';
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLocked = useSecurityStore((s) => s.isLocked);
  const fetchUnreadCount = useNotificationsStore((s) => s.fetchUnreadCount);
  const fetchNotifications = useNotificationsStore((s) => s.fetchNotifications);

  useEffect(() => {
    setRootNavigationReady(isNavigationReady);
  }, [isNavigationReady]);

  useEffect(() => {
    setSuppressSessionExpiryUi(onAuthRoute);
  }, [onAuthRoute]);

  useEffect(() => {
    if (!isNavigationReady) return;
    if (!isBootComplete()) return;
    if (isAuthenticated || onAuthRoute) return;

    const root = segments[0] || '';
    if (PUBLIC_ROUTE_ROOTS.has(root)) return;

    safeReplace('/auth/login');
  }, [isNavigationReady, isAuthenticated, onAuthRoute, segments]);

  useEffect(() => {
    if (!isAuthenticated || onAuthRoute) return;
    if (!isBootComplete()) return;
    if (isLocked) return;

    void (async () => {
      await prefetchAppData();
      void syncCatalogRevision();
      void hydrateNotificationSettingsCache();
      preloadBiometricSettings();
      preloadProgramsData();
      preloadApiAccessData();
      preloadReferralSummaryData();
      void fetchNotifications({ page: 1 });
      void fetchUnreadCount();
    })();
  }, [fetchNotifications, fetchUnreadCount, isAuthenticated, isLocked, onAuthRoute]);

  useEffect(() => {
    if (!isAuthenticated || onAuthRoute) return;
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      if (useSecurityStore.getState().isLocked) return;

      void api.getValidToken({ logoutOnAuthFailure: true });
      void fetchUnreadCount();
      void fetchNotifications({ refresh: true, page: 1 });
      void refreshUserProfile();
      void syncCatalogRevision({ force: true });
      void useServiceAvailabilityStore.getState().refresh({ force: true });
      refreshServiceCatalogSilently();
    });
    return () => sub.remove();
  }, [fetchNotifications, fetchUnreadCount, isAuthenticated, onAuthRoute]);

  useEffect(() => {
    registerSessionExpiredHandler(async (reason) => {
      useSecurityStore.getState().unlock();
      await useAuthStore.getState().logout();
      if (segmentsRef.current[0] === 'auth') return;
      const copy = sessionLogoutCopy(reason);
      showToast({ type: 'info', ...copy });
      safeReplace('/auth/login');
    });
  }, []);

  return null;
}
