import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { useState, useRef } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../src/lib/api';
import { useAuthStore } from '../../src/stores';
import { Toast } from '../../src/components/ui/Toast';
import { Colors, Spacing, Typography, Radius } from '../../src/theme';

export default function Verify2FAScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const { setUser } = useAuthStore();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const refs = useRef<(TextInput | null)[]>([]);

  const handleChange = (idx: number, val: string) => {
    if (val.length > 1) {
      const digits = val.replace(/\D/g, '').slice(0, 6).split('');
      const next = Array(6).fill('');
      digits.forEach((d, i) => { next[i] = d; });
      setOtp(next);
      if (digits.length === 6) handleVerify(next.join(''));
      return;
    }
    const next = [...otp];
    next[idx] = val.replace(/\D/g, '');
    setOtp(next);
    if (val && idx < 5) refs.current[idx + 1]?.focus();
    if (val && idx === 5) handleVerify(next.join(''));
  };

  const handleKey = (idx: number, key: string) => {
    if (key === 'Backspace' && !otp[idx] && idx > 0) refs.current[idx - 1]?.focus();
  };

  const handleVerify = async (code?: string) => {
    const c = code || otp.join('');
    if (c.length !== 6) {
      Toast.show({ type: 'error', text1: 'Incomplete Code', text2: 'Enter the full 6-digit code' });
      return;
    }
    setLoading(true);
    try {
      const res = await api.verify2FALogin(userId!, c);
      if (res.success && res.data?.user) {
        setUser(res.data.user);
        Toast.show({ type: 'success', text1: 'Authenticated! ✓', text2: `Welcome back, ${res.data.user.firstName}` });
        setTimeout(() => {
          router.replace(res.data!.user?.hasPin === false ? '/dashboard/setup-pin' : '/(tabs)');
        }, 700);
      } else {
        Toast.show({ type: 'error', text1: 'Invalid Code', text2: res.message || 'Incorrect 2FA code. Please try again.' });
        setOtp(Array(6).fill(''));
        refs.current[0]?.focus();
      }
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Verification Failed', text2: err?.data?.message || err?.message || 'Please try again' });
      setOtp(Array(6).fill(''));
      refs.current[0]?.focus();
    } finally { setLoading(false); }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.root}>
      <View style={styles.hero}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={Colors.white} />
        </TouchableOpacity>
        <View style={styles.iconCircle}>
          <Ionicons name="shield-checkmark-outline" size={30} color={Colors.white} />
        </View>
        <Text style={styles.heroTitle}>Two-Factor Auth</Text>
        <Text style={styles.heroSub}>Enter your authenticator app code</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.instruction}>Enter the 6-digit code from your authenticator app</Text>
        <View style={styles.otpRow}>
          {otp.map((d, i) => (
            <TextInput
              key={i}
              ref={r => { refs.current[i] = r; }}
              style={[styles.otpBox, d && styles.otpBoxFilled]}
              value={d}
              onChangeText={v => handleChange(i, v)}
              onKeyPress={({ nativeEvent }) => handleKey(i, nativeEvent.key)}
              keyboardType="number-pad"
              maxLength={6}
              selectTextOnFocus
              autoFocus={i === 0}
            />
          ))}
        </View>
        {loading && (
          <View style={styles.loadRow}>
            <ActivityIndicator color={Colors.primary} size="small" />
            <Text style={styles.loadText}>Verifying...</Text>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.primaryDeep },
  hero: { paddingTop: 60, paddingBottom: 36, alignItems: 'center' },
  backBtn: { position: 'absolute', top: 60, left: 20, padding: 8 },
  iconCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: Colors.success,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 16,
    shadowColor: Colors.success,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35, shadowRadius: 16, elevation: 8,
  },
  heroTitle: { ...Typography.h2, color: Colors.white, marginBottom: 8 },
  heroSub: { ...Typography.small, color: 'rgba(255,255,255,0.7)', textAlign: 'center', paddingHorizontal: 40 },
  card: {
    flex: 1, backgroundColor: Colors.white,
    borderTopLeftRadius: 32, borderTopRightRadius: 32,
    paddingHorizontal: Spacing.page, paddingTop: 36,
    paddingBottom: 48, alignItems: 'center',
  },
  instruction: { ...Typography.small, color: Colors.muted, marginBottom: 28, textAlign: 'center' },
  otpRow: { flexDirection: 'row', gap: 10, marginBottom: 28 },
  otpBox: {
    width: 46, height: 54, borderRadius: Radius.md,
    borderWidth: 1.5, borderColor: Colors.border,
    backgroundColor: Colors.surface,
    fontSize: 22, fontWeight: '700', textAlign: 'center', color: Colors.dark,
  },
  otpBoxFilled: { borderColor: Colors.primary, backgroundColor: Colors.primaryMuted, color: Colors.primary },
  loadRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  loadText: { ...Typography.small, color: Colors.muted },
});
