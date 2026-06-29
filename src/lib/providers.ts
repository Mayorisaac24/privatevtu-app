import { ImageSourcePropType } from 'react-native';
import type { AirtimeProvider } from './api';

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

const PROVIDER_STYLES: Record<string, ProviderStyle> = {
  mtn: { bg: '#FFFDE7', border: '#FDE047', text: '#78350F' },
  glo: { bg: '#F0FDF4', border: '#86EFAC', text: '#14532D' },
  airtel: { bg: '#FFF5F5', border: '#FCA5A5', text: '#7F1D1D' },
  '9mobile': { bg: '#F0FDF4', border: '#6EE7B7', text: '#064E3B' },
};

const LOGO_SCALE_BY_CODE: Record<string, number> = {
  airtel: 1.22,
};

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

export function getProviderLogoScale(code: string): number {
  return LOGO_SCALE_BY_CODE[String(code || '').toLowerCase()] ?? 1;
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
