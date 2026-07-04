import { ImageSourcePropType } from 'react-native';
import type { AirtimeProvider } from './api';
import { NetworkProviderColors } from '../theme/colors/app-colors';

export type ProviderStyle = {
  bg: string;
  border: string;
  text: string;
};

const LOCAL_LOGOS: Record<string, ImageSourcePropType> = {
  mtn: require('../../assets/images/providers/mtnlogo.jpg'),
  airtel: require('../../assets/images/providers/airtellogo.png'),
  glo: require('../../assets/images/providers/glologo.png'),
  '9mobile': require('../../assets/images/providers/9mobilelogo.png'),
  t2: require('../../assets/images/providers/9mobilelogo.png'),
};

const PROVIDER_STYLES: Record<string, ProviderStyle> = NetworkProviderColors;

export function getProviderCode(provider: Pick<AirtimeProvider, 'code' | 'id'>): string {
  return String(provider.code || provider.id || '').toLowerCase();
}

export function getProviderLogo(provider: Pick<AirtimeProvider, 'code' | 'id' | 'imageUrl'>): ImageSourcePropType {
  const imageUrl = String(provider.imageUrl || '').trim();
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://') || imageUrl.startsWith('data:image/')) {
    return { uri: imageUrl };
  }

  const code = getProviderCode(provider);
  if (LOCAL_LOGOS[code]) return LOCAL_LOGOS[code];

  return LOCAL_LOGOS.mtn;
}

export function getProviderStyle(code: string, fallback: ProviderStyle): ProviderStyle {
  return PROVIDER_STYLES[String(code || '').toLowerCase()] ?? fallback;
}

const SHORT_NAMES: Record<string, string> = {
  mtn: 'MTN',
  airtel: 'Airtel',
  glo: 'Glo',
  '9mobile': '9mobile',
  t2: 'T2',
};

export function getProviderShortName(
  provider: Pick<AirtimeProvider, 'code' | 'name' | 'id'>,
): string {
  const code = getProviderCode(provider);
  const apiName = String(provider.name || '').trim();
  if (apiName) return apiName;
  return SHORT_NAMES[code] || code.toUpperCase();
}
