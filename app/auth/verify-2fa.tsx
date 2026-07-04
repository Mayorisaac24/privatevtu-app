import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api, isResponseSuccess, type TwoFactorMethodType, type User } from '../../src/lib/api';
import { useAuthStore } from '../../src/stores';
import { showToast } from '../../src/components/ui/Toast';
import { LoadingOverlay } from '../../src/components/ui/LoadingOverlay';
import { GradientButton } from '../../src/components/ui/GradientButton';
import { KeyboardDismissView } from '../../src/components/ui/KeyboardDismissView';
import { registerPushNotifications } from '../../src/lib/push-notifications';
import { getLoginDeviceId } from '../../src/lib/login-context';
import {
  clearTwoFactorLoginChallenge,
  leaveTwoFactorVerifyScreen,
  normalizeTwoFactorMethod,
  peekTwoFactorLoginChallenge,
  readRouteParam,
  resolveLoginTwoFactorChallenge,
  stashTwoFactorLoginChallenge,
} from '../../src/lib/two-factor-login';
import {Colors, Spacing, Typography , Overlays, useThemedStyles } from '../../src/theme';
import { useGradients } from '../../src/theme/hooks';
import { useLayout } from '../../src/lib/platform-ui';
import { OtpHelperTip, OtpResendButton, PremiumOtpInput } from '../../src/components/security/PremiumOtpInput';

const METHOD_META = {
  AUTHENTICATOR: { icon: 'phone-portrait-outline' as const, label: 'Authenticator app' },
  EMAIL: { icon: 'mail-outline' as const, label: 'Email' },
  SMS: { icon: 'chatbubble-ellipses-outline' as const, label: 'SMS' },
};

const RESEND_COOLDOWN_SEC = 60;

function normalizeLoginUser(raw: Partial<User> & { id: string; firstName: string; lastName: string }): User {
  return {
    isActive: true,
    isEmailVerified: Boolean(raw.email),
    isPhoneVerified: Boolean(raw.phone),
    kycStatus: 'NOT_VERIFIED',
    twoFactorEnabled: raw.twoFactorEnabled ?? true,
    biometricEnabled: false,
    roles: raw.roles ?? ['USER'],
    permissions: raw.permissions ?? [],
    ...raw,
  };
}

function resolveInitialChallenge(
  userId: string,
  methodParam: string,
  destinationParam: string,
): { challenge: { userId: string; twoFactorMethod: TwoFactorMethodType; destination?: string } | null; needsFetch: boolean } {
  if (!userId) return { challenge: null, needsFetch: false };

  const stashed = peekTwoFactorLoginChallenge(userId);
  if (stashed) return { challenge: stashed, needsFetch: false };

  if (methodParam) {
    return {
      challenge: {
        userId,
        twoFactorMethod: normalizeTwoFactorMethod(methodParam),
        destination: destinationParam || undefined,
      },
      needsFetch: false,
    };
  }

  return { challenge: null, needsFetch: true };
}

export default function Verify2FAScreen() {
  const styles = useStyles();

  const params = useLocalSearchParams<{
    userId: string;
    method?: string;
    destination?: string;
  }>();
  const userId = readRouteParam(params.userId);
  const methodParam = readRouteParam(params.method);
  const destinationParam = readRouteParam(params.destination);
  const initial = useMemo(
    () => resolveInitialChallenge(userId, methodParam, destinationParam),
    [destinationParam, methodParam, userId],
  );
  const gradients = useGradients();
  const { pagePadding } = useLayout();
  const [twoFactorMethod, setTwoFactorMethod] = useState<TwoFactorMethodType>(
    () => initial.challenge?.twoFactorMethod ?? 'EMAIL',
  );
  const [destination, setDestination] = useState(
    () => initial.challenge?.destination ?? destinationParam,
  );
  const [contextLoading, setContextLoading] = useState(initial.needsFetch);
  const meta = METHOD_META[twoFactorMethod];
  const { setUser } = useAuthStore();
  const [otp, setOtp] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const otpInputRef = useRef<TextInput>(null);
  const leavingRef = useRef(false);
  const resendInFlight = useRef(false);
  const contextFetchedRef = useRef(false);

  useEffect(() => {
    if (initial.challenge) {
      stashTwoFactorLoginChallenge(initial.challenge);
    }
  }, [initial.challenge]);

  useEffect(() => {
    if (!initial.needsFetch || !userId || contextFetchedRef.current) return;
    contextFetchedRef.current = true;

    let active = true;
    void (async () => {
      try {
        const challenge = await resolveLoginTwoFactorChallenge(userId, methodParam, destinationParam);
        if (!active) return;
        setTwoFactorMethod(challenge.twoFactorMethod);
        setDestination(challenge.destination || '');
        stashTwoFactorLoginChallenge(challenge);
      } finally {
        if (active) setContextLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [destinationParam, initial.needsFetch, methodParam, userId]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const handleBack = () => {
    if (leavingRef.current) return;
    leavingRef.current = true;
    otpInputRef.current?.blur();
    Keyboard.dismiss();
    leaveTwoFactorVerifyScreen();
  };

  const handleVerify = async (code?: string) => {
    const c = (code ?? otp).replace(/\D/g, '');
    if (c.length !== 6 || isSubmitting) {
      if (c.length !== 6) {
        showToast({ type: 'error', text1: 'Incomplete code', text2: 'Enter the full 6-digit code' });
        otpInputRef.current?.focus();
      }
      return;
    }
    setIsSubmitting(true);
    let verified = false;
    try {
      const deviceId = await getLoginDeviceId();
      const res = await api.verify2FALogin(userId, c, deviceId);
      const payload = res.data;

      if (isResponseSuccess(res) && payload?.user && payload.accessToken) {
        verified = true;
        clearTwoFactorLoginChallenge();
        setUser(normalizeLoginUser(payload.user));
        void registerPushNotifications().catch(() => {});
        showToast({
          type: 'success',
          text1: 'Welcome back',
          text2: payload.user.firstName ? `Hello, ${payload.user.firstName}` : undefined,
        });
        router.replace(payload.user.hasPin === false ? '/dashboard/setup-pin' : '/(tabs)');
        return;
      }

      showToast({
        type: 'error',
        text1: 'Invalid code',
        text2: res.message || 'Incorrect 2FA code. Please try again.',
      });
      setOtp('');
      otpInputRef.current?.focus();
    } catch (err: unknown) {
      const message =
        (err as { data?: { message?: string }; message?: string })?.data?.message
        || (err as Error)?.message
        || 'Please try again';
      showToast({ type: 'error', text1: 'Verification failed', text2: message });
      setOtp('');
      otpInputRef.current?.focus();
    } finally {
      if (!verified) setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (resendInFlight.current || resendCooldown > 0 || twoFactorMethod === 'AUTHENTICATOR') return;
    resendInFlight.current = true;
    try {
      const res = await api.send2FACode('login', { userId, method: twoFactorMethod });
      if (res.success) {
        showToast({
          type: 'success',
          text1: 'Code resent',
          text2: res.data?.destination ? `Sent to ${res.data.destination}` : destination ? `Sent to ${destination}` : undefined,
        });
        setResendCooldown(RESEND_COOLDOWN_SEC);
        setOtp('');
        otpInputRef.current?.focus();
      } else {
        showToast({ type: 'error', text1: 'Could not resend', text2: res.message });
      }
    } catch {
      showToast({ type: 'error', text1: 'Could not resend', text2: 'Please try again shortly' });
    } finally {
      resendInFlight.current = false;
    }
  };

  const subtitle = contextLoading
    ? 'Loading verification method…'
    : twoFactorMethod === 'AUTHENTICATOR'
      ? 'Open your authenticator app and enter the latest code'
      : `We sent a code to ${destination || 'your contact'}`;

  return (
    <View style={styles.root}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <KeyboardDismissView style={styles.flex}>
          <LinearGradient colors={[...gradients.heroAuth]} style={styles.header}>
            <SafeAreaView edges={['top']}>
              <TouchableOpacity
                style={styles.backBtn}
                onPress={handleBack}
                activeOpacity={0.8}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <View style={styles.backBtnInner}>
                  <Ionicons name="chevron-back" size={22} color={Colors.white} />
                </View>
              </TouchableOpacity>
            </SafeAreaView>
          </LinearGradient>

          <ScrollView
            style={styles.flex}
            contentContainerStyle={[styles.scroll, { paddingHorizontal: pagePadding }]}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.card}>
              <Text style={styles.eyebrow}>Two-factor auth</Text>
              <Text style={styles.title}>Verification code</Text>
              <Text style={styles.subtitle}>{subtitle}</Text>

              {contextLoading ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator color={Colors.primary} />
                  <Text style={styles.loadingText}>Preparing verification…</Text>
                </View>
              ) : (
                <>
                  <View style={styles.methodPill}>
                    <Ionicons name={meta.icon} size={14} color={Colors.primary} />
                    <Text style={styles.methodPillText}>{meta.label}</Text>
                  </View>

                  <PremiumOtpInput
                    ref={otpInputRef}
                    value={otp}
                    onChange={setOtp}
                    onComplete={(code) => void handleVerify(code)}
                  />

                  <GradientButton
                    title="Verify & continue"
                    onPress={() => void handleVerify()}
                    isLoading={isSubmitting}
                    disabled={otp.length < 6}
                    leftIcon={<Ionicons name="shield-checkmark-outline" size={18} color={Colors.white} />}
                    style={styles.verifyBtn}
                  />

                  {twoFactorMethod !== 'AUTHENTICATOR' ? (
                    <OtpResendButton
                      onPress={() => void handleResend()}
                      disabled={resendCooldown > 0 || resendInFlight.current}
                      label={resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
                    />
                  ) : (
                    <OtpHelperTip text="Use the latest code from your authenticator — older codes will not work." />
                  )}

                  <Text style={styles.dismissHint}>Tap outside the keyboard to hide it</Text>
                </>
              )}
            </View>
          </ScrollView>
        </KeyboardDismissView>
      </KeyboardAvoidingView>

      <LoadingOverlay
        visible={isSubmitting}
        message="Verifying your code…"
        submessage="Signing you in securely"
        icon="shield-checkmark"
      />
    </View>
  );
}

const createStyles = (colors: import('../../src/theme/types').ThemeColors) => StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.pageBg,
  },
  flex: {
    flex: 1,
  },
  header: {
    paddingBottom: 12,
  },
  backBtn: {
    alignSelf: 'flex-start',
    marginLeft: Spacing.page,
    marginTop: 4,
    marginBottom: 8,
  },
  backBtnInner: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Overlays.white14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    flexGrow: 1,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 28,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderSubtle,
  },
  eyebrow: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: 6,
  },
  title: {
    ...Typography.h2,
    fontSize: 24,
    color: colors.dark,
    marginBottom: 8,
  },
  subtitle: {
    ...Typography.small,
    color: colors.muted,
    lineHeight: 21,
    marginBottom: 20,
  },
  methodPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.primaryMuted,
    borderWidth: 1,
    borderColor: Overlays.borderPrimary14,
    marginBottom: 8,
  },
  methodPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  verifyBtn: {
    marginTop: 12,
  },
  dismissHint: {
    marginTop: 8,
    fontSize: 12,
    color: colors.mutedLight,
    textAlign: 'center',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 40,
  },
  loadingText: {
    ...Typography.small,
    color: colors.muted,
  },
});

function useStyles() {
  return useThemedStyles(createStyles);
}
