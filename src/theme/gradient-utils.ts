/** Spread readonly theme gradient tuples for expo-linear-gradient. */
export function gradientStops(colors: readonly string[]): [string, string, ...string[]] {
  return [...colors] as [string, string, ...string[]];
}

/** Append an alpha channel to a 3- or 6-digit hex color. */
export function withAlpha(hex: string, alpha: number): string {
  const normalized = hex.replace('#', '');
  const expanded =
    normalized.length === 3
      ? normalized.split('').map((c) => c + c).join('')
      : normalized.slice(0, 6);
  const channel = Math.round(Math.min(1, Math.max(0, alpha)) * 255)
    .toString(16)
    .padStart(2, '0');
  return `#${expanded}${channel}`;
}
