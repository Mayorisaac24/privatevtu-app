import { Palette } from './palette';
import { Overlays } from './overlays';
import type { ThemeColors, ThemeGradients } from '../types';

/** Default light semantic colors — current PrivateVTU design. */
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
    warningLight: '#FEF3C7',
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
    glassOverlay: 'rgba(255, 255, 255, 0.94)',
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
    header: [Palette.white, '#FAF5FF', Palette.slate50],
    hero: [Palette.heroBase, Palette.heroDeep, Palette.violet900],
    heroAlt: [Palette.heroBase, Palette.heroMid, Palette.heroAccent],
    heroAuth: [Palette.heroBase, Palette.heroMid, Palette.heroDeep, Palette.violet900],
    button: [Palette.violet500, Palette.violet600, Palette.violet700],
    buttonInactive: [Palette.violet300, Palette.violet400],
    buttonDanger: [Palette.red500, Palette.red600, '#B91C1C'],
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
    primaryMuted: '#1E1535',
    primaryGlow: Palette.violet500,

    dark: Palette.darkText,
    darkAlt: Palette.slate200,
    darkCard: Palette.darkCard,
    darkBorder: Palette.darkBorder,
    mid: Palette.slate300,
    muted: Palette.darkMuted,
    mutedLight: Palette.slate500,
    border: Palette.darkBorder,
    borderMid: '#3D3258',
    borderSubtle: 'rgba(255, 255, 255, 0.08)',
    surface: Palette.darkSurface,
    surfaceAlt: Palette.darkSurfaceAlt,
    card: Palette.darkCard,
    pageBg: Palette.darkPageBg,
    heroDark: '#0D0518',
    textOnHero: Palette.white,
    textOnHeroMuted: Overlays.white72,
    textOnHeroSubtle: Overlays.white55,

    airtimeBg: '#1A1030',
    dataBg: '#1A1030',
    electricityBg: '#1F1508',
    cableBg: '#1F0A0A',
    transferBg: '#0A1428',
    fundBg: '#081820',
    bettingBg: '#1F1008',
    educationBg: '#081820',

    successLight: '#0A2E22',
    warningLight: '#2A1F08',
    errorLight: '#2A1010',
    infoLight: '#082028',

    ambientPrimary: 'rgba(124, 58, 237, 0.12)',
    ambientSecondary: 'rgba(99, 102, 241, 0.08)',
    glassOverlay: 'rgba(18, 12, 34, 0.92)',
    glassBorder: 'rgba(255, 255, 255, 0.08)',
    headerGlass: 'rgba(10, 6, 20, 0.88)',
    statusBarStyle: 'light',
    shadowColor: '#000000',
  };
}

export function createVioletDarkGradients(): ThemeGradients {
  const light = createVioletLightGradients();
  return {
    ...light,
    header: [Palette.darkPageBg, '#120C22', Palette.darkSurface],
    hero: ['#0D0518', '#1A0A3C', Palette.violet900],
    heroAlt: ['#0D0518', Palette.heroMid, Palette.violet900],
    heroAuth: ['#0D0518', Palette.heroBase, Palette.heroDeep, Palette.violet900],
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
};

function buildFamilyLight(accent: FamilyAccent, pageBg: string): ThemeColors {
  const base = createVioletLightColors();
  return {
    ...base,
    ...accent,
    pageBg,
    primaryMuted: accent.primaryMuted,
    border: accent.border,
  };
}

function buildFamilyDark(accent: FamilyAccent, pageBg: string): ThemeColors {
  const base = createVioletDarkColors();
  return {
    ...base,
    primary: accent.primaryLight,
    primaryDark: accent.primary,
    primaryDeep: accent.primaryDeep,
    primaryLight: accent.primaryLight,
    primaryMuted: accent.primaryMuted,
    primaryGlow: accent.primaryGlow,
    pageBg,
    heroDark: accent.heroDark,
    border: accent.border,
    ambientPrimary: accent.ambientPrimary,
    ambientSecondary: accent.ambientSecondary,
  };
}

function buildFamilyGradients(hero: [string, string, string], button: [string, string, string], logo: [string, string, string]): ThemeGradients {
  const base = createVioletLightGradients();
  return { ...base, hero, heroAlt: hero, heroAuth: [hero[0], hero[1], hero[2], hero[2]], button, logo, primary: button };
}

export const FamilyAccents = {
  midnight: {
    light: {
      primary: '#1E3A5F',
      primaryDark: '#152A45',
      primaryDeep: '#0F1D32',
      primaryLight: '#3B82F6',
      primaryMuted: '#EFF6FF',
      primaryGlow: '#2563EB',
      pageBg: '#F8FAFC',
      heroDark: '#0F1D32',
      border: '#DBEAFE',
      ambientPrimary: 'rgba(59, 130, 246, 0.06)',
      ambientSecondary: 'rgba(30, 58, 95, 0.04)',
    },
    dark: {
      primary: '#3B82F6',
      primaryDark: '#2563EB',
      primaryDeep: '#1E3A5F',
      primaryLight: '#60A5FA',
      primaryMuted: '#111827',
      primaryGlow: '#3B82F6',
      pageBg: Palette.midnightPage,
      heroDark: '#060B12',
      border: '#1F2937',
      ambientPrimary: 'rgba(59, 130, 246, 0.12)',
      ambientSecondary: 'rgba(30, 58, 95, 0.08)',
    },
  },
  ocean: {
    light: {
      primary: Palette.oceanAccent,
      primaryDark: '#0E7490',
      primaryDeep: '#164E63',
      primaryLight: Palette.oceanAccentLight,
      primaryMuted: '#ECFEFF',
      primaryGlow: '#06B6D4',
      pageBg: Palette.oceanPage,
      heroDark: '#164E63',
      border: '#CFFAFE',
      ambientPrimary: 'rgba(8, 145, 178, 0.06)',
      ambientSecondary: 'rgba(34, 211, 238, 0.04)',
    },
    dark: {
      primary: Palette.oceanAccentLight,
      primaryDark: Palette.oceanAccent,
      primaryDeep: '#164E63',
      primaryLight: '#67E8F9',
      primaryMuted: '#0A1A22',
      primaryGlow: '#06B6D4',
      pageBg: Palette.oceanDarkPage,
      heroDark: '#021018',
      border: '#1A3040',
      ambientPrimary: 'rgba(34, 211, 238, 0.1)',
      ambientSecondary: 'rgba(8, 145, 178, 0.08)',
    },
  },
  emerald: {
    light: {
      primary: Palette.emeraldAccent,
      primaryDark: '#047857',
      primaryDeep: '#064E3B',
      primaryLight: '#34D399',
      primaryMuted: Palette.emeraldPage,
      primaryGlow: Palette.emerald500,
      pageBg: Palette.emeraldPage,
      heroDark: '#064E3B',
      border: '#D1FAE5',
      ambientPrimary: 'rgba(5, 150, 105, 0.06)',
      ambientSecondary: 'rgba(212, 175, 55, 0.04)',
    },
    dark: {
      primary: '#34D399',
      primaryDark: Palette.emeraldAccent,
      primaryDeep: '#064E3B',
      primaryLight: '#6EE7B7',
      primaryMuted: '#0A1A12',
      primaryGlow: Palette.emerald500,
      pageBg: Palette.emeraldDarkPage,
      heroDark: '#021208',
      border: '#1A3028',
      ambientPrimary: 'rgba(52, 211, 153, 0.1)',
      ambientSecondary: 'rgba(212, 175, 55, 0.06)',
    },
  },
  rose: {
    light: {
      primary: Palette.roseAccent,
      primaryDark: '#BE123C',
      primaryDeep: '#881337',
      primaryLight: Palette.roseAccentLight,
      primaryMuted: Palette.rosePage,
      primaryGlow: '#F43F5E',
      pageBg: Palette.rosePage,
      heroDark: '#881337',
      border: '#FFE4E6',
      ambientPrimary: 'rgba(225, 29, 72, 0.06)',
      ambientSecondary: 'rgba(251, 113, 133, 0.04)',
    },
    dark: {
      primary: Palette.roseAccentLight,
      primaryDark: Palette.roseAccent,
      primaryDeep: '#881337',
      primaryLight: '#FDA4AF',
      primaryMuted: '#1A0A10',
      primaryGlow: '#F43F5E',
      pageBg: Palette.roseDarkPage,
      heroDark: '#0A0408',
      border: '#301820',
      ambientPrimary: 'rgba(251, 113, 133, 0.1)',
      ambientSecondary: 'rgba(225, 29, 72, 0.08)',
    },
  },
} as const;

export function createFamilyLightColors(family: keyof typeof FamilyAccents): ThemeColors {
  const accent = FamilyAccents[family].light;
  return buildFamilyLight(accent, accent.pageBg);
}

export function createFamilyDarkColors(family: keyof typeof FamilyAccents): ThemeColors {
  const accent = FamilyAccents[family].dark;
  return buildFamilyDark(accent, accent.pageBg);
}

export function createFamilyGradients(family: keyof typeof FamilyAccents, mode: 'light' | 'dark'): ThemeGradients {
  const accent = FamilyAccents[family][mode];
  return buildFamilyGradients(
    [accent.heroDark, accent.primaryDeep, accent.primaryDark],
    [accent.primaryGlow, accent.primary, accent.primaryDark],
    [accent.primaryLight, accent.primaryGlow, accent.primary],
  );
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
  outIconBg: 'rgba(220, 38, 38, 0.12)',
} as const;
