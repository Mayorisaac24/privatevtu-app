import type { BettingPlatform } from './api';

export const POPULAR_BETTING_KEYWORDS = [
  'bet9ja',
  'betking',
  '1xbet',
  'betway',
  'betano',
  'nairabet',
  'bangbet',
  'sportybet',
];

export function getBettingPlatformDisplayName(platform: Pick<BettingPlatform, 'name' | 'code'>): string {
  return formatBettingPlatformLabel(platform);
}

/** Synced betting codes look like `1xbet-2968` — show brand name only in the app. */
export function formatBettingPlatformLabel(input: {
  name?: string | null;
  displayName?: string | null;
  code?: string | null;
}): string {
  const explicit = String(input.displayName || input.name || '').trim();
  if (explicit) return explicit;

  const code = String(input.code || '').trim();
  if (!code) return 'Betting';

  const withoutBillerId = code.replace(/-\d+$/, '');
  return withoutBillerId
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function sortBettingPlatformsAlphabetically(platforms: BettingPlatform[]): BettingPlatform[] {
  return [...platforms].sort((a, b) =>
    getBettingPlatformDisplayName(a).localeCompare(getBettingPlatformDisplayName(b)),
  );
}

export function isPopularBettingPlatform(platform: Pick<BettingPlatform, 'name' | 'code'>): boolean {
  const haystack = `${platform.name} ${platform.code}`.toLowerCase();
  return POPULAR_BETTING_KEYWORDS.some((keyword) => haystack.includes(keyword));
}

export function selectPopularBettingPlatforms(platforms: BettingPlatform[], limit = 8): BettingPlatform[] {
  const popular = platforms.filter(isPopularBettingPlatform);
  if (popular.length >= limit) return popular.slice(0, limit);
  const rest = platforms.filter((platform) => !popular.includes(platform));
  return [...popular, ...rest].slice(0, limit);
}

export function formatBettingAmountRange(platform: Pick<BettingPlatform, 'minAmount' | 'maxAmount'>): string {
  const min = Math.max(100, Math.round(Number(platform.minAmount || 10000) / 100));
  const max = Math.round(Number(platform.maxAmount || 100000000) / 100);
  return `₦${min.toLocaleString()} – ₦${max.toLocaleString()}`;
}

export function hasBettingPlatformLogo(platform: Pick<BettingPlatform, 'imageUrl'>): boolean {
  const imageUrl = String(platform.imageUrl || '').trim();
  return imageUrl.startsWith('http://') || imageUrl.startsWith('https://') || imageUrl.startsWith('data:image/');
}

export function getBettingPlatformLogo(
  platform: Pick<BettingPlatform, 'code' | 'imageUrl'>,
): { uri: string } | null {
  const imageUrl = String(platform.imageUrl || '').trim();
  if (!hasBettingPlatformLogo(platform)) return null;
  return { uri: imageUrl };
}
