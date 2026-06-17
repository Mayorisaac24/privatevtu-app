import { requireOptionalNativeModule } from 'expo-modules-core';

let cached: boolean | null = null;

/** True when VisionCamera native module is linked in the current dev client / build. */
export function isVisionCameraNativeAvailable(): boolean {
  if (cached !== null) return cached;
  try {
    cached = !!requireOptionalNativeModule('VisionCamera');
  } catch {
    cached = false;
  }
  return cached;
}
