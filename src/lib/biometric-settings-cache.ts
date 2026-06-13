import { getBiometricCapability, type BiometricCapability } from './biometric-auth';
import { useSecurityStore } from '../stores/security-store';

let capabilityCache: BiometricCapability | null = null;
let hydrateStarted = false;

export function peekBiometricCapability(): BiometricCapability | null {
  return capabilityCache;
}

export function isBiometricSettingsCached(): boolean {
  const { prefsLoaded } = useSecurityStore.getState();
  return prefsLoaded && capabilityCache !== null;
}

export async function ensureBiometricSettingsReady(): Promise<BiometricCapability> {
  const { loadPrefs, prefsLoaded } = useSecurityStore.getState();

  if (!prefsLoaded) {
    await loadPrefs();
  }

  if (capabilityCache) {
    return capabilityCache;
  }

  capabilityCache = await getBiometricCapability();
  return capabilityCache;
}

export function preloadBiometricSettings() {
  if (hydrateStarted && isBiometricSettingsCached()) return;
  hydrateStarted = true;
  void ensureBiometricSettingsReady().catch(() => undefined);
}

export function invalidateBiometricCapabilityCache() {
  capabilityCache = null;
  hydrateStarted = false;
}
