// Layout tokens + typography — theme-independent sizing & fonts
import { Platform, type ViewStyle } from 'react-native';
import { platformShadow, platformText } from './lib/platform-ui';
import { FontFamily, Radius, Spacing } from './theme/layout-tokens';
import { Palette } from './theme/colors/app-colors';

export { FontFamily, Radius, Spacing };

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

export const Shadow = {
  xs: platformShadow('xs'),
  sm: platformShadow('sm'),
  md: platformShadow('md'),
  lg: platformShadow('lg'),
  card: Platform.select({
    ios: {
      shadowColor: Palette.slate500,
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
export const HERO_DARK = Palette.heroBase;
