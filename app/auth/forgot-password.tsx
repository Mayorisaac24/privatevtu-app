import { useState } from 'react';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../src/lib/api';
import { showToast } from '../../src/components/ui/Toast';
import { Colors } from '../../src/theme';
import { AuthShell, AuthCardHeader, AuthHeroIcon } from '../../src/components/auth/AuthShell';
import { AuthInput } from '../../src/components/auth/AuthInput';
import {
  AuthGradientButton,
  AuthSegmentedControl,
  AuthTextLink,
} from '../../src/components/auth/AuthControls';

const METHODS = [
  { key: 'email' as const, label: 'Email', icon: 'mail-outline' as const },
  { key: 'phone' as const, label: 'Phone', icon: 'call-outline' as const },
];

export default function ForgotPasswordScreen() {
  const [method, setMethod] = useState<'email' | 'phone'>('email');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    const id = method === 'email' ? email.trim() : phone.trim();
    if (!id) {
      setFieldError(`Enter your ${method === 'email' ? 'email address' : 'phone number'}`);
      return;
    }
    setFieldError('');
    setIsLoading(true);
    try {
      const res = await api.forgotPassword(id);
      if (res.success) {
        const dest = res.data?.email || (method === 'email' ? id : '');
        showToast({ type: 'success', text1: 'Reset Code Sent', text2: `Check ${dest} for your reset code` });
        setTimeout(() => router.push({ pathname: '/auth/verify-otp', params: { email: dest, type: 'password_reset' } }), 600);
      } else {
        showToast({ type: 'error', text1: 'Request Failed', text2: res.message || 'Please try again' });
      }
    } catch (err: any) {
      showToast({ type: 'error', text1: 'Request Failed', text2: err?.data?.message || err?.message || 'Please try again' });
    } finally { setIsLoading(false); }
  };

  return (
    <AuthShell
      scrollable
      heroTitle="Forgot password?"
      onBack={() => router.back()}
      showLogo={false}
      heroIcon={<AuthHeroIcon icon="lock-open-outline" size={48} />}
    >
      <AuthCardHeader
        title="Reset access"
        subtitle="Choose how you'd like to receive your reset code"
      />

      <AuthSegmentedControl
        label="Reset via"
        value={method}
        options={METHODS}
        onChange={(next) => {
          setMethod(next);
          setFieldError('');
        }}
      />

      {method === 'email' ? (
        <AuthInput label="Email Address" placeholder="you@example.com" value={email}
          onChangeText={(v) => { setEmail(v); setFieldError(''); }} keyboardType="email-address" autoCapitalize="none"
          error={fieldError} leftIcon={<Ionicons name="mail-outline" size={19} color={Colors.muted} />} />
      ) : (
        <AuthInput label="Phone Number" placeholder="08012345678" value={phone}
          onChangeText={(v) => { setPhone(v); setFieldError(''); }} keyboardType="phone-pad" maxLength={11}
          error={fieldError}
          hint="We'll find your email and send a reset code"
          leftIcon={<Ionicons name="call-outline" size={19} color={Colors.muted} />} />
      )}

      <AuthGradientButton
        title="Send Reset Code"
        onPress={handleSubmit}
        isLoading={isLoading}
        icon={<Ionicons name="paper-plane-outline" size={18} color={Colors.white} />}
        style={{ marginTop: 4 }}
      />

      <AuthTextLink label="Back to sign in" onPress={() => router.back()} style={{ marginTop: 20 }} />
    </AuthShell>
  );
}
