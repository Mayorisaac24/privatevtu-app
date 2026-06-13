import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useState } from 'react';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../src/lib/api';
import { showToast } from '../../src/components/ui/Toast';
import { Colors, Radius, Typography } from '../../src/theme';
import { AuthShell, AuthCardHeader, AuthSecurityFooter } from '../../src/components/auth/AuthShell';
import { AuthInput } from '../../src/components/auth/AuthInput';
import {
  AuthDivider,
  AuthFooterLink,
  AuthGradientButton,
} from '../../src/components/auth/AuthControls';

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
  const [showReferral, setShowReferral] = useState(false);

  const set = (k: keyof typeof form) => (v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    setFieldErrors((e) => ({ ...e, [k]: '' }));
  };

  const pwStrength = PW_RULES.filter((r) => r.test(form.password)).length;
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
    else if (!PW_RULES.every((r) => r.test(form.password))) errs.password = 'Password does not meet all requirements';
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
        showToast({ type: 'success', text1: 'OTP Sent', text2: `Check ${form.email} for your verification code` });
        setTimeout(() => {
          router.push({ pathname: '/auth/verify-otp', params: { email: form.email.trim(), type: 'complete_registration' } });
        }, 600);
      } else {
        showToast({ type: 'error', text1: 'Registration Failed', text2: res.message || 'Please try again' });
      }
    } catch (err: any) {
      showToast({ type: 'error', text1: 'Registration Failed', text2: err?.data?.message || err?.message || 'Please try again' });
    } finally { setIsLoading(false); }
  };

  return (
    <AuthShell
      scrollable
      cardFooter={<AuthSecurityFooter />}
    >
      <AuthCardHeader
        eyebrow="Get started"
        title="Create account"
        subtitle="Fill in your details to set up your free PrivateVTU account"
      />

      <View style={styles.nameRow}>
        <View style={{ flex: 1 }}>
          <AuthInput
            label="First Name"
            placeholder="John"
            value={form.firstName}
            onChangeText={set('firstName')}
            autoCapitalize="words"
            error={fieldErrors.firstName}
            leftIcon={<Ionicons name="person-outline" size={18} color={Colors.primary} />}
            containerStyle={{ marginBottom: 16 }}
          />
        </View>
        <View style={{ width: 10 }} />
        <View style={{ flex: 1 }}>
          <AuthInput
            label="Last Name"
            placeholder="Doe"
            value={form.lastName}
            onChangeText={set('lastName')}
            autoCapitalize="words"
            error={fieldErrors.lastName}
            leftIcon={<Ionicons name="person-outline" size={18} color={Colors.primary} />}
            containerStyle={{ marginBottom: 16 }}
          />
        </View>
      </View>

      <AuthInput
        label="Email Address"
        placeholder="you@gmail.com"
        value={form.email}
        onChangeText={set('email')}
        keyboardType="email-address"
        autoCapitalize="none"
        error={fieldErrors.email}
        hint="Gmail and Yahoo only"
        leftIcon={<Ionicons name="mail-outline" size={18} color={Colors.primary} />}
      />

      <AuthInput
        label="Phone Number"
        placeholder="08012345678"
        value={form.phone}
        onChangeText={set('phone')}
        keyboardType="phone-pad"
        maxLength={11}
        error={fieldErrors.phone}
        leftIcon={<Ionicons name="call-outline" size={18} color={Colors.primary} />}
      />

      <AuthInput
        label="Password"
        placeholder="Create a strong password"
        value={form.password}
        onChangeText={set('password')}
        secureTextEntry
        error={fieldErrors.password}
        leftIcon={<Ionicons name="lock-closed-outline" size={18} color={Colors.primary} />}
        containerStyle={{ marginBottom: form.password ? 6 : 16 }}
      />

      {form.password ? (
        <View style={styles.strengthRow}>
          <View style={styles.strengthBar}>
            <View style={[styles.strengthFill, { width: `${(pwStrength / 5) * 100}%` as `${number}%`, backgroundColor: strengthColor }]} />
          </View>
          <Text style={[styles.strengthLabel, { color: strengthColor }]}>{strengthLabel}</Text>
        </View>
      ) : null}

      {fieldErrors.password ? (
        <View style={styles.pwRules}>
          {PW_RULES.map((r, i) => (
            <View key={i} style={styles.pwRule}>
              <Ionicons
                name={r.test(form.password) ? 'checkmark-circle' : 'ellipse-outline'}
                size={13}
                color={r.test(form.password) ? Colors.success : Colors.muted}
              />
              <Text style={[styles.pwRuleText, r.test(form.password) && { color: Colors.successDark }]}>
                {r.label}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      <AuthInput
        label="Confirm Password"
        placeholder="Confirm your password"
        value={form.confirmPassword}
        onChangeText={set('confirmPassword')}
        secureTextEntry
        error={fieldErrors.confirmPassword}
        leftIcon={<Ionicons name="lock-closed-outline" size={18} color={Colors.primary} />}
      />

      <TouchableOpacity
        style={styles.referralToggle}
        onPress={() => setShowReferral((v) => !v)}
        activeOpacity={0.8}
      >
        <Ionicons name="gift-outline" size={16} color={Colors.primary} />
        <Text style={styles.referralToggleText}>
          {showReferral ? 'Hide referral code' : 'Have a referral code?'}
        </Text>
        <Ionicons name={showReferral ? 'chevron-up' : 'chevron-down'} size={14} color={Colors.muted} />
      </TouchableOpacity>

      {showReferral ? (
        <AuthInput
          placeholder="Enter referral code"
          value={form.referralCode}
          onChangeText={set('referralCode')}
          leftIcon={<Ionicons name="gift-outline" size={18} color={Colors.primary} />}
          containerStyle={{ marginTop: -4 }}
        />
      ) : null}

      <AuthGradientButton
        title="Create Account"
        loadingLabel="Creating account..."
        onPress={handleRegister}
        isLoading={isLoading}
        icon={<Ionicons name="person-add-outline" size={18} color={Colors.white} />}
        style={{ marginTop: 4 }}
      />

      <AuthDivider />

      <AuthFooterLink
        prefix="Already registered?"
        linkLabel="Sign in"
        onPress={() => router.push('/auth/login')}
      />
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  nameRow: { flexDirection: 'row' },
  strengthRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  strengthBar: { flex: 1, height: 4, backgroundColor: Colors.border, borderRadius: 2, overflow: 'hidden' },
  strengthFill: { height: '100%', borderRadius: 2 },
  strengthLabel: { ...Typography.captionMed },
  pwRules: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: 12,
    gap: 6,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pwRule: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pwRuleText: { ...Typography.caption, color: Colors.muted },
  referralToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    paddingVertical: 2,
  },
  referralToggleText: {
    ...Typography.bodyMed,
    color: Colors.primary,
    flex: 1,
    fontWeight: '600',
  },
});
