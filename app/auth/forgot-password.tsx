import { View, Text, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useState } from 'react';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../src/lib/api';
import { Input } from '../../src/components/ui/Input';
import { Button } from '../../src/components/ui/Button';
import { Toast } from '../../src/components/ui/Toast';
import { Colors, Spacing, Typography, Shadow } from '../../src/theme';

export default function ForgotPasswordScreen() {
  const [method, setMethod] = useState<'email' | 'phone'>('email');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    const id = method === 'email' ? email.trim() : phone.trim();
    if (!id) { setFieldError(`Enter your ${method === 'email' ? 'email address' : 'phone number'}`); return; }
    setFieldError('');
    setIsLoading(true);
    try {
      const res = await api.forgotPassword(id);
      if (res.success) {
        const dest = res.data?.email || (method === 'email' ? id : '');
        Toast.show({ type: 'success', text1: 'Reset Code Sent! 📧', text2: `Check ${dest} for your reset code` });
        setTimeout(() => router.push({ pathname: '/auth/verify-otp', params: { email: dest, type: 'password_reset' } }), 600);
      } else {
        Toast.show({ type: 'error', text1: 'Request Failed', text2: res.message || 'Please try again' });
      }
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Request Failed', text2: err?.data?.message || err?.message || 'Please try again' });
    } finally { setIsLoading(false); }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color={Colors.white} />
          </TouchableOpacity>
          <View style={styles.iconCircle}>
            <Ionicons name="lock-open-outline" size={30} color={Colors.white} />
          </View>
          <Text style={styles.heroTitle}>Forgot Password?</Text>
          <Text style={styles.heroSub}>We'll send a reset code to your email</Text>
        </View>
        <View style={styles.card}>
          <View style={styles.toggle}>
            {(['email', 'phone'] as const).map(m => (
              <TouchableOpacity key={m} style={[styles.tBtn, method === m && styles.tBtnActive]}
                onPress={() => { setMethod(m); setFieldError(''); }}>
                <Ionicons name={m === 'email' ? 'mail-outline' : 'call-outline'} size={14} color={method === m ? Colors.primary : Colors.muted} />
                <Text style={[styles.tText, method === m && styles.tTextActive]}>{m === 'email' ? 'Email' : 'Phone'}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {method === 'email' ? (
            <Input label="Email Address" placeholder="you@example.com" value={email}
              onChangeText={v => { setEmail(v); setFieldError(''); }} keyboardType="email-address" autoCapitalize="none"
              error={fieldError} leftIcon={<Ionicons name="mail-outline" size={16} color={Colors.muted} />} />
          ) : (
            <Input label="Phone Number" placeholder="08012345678" value={phone}
              onChangeText={v => { setPhone(v); setFieldError(''); }} keyboardType="phone-pad" maxLength={11}
              error={fieldError}
              hint="We'll find your email and send a reset code"
              leftIcon={<Ionicons name="call-outline" size={16} color={Colors.muted} />} />
          )}
          <Button title="Send Reset Code" onPress={handleSubmit} isLoading={isLoading} style={{ paddingVertical: 16 }} />
          <TouchableOpacity style={styles.backLink} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={14} color={Colors.muted} />
            <Text style={styles.backLinkText}>Back to login</Text>
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
  iconCircle: { width: 68, height: 68, borderRadius: 34, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', marginBottom: 14 },
  heroTitle: { ...Typography.h2, color: Colors.white, marginBottom: 8 },
  heroSub: { ...Typography.small, color: 'rgba(255,255,255,0.7)' },
  card: { flex: 1, backgroundColor: Colors.white, borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingHorizontal: Spacing.page, paddingTop: 32, paddingBottom: 48 },
  toggle: { flexDirection: 'row', backgroundColor: Colors.surface, borderRadius: 12, padding: 4, marginBottom: 20, borderWidth: 1, borderColor: Colors.border },
  tBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 8 },
  tBtnActive: { backgroundColor: Colors.white, ...Shadow.sm },
  tText: { ...Typography.smallMed, color: Colors.muted },
  tTextActive: { color: Colors.primary, fontWeight: '700' },
  backLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, marginTop: 20 },
  backLinkText: { ...Typography.small, color: Colors.muted },
});
