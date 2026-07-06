import { useCallback, useEffect, useRef, useState } from 'react';
import { Modal } from 'react-native';
import { router } from 'expo-router';
import { api } from '../../lib/api';
import { unlockWithBiometric } from '../../lib/biometric-auth';
import { getBiometricUiPresentation, getAuthorizeBiometricAccessibilityLabel } from '../../lib/biometric-ui';
import type { BiometricUiPresentation } from '../../lib/biometric-ui';
import { canUnlockWithBiometric } from '../../lib/security-storage';
import { useAuthStore, useSecurityStore } from '../../stores';
import { showToast } from '../ui/Toast';
import { LockScreenShell } from './LockScreenShell';

type AppLockOverlayProps = {
  visible: boolean;
};

export function AppLockOverlay({ visible }: AppLockOverlayProps) {
  const user = useAuthStore((s) => s.user);
  const unlock = useSecurityStore((s) => s.unlock);
  const prefs = useSecurityStore((s) => s.prefs);
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [bioLoading, setBioLoading] = useState(false);
  const [bioPresentation, setBioPresentation] = useState<BiometricUiPresentation | null>(null);
  const bioPrompted = useRef(false);
  const unlockedRef = useRef(false);

  const showBiometric = canUnlockWithBiometric(prefs);
  const fullName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : '';

  useEffect(() => {
    if (!visible) {
      bioPrompted.current = false;
      unlockedRef.current = false;
      setPin('');
      setLoading(false);
      setBioLoading(false);
    }
  }, [visible]);

  const handleLogout = async () => {
    unlockedRef.current = true;
    await useAuthStore.getState().logout();
    unlock();
    router.replace('/auth/login');
  };

  useEffect(() => {
    void getBiometricUiPresentation().then(setBioPresentation);
  }, []);

  const finishUnlock = useCallback(async () => {
    const token = await api.getValidToken({ logoutOnAuthFailure: true });
    if (!token || !useAuthStore.getState().isAuthenticated) {
      unlockedRef.current = true;
      unlock();
      router.replace('/auth/login');
      return;
    }

    unlockedRef.current = true;
    unlock();
  }, [unlock]);

  const verifyPin = useCallback(async (value: string) => {
    if (value.length !== 4) return;
    setLoading(true);
    try {
      const res = await api.verifyPin(value);
      if (res.success) {
        await finishUnlock();
      } else {
        showToast({ type: 'error', text1: 'Incorrect PIN', text2: res.message || 'Try again' });
        setPin('');
      }
    } catch (err: any) {
      showToast({
        type: 'error',
        text1: 'Unlock failed',
        text2: err?.data?.message || err?.message || 'Please try again',
      });
      setPin('');
    } finally {
      setLoading(false);
    }
  }, [finishUnlock]);

  const handleBiometric = useCallback(async () => {
    setBioLoading(true);
    try {
      const ok = await unlockWithBiometric();
      if (ok) await finishUnlock();
    } finally {
      setBioLoading(false);
    }
  }, [finishUnlock]);

  useEffect(() => {
    if (!visible || !showBiometric || bioPrompted.current || loading) return;
    bioPrompted.current = true;
    const timer = setTimeout(() => {
      void handleBiometric();
    }, 420);
    return () => clearTimeout(timer);
  }, [visible, showBiometric, handleBiometric, loading]);

  useEffect(() => {
    if (pin.length === 4) {
      void verifyPin(pin);
    }
  }, [pin, verifyPin]);

  if (!visible) return null;

  return (
    <Modal
      visible
      transparent={false}
      animationType="fade"
      presentationStyle="fullScreen"
      statusBarTranslucent
      onRequestClose={() => {}}
    >
      <LockScreenShell
        avatar={
          user
            ? {
                uri: user.avatar,
                firstName: user.firstName,
                lastName: user.lastName,
              }
            : undefined
        }
        headline="Welcome back"
        subline={fullName || undefined}
        badgeText="App locked"
        hint="Enter your transaction PIN to continue"
        pin={pin}
        onPinChange={setPin}
        pinLoading={loading}
        pinDisabled={bioLoading}
        biometric={
          showBiometric && bioPresentation
            ? {
                presentation: bioPresentation,
                onPress: () => void handleBiometric(),
                loading: bioLoading,
                disabled: loading,
              }
            : undefined
        }
        footerAction={{
          label: 'Log out',
          icon: 'log-out-outline',
          onPress: () => void handleLogout(),
        }}
      />
    </Modal>
  );
}
