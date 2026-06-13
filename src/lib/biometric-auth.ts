import * as LocalAuthentication from 'expo-local-authentication';
import { api, isResponseSuccess, type User } from './api';
import { getStableDeviceId } from './device-id';
import {
  BiometricCredentials,
  clearBiometricCredentials,
  getBiometricCredentials,
  saveBiometricCredentials,
} from './security-storage';

export type BiometricCapability = {
  available: boolean;
  enrolled: boolean;
  label: string;
};

export async function getBiometricCapability(): Promise<BiometricCapability> {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  const enrolled = await LocalAuthentication.isEnrolledAsync();
  if (!hasHardware || !enrolled) {
    return { available: false, enrolled: false, label: '' };
  }

  const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
  const label = types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)
    ? 'Face ID'
    : 'Fingerprint';

  return { available: true, enrolled: true, label };
}

export async function promptLocalBiometric(reason: string): Promise<boolean> {
  const capability = await getBiometricCapability();
  if (!capability.available) return false;

  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: reason,
    cancelLabel: 'Use PIN',
    fallbackLabel: 'Use PIN',
    disableDeviceFallback: true,
  });

  return result.success;
}

export async function enableBiometricSignIn(
  email: string,
  userId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const capability = await getBiometricCapability();
  if (!capability.available) {
    return { ok: false, message: `${capability.label || 'Biometric'} is not available on this device` };
  }

  const localOk = await promptLocalBiometric('Confirm your identity to enable biometric sign-in');
  if (!localOk) return { ok: false, message: 'Biometric confirmation cancelled' };

  const deviceId = await getStableDeviceId();
  const res = await api.enableBiometric(deviceId);
  if (!res.success || !res.data?.biometricToken) {
    return { ok: false, message: res.message || 'Could not enable biometric sign-in' };
  }

  await saveBiometricCredentials({
    userId,
    biometricToken: res.data.biometricToken,
    email: email.trim().toLowerCase(),
    deviceId,
  });

  return { ok: true };
}

export async function disableBiometricSignIn(): Promise<void> {
  try {
    await api.disableBiometric();
  } catch {
    // still clear local credentials
  }
  await clearBiometricCredentials();
}

export async function biometricQuickSignIn(): Promise<
  { ok: true; user: User } | { ok: false; message: string }
> {
  try {
    const creds = await getBiometricCredentials();
    if (!creds) return { ok: false, message: 'Biometric sign-in is not set up on this device' };

    const localOk = await promptLocalBiometric('Sign in to PrivateVTU');
    if (!localOk) return { ok: false, message: 'Biometric sign-in cancelled' };

    const res = await api.biometricLogin({
      userId: creds.userId,
      deviceId: creds.deviceId,
      biometricToken: creds.biometricToken,
    });

    if (!isResponseSuccess(res) || !res.data) {
      if (/invalid biometric|device not registered/i.test(res.message || '')) {
        await clearBiometricCredentials();
      }
      return { ok: false, message: res.message || 'Biometric sign-in failed' };
    }

    const { useAuthStore } = require('../stores/auth-store');
    const user = useAuthStore.getState().user;
    if (!user) {
      return { ok: false, message: 'Sign-in incomplete — please use your password' };
    }

    void api.getProfile().then((profile) => {
      if (isResponseSuccess(profile) && profile.data) {
        useAuthStore.getState().setUser(profile.data);
      }
    }).catch(() => {});

    return { ok: true, user };
  } catch (err: any) {
    const message =
      err?.data?.message ||
      err?.message ||
      'Biometric sign-in failed. Try signing in with your password.';
    return { ok: false, message };
  }
}

export async function unlockWithBiometric(): Promise<boolean> {
  return promptLocalBiometric('Unlock PrivateVTU');
}

export async function hasBiometricSignInEnabled(): Promise<boolean> {
  const creds = await getBiometricCredentials();
  return !!creds?.biometricToken;
}

export async function getQuickSignInEmail(): Promise<string | null> {
  const creds = await getBiometricCredentials();
  return creds?.email ?? null;
}
