import { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '../ui/GlassCard';
import { OtpHelperTip, OtpResendButton, PremiumOtpInput } from './PremiumOtpInput';
import type { TwoFactorMethodType } from '../../lib/api';
import {Colors, Radius, useThemedStyles } from '../../theme';
import { useColors } from '../../theme/hooks';
import { SERVICE_ICON } from '../../lib/service-catalog-ui';

const METHOD_META: Record<TwoFactorMethodType, {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
  bg: string;
}> = {
  EMAIL: { icon: 'mail-outline', label: 'Email', ...SERVICE_ICON },
  AUTHENTICATOR: { icon: 'phone-portrait-outline', label: 'Authenticator app', ...SERVICE_ICON },
  SMS: { icon: 'chatbubble-ellipses-outline', label: 'SMS', ...SERVICE_ICON },
};

type Props = {
  method: TwoFactorMethodType;
  destination?: string;
  otp: string;
  onOtpChange: (value: string) => void;
  onComplete?: (code: string) => void;
  onCancel: () => void;
  onResend?: () => void;
  resendDisabled?: boolean;
};

export function Disable2FAVerifyCard({
  method,
  destination,
  otp,
  onOtpChange,
  onComplete,
  onCancel,
  onResend,
  resendDisabled,
}: Props) {
  const styles = useStyles();

  const meta = METHOD_META[method];
  const colors = useColors();
  const otpInputRef = useRef<TextInput>(null);

  useEffect(() => {
    const timer = setTimeout(() => otpInputRef.current?.focus(), 360);
    return () => clearTimeout(timer);
  }, []);

  const subtitle =
    method === 'AUTHENTICATOR'
      ? 'Open your authenticator app and enter the latest 6-digit code'
      : `Enter the 6-digit code sent to ${destination || 'your contact'}`;

  return (
    <GlassCard variant="solid" borderRadius={22} padding={0} contentStyle={styles.card}>
      <TouchableOpacity style={styles.backLink} onPress={onCancel} activeOpacity={0.8}>
        <Ionicons name="chevron-back" size={18} color={colors.primary} />
        <Text style={[styles.backLinkText, { color: colors.primary }]}>Back to settings</Text>
      </TouchableOpacity>

      <View style={styles.stepBadge}>
        <View style={[styles.stepBadgeIcon, { backgroundColor: meta.bg }]}>
          <Ionicons name={meta.icon} size={22} color={meta.color} />
        </View>
      </View>

      <View style={styles.stepHeader}>
        <Text style={styles.eyebrow}>Turn off 2FA</Text>
        <Text style={styles.stepTitle}>Verification code</Text>
        <Text style={styles.stepSubtitle}>{subtitle}</Text>
      </View>

      <View style={[styles.methodChip, { borderColor: colors.borderSubtle, backgroundColor: colors.surface }]}>
        <View style={[styles.methodChipIcon, { backgroundColor: meta.bg }]}>
          <Ionicons name={meta.icon} size={16} color={meta.color} />
        </View>
        <Text style={styles.methodChipText}>{meta.label}</Text>
      </View>

      <PremiumOtpInput
        ref={otpInputRef}
        value={otp}
        onChange={onOtpChange}
        onComplete={onComplete}
      />

      {method === 'AUTHENTICATOR' ? (
        <OtpHelperTip text="Use the latest code from your authenticator — older codes will not work." />
      ) : onResend ? (
        <OtpResendButton onPress={onResend} disabled={resendDisabled} />
      ) : null}

      <View style={[styles.notice, { backgroundColor: colors.primaryMuted, borderColor: colors.border }]}>
        <Ionicons name="information-circle-outline" size={16} color={colors.primary} />
        <Text style={[styles.noticeText, { color: colors.muted }]}>
          After you confirm, your account will only be protected by your password until you set up 2FA again.
        </Text>
      </View>
    </GlassCard>
  );
}

const createStyles = (colors: import('../../theme/types').ThemeColors) => StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 22,
    gap: 16,
  },
  backLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
  },
  backLinkText: {
    fontSize: 14,
    fontWeight: '600',
  },
  stepBadge: {
    alignSelf: 'center',
  },
  stepBadgeIcon: {
    width: 48,
    height: 48,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepHeader: {
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.dark,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  stepSubtitle: {
    fontSize: 13,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 19,
  },
  methodChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  methodChipIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodChipText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.dark,
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderRadius: Radius.md,
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  noticeText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },
});

function useStyles() {
  return useThemedStyles(createStyles);
}
