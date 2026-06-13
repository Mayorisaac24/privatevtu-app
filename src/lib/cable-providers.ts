import { ImageSourcePropType } from 'react-native';
import type { CableProvider } from './api';
import { CableProviderColors } from '../theme';

export type CableProviderStyle = {
  bg: string;
  border: string;
  text: string;
};

const DEFAULT_LOGO = require('../../assets/images/cable/cabletvlogo.png');

const LOCAL_CABLE_LOGOS: Record<string, ImageSourcePropType> = {};

const CABLE_STYLES: Record<string, CableProviderStyle> = {
  dstv: CableProviderColors.DSTV,
  gotv: CableProviderColors.GOTV,
  startimes: CableProviderColors.STARTIMES,
  showmax: CableProviderColors.SHOWMAX,
};

const SHORT_NAMES: Record<string, string> = {
  dstv: 'DStv',
  gotv: 'GOtv',
  startimes: 'StarTimes',
  showmax: 'Showmax',
};

export function getCableProviderCode(provider: Pick<CableProvider, 'code' | 'id'>): string {
  return String(provider.code || provider.id || '').toLowerCase();
}

export function getCableProviderLogo(provider: Pick<CableProvider, 'code' | 'id' | 'imageUrl'>): ImageSourcePropType {
  const code = getCableProviderCode(provider);
  if (LOCAL_CABLE_LOGOS[code]) return LOCAL_CABLE_LOGOS[code];

  const imageUrl = String(provider.imageUrl || '').trim();
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return { uri: imageUrl };
  }

  return DEFAULT_LOGO;
}

export function getCableProviderStyle(code: string, fallback: CableProviderStyle): CableProviderStyle {
  return CABLE_STYLES[String(code || '').toLowerCase()] ?? fallback;
}

export function getCableProviderShortName(
  provider: Pick<CableProvider, 'code' | 'name' | 'displayName' | 'id'>,
): string {
  const code = getCableProviderCode(provider);
  return SHORT_NAMES[code] || provider.displayName || provider.name?.split(' ')[0] || code.toUpperCase();
}

export function getCableProviderDisplayName(
  provider: Pick<CableProvider, 'code' | 'name' | 'displayName' | 'id'>,
): string {
  return provider.displayName || provider.name || getCableProviderShortName(provider);
}
