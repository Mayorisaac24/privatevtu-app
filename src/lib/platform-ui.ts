import { useMemo } from 'react';
import {
  Platform,
  useWindowDimensions,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { Spacing } from '../theme/layout-tokens';

export const isAndroid = Platform.OS === 'android';
export const isIOS = Platform.OS === 'ios';

export const BREAKPOINTS = {
  tablet: 768,
  desktop: 1024,
} as const;

/** Max content column width — keeps phone UI centered on tablets. */
export const CONTENT_MAX_WIDTH = 520;

export const FIELD_HEIGHT = isAndroid ? 54 : 56;
export const FIELD_HEIGHT_SM = isAndroid ? 48 : 50;

/** Tighter auth form rhythm — Android extra font padding makes controls feel oversized. */
export const AUTH_FIELD_HEIGHT = isAndroid ? 50 : 54;
export const AUTH_BUTTON_HEIGHT = isAndroid ? 48 : 52;
export const AUTH_SEGMENT_HEIGHT = isAndroid ? 42 : 46;

/** Service / transfer CTAs — slightly shorter than auth primary buttons. */
export const CTA_BUTTON_HEIGHT = isAndroid ? 46 : 50;

/** Removes extra top/bottom padding Android adds around text. */
export function platformText(style: TextStyle): TextStyle {
  if (!isAndroid) return style;
  return { ...style, includeFontPadding: false };
}

/** Merge arbitrary text styles with safe line-height + Android padding fix. */
export function textStyle(style: TextStyle): TextStyle {
  const fontSize = style.fontSize ?? 15;
  const lineHeight = style.lineHeight ?? Math.round(fontSize * 1.45);
  return platformText({ lineHeight, ...style });
}

/** iOS shadow + tuned Android elevation so cards/buttons feel closer across devices. */
export function platformShadow(
  level: 'xs' | 'sm' | 'md' | 'lg',
  color = '#4C1D95',
): ViewStyle {
  const presets = {
    xs: {
      ios: { shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2 },
      android: { elevation: 1 },
    },
    sm: {
      ios: { shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6 },
      android: { elevation: 2 },
    },
    md: {
      ios: { shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 12 },
      android: { elevation: 4 },
    },
    lg: {
      ios: { shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.16, shadowRadius: 18 },
      android: { elevation: 6 },
    },
  } as const;

  const preset = presets[level];
  if (isAndroid) {
    return preset.android;
  }
  return {
    shadowColor: color,
    ...preset.ios,
  };
}

/** Slightly tighter vertical rhythm on Android where fonts render taller. */
export function platformSpacing(value: number, androidDelta = -2): number {
  return isAndroid ? Math.max(0, value + androidDelta) : value;
}

/** Shared input alignment so fields sit centered like iOS. */
export const platformInputText: TextStyle = Platform.select({
  android: {
    paddingVertical: 0,
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  default: {},
}) as TextStyle;

export function mergeInputStyle(style?: TextStyle): TextStyle {
  return { ...platformInputText, ...style };
}

/** Invisible TextInput used with custom OTP/PIN boxes — avoids blocking scroll/taps. */
export const hiddenNumericInputStyle: TextStyle = {
  position: 'absolute',
  opacity: 0,
  width: 1,
  height: 1,
  left: 0,
  top: 0,
};

export type LayoutMetrics = {
  width: number;
  height: number;
  isTablet: boolean;
  isLargeTablet: boolean;
  pagePadding: number;
  contentMaxWidth: number;
  contentWidth: number;
};

export function getLayoutMetrics(width: number, height: number): LayoutMetrics {
  const isTablet = width >= BREAKPOINTS.tablet;
  const isLargeTablet = width >= BREAKPOINTS.desktop;
  const pagePadding = isLargeTablet ? 40 : isTablet ? 32 : Spacing.page;
  const contentMaxWidth = isTablet ? CONTENT_MAX_WIDTH : width;
  const contentWidth = Math.min(width, contentMaxWidth);

  return {
    width,
    height,
    isTablet,
    isLargeTablet,
    pagePadding,
    contentMaxWidth,
    contentWidth,
  };
}

/** Responsive layout metrics for all screens (phones, tablets, rotation). */
export function useLayout(): LayoutMetrics {
  const { width, height } = useWindowDimensions();
  return useMemo(() => getLayoutMetrics(width, height), [width, height]);
}

/** Grid tile width helper — replaces static Dimensions.get at module load. */
export function useGridTileWidth(options: {
  columns: number;
  gap: number;
  padding?: number;
}): number {
  const { contentWidth, pagePadding } = useLayout();
  const pad = options.padding ?? pagePadding;
  const usable = contentWidth - pad * 2 - options.gap * (options.columns - 1);
  return Math.max(usable / options.columns, 0);
}
