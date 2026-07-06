import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { usePathname } from 'expo-router';
import { useAuthStore, useSecurityStore } from '../../stores';
import { isAppLockEnabled } from '../../lib/security-storage';
import { AppPrivacyOverlay } from './AppPrivacyOverlay';
import { AppLockOverlay } from './AppLockOverlay';

const AUTH_PREFIXES = ['/auth', '/dashboard/setup-pin'];

function shouldGuardSession(isAuthenticated: boolean, hasPin: boolean): boolean {
  return isAuthenticated && isAppLockEnabled(hasPin);
}

function isAuthExemptPath(pathname: string): boolean {
  return AUTH_PREFIXES.some((prefix) => pathname.startsWith(prefix));
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
          lock(pathname);
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
    pathname,
    shouldLockOnResume,
  ]);

  useEffect(() => {
    if (!isAuthenticated) {
      unlock();
    }
  }, [isAuthenticated, unlock]);

  const guarded = prefsLoaded
    && shouldGuardSession(isAuthenticated, !!user?.hasPin)
    && !isAuthExemptPath(pathname);

  const showLock = guarded && isLocked;
  const showPrivacy = guarded && isPrivacyMode && !isLocked;

  return (
    <>
      <AppPrivacyOverlay visible={showPrivacy} />
      <AppLockOverlay visible={showLock} />
    </>
  );
}
