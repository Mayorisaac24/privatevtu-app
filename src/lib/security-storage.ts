import * as SecureStore from 'expo-secure-store';

const KEYS = {
  BIOMETRIC_CREDS: 'pvtu_biometric_creds',
  SECURITY_PREFS: 'pvtu_security_prefs',
} as const;

export type SecurityPrefs = {
  /** App unlock and quick sign-in */
  authWithBiometric: boolean;
  /** Authorize payments with biometric or PIN */
  transactionsWithBiometric: boolean;
  /** Seconds away before unlock is required when returning to the app. */
  inactiveLockSeconds: number;
  /** @deprecated No longer used — all resume paths use inactiveLockSeconds. */
  lockImmediatelyFromBackground: boolean;
};

/** Unified inactive threshold before the app lock screen is required. */
export const INACTIVE_LOCK_SECONDS = 5;

export const DEFAULT_SECURITY_PREFS: SecurityPrefs = {
  authWithBiometric: false,
  transactionsWithBiometric: false,
  inactiveLockSeconds: INACTIVE_LOCK_SECONDS,
  lockImmediatelyFromBackground: false,
};

export type BiometricCredentials = {
  userId: string;
  biometricToken: string;
  email: string;
  deviceId: string;
};

function normalizeSecurityPrefs(raw: Record<string, unknown>): SecurityPrefs {
  const authWithBiometric = !!(
    raw.authWithBiometric
    ?? raw.unlockWithBiometric
    ?? raw.signInWithBiometric
  );
  const transactionsWithBiometric = !!raw.transactionsWithBiometric;

  return {
    authWithBiometric,
    transactionsWithBiometric,
    inactiveLockSeconds:
      typeof raw.inactiveLockSeconds === 'number' && raw.inactiveLockSeconds > 0
        ? raw.inactiveLockSeconds
        : INACTIVE_LOCK_SECONDS,
    lockImmediatelyFromBackground: false,
  };
}

/** App lock applies whenever the user has a PIN; biometric only affects unlock method. */
export function isAppLockEnabled(hasPin: boolean): boolean {
  return hasPin;
}

export function canUnlockWithBiometric(prefs: SecurityPrefs): boolean {
  return prefs.authWithBiometric;
}

export function canUseBiometricAuth(prefs: SecurityPrefs): boolean {
  return prefs.authWithBiometric;
}

export function canUseBiometricTransactions(prefs: SecurityPrefs): boolean {
  return prefs.transactionsWithBiometric;
}

export async function getSecurityPrefs(): Promise<SecurityPrefs> {
  try {
    const raw = await SecureStore.getItemAsync(KEYS.SECURITY_PREFS);
    if (!raw) return { ...DEFAULT_SECURITY_PREFS };
    return normalizeSecurityPrefs(JSON.parse(raw) as Record<string, unknown>);
  } catch {
    return { ...DEFAULT_SECURITY_PREFS };
  }
}

export async function saveSecurityPrefs(prefs: SecurityPrefs): Promise<void> {
  await SecureStore.setItemAsync(KEYS.SECURITY_PREFS, JSON.stringify(prefs));
}

export async function getBiometricCredentials(): Promise<BiometricCredentials | null> {
  try {
    const raw = await SecureStore.getItemAsync(KEYS.BIOMETRIC_CREDS);
    if (!raw) return null;
    return JSON.parse(raw) as BiometricCredentials;
  } catch {
    return null;
  }
}

export async function saveBiometricCredentials(creds: BiometricCredentials): Promise<void> {
  await SecureStore.setItemAsync(KEYS.BIOMETRIC_CREDS, JSON.stringify(creds));
}

export async function clearBiometricCredentials(): Promise<void> {
  await SecureStore.deleteItemAsync(KEYS.BIOMETRIC_CREDS);
}
