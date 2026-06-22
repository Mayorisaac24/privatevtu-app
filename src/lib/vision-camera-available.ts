import { NativeModules } from 'react-native';

let cached: boolean | null = null;

/**
 * Vision Camera is a React Native native module (`CameraView`), not an Expo module.
 * Checking `requireOptionalNativeModule('VisionCamera')` always returned false.
 */
export function isVisionCameraNativeAvailable(): boolean {
  if (cached !== null) return cached;

  try {
    const { CameraView, CameraDevices } = NativeModules;
    cached = Boolean(CameraView && CameraDevices);
  } catch {
    cached = false;
  }

  return cached;
}

/** Clear cached result (e.g. after a dev-client reload). */
export function resetVisionCameraAvailabilityCache(): void {
  cached = null;
}
