import { View, Text, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../src/lib/api';
import { Input } from '../../src/components/ui/Input';
import { Button } from '../../src/components/ui/Button';
import { Toast } from '../../src/components/ui/Toast';
import { Colors, Spacing, Typography } from '../../src/theme';

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
        Toast.show({ type: 'success', text1: 'Password Reset! ✓', text2: 'You can now sign in with your new password' });
        setTimeout(() => router.replace('/auth/login'), 700);
      } else {
        Toast.show({ type: 'error', text1: 'Reset Failed', text2: res.message || 'Please try again' });
      }
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Reset Failed', text2: err?.data?.message || err?.message || 'Please try again' });
    } finally { setLoading(false); }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={styles.iconCircle}><Ionicons name="key-outline" size={30} color={Colors.white} /></View>
          <Text style={styles.heroTitle}>New Password</Text>
          <Text style={styles.heroSub}>Create a strong password for your account</Text>
        </View>
        <View style={styles.card}>
          <Input label="New Password" placeholder="Create a strong password" value={pw}
            onChangeText={v => { setPw(v); setFieldErrors(e => ({ ...e, pw: undefined })); }} secureTextEntry
            error={fieldErrors.pw} leftIcon={<Ionicons name="lock-closed-outline" size={16} color={Colors.muted} />} />
          <Input label="Confirm Password" placeholder="Confirm new password" value={confirm}
            onChangeText={v => { setConfirm(v); setFieldErrors(e => ({ ...e, confirm: undefined })); }} secureTextEntry
            error={fieldErrors.confirm} leftIcon={<Ionicons name="lock-closed-outline" size={16} color={Colors.muted} />} />
          <Button title="Reset Password" onPress={handleReset} isLoading={loading} style={{ paddingVertical: 16 }} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.primaryDeep },
  scroll: { flexGrow: 1 },
  hero: { paddingTop: 80, paddingBottom: 36, alignItems: 'center' },
  iconCircle: { width: 68, height: 68, borderRadius: 34, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', marginBottom: 14 },
  heroTitle: { ...Typography.h2, color: Colors.white, marginBottom: 8 },
  heroSub: { ...Typography.small, color: 'rgba(255,255,255,0.7)', textAlign: 'center', paddingHorizontal: 40 },
  card: { flex: 1, backgroundColor: Colors.white, borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingHorizontal: Spacing.page, paddingTop: 32, paddingBottom: 48 },
});
