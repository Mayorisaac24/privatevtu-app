import React, { useEffect, useRef, useState } from 'react';
import { TextInput } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api, isResponseSuccess, type TwoFactorMethodType, type User } from '../../src/lib/api';
import { useAuthStore } from '../../src/stores';
import { showToast } from '../../src/components/ui/Toast';
import { LoadingOverlay } from '../../src/components/ui/LoadingOverlay';
import { registerPushNotifications } from '../../src/lib/push-notifications';
import { getLoginDeviceId } from '../../src/lib/login-context';
import {
  clearTwoFactorLoginChallenge,
  readRouteParam,
  resolveLoginTwoFactorChallenge,
  stashTwoFactorLoginChallenge,
} from '../../src/lib/two-factor-login';
import { Colors } from '../../src/theme';
import { AuthShell, AuthCardHeader, AuthHeroIcon, AuthMethodPill } from '../../src/components/auth/AuthShell';
import { AuthGradientButton } from '../../src/components/auth/AuthControls';
import { OtpHelperTip, OtpResendButton, PremiumOtpInput } from '../../src/components/security/PremiumOtpInput';

const METHOD_META = {
  AUTHENTICATOR: { icon: 'phone-portrait-outline' as const, label: 'Authenticator app' },
  EMAIL: { icon: 'mail-outline' as const, label: 'Email' },
  SMS: { icon: 'chatbubble-ellipses-outline' as const, label: 'SMS' },
};

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

export default function Verify2FAScreen() {
  const params = useLocalSearchParams<{
    userId: string;
    method?: string;
    destination?: string;
  }>();
  const userId = readRouteParam(params.userId);
  const [twoFactorMethod, setTwoFactorMethod] = useState<TwoFactorMethodType>('EMAIL');
  const [destination, setDestination] = useState(readRouteParam(params.destination));
  const [contextLoading, setContextLoading] = useState(true);
  const meta = METHOD_META[twoFactorMethod];
  const { setUser } = useAuthStore();
  const [otp, setOtp] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const otpInputRef = useRef<TextInput>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      if (!userId) {
        setContextLoading(false);
        return;
      }
      try {
        const challenge = await resolveLoginTwoFactorChallenge(
          userId,
          readRouteParam(params.method),
          readRouteParam(params.destination),
        );
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
  }, [params.destination, params.method, userId]);

  useEffect(() => {
    if (contextLoading) return;
    const timer = setTimeout(() => otpInputRef.current?.focus(), 400);
    return () => clearTimeout(timer);
  }, [contextLoading]);

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
    try {
      const res = await api.send2FACode('login', { userId, method: twoFactorMethod });
      if (res.success) {
        showToast({
          type: 'success',
          text1: 'Code resent',
          text2: res.data?.destination ? `Sent to ${res.data.destination}` : destination ? `Sent to ${destination}` : undefined,
        });
        setOtp('');
        otpInputRef.current?.focus();
      } else {
        showToast({ type: 'error', text1: 'Could not resend', text2: res.message });
      }
    } catch {
      showToast({ type: 'error', text1: 'Could not resend', text2: 'Please try again shortly' });
    }
  };

  return (
    <>
      <AuthShell
        onBack={() => router.back()}
        showLogo={false}
        scrollable
        heroIcon={<AuthHeroIcon icon="shield-checkmark" size={52} />}
      >
        <AuthCardHeader
          eyebrow="Two-factor auth"
          title="Verification code"
          subtitle={
            contextLoading
              ? 'Loading verification method…'
              : twoFactorMethod === 'AUTHENTICATOR'
                ? 'Open your authenticator app and enter the latest code'
                : `We sent a code to ${destination || 'your contact'}`
          }
        />

        {!contextLoading ? (
          <>
            <AuthMethodPill icon={meta.icon} label={meta.label} />

            <PremiumOtpInput
              ref={otpInputRef}
              value={otp}
              onChange={setOtp}
              onComplete={(code) => void handleVerify(code)}
            />

            <AuthGradientButton
              title="Verify & continue"
              onPress={() => void handleVerify()}
              isLoading={isSubmitting}
              disabled={otp.length < 6}
              icon={<Ionicons name="shield-checkmark-outline" size={18} color={Colors.white} />}
              style={{ marginTop: 8 }}
            />

            {twoFactorMethod !== 'AUTHENTICATOR' ? (
              <OtpResendButton onPress={() => void handleResend()} />
            ) : (
              <OtpHelperTip text="Use the latest code from your authenticator — older codes will not work." />
            )}
          </>
        ) : null}
      </AuthShell>

      <LoadingOverlay
        visible={isSubmitting || contextLoading}
        message={contextLoading ? 'Preparing verification…' : 'Verifying your code…'}
        submessage={contextLoading ? 'Checking your 2FA method' : 'Signing you in securely'}
        icon="shield-checkmark"
      />
    </>
  );
}
