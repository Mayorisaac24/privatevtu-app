// Layout tokens + typography — theme-independent sizing & fonts
import { Platform, type ViewStyle } from 'react-native';
import { platformShadow, platformText } from './lib/platform-ui';

function type(style: import('react-native').TextStyle): import('react-native').TextStyle {
  const weight = style.fontWeight ?? '400';
  const fontFamily = weight === '800'
    ? FontFamily.extrabold
    : weight === '700'
      ? FontFamily.bold
      : weight === '600'
        ? FontFamily.semibold
        : weight === '500'
          ? FontFamily.medium
          : FontFamily.regular;
  return platformText({ fontFamily, ...style });
}

export const FontFamily = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  extrabold: 'Inter_800ExtraBold',
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  page: 20,
} as const;

export const Radius = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  xxl: 32,
  full: 9999,
} as const;

export const Shadow = {
  xs: platformShadow('xs'),
  sm: platformShadow('sm'),
  md: platformShadow('md'),
  lg: platformShadow('lg'),
  card: Platform.select({
    ios: {
      shadowColor: '#64748B',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.07,
      shadowRadius: 10,
    },
    android: { elevation: 3 },
    default: {},
  }) as ViewStyle,
};

export const Typography = {
  display: type({ fontSize: 36, fontWeight: '800' as const, letterSpacing: -1, lineHeight: 42 }),
  h1: type({ fontSize: 28, fontWeight: '700' as const, letterSpacing: -0.5, lineHeight: 34 }),
  h2: type({ fontSize: 22, fontWeight: '700' as const, letterSpacing: -0.3, lineHeight: 28 }),
  h3: type({ fontSize: 18, fontWeight: '600' as const, letterSpacing: -0.2, lineHeight: 24 }),
  h4: type({ fontSize: 16, fontWeight: '600' as const, lineHeight: 22 }),
  body: type({ fontSize: 15, fontWeight: '400' as const, lineHeight: 22 }),
  bodyMed: type({ fontSize: 15, fontWeight: '500' as const, lineHeight: 22 }),
  small: type({ fontSize: 13, fontWeight: '400' as const, lineHeight: 18 }),
  smallMed: type({ fontSize: 13, fontWeight: '500' as const, lineHeight: 18 }),
  caption: type({ fontSize: 11, fontWeight: '400' as const, lineHeight: 15 }),
  captionMed: type({ fontSize: 11, fontWeight: '600' as const, lineHeight: 15 }),
  label: type({ fontSize: 10, fontWeight: '700' as const, letterSpacing: 1, textTransform: 'uppercase' as const, lineHeight: 13 }),
  mono: type({ fontSize: 13, fontWeight: '600' as const, letterSpacing: 0.5, lineHeight: 18 }),
};

/** @deprecated Use Colors.heroDark from useColors() */
export const HERO_DARK = '#1A0A3C';

export { useLayout, useGridTileWidth, textStyle, platformText, platformShadow } from './lib/platform-ui';
