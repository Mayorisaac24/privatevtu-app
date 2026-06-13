import { ImageSourcePropType } from 'react-native';
import type { ElectricityProvider } from './api';

const DEFAULT_LOGO = require('../../assets/images/discos/electricitylogo.png');

const LOCAL_DISCO_LOGOS: Record<string, ImageSourcePropType> = {
  ikedc: require('../../assets/images/discos/ikedc.png'),
  ibedc: require('../../assets/images/discos/ibedc.png'),
  ekedc: require('../../assets/images/discos/ekedc.png'),
};

const LOGO_SCALE_BY_CODE: Record<string, number> = {
  ikedc: 0.92,
  ibedc: 1.05,
  ekedc: 1.08,
};

export function getDiscoCode(provider: Pick<ElectricityProvider, 'code' | 'id'>): string {
  return String(provider.code || provider.id || '').toLowerCase();
}

export function getDiscoLogoUri(url: string, updatedAt?: string | null): string {
  const trimmed = url.trim();
  if (trimmed.startsWith('data:image/')) return trimmed;

  const base = trimmed.split('?')[0];
  if (base.includes('res.cloudinary.com') && /\/upload\/v\d+\//.test(base)) {
    return base;
  }

  const version = updatedAt ? new Date(updatedAt).getTime() : 0;
  const separator = trimmed.includes('?') ? '&' : '?';
  return `${trimmed}${separator}v=${version}`;
}

export function getDiscoLogo(
  provider: Pick<ElectricityProvider, 'code' | 'id' | 'imageUrl' | 'updatedAt'>,
): ImageSourcePropType {
  const imageUrl = String(provider.imageUrl || '').trim();
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return { uri: getDiscoLogoUri(imageUrl, provider.updatedAt) };
  }

  const code = getDiscoCode(provider);
  if (LOCAL_DISCO_LOGOS[code]) return LOCAL_DISCO_LOGOS[code];

  return DEFAULT_LOGO;
}

export function getDiscoLogoScale(code: string): number {
  return LOGO_SCALE_BY_CODE[String(code || '').toLowerCase()] ?? 1;
}

export function getDiscoShortCode(provider: Pick<ElectricityProvider, 'code' | 'id'>): string {
  return getDiscoCode(provider).toUpperCase();
}

export function getDiscoDisplayName(provider: Pick<ElectricityProvider, 'code' | 'name' | 'id'>): string {
  const code = getDiscoShortCode(provider);
  const name = String(provider.name || '').trim();
  if (!name) return code;
  if (name.toUpperCase().includes(code)) return name;
  return `${name} (${code})`;
}

export const POPULAR_DISCO_CODES = ['ikedc', 'ekedc', 'ibedc', 'aedc', 'yedc', 'kedco'];

export function sortDiscosAlphabetically(discos: ElectricityProvider[]): ElectricityProvider[] {
  return [...discos].sort((a, b) => getDiscoDisplayName(a).localeCompare(getDiscoDisplayName(b)));
}

export function selectPopularDiscoRows<T extends { provider: ElectricityProvider }>(rows: T[], limit = 8): T[] {
  const popular = new Set(POPULAR_DISCO_CODES);
  const hits = rows.filter((row) => popular.has(getDiscoCode(row.provider)));
  const rest = rows.filter((row) => !popular.has(getDiscoCode(row.provider)));
  return [...hits, ...rest].slice(0, limit);
}
