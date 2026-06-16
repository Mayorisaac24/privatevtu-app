import { ReactNode } from 'react';
import { Platform, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';

export type GlassVariant = 'light' | 'tinted' | 'dark' | 'solid';

type GlassSurfaceProps = {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  variant?: GlassVariant;
  intensity?: number;
  borderRadius?: number;
};

const VARIANTS: Record<
  GlassVariant,
  { tint: 'light' | 'dark' | 'default'; overlay: string; border: string; intensity: number; blur: boolean }
> = {
  light: {
    tint: 'light',
    overlay: 'rgba(255, 255, 255, 0.94)',
    border: 'rgba(15, 23, 42, 0.06)',
    intensity: 16,
    blur: true,
  },
  tinted: {
    tint: 'light',
    overlay: 'rgba(252, 251, 255, 0.92)',
    border: 'rgba(124, 58, 237, 0.08)',
    intensity: 14,
    blur: true,
  },
  dark: {
    tint: 'dark',
    overlay: 'rgba(26, 10, 60, 0.82)',
    border: 'rgba(255, 255, 255, 0.14)',
    intensity: 20,
    blur: true,
  },
  solid: {
    tint: 'light',
    overlay: '#FFFFFF',
    border: 'rgba(15, 23, 42, 0.06)',
    intensity: 0,
    blur: false,
  },
};

export function GlassSurface({
  children,
  style,
  contentStyle,
  variant = 'light',
  intensity,
  borderRadius = 16,
}: GlassSurfaceProps) {
  const preset = VARIANTS[variant];
  const blurIntensity = intensity ?? preset.intensity;
  // BlurView is unreliable on some Android devices — use solid overlay instead.
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
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
  },
  content: {
    position: 'relative',
    zIndex: 1,
  },
});
