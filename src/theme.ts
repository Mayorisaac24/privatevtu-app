/**
 * Datamart Design System
 *
 * **Change app colors:** `src/theme/colors/app-colors.ts` — the only file with hex values.
 * Runtime hooks: `useColors()` / `useGradients()` from `src/theme/hooks`.
 * Legacy StyleSheets: `Colors` export from `src/theme`.
 */
export * from './theme/index';
export { Spacing, Radius, Shadow, Typography, FontFamily, HERO_DARK } from './theme-legacy';
export { useLayout, useGridTileWidth, textStyle, platformText, platformShadow } from './lib/platform-ui';
