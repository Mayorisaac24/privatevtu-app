/**
 * Raw color palette — single source of truth for every hex value in the app.
 * Change a value here to update the default (light) theme foundation.
 */
export const Palette = {
  // ── Brand violet ─────────────────────────────────────────────
  violet50: '#F5F3FF',
  violet100: '#EDE9FE',
  violet200: '#DDD6FE',
  violet300: '#C4B5FD',
  violet400: '#A78BFA',
  violet500: '#8B5CF6',
  violet600: '#7C3AED',
  violet700: '#6D28D9',
  violet800: '#5B21B6',
  violet900: '#4C1D95',
  violet950: '#2E1065',

  // ── Hero / card dark bases ───────────────────────────────────
  heroBase: '#1A0A3C',
  heroMid: '#251454',
  heroDeep: '#2D1B69',
  heroAccent: '#3B1578',
  indigoDeep: '#2E1065',
  indigoCard: '#1E1B4B',
  indigoBorder: '#312E81',
  purpleDeep: '#5B21B6',

  // ── Neutrals (slate) ─────────────────────────────────────────
  white: '#FFFFFF',
  pageBg: '#F4F5FA',
  slate50: '#F8FAFC',
  slate100: '#F1F5F9',
  slate200: '#E2E8F0',
  slate300: '#CBD5E1',
  slate400: '#94A3B8',
  slate500: '#64748B',
  slate600: '#475569',
  slate700: '#334155',
  slate800: '#1E293B',
  slate900: '#0F172A',

  // ── Semantic ─────────────────────────────────────────────────
  emerald400: '#34D399',
  emerald500: '#10B981',
  emerald600: '#059669',
  emerald700: '#065F46',
  emerald50: '#ECFDF5',
  emerald100: '#D1FAE5',
  emerald200: '#FEE2E2',

  red500: '#EF4444',
  red600: '#DC2626',
  red700: '#991B1B',
  red50: '#FEF2F2',
  red300: '#FCA5A5',
  red400: '#F87171',

  amber400: '#FCD34D',
  amber500: '#F59E0B',
  amber600: '#D97706',
  amber700: '#92400E',
  amber50: '#FFFBEB',
  amber200: '#FDE68A',
  amber300: '#FCD34D',

  cyan400: '#06B6D4',
  cyan50: '#CFFAFE',
  cyan600: '#0891B2',
  cyan700: '#0284C7',
  cyan50Bg: '#ECFEFF',
  cyan100Bg: '#E0F2FE',

  blue500: '#2563EB',
  blue50: '#EFF6FF',
  blue300: '#93C5FD',
  blue700: '#1D4ED8',

  orange600: '#EA580C',
  orange50: '#FFF7ED',

  // ── KYC status accents ───────────────────────────────────────
  kycPending: '#FCD34D',
  kycRejected: '#FCA5A5',

  // ── Cable provider accents ─────────────────────────────────────
  dstvBg: '#EFF6FF',
  dstvBorder: '#93C5FD',
  dstvText: '#1D4ED8',
  gotvBg: '#F0FDF4',
  gotvBorder: '#86EFAC',
  gotvText: '#15803D',
  startimesBg: '#FFF7ED',
  startimesBorder: '#FCD34D',
  startimesText: '#B45309',
  showmaxBg: '#FDF4FF',
  showmaxBorder: '#D8B4FE',
  showmaxText: '#7C3AED',

  // ── Dark theme bases (violet dark family) ────────────────────
  darkPageBg: '#0A0614',
  darkSurface: '#120C22',
  darkSurfaceAlt: '#1A1228',
  darkCard: '#1E1630',
  darkBorder: '#2A2040',
  darkText: '#F1F5F9',
  darkMuted: '#94A3B8',

  // Midnight family
  midnightPage: '#0B0F14',
  midnightSurface: '#111827',
  midnightCard: '#1A2332',
  midnightAccent: '#3B82F6',

  // Ocean family
  oceanPage: '#F0F9FF',
  oceanDarkPage: '#041018',
  oceanAccent: '#0891B2',
  oceanAccentLight: '#22D3EE',

  // Emerald family
  emeraldPage: '#F0FDF4',
  emeraldDarkPage: '#04120C',
  emeraldAccent: '#059669',
  emeraldGold: '#D4AF37',

  // Rose family
  rosePage: '#FFF5F7',
  roseDarkPage: '#140A10',
  roseAccent: '#E11D48',
  roseAccentLight: '#FB7185',
} as const;

export type PaletteKey = keyof typeof Palette;
