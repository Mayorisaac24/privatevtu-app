import { ReactNode, useMemo } from 'react';
import { Overlays } from '../../theme/colors/app-colors';
import { withAlpha } from '../../theme/gradient-utils';
import { Platform, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { useColors, useTheme } from '../../theme/hooks';
import type { ThemeColors } from '../../theme/types';

export type GlassVariant = 'light' | 'tinted' | 'dark' | 'solid';

type GlassSurfaceProps = {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  variant?: GlassVariant;
  intensity?: number;
  borderRadius?: number;
};

type GlassPreset = {
  tint: 'light' | 'dark' | 'default';
  overlay: string;
  border: string;
  intensity: number;
  blur: boolean;
};

function buildPresets(colors: ThemeColors, isDark: boolean): Record<GlassVariant, GlassPreset> {
  return {
    light: {
      tint: isDark ? 'dark' : 'light',
      overlay: isDark ? colors.surface : colors.glassOverlay,
      border: colors.glassBorder,
      intensity: isDark ? 0 : 16,
      blur: !isDark,
    },
    tinted: {
      tint: isDark ? 'dark' : 'light',
      overlay: isDark ? colors.surfaceAlt : colors.glassOverlay,
      border: isDark ? colors.glassBorder : colors.border,
      intensity: isDark ? 0 : 14,
      blur: !isDark,
    },
    dark: {
      tint: 'dark',
      overlay: withAlpha(colors.primaryDeep, 0.82),
      border: withAlpha(colors.white, 0.16),
      intensity: 0,
      blur: false,
    },
    solid: {
      tint: isDark ? 'dark' : 'light',
      overlay: colors.card,
      border: colors.glassBorder,
      intensity: 0,
      blur: false,
    },
  };
}

export function GlassSurface({
  children,
  style,
  contentStyle,
  variant = 'light',
  intensity,
  borderRadius = 16,
}: GlassSurfaceProps) {
  const colors = useColors();
  const { isDark } = useTheme();
  const presets = useMemo(() => buildPresets(colors, isDark), [colors, isDark]);
  const preset = presets[variant];
  const blurIntensity = intensity ?? preset.intensity;
  const useBlur = preset.blur && blurIntensity > 0 && Platform.OS === 'ios';

  return (
    <View style={[styles.shell, { borderRadius }, style]}>
      {useBlur ? (
        <BlurView
          intensity={blurIntensity}
          tint={preset.tint}
          style={[StyleSheet.absoluteFill, { borderRadius }]}
          experimentalBlurMethod={Platform.OS === 'android' ? 'dimezisBlurView' : undefined}
        />
      ) : null}
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          styles.overlay,
          {
            borderRadius,
            backgroundColor: preset.overlay,
            borderColor: preset.border,
          },
        ]}
      />
      {useBlur ? (
        <View
          pointerEvents="none"
          style={[styles.shine, { borderTopLeftRadius: borderRadius, borderTopRightRadius: borderRadius }]}
        />
      ) : null}
      {children ? <View style={[styles.content, contentStyle]}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    overflow: 'hidden',
    position: 'relative',
  },
  overlay: {
    borderWidth: StyleSheet.hairlineWidth,
  },
  shine: {
    position: 'absolute',
    top: 0,
    left: 12,
    right: 12,
    height: 1,
    backgroundColor: Overlays.glassShine,
  },
  content: {
    position: 'relative',
    zIndex: 1,
  },
});
