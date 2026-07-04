import { ReactNode } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {Colors, Radius, FontFamily , Palette, FormColors, BRAND, Overlays, useThemedStyles } from '../../theme';
import { useGradients } from '../../theme/hooks';
import { gradientStops } from '../../theme/gradient-utils';
import {
  isAndroid,
  platformSpacing,
  AUTH_BUTTON_HEIGHT,
  CTA_BUTTON_HEIGHT,
} from '../../lib/platform-ui';

type GradientButtonSize = 'default' | 'compact';

type GradientButtonProps = {
  title?: string;
  onPress: () => void;
  disabled?: boolean;
  /** Use muted inactive gradient (e.g. form not ready). */
  inactive?: boolean;
  isLoading?: boolean;
  loadingLabel?: string;
  variant?: 'primary' | 'danger';
  size?: GradientButtonSize;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  children?: ReactNode;
  style?: ViewStyle;
  /** Avoid extra padding here — use `size` instead. Layout-only overrides only. */
  gradientStyle?: ViewStyle;
};

function getButtonMetrics(size: GradientButtonSize) {
  if (size === 'compact') {
    return {
      minHeight: CTA_BUTTON_HEIGHT,
      paddingVertical: isAndroid ? 10 : 12,
      paddingHorizontal: isAndroid ? 14 : 18,
      fontSize: isAndroid ? 14 : 15,
      gap: isAndroid ? 6 : 8,
      elevation: isAndroid ? 2 : undefined,
    };
  }

  return {
    minHeight: AUTH_BUTTON_HEIGHT,
    paddingVertical: isAndroid ? 12 : platformSpacing(16, 14),
    paddingHorizontal: isAndroid ? 16 : 20,
    fontSize: isAndroid ? 15 : 16,
    gap: isAndroid ? 6 : 8,
    elevation: isAndroid ? 4 : undefined,
  };
}

export function GradientButton({
  title,
  onPress,
  disabled = false,
  inactive = false,
  isLoading = false,
  loadingLabel,
  variant = 'primary',
  size = 'default',
  leftIcon,
  rightIcon,
  children,
  style,
  gradientStyle,
}: GradientButtonProps) {
  const styles = useStyles();

  const gradients = useGradients();
  const metrics = getButtonMetrics(size);
  const muted = inactive || (disabled && !isLoading);
  const activeStops = variant === 'danger' ? gradients.buttonDanger : gradients.button;
  const mutedStops = variant === 'danger' ? gradients.buttonDangerInactive : gradients.buttonInactive;
  const stops = muted ? mutedStops : activeStops;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || isLoading}
      activeOpacity={0.88}
      style={[
        styles.wrap,
        metrics.elevation != null && isAndroid ? { elevation: metrics.elevation } : null,
        muted && styles.wrapMuted,
        style,
      ]}
    >
      <LinearGradient
        colors={gradientStops(stops)}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[
          styles.gradient,
          { minHeight: metrics.minHeight },
          isLoading && styles.gradientLoading,
          gradientStyle,
        ]}
      >
        <View
          style={[
            styles.inner,
            {
              minHeight: metrics.minHeight,
              paddingVertical: metrics.paddingVertical,
              paddingHorizontal: metrics.paddingHorizontal,
              gap: metrics.gap,
            },
          ]}
        >
          {children ?? (
            isLoading ? (
              <>
                <ActivityIndicator color={Palette.white} size="small" />
                {title ? (
                  <Text style={[styles.text, { fontSize: metrics.fontSize }]} numberOfLines={1}>
                    {loadingLabel ?? title}
                  </Text>
                ) : null}
              </>
            ) : (
              <>
                {leftIcon}
                {title ? (
                  <Text
                    style={[styles.text, { fontSize: metrics.fontSize }]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.82}
                  >
                    {title}
                  </Text>
                ) : null}
                {rightIcon}
              </>
            )
          )}
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const createStyles = (colors: import('../../theme/types').ThemeColors) => StyleSheet.create({
  wrap: {
    borderRadius: Radius.md,
    overflow: 'hidden',
    ...(isAndroid ? {} : {
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.22,
      shadowRadius: 10,
    }),
  },
  wrapMuted: {
    opacity: 0.72,
    ...(isAndroid ? { elevation: 0 } : { shadowOpacity: 0 }),
  },
  gradient: {},
  gradientLoading: {},
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  text: {
    fontWeight: '700',
    fontFamily: FontFamily.bold,
    color: colors.card,
    letterSpacing: isAndroid ? 0.1 : 0.2,
    lineHeight: 20,
    flexShrink: 1,
    textAlign: 'center',
    ...(isAndroid ? { includeFontPadding: false, textAlignVertical: 'center' } : null),
  },
});

function useStyles() {
  return useThemedStyles(createStyles);
}
