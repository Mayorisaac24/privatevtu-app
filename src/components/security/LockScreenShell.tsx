import { ReactNode } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {Colors, Radius, Shadow, Spacing, Typography , Overlays, useThemedStyles } from '../../theme';
import { useColors, useGradients } from '../../theme/hooks';
import { gradientStops, withAlpha } from '../../theme/gradient-utils';
import { UserAvatar } from '../ui/UserAvatar';
import { PinKeypad } from './PinKeypad';
import { isAndroid } from '../../lib/platform-ui';

type BiometricAction = {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  accessibilityLabel?: string;
};

type FooterAction = {
  label: string;
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  disabled?: boolean;
};

export type LockScreenShellProps = {
  headline: string;
  subline?: string;
  hint: string;
  pin: string;
  onPinChange: (value: string) => void;
  pinLoading?: boolean;
  pinDisabled?: boolean;
  amount?: string;
  badgeIcon?: keyof typeof Ionicons.glyphMap;
  badgeText?: string;
  avatar?: {
    uri?: string | null;
    firstName?: string;
    lastName?: string;
  };
  heroIcon?: ReactNode;
  biometric?: BiometricAction;
  footerAction?: FooterAction;
  onClose?: () => void;
  closeDisabled?: boolean;
  secureNote?: string;
  footnote?: string;
  preparing?: boolean;
  preparingLabel?: string;
  statusBarLight?: boolean;
};

export function LockScreenShell({
  headline,
  subline,
  hint,
  pin,
  onPinChange,
  pinLoading = false,
  pinDisabled = false,
  amount,
  badgeIcon = 'lock-closed',
  badgeText = 'App locked',
  avatar,
  heroIcon,
  biometric,
  footerAction,
  onClose,
  closeDisabled = false,
  secureNote,
  footnote,
  preparing = false,
  preparingLabel = 'Preparing secure authorization…',
}: LockScreenShellProps) {
  const styles = useStyles();

  const insets = useSafeAreaInsets();
  const colors = useColors();
  const gradients = useGradients();

  return (
    <View style={[styles.root, { backgroundColor: colors.pageBg }]}>
      <LinearGradient
        colors={gradientStops(gradients.heroAuth)}
        style={[styles.hero, { paddingTop: insets.top + (onClose ? 8 : 16) }]}
      >
        {onClose ? (
          <View style={styles.topBar}>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={onClose}
              disabled={closeDisabled}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <Ionicons name="close" size={22} color={Colors.white} />
            </TouchableOpacity>
          </View>
        ) : null}

        <View style={styles.heroMeshPrimary} pointerEvents="none" />
        <View style={styles.heroMeshSecondary} pointerEvents="none" />

        {avatar ? (
          <UserAvatar
            uri={avatar.uri}
            firstName={avatar.firstName}
            lastName={avatar.lastName}
            size="lg"
            variant="hero"
          />
        ) : heroIcon ? (
          <View style={styles.heroIconWrap}>{heroIcon}</View>
        ) : null}

        <Text style={styles.headline}>{headline}</Text>
        {subline ? <Text style={styles.subline}>{subline}</Text> : null}
        {amount ? <Text style={styles.amount}>{amount}</Text> : null}

        {badgeText ? (
          <View style={styles.badge}>
            <Ionicons name={badgeIcon} size={12} color={Overlays.white92} />
            <Text style={styles.badgeText}>{badgeText}</Text>
          </View>
        ) : null}
      </LinearGradient>

      <LinearGradient
        colors={gradientStops([colors.card, colors.pageBg])}
        style={[
          styles.sheet,
          {
            paddingBottom: insets.bottom + 16,
            borderColor: colors.border,
          },
        ]}
      >
        <View style={[styles.sheetHandle, { backgroundColor: colors.borderMid }]} />

        <Text style={[styles.hint, { color: colors.muted }]}>{hint}</Text>

        <View style={styles.keypadSection}>
          {preparing ? (
            <View style={styles.preparing}>
              <ActivityIndicator color={colors.primary} size="large" />
              <Text style={[styles.preparingText, { color: colors.muted }]}>{preparingLabel}</Text>
            </View>
          ) : (
            <PinKeypad
              value={pin}
              onChange={onPinChange}
              disabled={pinDisabled}
              loading={pinLoading}
              variant="light"
              bottomLeftAction={biometric}
            />
          )}
        </View>

        {footnote ? (
          <Text style={[styles.footnote, { color: colors.mutedLight }]}>{footnote}</Text>
        ) : null}

        {footerAction ? (
          <TouchableOpacity
            style={[
              styles.footerBtn,
              {
                backgroundColor: colors.surfaceAlt,
                borderColor: colors.border,
              },
              footerAction.disabled && styles.footerBtnDisabled,
            ]}
            onPress={footerAction.onPress}
            disabled={footerAction.disabled}
            activeOpacity={0.8}
            accessibilityRole="button"
          >
            {footerAction.icon ? (
              <Ionicons name={footerAction.icon} size={16} color={colors.muted} />
            ) : null}
            <Text style={[styles.footerBtnText, { color: colors.muted }]}>{footerAction.label}</Text>
          </TouchableOpacity>
        ) : null}

        {secureNote ? (
          <View style={styles.secureRow}>
            <Ionicons name="lock-closed" size={12} color={colors.mutedLight} />
            <Text style={[styles.secureText, { color: colors.mutedLight }]}>{secureNote}</Text>
          </View>
        ) : null}
      </LinearGradient>
    </View>
  );
}

const createStyles = (colors: import('../../theme/types').ThemeColors, gradients: import('../../theme/types').ThemeGradients) => StyleSheet.create({
  root: {
    flex: 1,
  },
  topBar: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 4,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: Overlays.white12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hero: {
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: Spacing.page,
    paddingBottom: isAndroid ? 28 : 32,
    overflow: 'hidden',
    position: 'relative',
  },
  heroMeshPrimary: {
    position: 'absolute',
    top: -24,
    right: -18,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: withAlpha(gradients.hero[2], 0.24),
  },
  heroMeshSecondary: {
    position: 'absolute',
    top: 36,
    left: -40,
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: withAlpha(gradients.hero[0], 0.16),
  },
  heroIconWrap: {
    marginBottom: 2,
  },
  headline: {
    ...Typography.h2,
    color: colors.white,
    fontWeight: '800',
    marginTop: 4,
    textAlign: 'center',
    letterSpacing: -0.4,
  },
  subline: {
    ...Typography.small,
    color: Overlays.white68,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 320,
  },
  amount: {
    fontSize: 34,
    fontWeight: '800',
    color: colors.white,
    marginTop: 4,
    letterSpacing: -0.8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
    backgroundColor: Overlays.white14,
    borderWidth: 1,
    borderColor: Overlays.rgba255_255_255_02,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: Overlays.white92,
    letterSpacing: 0.3,
  },
  sheet: {
    flex: 1,
    marginTop: isAndroid ? -20 : -24,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 10,
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    ...Shadow.lg,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: 18,
  },
  hint: {
    ...Typography.caption,
    textAlign: 'center',
    marginBottom: 8,
    fontWeight: '600',
  },
  keypadSection: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  preparing: {
    alignItems: 'center',
    gap: 14,
    paddingVertical: 32,
  },
  preparingText: {
    ...Typography.bodyMed,
    fontWeight: '600',
    textAlign: 'center',
  },
  footnote: {
    ...Typography.caption,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 8,
    paddingHorizontal: 12,
  },
  footerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: Radius.full,
    borderWidth: 1,
    marginTop: 4,
  },
  footerBtnDisabled: {
    opacity: 0.55,
  },
  footerBtnText: {
    ...Typography.smallMed,
    fontWeight: '600',
  },
  secureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 10,
    paddingHorizontal: 12,
  },
  secureText: {
    ...Typography.caption,
    textAlign: 'center',
  },
});

function useStyles() {
  return useThemedStyles(createStyles);
}
