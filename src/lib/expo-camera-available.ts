import { requireOptionalNativeModule } from 'expo-modules-core';

let cached: boolean | null = null;

/** True when the native ExpoCamera module is linked in the current dev client / build. */
export function isExpoCameraNativeAvailable(): boolean {
  if (cached !== null) return cached;
  try {
    cached = !!requireOptionalNativeModule('ExpoCamera');
  } catch {
    cached = false;
  }
  return cached;
}
