import { useCallback, useEffect, useRef, useState } from 'react';
import { getBiometricCapability, promptLocalBiometric } from '../lib/biometric-auth';
import { canUseBiometricTransactions, getBiometricCredentials, getSecurityPrefs } from '../lib/security-storage';

export type TransactionAuthPayload = {
  pin?: string;
  biometricToken?: string;
  deviceId?: string;
};

export function useTransactionLockAuth(isVisible: boolean) {
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricVerified, setBiometricVerified] = useState(false);
  const [biometricLabel, setBiometricLabel] = useState('Biometric');
  const [prefsReady, setPrefsReady] = useState(false);
  const [initialBiometricAttempted, setInitialBiometricAttempted] = useState(false);
  const promptedRef = useRef(false);

  useEffect(() => {
    if (!isVisible) {
      promptedRef.current = false;
      setBiometricVerified(false);
      setBiometricEnabled(false);
      setPrefsReady(false);
      setInitialBiometricAttempted(false);
      return;
    }

    let cancelled = false;

    (async () => {
      const prefs = await getSecurityPrefs();
      const capability = await getBiometricCapability();
      const creds = await getBiometricCredentials();
      const enabled = canUseBiometricTransactions(prefs) && capability.available && !!creds?.biometricToken;
      if (cancelled) return;

      setBiometricEnabled(enabled);
      setBiometricLabel(capability.label || 'Biometric');
      setPrefsReady(true);

      if (!enabled || promptedRef.current) return;
      promptedRef.current = true;

      const ok = await promptLocalBiometric('Authorize transaction');
      if (!cancelled) {
        setInitialBiometricAttempted(true);
        if (ok) setBiometricVerified(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isVisible]);

  const retryBiometric = useCallback(async () => {
    const ok = await promptLocalBiometric('Authorize transaction');
    if (ok) {
      setBiometricVerified(true);
      return true;
    }
    setBiometricVerified(false);
    return false;
  }, []);

  const buildAuthPayload = useCallback(async (pin: string): Promise<TransactionAuthPayload | null> => {
    if (pin.length === 4) {
      return { pin };
    }
    if (biometricVerified) {
      const creds = await getBiometricCredentials();
      if (!creds?.biometricToken || !creds.deviceId) return null;
      return {
        biometricToken: creds.biometricToken,
        deviceId: creds.deviceId,
      };
    }
    return null;
  }, [biometricVerified]);

  const resetAuth = useCallback(() => {
    setBiometricVerified(false);
    setInitialBiometricAttempted(false);
    promptedRef.current = false;
  }, []);

  return {
    biometricEnabled,
    biometricVerified,
    biometricLabel,
    prefsReady,
    initialBiometricAttempted,
    retryBiometric,
    buildAuthPayload,
    resetAuth,
  };
}
