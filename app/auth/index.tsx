import {
  View, Text, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { useState } from 'react';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../src/lib/api';
import { Input } from '../../src/components/ui/Input';
import { Button } from '../../src/components/ui/Button';
import { Toast } from '../../src/components/ui/Toast';
import { Colors, Spacing, Typography, Radius, Shadow } from '../../src/theme';

const ALLOWED_DOMAINS = ['gmail.com','yahoo.com','yahoo.co.uk','yahoo.fr','yahoo.de','yahoo.es','yahoo.it','yahoo.in','yahoo.com.au','yahoo.com.br','yahoo.co.jp'];
const PW_RULES = [
  { label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
  { label: 'One uppercase letter',  test: (p: string) => /[A-Z]/.test(p) },
  { label: 'One lowercase letter',  test: (p: string) => /[a-z]/.test(p) },
  { label: 'One number',            test: (p: string) => /\d/.test(p) },
  { label: 'One special character', test: (p: string) => /[@$!%*?&]/.test(p) },
];

export default function RegisterScreen() {
  const [form, setForm] = useState({ firstName:'', lastName:'', email:'', phone:'', password:'', confirmPassword:'', referralCode:'' });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPwRules, setShowPwRules] = useState(false);

  const set = (k: keyof typeof form) => (v: string) => {
    setForm(f => ({ ...f, [k]: v }));
    setFieldErrors(e => ({ ...e, [k]: '' }));
  };

  const pwStrength = PW_RULES.filter(r => r.test(form.password)).length;
  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Strong'][pwStrength];
  const strengthColor = [Colors.border, Colors.error, Colors.warning, Colors.primary, Colors.success, Colors.success][pwStrength];

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.firstName.trim()) errs.firstName = 'First name is required';
    if (!form.lastName.trim()) errs.lastName = 'Last name is required';
    if (!form.email.trim()) errs.email = 'Email address is required';
    else {
      const domain = form.email.split('@')[1]?.toLowerCase();
      if (!ALLOWED_DOMAINS.includes(domain)) errs.email = 'Only Gmail and Yahoo addresses allowed';
    }
    if (!form.phone.trim()) errs.phone = 'Phone number is required';
    else if (form.phone.length < 11) errs.phone = 'Enter a valid 11-digit phone number';
    if (!form.password) errs.password = 'Password is required';
    else if (!PW_RULES.every(r => r.test(form.password))) errs.password = 'Password does not meet all requirements';
    if (form.password !== form.confirmPassword) errs.confirmPassword = 'Passwords do not match';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    setIsLoading(true);
    try {
      const res = await api.initiateRegistration({
        firstName: form.firstName.trim(), lastName: form.lastName.trim(),
        email: form.email.trim(), phone: form.phone.trim(),
        password: form.password,
        referralCode: form.referralCode || undefined,
      });
      if (res.success) {
        Toast.show({ type: 'success', text1: 'OTP Sent! 📧', text2: `Check ${form.email} for your verification code` });
        setTimeout(() => {
          router.push({ pathname: '/auth/verify-otp', params: { email: form.email.trim(), type: 'complete_registration' } });
        }, 600);
      } else {
        Toast.show({ type: 'error', text1: 'Registration Failed', text2: res.message || 'Please try again' });
      }
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Registration Failed', text2: err?.data?.message || err?.message || 'Please try again' });
    } finally { setIsLoading(false); }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color={Colors.white} />
          </TouchableOpacity>
          <View style={styles.logoBox}><Text style={styles.logoLetter}>P</Text></View>
          <Text style={styles.appName}>PrivateVTU</Text>
          <Text style={styles.tagline}>Create your free account</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Get started</Text>
          <Text style={styles.subtitle}>Fill in your details below</Text>

          <View style={styles.nameRow}>
            <View style={{ flex: 1 }}>
              <Input label="First Name" placeholder="John" value={form.firstName}
                onChangeText={set('firstName')} autoCapitalize="words"
                error={fieldErrors.firstName}
                leftIcon={<Ionicons name="person-outline" size={16} color={Colors.muted} />}
                containerStyle={{ marginBottom: 16 }} />
            </View>
            <View style={{ width: 10 }} />
            <View style={{ flex: 1 }}>
              <Input label="Last Name" placeholder="Doe" value={form.lastName}
                onChangeText={set('lastName')} autoCapitalize="words"
                error={fieldErrors.lastName}
                leftIcon={<Ionicons name="person-outline" size={16} color={Colors.muted} />}
                containerStyle={{ marginBottom: 16 }} />
            </View>
          </View>

          <Input label="Email Address" placeholder="you@gmail.com" value={form.email}
            onChangeText={set('email')} keyboardType="email-address" autoCapitalize="none"
            error={fieldErrors.email}
            hint="Gmail and Yahoo only"
            leftIcon={<Ionicons name="mail-outline" size={16} color={Colors.muted} />} />

          <Input label="Phone Number" placeholder="08012345678" value={form.phone}
            onChangeText={set('phone')} keyboardType="phone-pad" maxLength={11}
            error={fieldErrors.phone}
            leftIcon={<Ionicons name="call-outline" size={16} color={Colors.muted} />} />

          {/* Password with strength */}
          <Input label="Password" placeholder="Create a strong password" value={form.password}
            onChangeText={set('password')} secureTextEntry
            onFocus={() => setShowPwRules(true)}
            error={fieldErrors.password}
            leftIcon={<Ionicons name="lock-closed-outline" size={16} color={Colors.muted} />}
            containerStyle={{ marginBottom: form.password ? 6 : 16 }} />

          {form.password ? (
            <View style={styles.strengthRow}>
              <View style={styles.strengthBar}>
                <View style={[styles.strengthFill, { width: `${(pwStrength / 5) * 100}%` as any, backgroundColor: strengthColor }]} />
              </View>
              <Text style={[styles.strengthLabel, { color: strengthColor }]}>{strengthLabel}</Text>
            </View>
          ) : null}

          {showPwRules && (
            <View style={styles.pwRules}>
              {PW_RULES.map((r, i) => (
                <View key={i} style={styles.pwRule}>
                  <Ionicons name={r.test(form.password) ? 'checkmark-circle' : 'ellipse-outline'} size={13}
                    color={r.test(form.password) ? Colors.success : Colors.muted} />
                  <Text style={[styles.pwRuleText, r.test(form.password) && { color: Colors.successDark }]}>{r.label}</Text>
                </View>
              ))}
            </View>
          )}

          <Input label="Confirm Password" placeholder="Confirm your password" value={form.confirmPassword}
            onChangeText={set('confirmPassword')} secureTextEntry
            error={fieldErrors.confirmPassword}
            leftIcon={<Ionicons name="lock-closed-outline" size={16} color={Colors.muted} />} />

          <Input label="Referral Code (Optional)" placeholder="Enter referral code" value={form.referralCode}
            onChangeText={set('referralCode')}
            leftIcon={<Ionicons name="gift-outline" size={16} color={Colors.muted} />} />

          <Button title="Create Account" onPress={handleRegister} isLoading={isLoading} style={{ paddingVertical: 16 }} />

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>already have an account?</Text>
            <View style={styles.dividerLine} />
          </View>
          <TouchableOpacity onPress={() => router.push('/auth/login')}>
            <Text style={styles.loginLink}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.primaryDeep },
  scroll: { flexGrow: 1 },
  hero: { paddingTop: 60, paddingBottom: 36, alignItems: 'center' },
  backBtn: { position: 'absolute', top: 60, left: 20, padding: 8 },
  logoBox: { width: 60, height: 60, borderRadius: 18, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center', marginBottom: 12, ...Shadow.md },
  logoLetter: { fontSize: 28, fontWeight: '800', color: Colors.white },
  appName: { ...Typography.h3, color: Colors.white, marginBottom: 4 },
  tagline: { ...Typography.small, color: 'rgba(255,255,255,0.6)' },
  card: { flex: 1, backgroundColor: Colors.white, borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingHorizontal: Spacing.page, paddingTop: 32, paddingBottom: 48 },
  title: { ...Typography.h2, color: Colors.dark, marginBottom: 4 },
  subtitle: { ...Typography.small, color: Colors.muted, marginBottom: 24 },
  nameRow: { flexDirection: 'row' },
  strengthRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  strengthBar: { flex: 1, height: 4, backgroundColor: Colors.border, borderRadius: 2, overflow: 'hidden' },
  strengthFill: { height: '100%', borderRadius: 2 },
  strengthLabel: { ...Typography.captionMed },
  pwRules: { backgroundColor: Colors.surface, borderRadius: Radius.md, padding: 12, gap: 6, marginBottom: 16, borderWidth: 1, borderColor: Colors.border },
  pwRule: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pwRuleText: { ...Typography.caption, color: Colors.muted },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 20, gap: 8 },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  dividerText: { ...Typography.caption, color: Colors.muted },
  loginLink: { ...Typography.bodyMed, color: Colors.primary, textAlign: 'center', fontWeight: '700' },
});
