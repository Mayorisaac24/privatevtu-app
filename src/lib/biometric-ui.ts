import { Platform } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export type BiometricIconName = keyof typeof MaterialCommunityIcons.glyphMap;

export type BiometricUiPresentation = {
  icon: BiometricIconName;
  shortLabel: string;
  accessibilityLabel: string;
};

export function getBiometricUiFromTypes(
  types: LocalAuthentication.AuthenticationType[],
): BiometricUiPresentation {
  const hasFace = types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION);
  const hasFingerprint = types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT);

  if (hasFace) {
    return {
      icon: 'face-recognition',
      shortLabel: Platform.OS === 'ios' ? 'Face ID' : 'Face',
      accessibilityLabel:
        Platform.OS === 'ios' ? 'Unlock with Face ID' : 'Unlock with face recognition',
    };
  }

  if (hasFingerprint) {
    return {
      icon: 'fingerprint',
      shortLabel: Platform.OS === 'ios' ? 'Touch ID' : 'Fingerprint',
      accessibilityLabel:
        Platform.OS === 'ios' ? 'Unlock with Touch ID' : 'Unlock with fingerprint',
    };
  }

  return {
    icon: 'shield-lock-outline',
    shortLabel: 'Biometric',
    accessibilityLabel: 'Unlock with biometrics',
  };
}

export async function getBiometricUiPresentation(): Promise<BiometricUiPresentation | null> {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  const enrolled = await LocalAuthentication.isEnrolledAsync();
  if (!hasHardware || !enrolled) return null;

  const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
  return getBiometricUiFromTypes(types);
}

export function getAuthorizeBiometricAccessibilityLabel(
  presentation: BiometricUiPresentation,
): string {
  return presentation.accessibilityLabel.replace(/^Unlock with /i, 'Authorize with ');
}
