import * as Device from 'expo-device';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';

const DEVICE_ID_KEY = 'pvtu_device_id';

export interface DeviceIntegrityPayload {
  deviceId: string;
  platform: string;
  appVersion: string;
  buildNumber: string;
  isRooted: boolean;
  isJailBroken: boolean;
  isEmulator: boolean;
  isDebug: boolean;
  canMockLocation: boolean;
  trustScore: number;
  reportedAt: string;
}

let cachedPayload: DeviceIntegrityPayload | null = null;

async function getOrCreateDeviceId(): Promise<string> {
  const existing = await SecureStore.getItemAsync(DEVICE_ID_KEY);
  if (existing) return existing;

  const generated = `dev_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
  await SecureStore.setItemAsync(DEVICE_ID_KEY, generated);
  return generated;
}

function readJailMonkeyFlags(): {
  isRooted: boolean;
  isJailBroken: boolean;
  canMockLocation: boolean;
} {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const JailMonkey = require('jail-monkey') as {
      isJailBroken?: () => boolean;
      isOnExternalStorage?: () => boolean;
      canMockLocation?: () => boolean;
      hookDetected?: () => boolean;
    };

    const jailBroken = Boolean(JailMonkey.isJailBroken?.());
    const hooked = Boolean(JailMonkey.hookDetected?.());
    const externalStorage = Boolean(JailMonkey.isOnExternalStorage?.());
    const canMockLocation = Boolean(JailMonkey.canMockLocation?.());

    return {
      isJailBroken: jailBroken || hooked,
      isRooted: jailBroken || externalStorage || hooked,
      canMockLocation,
    };
  } catch {
    return {
      isRooted: false,
      isJailBroken: false,
      canMockLocation: false,
    };
  }
}

function computeTrustScore(input: {
  isRooted: boolean;
  isJailBroken: boolean;
  isEmulator: boolean;
  isDebug: boolean;
}): number {
  let score = 100;
  if (input.isRooted || input.isJailBroken) score -= 60;
  if (input.isEmulator) score -= 25;
  if (input.isDebug) score -= 10;
  return Math.max(0, score);
}

export async function buildDeviceIntegrityPayload(): Promise<DeviceIntegrityPayload> {
  if (cachedPayload) return cachedPayload;

  const deviceId = await getOrCreateDeviceId();
  const jailFlags = readJailMonkeyFlags();
  const isEmulator = !Device.isDevice;
  const isDebug = __DEV__;

  const payload: DeviceIntegrityPayload = {
    deviceId,
    platform: Device.osName?.toLowerCase() || 'unknown',
    appVersion: Constants.expoConfig?.version || Constants.nativeAppVersion || '1.0.0',
    buildNumber: String(Constants.nativeBuildVersion || Constants.expoConfig?.ios?.buildNumber || '0'),
    isRooted: jailFlags.isRooted,
    isJailBroken: jailFlags.isJailBroken,
    isEmulator,
    isDebug,
    canMockLocation: jailFlags.canMockLocation,
    trustScore: computeTrustScore({
      isRooted: jailFlags.isRooted,
      isJailBroken: jailFlags.isJailBroken,
      isEmulator,
      isDebug,
    }),
    reportedAt: new Date().toISOString(),
  };

  cachedPayload = payload;
  return payload;
}

export function encodeDeviceIntegrityHeader(payload: DeviceIntegrityPayload): string {
  const json = JSON.stringify(payload);
  const bytes = new TextEncoder().encode(json);
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  if (typeof globalThis.btoa === 'function') {
    return globalThis.btoa(binary);
  }
  return json;
}

export async function getDeviceIntegrityHeaders(): Promise<Record<string, string>> {
  const payload = await buildDeviceIntegrityPayload();
  return {
    'X-Device-Id': payload.deviceId,
    'X-App-Platform': payload.platform,
    'X-App-Version': payload.appVersion,
    'X-Device-Integrity': encodeDeviceIntegrityHeader(payload),
  };
}

export function isDeviceCompromised(payload: DeviceIntegrityPayload): boolean {
  return Boolean(payload.isRooted || payload.isJailBroken);
}
