import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../src/lib/api';
import { showToast } from '../../src/components/ui/Toast';
import { Colors } from '../../src/theme';
import { AuthShell, AuthCardHeader, AuthHeroIcon } from '../../src/components/auth/AuthShell';
import { AuthInput } from '../../src/components/auth/AuthInput';
import { AuthGradientButton } from '../../src/components/auth/AuthControls';

export default function ResetPasswordScreen() {
  const { email, otp } = useLocalSearchParams<{ email: string; otp: string }>();
  const [pw, setPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ pw?: string; confirm?: string }>({});
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    const errs: typeof fieldErrors = {};
    if (!pw || pw.length < 8) errs.pw = 'Password must be at least 8 characters';
    if (pw !== confirm) errs.confirm = 'Passwords do not match';
    setFieldErrors(errs);
    if (Object.keys(errs).length) return;
    setLoading(true);
    try {
      const res = await api.resetPassword(otp!, pw, undefined, email);
      if (res.success) {
        showToast({ type: 'success', text1: 'Password Reset', text2: 'You can now sign in with your new password' });
        setTimeout(() => router.replace('/auth/login'), 700);
      } else {
        showToast({ type: 'error', text1: 'Reset Failed', text2: res.message || 'Please try again' });
      }
    } catch (err: any) {
      showToast({ type: 'error', text1: 'Reset Failed', text2: err?.data?.message || err?.message || 'Please try again' });
    } finally { setLoading(false); }
  };

  return (
    <AuthShell
      heroTitle="New password"
      showLogo={false}
      heroIcon={<AuthHeroIcon icon="key-outline" size={48} />}
    >
      <AuthCardHeader
        title="Set new password"
        subtitle="Choose a strong password you haven't used before"
      />

      <AuthInput label="New Password" placeholder="Create a strong password" value={pw}
        onChangeText={(v) => { setPw(v); setFieldErrors((e) => ({ ...e, pw: undefined })); }} secureTextEntry
        error={fieldErrors.pw} leftIcon={<Ionicons name="lock-closed-outline" size={19} color={Colors.muted} />} />
      <AuthInput label="Confirm Password" placeholder="Confirm new password" value={confirm}
        onChangeText={(v) => { setConfirm(v); setFieldErrors((e) => ({ ...e, confirm: undefined })); }} secureTextEntry
        error={fieldErrors.confirm} leftIcon={<Ionicons name="lock-closed-outline" size={19} color={Colors.muted} />} />

      <AuthGradientButton
        title="Reset Password"
        onPress={handleReset}
        isLoading={loading}
        icon={<Ionicons name="checkmark-circle-outline" size={18} color={Colors.white} />}
        style={{ marginTop: 8 }}
      />
    </AuthShell>
  );
}
