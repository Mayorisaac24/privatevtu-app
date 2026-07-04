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

export {
  BRAND,
  Palette,
  type PaletteKey,
  Overlays,
  FormColors,
  SupportChannelColors,
  NetworkProviderColors,
  DisputeStatusColors,
  StarRatingColor,
  PrivacyHighlightColors,
  EducationProviderColors,
  BankBrandColors,
  FamilyAccents,
  ReceiptColors,
  BRAND_SPLASH_BG,
} from './colors/app-colors';
export {
  KycStatusColors,
  CableProviderColors,
  WalletFlowColors,
  createVioletLightColors,
  createVioletLightGradients,
} from './colors/semantic';

export {
  colorWithAlpha,
  getPurchaseConfirmGradient,
  getNotificationTypePalette,
  getToastVariantPalette,
} from './colors/ui-semantics';
export type { NotificationVisualType, ToastVariant } from './colors/ui-semantics';

export { Colors, Gradients, useThemeStore } from './theme-store';
export { ThemeProvider } from './ThemeProvider';
export { useTheme, useColors, useGradients, useThemeId, useThemedStyles, createThemedStyles, useCardGlassVariant } from './hooks';
export { gradientStops, withAlpha } from './gradient-utils';

export { Spacing, Radius, Shadow, Typography, FontFamily, HERO_DARK } from '../theme-legacy';
