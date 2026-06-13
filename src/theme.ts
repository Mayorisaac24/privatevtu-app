/**
 * PrivateVTU Design System
 *
 * Color constants live in `src/theme/colors/` (palette, overlays, semantic).
 * Active theme colors: `useColors()` from `src/theme/hooks`.
 * Static default (violet light): `Colors` export for legacy StyleSheets.
 */
export * from './theme/index';
export { Spacing, Radius, Shadow, Typography, FontFamily, HERO_DARK } from './theme-legacy';
export { useLayout, useGridTileWidth, textStyle, platformText, platformShadow } from './lib/platform-ui';
