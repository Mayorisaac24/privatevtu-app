/**
 * Central color exports — all hex/rgba definitions live in `app-colors.ts`.
 */
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
} from './app-colors';

export {
  KycStatusColors,
  CableProviderColors,
  WalletFlowColors,
  createVioletLightColors,
  createVioletLightGradients,
  createVioletDarkColors,
  createVioletDarkGradients,
  createFamilyLightColors,
  createFamilyDarkColors,
  createFamilyGradients,
  createFamilyLightGradients,
  createFamilyDarkGradients,
} from './semantic';

export {
  colorWithAlpha,
  getPurchaseConfirmGradient,
  getNotificationTypePalette,
  getToastVariantPalette,
} from './ui-semantics';
export type { NotificationVisualType, ToastVariant } from './ui-semantics';
