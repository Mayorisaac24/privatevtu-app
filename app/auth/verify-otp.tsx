import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../src/lib/api';
import { useAuthStore } from '../../src/stores';
import { Toast } from '../../src/components/ui/Toast';
import { Colors, Spacing, Typography, Radius, Shadow } from '../../src/theme';

export default function VerifyOTPScreen() {
  const { email, type } = useLocalSearchParams<{ email: string; type: string }>();
  const { setUser } = useAuthStore();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const refs = useRef<(TextInput | null)[]>([]);
  const isReg = type === 'complete_registration';

  useEffect(() => {
    if (countdown > 0) { const t = setTimeout(() => setCountdown(c => c - 1), 1000); return () => clearTimeout(t); }
    setCanResend(true);
  }, [countdown]);

  const handleChange = (idx: number, val: string) => {
    if (val.length > 1) {
      const digits = val.replace(/\D/g, '').slice(0, 6).split('');
      const next = Array(6).fill('');
      digits.forEach((d, i) => { next[i] = d; });
      setOtp(next);
      if (digits.length === 6) handleVerify(next.join(''));
      return;
    }
    const next = [...otp]; next[idx] = val.replace(/\D/g, '');
    setOtp(next);
    if (val && idx < 5) refs.current[idx + 1]?.focus();
    if (val && idx === 5) handleVerify(next.join(''));
  };

  const handleKey = (idx: number, key: string) => {
    if (key === 'Backspace' && !otp[idx] && idx > 0) refs.current[idx - 1]?.focus();
  };

  const handleVerify = async (code?: string) => {
    const c = code || otp.join('');
    if (c.length !== 6) { Toast.show({ type: 'error', text1: 'Incomplete Code', text2: 'Enter the complete 6-digit code' }); return; }
    setLoading(true);
    try {
      if (isReg) {
        const res = await api.completeRegistration(email!, c);
        if (res.success && res.data) {
          if (res.data.user) setUser(res.data.user);
          Toast.show({ type: 'success', text1: 'Account Created! 🎉', text2: 'Set your transaction PIN to get started' });
          setTimeout(() => router.replace('/dashboard/setup-pin'), 700);
        } else {
          Toast.show({ type: 'error', text1: 'Invalid Code', text2: res.message || 'Incorrect code. Please try again.' });
          setOtp(Array(6).fill('')); refs.current[0]?.focus();
        }
      } else {
        router.push({ pathname: '/auth/reset-password', params: { email, otp: c } });
      }
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Verification Failed', text2: err?.data?.message || err?.message || 'Please try again' });
      setOtp(Array(6).fill('')); refs.current[0]?.focus();
    } finally { setLoading(false); }
  };

  const handleResend = async () => {
    if (!canResend) return;
    setLoading(true);
    try {
      if (isReg) await api.resendRegistrationOtp(email!);
      else await api.forgotPassword(email!);
      setCountdown(60); setCanResend(false); setOtp(Array(6).fill(''));
      refs.current[0]?.focus();
      Toast.show({ type: 'success', text1: 'Code Resent', text2: `A new code was sent to ${email}` });
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Resend Failed', text2: err?.data?.message || err?.message || 'Please try again' });
    } finally { setLoading(false); }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.root}>
      <View style={styles.hero}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={Colors.white} />
        </TouchableOpacity>
        <View style={styles.iconCircle}>
          <Ionicons name="mail-outline" size={30} color={Colors.white} />
        </View>
        <Text style={styles.heroTitle}>Verify Email</Text>
        <Text style={styles.heroSub}>
          Code sent to{'\n'}
          <Text style={{ color: Colors.primaryLight, fontWeight: '700' }}>{email}</Text>
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.instruction}>Enter the 6-digit verification code</Text>

        <View style={styles.otpRow}>
          {otp.map((d, i) => (
            <TextInput key={i} ref={r => { refs.current[i] = r; }}
              style={[styles.otpBox, d && styles.otpBoxFilled]}
              value={d} onChangeText={v => handleChange(i, v)}
              onKeyPress={({ nativeEvent }) => handleKey(i, nativeEvent.key)}
              keyboardType="number-pad" maxLength={6} selectTextOnFocus autoFocus={i === 0} />
          ))}
        </View>

        {loading && (
          <View style={styles.loadRow}>
            <ActivityIndicator color={Colors.primary} size="small" />
            <Text style={styles.loadText}>Verifying...</Text>
          </View>
        )}

        <TouchableOpacity style={[styles.resendBtn, !canResend && { opacity: 0.5 }]}
          onPress={handleResend} disabled={!canResend || loading}>
          <Ionicons name="refresh-outline" size={14} color={canResend ? Colors.primary : Colors.muted} />
          <Text style={[styles.resendText, !canResend && { color: Colors.muted }]}>
            {canResend ? 'Resend code' : `Resend in ${countdown}s`}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.primaryDeep },
  hero: { paddingTop: 60, paddingBottom: 36, alignItems: 'center' },
  backBtn: { position: 'absolute', top: 60, left: 20, padding: 8 },
  iconCircle: { width: 68, height: 68, borderRadius: 34, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', marginBottom: 14, ...Shadow.md },
  heroTitle: { ...Typography.h2, color: Colors.white, marginBottom: 8 },
  heroSub: { ...Typography.small, color: 'rgba(255,255,255,0.7)', textAlign: 'center', paddingHorizontal: 40 },
  card: { flex: 1, backgroundColor: Colors.white, borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingHorizontal: Spacing.page, paddingTop: 36, paddingBottom: 48, alignItems: 'center' },
  instruction: { ...Typography.small, color: Colors.muted, marginBottom: 28 },
  otpRow: { flexDirection: 'row', gap: 10, marginBottom: 28 },
  otpBox: {
    width: 46, height: 54, borderRadius: Radius.md, borderWidth: 1.5,
    borderColor: Colors.border, backgroundColor: Colors.surface,
    fontSize: 22, fontWeight: '700', textAlign: 'center', color: Colors.dark,
  },
  otpBoxFilled: { borderColor: Colors.primary, backgroundColor: Colors.primaryMuted, color: Colors.primary },
  loadRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  loadText: { ...Typography.small, color: Colors.muted },
  resendBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 12 },
  resendText: { ...Typography.bodyMed, color: Colors.primary },
});
