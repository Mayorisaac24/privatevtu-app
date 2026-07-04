import { ImageSourcePropType } from 'react-native';
import type { EducationProvider } from './api';
import { EducationProviderColors } from '../theme/colors/app-colors';

export type EducationProviderStyle = {
  bg: string;
  border: string;
  text: string;
};

const PROVIDER_STYLES: Record<string, EducationProviderStyle> = EducationProviderColors;

const SHORT_NAMES: Record<string, string> = {
  waec: 'WAEC',
  'waec-registration': 'WAEC Reg.',
  jamb: 'JAMB',
};

export function getEducationProviderCode(provider: Pick<EducationProvider, 'code' | 'id'>): string {
  return String(provider.code || provider.id || '').toLowerCase();
}

export function hasEducationProviderLogo(provider: Pick<EducationProvider, 'imageUrl'>): boolean {
  const imageUrl = String(provider.imageUrl || '').trim();
  return imageUrl.startsWith('http://') || imageUrl.startsWith('https://') || imageUrl.startsWith('data:image/');
}

export function getEducationProviderLogo(
  provider: Pick<EducationProvider, 'code' | 'id' | 'imageUrl'>,
): ImageSourcePropType | null {
  const imageUrl = String(provider.imageUrl || '').trim();
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://') || imageUrl.startsWith('data:image/')) {
    return { uri: imageUrl };
  }
  return null;
}

export function getEducationProviderStyle(code: string, fallback: EducationProviderStyle): EducationProviderStyle {
  return PROVIDER_STYLES[String(code || '').toLowerCase()] ?? fallback;
}

export function getEducationProviderShortName(
  provider: Pick<EducationProvider, 'code' | 'name' | 'displayName' | 'id'>,
): string {
  const code = getEducationProviderCode(provider);
  return SHORT_NAMES[code] || provider.displayName || provider.name?.split(' ')[0] || code.toUpperCase();
}

export function getEducationProviderDisplayName(
  provider: Pick<EducationProvider, 'code' | 'name' | 'displayName' | 'id'>,
): string {
  return provider.displayName || provider.name || getEducationProviderShortName(provider);
}
