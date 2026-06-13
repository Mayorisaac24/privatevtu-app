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
import { Colors, Radius } from '../../theme';
import { useGradients } from '../../theme/hooks';
import { gradientStops } from '../../theme/gradient-utils';
import { isAndroid, platformSpacing } from '../../lib/platform-ui';

type GradientButtonProps = {
  title?: string;
  onPress: () => void;
  disabled?: boolean;
  /** Use muted inactive gradient (e.g. form not ready). */
  inactive?: boolean;
  isLoading?: boolean;
  loadingLabel?: string;
  variant?: 'primary' | 'danger';
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  children?: ReactNode;
  style?: ViewStyle;
  gradientStyle?: ViewStyle;
};

export function GradientButton({
  title,
  onPress,
  disabled = false,
  inactive = false,
  isLoading = false,
  loadingLabel,
  variant = 'primary',
  leftIcon,
  rightIcon,
  children,
  style,
  gradientStyle,
}: GradientButtonProps) {
  const gradients = useGradients();
  const muted = inactive || (disabled && !isLoading);
  const activeStops = variant === 'danger' ? gradients.buttonDanger : gradients.button;
  const mutedStops = variant === 'danger' ? gradients.buttonDangerInactive : gradients.buttonInactive;
  const stops = muted ? mutedStops : activeStops;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || isLoading}
      activeOpacity={0.88}
      style={[styles.wrap, muted && styles.wrapMuted, style]}
    >
      <LinearGradient
        colors={gradientStops(stops)}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.gradient, isLoading && styles.gradientLoading, gradientStyle]}
      >
        {children ?? (
          isLoading ? (
            <>
              <ActivityIndicator color={Colors.white} size="small" />
              {title ? <Text style={styles.text}>{loadingLabel ?? title}</Text> : null}
            </>
          ) : (
            <>
              {leftIcon}
              {title ? <Text style={styles.text}>{title}</Text> : null}
              {rightIcon}
            </>
          )
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: Radius.md,
    overflow: 'hidden',
    ...(isAndroid ? { elevation: 4 } : {
      shadowColor: Colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.22,
      shadowRadius: 10,
    }),
  },
  wrapMuted: {
    opacity: 0.72,
    ...(isAndroid ? { elevation: 0 } : { shadowOpacity: 0 }),
  },
  gradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: platformSpacing(16, 14),
    paddingHorizontal: 20,
    minHeight: 52,
  },
  gradientLoading: {
    gap: 10,
  },
  text: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.white,
    letterSpacing: 0.2,
    ...(isAndroid ? { includeFontPadding: false } : null),
  },
});
