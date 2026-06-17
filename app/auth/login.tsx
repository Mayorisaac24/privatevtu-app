import { ActivityIndicator, View, TouchableOpacity, StyleSheet } from 'react-native';
import { useState, useEffect } from 'react';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../src/lib/api';
import { useAuthStore } from '../../src/stores';
import { showToast } from '../../src/components/ui/Toast';
import { Colors, Radius } from '../../src/theme';
import { isAndroid, AUTH_BUTTON_HEIGHT } from '../../src/lib/platform-ui';
import { registerPushNotifications } from '../../src/lib/push-notifications';
import { getLoginDeviceId } from '../../src/lib/login-context';
import {
  biometricQuickSignIn,
  getBiometricCapability,
  getQuickSignInEmail,
  hasBiometricSignInEnabled,
} from '../../src/lib/biometric-auth';
import { canUseBiometricAuth, getSecurityPrefs } from '../../src/lib/security-storage';
import { AuthShell, AuthCardHeader, AuthSecurityFooter } from '../../src/components/auth/AuthShell';
import { AuthInput } from '../../src/components/auth/AuthInput';
import {
  AuthDivider,
  AuthFooterLink,
  AuthGradientButton,
  AuthSegmentedControl,
  AuthTextLink,
} from '../../src/components/auth/AuthControls';

const LOGIN_METHODS = [
  { key: 'email' as const, label: 'Email', icon: 'mail-outline' as const },
  { key: 'phone' as const, label: 'Phone', icon: 'call-outline' as const },
];

export default function LoginScreen() {
  const [method, setMethod] = useState<'email' | 'phone'>('email');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ identifier?: string; password?: string }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [bioLoading, setBioLoading] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [quickSignInEmail, setQuickSignInEmail] = useState<string | null>(null);
  const { setUser } = useAuthStore();

  useEffect(() => {
    void (async () => {
      const capability = await getBiometricCapability();
      setBiometricAvailable(capability.available);

      const prefs = await getSecurityPrefs();
      const biometricReady =
        canUseBiometricAuth(prefs) && (await hasBiometricSignInEnabled());

      if (biometricReady) {
        const savedEmail = await getQuickSignInEmail();
        if (savedEmail) {
          setQuickSignInEmail(savedEmail);
          setEmail(savedEmail);
          setMethod('email');
        }
      }
    })();
  }, []);

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

  const finishSignIn = (signedInUser: { firstName?: string; hasPin?: boolean }) => {
    void registerPushNotifications().catch(() => {});
    showToast({
      type: 'success',
      text1: 'Welcome back',
      text2: `Hello, ${signedInUser.firstName || 'there'}`,
    });
    router.replace(signedInUser.hasPin === false ? '/dashboard/setup-pin' : '/(tabs)');
  };

  const handleLogin = async () => {
    if (!validate()) return;
    setIsLoading(true);
    try {
      const deviceId = await getLoginDeviceId();
      const res = await api.login({
        email: method === 'email' ? email.trim() : undefined,
        phone: method === 'phone' ? phone.trim() : undefined,
        password,
        deviceId,
      });
      if (res.success && res.data) {
        if (res.data.requiresTwoFactor && res.data.userId) {
          const twoFactorMethod = res.data.twoFactorMethod || 'AUTHENTICATOR';
          const hint = twoFactorMethod === 'AUTHENTICATOR'
            ? 'Enter your authenticator code'
            : `Enter the code sent to ${res.data.destination || 'your contact'}`;
          showToast({ type: 'info', text1: '2FA Required', text2: hint });
          router.push({
            pathname: '/auth/verify-2fa',
            params: {
              userId: res.data.userId,
              method: twoFactorMethod,
              destination: res.data.destination || '',
            },
          });
          return;
        }
        if (res.data.user) {
          setUser(res.data.user);
          finishSignIn(res.data.user);
        }
      } else {
        showToast({ type: 'error', text1: 'Login Failed', text2: res.message || 'Invalid credentials. Please try again.' });
      }
    } catch (err: any) {
      const msg = err?.data?.message || err?.message || 'Something went wrong. Try again.';
      showToast({ type: 'error', text1: 'Login Failed', text2: msg });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBiometricSignIn = async () => {
    setBioLoading(true);
    try {
      const result = await biometricQuickSignIn();
      if (!result.ok) {
        if (result.message !== 'Biometric sign-in cancelled') {
          showToast({ type: 'error', text1: 'Sign-in failed', text2: result.message });
        }
        return;
      }

      finishSignIn(result.user);
    } catch (err: any) {
      const msg = err?.data?.message || err?.message || 'Biometric sign-in failed. Try your password.';
      showToast({ type: 'error', text1: 'Sign-in failed', text2: msg });
    } finally {
      setBioLoading(false);
    }
  };

  const showBiometricSignIn = biometricAvailable && !!quickSignInEmail;

  return (
    <AuthShell scrollable cardFooter={<AuthSecurityFooter />}>
      <AuthCardHeader
        eyebrow="Welcome back"
        title="Sign in"
        subtitle={
          showBiometricSignIn
            ? 'Sign in with your password or biometrics'
            : 'Use your email or phone number to access your account'
        }
      />

      <AuthSegmentedControl
        label="Continue with"
        value={method}
        options={LOGIN_METHODS}
        onChange={(next) => {
          setMethod(next);
          setFieldErrors({});
        }}
      />

      {method === 'email' ? (
        <AuthInput
          key="login-email"
          label="Email Address"
          placeholder="you@example.com"
          value={email}
          onChangeText={(v) => { setEmail(v); setFieldErrors((e) => ({ ...e, identifier: undefined })); }}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          error={fieldErrors.identifier}
          leftIcon={<Ionicons name="mail-outline" size={18} color={Colors.primary} />}
        />
      ) : (
        <AuthInput
          key="login-phone"
          label="Phone Number"
          placeholder="08012345678"
          value={phone}
          onChangeText={(v) => { setPhone(v); setFieldErrors((e) => ({ ...e, identifier: undefined })); }}
          keyboardType="phone-pad"
          maxLength={11}
          error={fieldErrors.identifier}
          leftIcon={<Ionicons name="call-outline" size={18} color={Colors.primary} />}
        />
      )}

      <AuthInput
        label="Password"
        placeholder="Enter your password"
        value={password}
        onChangeText={(v) => { setPassword(v); setFieldErrors((e) => ({ ...e, password: undefined })); }}
        secureTextEntry
        error={fieldErrors.password}
        leftIcon={<Ionicons name="lock-closed-outline" size={18} color={Colors.primary} />}
        containerStyle={{ marginBottom: 10 }}
      />

      <AuthTextLink
        label="Forgot password?"
        align="right"
        onPress={() => router.push('/auth/forgot-password')}
      />

      {showBiometricSignIn ? (
        <View style={styles.actionRow}>
          <AuthGradientButton
            title="Sign In"
            loadingLabel="Signing in..."
            onPress={handleLogin}
            isLoading={isLoading}
            disabled={bioLoading || isLoading}
            icon={<Ionicons name="log-in-outline" size={18} color={Colors.white} />}
            style={styles.actionPrimary}
          />
          <TouchableOpacity
            style={[
              styles.bioIconBtn,
              (bioLoading || isLoading) && styles.bioIconBtnDisabled,
            ]}
            onPress={() => void handleBiometricSignIn()}
            disabled={bioLoading || isLoading}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Continue with biometric"
            accessibilityHint="Sign in using Face ID or fingerprint"
          >
            {bioLoading ? (
              <ActivityIndicator color={Colors.primary} size="small" />
            ) : (
              <Ionicons name="finger-print-outline" size={24} color={Colors.primary} />
            )}
          </TouchableOpacity>
        </View>
      ) : (
        <AuthGradientButton
          title="Sign In"
          loadingLabel="Signing in..."
          onPress={handleLogin}
          isLoading={isLoading}
          icon={<Ionicons name="log-in-outline" size={18} color={Colors.white} />}
          style={{ marginTop: isAndroid ? 16 : 20 }}
        />
      )}

      <AuthDivider />

      <AuthFooterLink
        prefix="New to Datamart?"
        linkLabel="Create account"
        onPress={() => router.push('/auth')}
      />
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: isAndroid ? 16 : 20,
  },
  actionPrimary: {
    flex: 1,
  },
  bioIconBtn: {
    width: AUTH_BUTTON_HEIGHT,
    height: AUTH_BUTTON_HEIGHT,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: 'rgba(124, 58, 237, 0.3)',
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bioIconBtnDisabled: {
    opacity: 0.55,
  },
});
