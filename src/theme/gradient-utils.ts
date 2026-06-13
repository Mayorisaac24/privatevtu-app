/** Spread readonly theme gradient tuples for expo-linear-gradient. */
export function gradientStops(colors: readonly string[]): [string, string, ...string[]] {
  return [...colors] as [string, string, ...string[]];
}
