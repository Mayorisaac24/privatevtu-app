import { useCallback, useEffect, useRef, useState } from 'react';
import { router } from 'expo-router';
import { api } from '../../src/lib/api';
import { getBiometricCapability, unlockWithBiometric } from '../../src/lib/biometric-auth';
import { canUnlockWithBiometric } from '../../src/lib/security-storage';
import { useAuthStore, useSecurityStore } from '../../src/stores';
import { showToast } from '../../src/components/ui/Toast';
import { useStatusBarStyle } from '../../src/hooks/useStatusBarStyle';
import { LockScreenShell } from '../../src/components/security/LockScreenShell';

export default function UnlockScreen() {
  useStatusBarStyle('light');
  const user = useAuthStore((s) => s.user);
  const unlock = useSecurityStore((s) => s.unlock);
  const prefs = useSecurityStore((s) => s.prefs);
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [bioLoading, setBioLoading] = useState(false);
  const [bioIcon, setBioIcon] = useState<'finger-print-outline' | 'scan-outline'>('finger-print-outline');
  const bioPrompted = useRef(false);

  const showBiometric = canUnlockWithBiometric(prefs);
  const fullName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : '';

  const handleLogout = async () => {
    await useAuthStore.getState().logout();
    router.replace('/auth/login');
  };

  useEffect(() => {
    if (!user) {
      router.replace('/auth/login');
    }
  }, [user]);

  useEffect(() => {
    void getBiometricCapability().then((capability) => {
      if (capability.label === 'Face ID') {
        setBioIcon('scan-outline');
      }
    });
  }, []);

  const finishUnlock = useCallback(() => {
    unlock();
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  }, [unlock]);

  const verifyPin = useCallback(async (value: string) => {
    if (value.length !== 4) return;
    setLoading(true);
    try {
      const res = await api.verifyPin(value);
      if (res.success) {
        finishUnlock();
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
      if (ok) finishUnlock();
    } finally {
      setBioLoading(false);
    }
  }, [finishUnlock]);

  useEffect(() => {
    if (!showBiometric || bioPrompted.current || loading) return;
    bioPrompted.current = true;
    const timer = setTimeout(() => {
      void handleBiometric();
    }, 420);
    return () => clearTimeout(timer);
  }, [showBiometric, handleBiometric, loading]);

  useEffect(() => {
    if (pin.length === 4) {
      void verifyPin(pin);
    }
  }, [pin, verifyPin]);

  return (
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
        showBiometric
          ? {
              icon: bioIcon,
              onPress: () => void handleBiometric(),
              loading: bioLoading,
              disabled: loading,
              accessibilityLabel: 'Unlock with biometric',
            }
          : undefined
      }
      footerAction={{
        label: 'Log out',
        icon: 'log-out-outline',
        onPress: () => void handleLogout(),
      }}
    />
  );
}
