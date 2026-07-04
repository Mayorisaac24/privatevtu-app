export type ThemeFamily = 'violet' | 'midnight' | 'ocean' | 'emerald' | 'rose';
export type ThemeMode = 'light' | 'dark';

export type ThemeId =
  | 'violet-light'
  | 'violet-dark'
  | 'midnight-light'
  | 'midnight-dark'
  | 'ocean-light'
  | 'ocean-dark'
  | 'emerald-light'
  | 'emerald-dark'
  | 'rose-light'
  | 'rose-dark';

export type ThemeColors = {
  // Brand
  primary: string;
  primaryDark: string;
  primaryDeep: string;
  primaryLight: string;
  primaryMuted: string;
  primaryGlow: string;

  // Semantic
  success: string;
  successLight: string;
  successDark: string;
  warning: string;
  warningLight: string;
  warningDark: string;
  error: string;
  errorLight: string;
  errorDark: string;
  info: string;
  infoLight: string;

  // Surfaces & text
  dark: string;
  darkAlt: string;
  darkCard: string;
  darkBorder: string;
  mid: string;
  muted: string;
  mutedLight: string;
  border: string;
  borderMid: string;
  borderSubtle: string;
  surface: string;
  surfaceAlt: string;
  card: string;
  white: string;
  pageBg: string;
  formBg: string;
  formBgAlt: string;
  formBgNeutral: string;
  inputFilled: string;
  pinFilled: string;
  heroDark: string;
  textOnHero: string;
  textOnHeroMuted: string;
  textOnHeroSubtle: string;

  // Service accents (functional — stay recognizable)
  airtime: string;
  airtimeBg: string;
  data: string;
  dataBg: string;
  electricity: string;
  electricityBg: string;
  cable: string;
  cableBg: string;
  transfer: string;
  transferBg: string;
  fund: string;
  fundBg: string;
  betting: string;
  bettingBg: string;
  education: string;
  educationBg: string;

  // Glass / ambient
  ambientPrimary: string;
  ambientSecondary: string;
  glassOverlay: string;
  glassBorder: string;
  headerGlass: string;

  // Status bar
  statusBarStyle: 'light' | 'dark';

  // Shadows
  shadowColor: string;
};

export type ThemeGradients = {
  primary: readonly [string, string, string];
  card: readonly [string, string, string];
  cardSoft: readonly [string, string, string];
  header: readonly [string, string, string];
  hero: readonly [string, string, string];
  heroAlt: readonly [string, string, string];
  heroAuth: readonly [string, string, string, string];
  button: readonly [string, string, string];
  buttonInactive: readonly [string, string];
  buttonDanger: readonly [string, string, string];
  buttonDangerInactive: readonly [string, string];
  logo: readonly [string, string, string];
  success: readonly [string, string];
  dark: readonly [string, string];
  surface: readonly [string, string];
  accentLine: readonly [string, string, string];
  activeCard: readonly [string, string];
};

export type ThemeDefinition = {
  id: ThemeId;
  family: ThemeFamily;
  mode: ThemeMode;
  label: string;
  description: string;
  preview: readonly [string, string, string];
  colors: ThemeColors;
  gradients: ThemeGradients;
  isDefault?: boolean;
  isDarkModeEquivalent?: boolean;
};

export type ThemeSection = 'brand' | 'other';

export function getThemeSection(id: ThemeId): ThemeSection {
  return id.startsWith('violet-') ? 'brand' : 'other';
}

export function parseThemeId(id: ThemeId): { family: ThemeFamily; mode: ThemeMode } {
  const [family, mode] = id.split('-') as [ThemeFamily, ThemeMode];
  return { family, mode };
}
