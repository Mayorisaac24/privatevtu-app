import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { router, usePathname } from 'expo-router';
import { useAuthStore, useSecurityStore } from '../../stores';
import { isAppLockEnabled } from '../../lib/security-storage';
import { AppPrivacyOverlay } from './AppPrivacyOverlay';

const UNLOCK_ROUTE = '/dashboard/unlock';
const AUTH_PREFIXES = ['/auth', '/dashboard/setup-pin'];

function shouldGuardSession(isAuthenticated: boolean, hasPin: boolean): boolean {
  return isAuthenticated && isAppLockEnabled(hasPin);
}

export function AppLockHost() {
  const pathname = usePathname();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const {
    isLocked,
    isPrivacyMode,
    lock,
    unlock,
    markLeftApp,
    shouldLockOnResume,
    loadPrefs,
    prefsLoaded,
  } = useSecurityStore();
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    void loadPrefs();
  }, [loadPrefs]);

  useEffect(() => {
    const onChange = (nextState: AppStateStatus) => {
      const prev = appState.current;
      appState.current = nextState;

      const guarded = shouldGuardSession(isAuthenticated, !!user?.hasPin);
      if (!guarded) return;

      if (nextState === 'inactive' || nextState === 'background') {
        markLeftApp(false);
        return;
      }

      if (prev.match(/inactive|background/) && nextState === 'active') {
        if (shouldLockOnResume()) {
          lock();
        } else {
          useSecurityStore.setState({
            isPrivacyMode: false,
            lastLeftAt: null,
            leftViaBackground: false,
          });
        }
      }
    };

    const sub = AppState.addEventListener('change', onChange);
    return () => sub.remove();
  }, [
    isAuthenticated,
    user?.hasPin,
    lock,
    markLeftApp,
    shouldLockOnResume,
  ]);

  useEffect(() => {
    if (!prefsLoaded || !isAuthenticated || !user?.hasPin) return;
    if (!isLocked) return;
    if (pathname === UNLOCK_ROUTE) return;
    if (AUTH_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return;

    router.push(UNLOCK_ROUTE);
  }, [isLocked, isAuthenticated, user?.hasPin, pathname, prefsLoaded]);

  useEffect(() => {
    if (!isAuthenticated) {
      unlock();
    }
  }, [isAuthenticated, unlock]);

  const showPrivacy = isPrivacyMode
    && isAuthenticated
    && isAppLockEnabled(!!user?.hasPin)
    && !isLocked;

  return <AppPrivacyOverlay visible={showPrivacy} />;
}
