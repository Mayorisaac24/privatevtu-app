import { useEffect } from 'react';
import { router, useSegments } from 'expo-router';
import { prefetchAppData } from '../lib/dashboard-data';
import { registerSessionExpiredHandler, setSuppressSessionExpiryUi } from '../lib/session';
import { useAuthStore } from '../stores';
import { showToast } from './ui/Toast';

export function SessionBootstrap() {
  const segments = useSegments();
  const onAuthRoute = segments[0] === 'auth';
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    setSuppressSessionExpiryUi(onAuthRoute);
  }, [onAuthRoute]);

  useEffect(() => {
    if (!isAuthenticated || onAuthRoute) return;
    void prefetchAppData();
  }, [isAuthenticated, onAuthRoute]);

  useEffect(() => {
    registerSessionExpiredHandler(async () => {
      await useAuthStore.getState().logout();
      if (onAuthRoute) return;
      showToast({
        type: 'info',
        text1: 'Session expired',
        text2: 'Please sign in again to continue.',
      });
      router.replace('/auth/login');
    });
  }, [onAuthRoute]);

  return null;
}
