import {
  View, Text, TouchableOpacity, StyleSheet, KeyboardAvoidingView,
  Platform, ScrollView,
} from 'react-native';
import { useState, useEffect } from 'react';
import { router } from 'expo-router';
import * as LocalAuthentication from 'expo-local-authentication';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../src/lib/api';
import { useAuthStore } from '../../src/stores';
import { Input } from '../../src/components/ui/Input';
import { Button } from '../../src/components/ui/Button';
import { Toast } from '../../src/components/ui/Toast';
import { Colors, Spacing, Typography, Radius, Shadow } from '../../src/theme';
import { prefetchAppData } from '../../src/lib/dashboard-data';
import { registerPushNotifications } from '../../src/lib/push-notifications';

export default function LoginScreen() {
  const [method, setMethod] = useState<'email' | 'phone'>('email');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ identifier?: string; password?: string }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [biometricLabel, setBiometricLabel] = useState('');
  const { setUser } = useAuthStore();

  useEffect(() => { checkBiometric(); }, []);

  const checkBiometric = async () => {
    const has = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    if (!has || !enrolled) return;
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    setBiometricLabel(
      types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)
        ? 'Face ID'
        : 'Fingerprint'
    );
  };

  const validate = () => {
    const errs: typeof fieldErrors = {};
    const identifier = method === 'email' ? email.trim() : phone.trim();
    if (!identifier) errs.identifier = `${method === 'email' ? 'Email address' : 'Phone number'} is required`;
    else if (method === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier))
      errs.identifier = 'Enter a valid email address';
    else if (method === 'phone' && identifier.length < 11)
      errs.identifier = 'Enter a valid 11-digit phone number';
    if (!password) errs.password = 'Password is required';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    setIsLoading(true);
    try {
      const res = await api.login({
        email: method === 'email' ? email.trim() : undefined,
        phone: method === 'phone' ? phone.trim() : undefined,
        password,
      });
      if (res.success && res.data) {
        if (res.data.requiresTwoFactor && res.data.userId) {
          Toast.show({ type: 'info', text1: '2FA Required', text2: 'Enter your authenticator code' });
          router.push({ pathname: '/auth/verify-2fa', params: { userId: res.data.userId } });
          return;
        }
        if (res.data.user) {
          setUser(res.data.user);
          void prefetchAppData();
          void registerPushNotifications().catch(() => {});
          Toast.show({ type: 'success', text1: 'Welcome back! 👋', text2: `Hello, ${res.data.user.firstName || 'there'}` });
          // Navigate AFTER a short delay so toast is visible
          setTimeout(() => {
            router.replace(res.data!.user?.hasPin === false ? '/dashboard/setup-pin' : '/(tabs)');
          }, 600);
        }
      } else {
        Toast.show({ type: 'error', text1: 'Login Failed', text2: res.message || 'Invalid credentials. Please try again.' });
      }
    } catch (err: any) {
      const msg = err?.data?.message || err?.message || 'Something went wrong. Try again.';
      Toast.show({ type: 'error', text1: 'Login Failed', text2: msg });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBiometric = async () => {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: `Authenticate with ${biometricLabel}`,
      fallbackLabel: 'Use password',
    });
    if (result.success) {
      Toast.show({ type: 'success', text1: 'Authenticated', text2: `Signed in with ${biometricLabel}` });
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        {/* ── HERO ──────────────────────────── */}
        <View style={styles.hero}>
          <View style={styles.heroShine} />
          <View style={styles.logoBox}>
            <Text style={styles.logoLetter}>P</Text>
          </View>
          <Text style={styles.appName}>PrivateVTU</Text>
          <Text style={styles.tagline}>Your trusted VTU partner</Text>
        </View>

        {/* ── CARD ──────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>Sign in to your account to continue</Text>

          {/* Method toggle */}
          <View style={styles.toggle}>
            {(['email', 'phone'] as const).map((m) => (
              <TouchableOpacity
                key={m}
                style={[styles.toggleBtn, method === m && styles.toggleBtnActive]}
                onPress={() => { setMethod(m); setFieldErrors({}); }}
              >
                <Ionicons
                  name={m === 'email' ? 'mail-outline' : 'call-outline'}
                  size={14}
                  color={method === m ? Colors.primary : Colors.muted}
                />
                <Text style={[styles.toggleText, method === m && styles.toggleTextActive]}>
                  {m === 'email' ? 'Email' : 'Phone'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Fields — inline field errors only, NO API error here */}
          {method === 'email' ? (
            <Input
              label="Email Address"
              placeholder="you@example.com"
              value={email}
              onChangeText={(v) => { setEmail(v); setFieldErrors(e => ({ ...e, identifier: undefined })); }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              error={fieldErrors.identifier}
              leftIcon={<Ionicons name="mail-outline" size={17} color={Colors.muted} />}
            />
          ) : (
            <Input
              label="Phone Number"
              placeholder="08012345678"
              value={phone}
              onChangeText={(v) => { setPhone(v); setFieldErrors(e => ({ ...e, identifier: undefined })); }}
              keyboardType="phone-pad"
              maxLength={11}
              error={fieldErrors.identifier}
              leftIcon={<Ionicons name="call-outline" size={17} color={Colors.muted} />}
            />
          )}

          <Input
            label="Password"
            placeholder="Enter your password"
            value={password}
            onChangeText={(v) => { setPassword(v); setFieldErrors(e => ({ ...e, password: undefined })); }}
            secureTextEntry
            error={fieldErrors.password}
            leftIcon={<Ionicons name="lock-closed-outline" size={17} color={Colors.muted} />}
            containerStyle={{ marginBottom: 8 }}
          />

          <TouchableOpacity style={styles.forgotRow} onPress={() => router.push('/auth/forgot-password')}>
            <Text style={styles.forgotText}>Forgot password?</Text>
          </TouchableOpacity>

          <Button
            title="Sign In"
            onPress={handleLogin}
            isLoading={isLoading}
            style={{ marginTop: 8, paddingVertical: 16 }}
          />

          {biometricLabel ? (
            <TouchableOpacity style={styles.biometricBtn} onPress={handleBiometric}>
              <View style={styles.biometricIcon}>
                <Ionicons
                  name={biometricLabel === 'Face ID' ? 'scan-outline' : 'finger-print-outline'}
                  size={20}
                  color={Colors.primary}
                />
              </View>
              <Text style={styles.biometricText}>Use {biometricLabel}</Text>
            </TouchableOpacity>
          ) : null}

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity style={styles.registerRow} onPress={() => router.push('/auth')}>
            <Text style={styles.registerText}>
              New to PrivateVTU?{' '}
              <Text style={styles.registerLink}>Create account</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.primaryDeep },
  scroll: { flexGrow: 1 },

  hero: {
    paddingTop: 72, paddingBottom: 44,
    alignItems: 'center', overflow: 'hidden',
  },
  heroShine: {
    position: 'absolute', top: -80, right: -60,
    width: 240, height: 240, borderRadius: 120,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  logoBox: {
    width: 72, height: 72, borderRadius: 22,
    backgroundColor: Colors.primary,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 16, ...Shadow.lg,
  },
  logoLetter: { fontSize: 36, fontWeight: '800', color: Colors.white },
  appName: { ...Typography.h2, color: Colors.white, marginBottom: 6 },
  tagline: { ...Typography.small, color: 'rgba(255,255,255,0.6)', letterSpacing: 0.3 },

  card: {
    flex: 1,
    backgroundColor: Colors.white,
    borderTopLeftRadius: 32, borderTopRightRadius: 32,
    paddingHorizontal: Spacing.page,
    paddingTop: 32, paddingBottom: 48,
  },
  title: { ...Typography.h2, color: Colors.dark, marginBottom: 4 },
  subtitle: { ...Typography.small, color: Colors.muted, marginBottom: 24 },

  toggle: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: 4,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  toggleBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 6,
    paddingVertical: 10, borderRadius: Radius.sm,
  },
  toggleBtnActive: {
    backgroundColor: Colors.white,
    ...Shadow.sm,
  },
  toggleText: { ...Typography.smallMed, color: Colors.muted },
  toggleTextActive: { color: Colors.primary, fontWeight: '700' },

  forgotRow: { alignSelf: 'flex-end', marginBottom: 4 },
  forgotText: { ...Typography.smallMed, color: Colors.primary },

  biometricBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, paddingVertical: 14, marginTop: 6,
  },
  biometricIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: Colors.primaryMuted,
    justifyContent: 'center', alignItems: 'center',
  },
  biometricText: { ...Typography.bodyMed, color: Colors.primary },

  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  dividerText: { ...Typography.caption, color: Colors.muted, paddingHorizontal: 12 },

  registerRow: { alignItems: 'center' },
  registerText: { ...Typography.small, color: Colors.muted },
  registerLink: { color: Colors.primary, fontWeight: '700' },
});
