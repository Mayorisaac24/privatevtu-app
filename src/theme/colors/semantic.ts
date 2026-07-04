import { BRAND, FamilyAccents, Overlays, Palette } from './app-colors';
import { withAlpha } from '../gradient-utils';
import type { ThemeColors, ThemeGradients } from '../types';

/** Default light semantic colors — Datamart design. */
export function createVioletLightColors(): ThemeColors {
  return {
    primary: Palette.violet600,
    primaryDark: Palette.violet700,
    primaryDeep: Palette.violet900,
    primaryLight: Palette.violet400,
    primaryMuted: Palette.violet50,
    primaryGlow: Palette.violet500,

    success: Palette.emerald500,
    successLight: Palette.emerald100,
    successDark: Palette.emerald700,
    warning: Palette.amber500,
    warningLight: Palette.warningLight,
    warningDark: Palette.amber700,
    error: Palette.red500,
    errorLight: Palette.red50,
    errorDark: Palette.red700,
    info: Palette.cyan400,
    infoLight: Palette.cyan50,

    dark: Palette.slate900,
    darkAlt: Palette.slate800,
    darkCard: Palette.indigoCard,
    darkBorder: Palette.indigoBorder,
    mid: Palette.slate700,
    muted: Palette.slate500,
    mutedLight: Palette.slate400,
    border: Palette.violet100,
    borderMid: Palette.slate300,
    borderSubtle: Overlays.borderSubtle,
    surface: Palette.slate50,
    surfaceAlt: Palette.slate100,
    card: Palette.white,
    white: Palette.white,
    pageBg: Palette.pageBg,
    formBg: Palette.formBg,
    formBgAlt: Palette.formBgAlt,
    formBgNeutral: Palette.formBgNeutral,
    inputFilled: Palette.violet50,
    pinFilled: Palette.headerTint,
    heroDark: Palette.heroBase,
    textOnHero: Palette.white,
    textOnHeroMuted: Overlays.white72,
    textOnHeroSubtle: Overlays.white58,

    airtime: Palette.violet600,
    airtimeBg: Palette.violet50,
    data: Palette.violet600,
    dataBg: Palette.violet50,
    electricity: Palette.amber600,
    electricityBg: Palette.amber50,
    cable: Palette.red600,
    cableBg: Palette.red50,
    transfer: Palette.blue500,
    transferBg: Palette.blue50,
    fund: Palette.cyan600,
    fundBg: Palette.cyan50Bg,
    betting: Palette.orange600,
    bettingBg: Palette.orange50,
    education: Palette.cyan700,
    educationBg: Palette.cyan100Bg,

    ambientPrimary: Overlays.violet06,
    ambientSecondary: Overlays.indigo05,
    glassOverlay: Overlays.rgba255_255_255_094,
    glassBorder: Overlays.glassBorder,
    headerGlass: Overlays.headerGlass,
    statusBarStyle: 'dark',
    shadowColor: Palette.violet900,
  };
}

export function createVioletLightGradients(): ThemeGradients {
  return {
    primary: [Palette.violet900, Palette.violet700, Palette.violet600],
    card: [Palette.indigoBorder, Palette.purpleDeep, Palette.violet600],
    cardSoft: [Palette.violet700, Palette.violet500, Palette.violet400],
    header: [Palette.white, Palette.headerTint, Palette.slate50],
    hero: [Palette.heroBase, Palette.heroDeep, Palette.violet900],
    heroAlt: [Palette.heroBase, Palette.heroMid, Palette.heroAccent],
    heroAuth: [Palette.heroBase, Palette.heroMid, Palette.heroDeep, Palette.violet900],
    button: [Palette.violet500, Palette.violet600, Palette.violet700],
    buttonInactive: [Palette.violet300, Palette.violet400],
    buttonDanger: [Palette.red500, Palette.red600, Palette.dangerDark],
    buttonDangerInactive: [Palette.red300, Palette.red400],
    logo: [Palette.violet400, Palette.violet500, Palette.violet600],
    success: [Palette.emerald600, Palette.emerald500],
    dark: [Palette.indigoCard, Palette.indigoBorder],
    surface: [Palette.slate50, Palette.slate100],
    accentLine: [Overlays.violet55, Overlays.violet35, 'transparent'],
    activeCard: [Overlays.emerald04, Overlays.violet06],
  };
}

/** Dark mode equivalent of the default violet design. */
export function createVioletDarkColors(): ThemeColors {
  const light = createVioletLightColors();
  return {
    ...light,
    primary: Palette.violet400,
    primaryDark: Palette.violet500,
    primaryDeep: Palette.violet800,
    primaryLight: Palette.violet300,
    primaryMuted: Palette.darkPrimaryMuted,
    primaryGlow: Palette.violet500,

    dark: Palette.darkText,
    darkAlt: Palette.slate200,
    darkCard: Palette.darkCard,
    darkBorder: Palette.darkBorder,
    mid: Palette.slate300,
    muted: Palette.darkMuted,
    mutedLight: Palette.slate500,
    border: Palette.darkBorder,
    borderMid: Palette.darkBorderMid,
    borderSubtle: Overlays.white08,
    surface: Palette.darkSurface,
    surfaceAlt: Palette.darkSurfaceAlt,
    card: Palette.darkCard,
    pageBg: Palette.darkPageBg,
    formBg: Palette.darkSurface,
    formBgAlt: Palette.darkSurfaceAlt,
    formBgNeutral: Palette.darkSurfaceAlt,
    inputFilled: Palette.darkPrimaryMuted,
    pinFilled: Palette.darkBorderMid,
    heroDark: Palette.darkHeroSurface,
    textOnHero: Palette.white,
    textOnHeroMuted: Overlays.white72,
    textOnHeroSubtle: Overlays.white55,

    airtimeBg: Palette.darkAirtimeBg,
    dataBg: Palette.darkAirtimeBg,
    electricityBg: Palette.darkElectricityBg,
    cableBg: Palette.darkCableBg,
    transferBg: Palette.darkTransferBg,
    fundBg: Palette.darkFundBg,
    bettingBg: Palette.darkBettingBg,
    educationBg: Palette.darkFundBg,

    successLight: Palette.darkSuccessLight,
    successDark: Palette.emerald400,
    warningLight: Palette.darkWarningLight,
    errorLight: Palette.darkErrorLight,
    errorDark: Palette.red400,
    infoLight: Palette.darkInfoLight,

    ambientPrimary: Overlays.darkAmbientPrimary,
    ambientSecondary: Overlays.darkAmbientSecondary,
    glassOverlay: Overlays.darkGlassOverlay,
    glassBorder: Overlays.white08,
    headerGlass: Overlays.darkHeaderGlass,
    statusBarStyle: 'light',
    shadowColor: Palette.black,
  };
}

export function createVioletDarkGradients(): ThemeGradients {
  const light = createVioletLightGradients();
  return {
    ...light,
    header: [Palette.darkPageBg, Palette.darkHeaderMid, Palette.darkSurface],
    hero: [Palette.darkHeroSurface, Palette.heroMid, Palette.violet900],
    heroAlt: [Palette.darkHeroSurface, Palette.heroMid, Palette.violet900],
    heroAuth: [Palette.darkHeroSurface, Palette.heroBase, Palette.heroDeep, Palette.violet900],
    surface: [Palette.darkSurface, Palette.darkSurfaceAlt],
    dark: [Palette.darkCard, Palette.darkBorder],
  };
}

type FamilyAccent = {
  primary: string;
  primaryDark: string;
  primaryDeep: string;
  primaryLight: string;
  primaryMuted: string;
  primaryGlow: string;
  pageBg: string;
  heroDark: string;
  border: string;
  ambientPrimary: string;
  ambientSecondary: string;
  surface: string;
  surfaceAlt: string;
  card: string;
  formBg: string;
  formBgAlt: string;
  inputFilled: string;
  pinFilled: string;
  borderMid: string;
  shadowColor: string;
  glassOverlay?: string;
  headerGlass?: string;
  airtimeBg?: string;
  dataBg?: string;
  transferBg?: string;
  fundBg?: string;
  educationBg?: string;
};

function buildFamilyLight(accent: FamilyAccent): ThemeColors {
  const base = createVioletLightColors();
  return {
    ...base,
    // Brand accents — headers, buttons, icons, active states
    primary: accent.primary,
    primaryDark: accent.primaryDark,
    primaryDeep: accent.primaryDeep,
    primaryLight: accent.primaryLight,
    primaryGlow: accent.primaryGlow,
    pageBg: accent.pageBg,
    heroDark: accent.heroDark,
    ambientPrimary: accent.ambientPrimary,
    ambientSecondary: accent.ambientSecondary,
    shadowColor: accent.shadowColor,
    airtime: accent.primary,
    data: accent.primary,
    glassOverlay: accent.glassOverlay ?? base.glassOverlay,
    headerGlass: accent.headerGlass ?? base.headerGlass,
    // Surfaces, borders, fills stay neutral (same as default violet-light)
  };
}

function buildFamilyDark(accent: FamilyAccent): ThemeColors {
  const base = createVioletDarkColors();
  return {
    ...base,
    primary: accent.primaryLight,
    primaryDark: accent.primary,
    primaryDeep: accent.primaryDeep,
    primaryLight: accent.primaryLight,
    primaryMuted: accent.primaryMuted,
    primaryGlow: accent.primaryGlow,
    pageBg: accent.pageBg,
    heroDark: accent.heroDark,
    border: accent.border,
    borderMid: accent.borderMid,
    ambientPrimary: accent.ambientPrimary,
    ambientSecondary: accent.ambientSecondary,
    surface: accent.surface,
    surfaceAlt: accent.surfaceAlt,
    card: accent.card,
    formBg: accent.formBg,
    formBgAlt: accent.formBgAlt,
    formBgNeutral: accent.surfaceAlt,
    inputFilled: accent.inputFilled,
    pinFilled: accent.pinFilled,
    shadowColor: accent.shadowColor,
    airtime: accent.primaryLight,
    data: accent.primaryLight,
    glassOverlay: accent.glassOverlay ?? base.glassOverlay,
    headerGlass: accent.headerGlass ?? base.headerGlass,
    airtimeBg: accent.airtimeBg ?? base.airtimeBg,
    dataBg: accent.dataBg ?? base.dataBg,
    transferBg: accent.transferBg ?? base.transferBg,
    fundBg: accent.fundBg ?? base.fundBg,
    educationBg: accent.educationBg ?? base.educationBg,
  };
}

function buildFamilyGradients(hero: [string, string, string], button: [string, string, string], logo: [string, string, string]): ThemeGradients {
  const base = createVioletLightGradients();
  return { ...base, hero, heroAlt: hero, heroAuth: [hero[0], hero[1], hero[2], hero[2]], button, logo, primary: button };
}

export function createFamilyLightColors(family: keyof typeof FamilyAccents): ThemeColors {
  return buildFamilyLight(FamilyAccents[family].light);
}

export function createFamilyDarkColors(family: keyof typeof FamilyAccents): ThemeColors {
  return buildFamilyDark(FamilyAccents[family].dark);
}

export function createFamilyGradients(family: keyof typeof FamilyAccents, mode: 'light' | 'dark'): ThemeGradients {
  const accent = FamilyAccents[family][mode];
  return buildFamilyGradients(
    [accent.heroDark, accent.primaryDeep, accent.primaryDark],
    [accent.primaryGlow, accent.primary, accent.primaryDark],
    [accent.primaryLight, accent.primaryGlow, accent.primary],
  );
}

export function createFamilyLightGradients(family: keyof typeof FamilyAccents): ThemeGradients {
  const accent = FamilyAccents[family].light;
  const base = createFamilyGradients(family, 'light');
  return {
    ...base,
    header: [Palette.white, Palette.slate50, accent.pageBg],
    hero: [accent.heroDark, accent.primaryDeep, accent.primaryGlow],
    heroAlt: [accent.heroDark, accent.primaryDeep, accent.primaryLight],
    heroAuth: [accent.heroDark, accent.primaryDeep, accent.primaryDark, accent.primary],
    card: [accent.primaryDeep, accent.primaryDark, accent.primary],
    cardSoft: [accent.primaryDark, accent.primaryGlow, accent.primaryLight],
    buttonInactive: [accent.primaryLight, accent.primaryMuted],
    accentLine: [withAlpha(accent.primary, 0.55), withAlpha(accent.primaryGlow, 0.35), 'transparent'],
    activeCard: [Overlays.emerald04, accent.ambientPrimary],
    surface: [accent.surface, accent.surfaceAlt],
    dark: [accent.heroDark, accent.primaryDeep],
  };
}

export function createFamilyDarkGradients(family: keyof typeof FamilyAccents): ThemeGradients {
  const accent = FamilyAccents[family].dark;
  const base = createFamilyGradients(family, 'dark');
  return {
    ...base,
    header: [accent.pageBg, accent.surface, accent.surfaceAlt],
    hero: [accent.heroDark, accent.primaryDeep, accent.primaryGlow],
    heroAlt: [accent.heroDark, accent.primaryDeep, accent.primaryLight],
    heroAuth: [accent.heroDark, accent.pageBg, accent.primaryDeep, accent.primaryDark],
    card: [accent.primaryDeep, accent.primaryDark, accent.primary],
    cardSoft: [accent.primaryDark, accent.primaryGlow, accent.primaryLight],
    buttonInactive: [accent.primaryMuted, accent.primaryDeep],
    accentLine: [withAlpha(accent.primary, 0.55), withAlpha(accent.primaryGlow, 0.35), 'transparent'],
    activeCard: [Overlays.emerald04, accent.ambientPrimary],
    surface: [accent.surface, accent.surfaceAlt],
    dark: [accent.card, accent.border],
  };
}

/** KYC status color map */
export const KycStatusColors = {
  VERIFIED: { label: 'Verified', color: Palette.emerald500, icon: 'shield-checkmark' as const },
  PENDING: { label: 'Pending', color: Palette.kycPending, icon: 'time-outline' as const },
  NOT_VERIFIED: { label: 'Not Verified', color: Palette.kycRejected, icon: 'shield-outline' as const },
  REJECTED: { label: 'Rejected', color: Palette.kycRejected, icon: 'close-circle-outline' as const },
};

/** Cable provider brand colors */
export const CableProviderColors = {
  DSTV: { bg: Palette.dstvBg, border: Palette.dstvBorder, text: Palette.dstvText },
  GOTV: { bg: Palette.gotvBg, border: Palette.gotvBorder, text: Palette.gotvText },
  STARTIMES: { bg: Palette.startimesBg, border: Palette.startimesBorder, text: Palette.startimesText },
  SHOWMAX: { bg: Palette.showmaxBg, border: Palette.showmaxBorder, text: Palette.showmaxText },
} as const;

/** Wallet flow indicator colors */
export const WalletFlowColors = {
  in: Palette.emerald600,
  inBg: Palette.emerald50,
  inBorder: Overlays.borderSuccess12,
  inIconBg: Overlays.emerald14,
  out: Palette.red600,
  outBg: Palette.red50,
  outBorder: Overlays.borderDanger10,
  outIconBg: Overlays.walletOutIconBg,
} as const;

export { FamilyAccents } from './app-colors';
