// PrivateVTU Premium Design System v3
// Brand: Violet / Indigo fintech — aligned with web dashboard

export const Colors = {
  // ── Brand ──────────────────────────────────
  primary:       '#7C3AED',   // Violet-600
  primaryDark:   '#6D28D9',   // Violet-700
  primaryDeep:   '#4C1D95',   // Violet-900
  primaryLight:  '#A78BFA',   // Violet-400
  primaryMuted:  '#F5F3FF',   // Violet-50
  primaryGlow:   '#8B5CF6',   // Violet-500

  // ── Semantic ───────────────────────────────
  success:       '#10B981',
  successLight:  '#D1FAE5',
  successDark:   '#065F46',
  warning:       '#F59E0B',
  warningLight:  '#FEF3C7',
  warningDark:   '#92400E',
  error:         '#EF4444',
  errorLight:    '#FEF2F2',
  errorDark:     '#991B1B',
  info:          '#06B6D4',
  infoLight:     '#CFFAFE',

  // ── Neutrals ───────────────────────────────
  dark:          '#0F172A',   // Slate-900
  darkAlt:       '#1E293B',
  darkCard:      '#1E1B4B',
  darkBorder:    '#312E81',
  mid:           '#334155',
  muted:         '#64748B',
  mutedLight:    '#94A3B8',
  border:        '#EDE9FE',   // Violet-tinted border
  borderMid:     '#CBD5E1',
  surface:       '#F8FAFC',   // Clean slate bg
  surfaceAlt:    '#F1F5F9',
  card:          '#FFFFFF',
  white:         '#FFFFFF',

  // ── Service brand colors ───────────────────
  airtime:       '#7C3AED',
  airtimeBg:     '#F5F3FF',
  data:          '#059669',
  dataBg:        '#ECFDF5',
  electricity:   '#D97706',
  electricityBg: '#FFFBEB',
  cable:         '#DC2626',
  cableBg:       '#FEF2F2',
  transfer:      '#2563EB',
  transferBg:    '#EFF6FF',
  fund:          '#0891B2',
  fundBg:        '#ECFEFF',
  betting:       '#EA580C',
  bettingBg:     '#FFF7ED',
  education:     '#0284C7',
  educationBg:   '#E0F2FE',
};

export const Spacing = {
  xs:   4,
  sm:   8,
  md:   16,
  lg:   24,
  xl:   32,
  xxl:  48,
  page: 20,
};

export const Radius = {
  xs:   6,
  sm:   10,
  md:   14,
  lg:   18,
  xl:   24,
  xxl:  32,
  full: 9999,
};

export const Shadow = {
  xs: {
    shadowColor: '#4C1D95',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  sm: {
    shadowColor: '#4C1D95',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  md: {
    shadowColor: '#4C1D95',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 5,
  },
  lg: {
    shadowColor: '#4C1D95',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  card: {
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 4,
  },
};

export const Typography = {
  display:    { fontSize: 36, fontWeight: '800' as const, letterSpacing: -1 },
  h1:         { fontSize: 28, fontWeight: '700' as const, letterSpacing: -0.5 },
  h2:         { fontSize: 22, fontWeight: '700' as const, letterSpacing: -0.3 },
  h3:         { fontSize: 18, fontWeight: '600' as const, letterSpacing: -0.2 },
  h4:         { fontSize: 16, fontWeight: '600' as const },
  body:       { fontSize: 15, fontWeight: '400' as const, lineHeight: 22 },
  bodyMed:    { fontSize: 15, fontWeight: '500' as const },
  small:      { fontSize: 13, fontWeight: '400' as const, lineHeight: 18 },
  smallMed:   { fontSize: 13, fontWeight: '500' as const },
  caption:    { fontSize: 11, fontWeight: '400' as const },
  captionMed: { fontSize: 11, fontWeight: '600' as const },
  label:      { fontSize: 10, fontWeight: '700' as const, letterSpacing: 1, textTransform: 'uppercase' as const },
  mono:       { fontSize: 13, fontWeight: '600' as const, letterSpacing: 0.5 },
};

export const Gradients = {
  primary:   ['#4C1D95', '#6D28D9', '#7C3AED'],
  card:      ['#312E81', '#5B21B6', '#7C3AED'],
  cardSoft:  ['#6D28D9', '#8B5CF6', '#A78BFA'],
  header:    ['#FFFFFF', '#FAF5FF', '#F8FAFC'],
  success:   ['#059669', '#10B981'],
  dark:      ['#1E1B4B', '#312E81'],
  surface:   ['#F8FAFC', '#F1F5F9'],
};
