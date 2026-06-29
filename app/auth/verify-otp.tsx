import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../src/lib/api';
import { useAuthStore } from '../../src/stores';
import { showToast } from '../../src/components/ui/Toast';
import { Colors, Typography } from '../../src/theme';
import { AuthShell, AuthCardHeader, AuthHeroIcon } from '../../src/components/auth/AuthShell';
import { AuthGradientButton } from '../../src/components/auth/AuthControls';
import { PremiumOtpInput } from '../../src/components/security/PremiumOtpInput';

export default function VerifyOTPScreen() {
  const { email, type } = useLocalSearchParams<{ email: string; type: string }>();
  const { setUser } = useAuthStore();
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const otpInputRef = useRef<TextInput>(null);
  const isReg = type === 'complete_registration';

  useEffect(() => {
    if (countdown > 0) {
      const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
      return () => clearTimeout(t);
    }
    setCanResend(true);
  }, [countdown]);

  const handleVerify = async (code?: string) => {
    const c = code || otp;
    if (c.length !== 6) {
      showToast({ type: 'error', text1: 'Incomplete Code', text2: 'Enter the complete 6-digit code' });
      return;
    }
    setLoading(true);
    try {
      if (isReg) {
        const res = await api.completeRegistration(email!, c);
        if (res.success && res.data) {
          if (res.data.user) setUser(res.data.user);
          showToast({ type: 'success', text1: 'Account Created', text2: 'Set your transaction PIN to get started' });
          setTimeout(() => router.replace('/dashboard/setup-pin'), 700);
        } else {
          showToast({ type: 'error', text1: 'Invalid Code', text2: res.message || 'Incorrect code. Please try again.' });
          setOtp('');
          otpInputRef.current?.focus();
        }
      } else {
        router.push({ pathname: '/auth/reset-password', params: { email, otp: c } });
      }
    } catch (err: any) {
      showToast({ type: 'error', text1: 'Verification Failed', text2: err?.data?.message || err?.message || 'Please try again' });
      setOtp('');
      otpInputRef.current?.focus();
    } finally { setLoading(false); }
  };

  const handleResend = async () => {
    if (!canResend) return;
    setLoading(true);
    try {
      if (isReg) await api.resendRegistrationOtp(email!);
      else await api.forgotPassword(email!);
      setCountdown(60);
      setCanResend(false);
      setOtp('');
      otpInputRef.current?.focus();
      showToast({ type: 'success', text1: 'Code Resent', text2: `A new code was sent to ${email}` });
    } catch (err: any) {
      showToast({ type: 'error', text1: 'Resend Failed', text2: err?.data?.message || err?.message || 'Please try again' });
    } finally { setLoading(false); }
  };

  return (
    <AuthShell
      onBack={() => router.back()}
      showLogo={false}
      scrollable
      heroIcon={<AuthHeroIcon icon="mail-outline" size={52} />}
    >
      <AuthCardHeader
        eyebrow={isReg ? 'Verify your email' : 'Check your inbox'}
        title="Enter verification code"
        subtitle={`We sent a 6-digit code to ${email}`}
      />

      <PremiumOtpInput
        ref={otpInputRef}
        value={otp}
        onChange={setOtp}
        onComplete={(code) => void handleVerify(code)}
      />

      {loading ? (
        <View style={styles.loadRow}>
          <ActivityIndicator color={Colors.primary} size="small" />
          <Text style={styles.loadText}>Verifying...</Text>
        </View>
      ) : null}

      <AuthGradientButton
        title={isReg ? 'Verify & continue' : 'Continue'}
        onPress={() => void handleVerify()}
        isLoading={loading}
        disabled={otp.length < 6}
        icon={<Ionicons name="shield-checkmark-outline" size={18} color={Colors.white} />}
        style={{ marginTop: 12 }}
      />

      <TouchableOpacity
        style={[styles.resendBtn, !canResend && styles.resendBtnDisabled]}
        onPress={() => void handleResend()}
        disabled={!canResend || loading}
        activeOpacity={0.8}
      >
        <Ionicons name="refresh-outline" size={16} color={canResend ? Colors.primary : Colors.muted} />
        <Text style={[styles.resendText, !canResend && styles.resendTextDisabled]}>
          {canResend ? 'Resend code' : `Resend in ${countdown}s`}
        </Text>
      </TouchableOpacity>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  loadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
    marginBottom: 4,
  },
  loadText: {
    ...Typography.small,
    color: Colors.muted,
  },
  resendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    marginTop: 4,
  },
  resendBtnDisabled: {
    opacity: 0.6,
  },
  resendText: {
    ...Typography.bodyMed,
    color: Colors.primary,
    fontWeight: '600',
  },
  resendTextDisabled: {
    color: Colors.muted,
  },
});
