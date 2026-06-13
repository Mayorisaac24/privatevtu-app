export type {
  ThemeId,
  ThemeFamily,
  ThemeMode,
  ThemeColors,
  ThemeGradients,
  ThemeDefinition,
  ThemeSection,
} from './types';

export {
  THEME_DEFINITIONS,
  THEME_MAP,
  DEFAULT_THEME_ID,
  BRAND_THEME_IDS,
  OTHER_THEME_FAMILIES,
} from './palettes';

export { Palette } from './colors/palette';
export { Overlays } from './colors/overlays';
export {
  KycStatusColors,
  CableProviderColors,
  WalletFlowColors,
  createVioletLightColors,
  createVioletLightGradients,
} from './colors/semantic';

export { Colors, Gradients, useThemeStore } from './theme-store';
export { ThemeProvider } from './ThemeProvider';
export { useTheme, useColors, useGradients, useThemeId, useThemedStyles } from './hooks';
export { gradientStops } from './gradient-utils';

export { Spacing, Radius, Shadow, Typography, FontFamily, HERO_DARK } from '../theme-legacy';
