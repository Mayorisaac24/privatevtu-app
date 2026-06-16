import { ReactNode } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Shadow, Typography } from '../../theme';
import { isAndroid, platformSpacing, AUTH_SEGMENT_HEIGHT } from '../../lib/platform-ui';
import { GradientButton } from '../ui/GradientButton';


type SegmentOption<T extends string> = {
  key: T;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
};

type AuthSegmentedControlProps<T extends string> = {
  value: T;
  options: SegmentOption<T>[];
  onChange: (value: T) => void;
  label?: string;
  style?: ViewStyle;
};

export function AuthSegmentedControl<T extends string>({
  value,
  options,
  onChange,
  label,
  style,
}: AuthSegmentedControlProps<T>) {
  return (
    <View style={style}>
      {label ? <Text style={styles.segmentLabel}>{label}</Text> : null}
      <View style={styles.segmented}>
        {options.map((option) => {
          const active = value === option.key;
          return (
            <TouchableOpacity
              key={option.key}
              style={styles.segment}
              onPress={() => onChange(option.key)}
              activeOpacity={0.85}
            >
              <View style={[styles.segmentInner, active && styles.segmentInnerActive]}>
                <View style={[styles.segmentIcon, active && styles.segmentIconActive]}>
                  <Ionicons
                    name={option.icon}
                    size={16}
                    color={active ? Colors.primary : Colors.mutedLight}
                  />
                </View>
                <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                  {option.label}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

type AuthGradientButtonProps = {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  isLoading?: boolean;
  loadingLabel?: string;
  icon?: ReactNode;
  style?: ViewStyle;
};

export function AuthGradientButton({
  title,
  onPress,
  disabled = false,
  isLoading = false,
  loadingLabel,
  icon,
  style,
}: AuthGradientButtonProps) {
  return (
    <GradientButton
      title={title}
      onPress={onPress}
      disabled={disabled}
      inactive={disabled && !isLoading}
      isLoading={isLoading}
      loadingLabel={loadingLabel}
      leftIcon={icon}
      style={style}
    />
  );
}

export function AuthDivider({ label = 'or' }: { label?: string }) {
  return (
    <View style={styles.divider}>
      <View style={styles.dividerLine} />
      <Text style={styles.dividerText}>{label}</Text>
      <View style={styles.dividerLine} />
    </View>
  );
}

export function AuthFooterLink({
  prefix,
  linkLabel,
  onPress,
}: {
  prefix: string;
  linkLabel: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={styles.footerLink}>
      <Text style={styles.footerPrefix}>
        {prefix}{' '}
        <Text style={styles.footerAction}>{linkLabel}</Text>
      </Text>
    </TouchableOpacity>
  );
}

export function AuthTextLink({
  label,
  onPress,
  align = 'center',
  style,
}: {
  label: string;
  onPress: () => void;
  align?: 'left' | 'center' | 'right';
  style?: ViewStyle;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[
        styles.textLink,
        align === 'right' && styles.textLinkRight,
        align === 'left' && styles.textLinkLeft,
        style,
      ]}
    >
      <Text style={styles.textLinkLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  segmented: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: isAndroid ? 16 : 18,
    padding: isAndroid ? 4 : 5,
    marginBottom: platformSpacing(24, -6),
    borderWidth: 1,
    borderColor: Colors.border,
    gap: isAndroid ? 4 : 6,
  },
  segmentLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.muted,
    letterSpacing: 0.3,
    marginBottom: isAndroid ? 8 : 10,
    textTransform: 'uppercase',
    ...(isAndroid ? { includeFontPadding: false } : null),
  },
  segment: {
    flex: 1,
  },
  segmentInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: isAndroid ? 6 : 8,
    paddingVertical: isAndroid ? 8 : 13,
    paddingHorizontal: isAndroid ? 8 : 10,
    borderRadius: isAndroid ? 12 : 14,
    minHeight: AUTH_SEGMENT_HEIGHT,
  },
  segmentInnerActive: {
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: 'rgba(124, 58, 237, 0.24)',
    ...(isAndroid ? { elevation: 1 } : Shadow.sm),
  },
  segmentIcon: {
    width: isAndroid ? 26 : 30,
    height: isAndroid ? 26 : 30,
    borderRadius: isAndroid ? 8 : 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  segmentIconActive: {
    backgroundColor: Colors.primaryMuted,
  },
  segmentText: {
    fontSize: isAndroid ? 14 : 15,
    fontWeight: '500',
    color: Colors.mutedLight,
    ...(isAndroid ? { includeFontPadding: false } : null),
  },
  segmentTextActive: {
    fontSize: isAndroid ? 14 : 15,
    fontWeight: '700',
    color: Colors.primary,
    ...(isAndroid ? { includeFontPadding: false } : null),
  },
  btnWrap: {
    borderRadius: Radius.md,
    overflow: 'hidden',
    ...(isAndroid ? { elevation: 3 } : Shadow.md),
  },
  btnWrapDisabled: {
    opacity: 0.72,
    ...(isAndroid ? { elevation: 1 } : Shadow.sm),
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: isAndroid ? 14 : 22,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.borderMid,
  },
  dividerText: {
    ...Typography.caption,
    color: Colors.mutedLight,
    fontWeight: '600',
    letterSpacing: 0.4,
    textTransform: 'lowercase',
  },
  footerLink: {
    alignItems: 'center',
  },
  footerPrefix: {
    ...Typography.small,
    color: Colors.muted,
    textAlign: 'center',
  },
  footerAction: {
    color: Colors.primary,
    fontWeight: '700',
  },
  textLink: {
    alignSelf: 'center',
  },
  textLinkLeft: {
    alignSelf: 'flex-start',
  },
  textLinkRight: {
    alignSelf: 'flex-end',
  },
  textLinkLabel: {
    ...Typography.smallMed,
    color: Colors.primary,
    fontWeight: '600',
  },
});
