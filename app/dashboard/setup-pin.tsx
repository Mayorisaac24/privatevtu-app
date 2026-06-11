import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { useState } from 'react';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../src/lib/api';
import { Toast } from '../../src/components/ui/Toast';
import { useStatusBarStyle } from '../../src/hooks/useStatusBarStyle';
import { Colors, Spacing, Typography, Radius } from '../../src/theme';

export default function SetupPinScreen() {
  useStatusBarStyle('light');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [step, setStep] = useState<'set' | 'confirm'>('set');
  const [loading, setLoading] = useState(false);

  const current = step === 'set' ? pin : confirmPin;

  const handleInput = (val: string) => {
    const d = val.replace(/\D/g, '').slice(0, 4);
    if (step === 'set') {
      setPin(d);
      if (d.length === 4) setTimeout(() => setStep('confirm'), 300);
    } else {
      setConfirmPin(d);
      if (d.length === 4) handleSubmit(d);
    }
  };

  const handleSubmit = async (finalConfirm: string) => {
    if (pin !== finalConfirm) {
      Toast.show({ type: 'error', text1: "PINs Don't Match", text2: 'Please try again from the beginning' });
      setPin(''); setConfirmPin(''); setStep('set');
      return;
    }
    setLoading(true);
    try {
      const res = await api.setPin(pin, pin);
      if (res.success) {
        Toast.show({ type: 'success', text1: 'PIN Set! 🔐', text2: 'Your transaction PIN is ready' });
        setTimeout(() => router.replace('/(tabs)'), 700);
      } else {
        Toast.show({ type: 'error', text1: 'Failed to Set PIN', text2: res.message || 'Please try again' });
        setPin(''); setConfirmPin(''); setStep('set');
      }
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Failed to Set PIN', text2: err?.data?.message || err?.message || 'Please try again' });
      setPin(''); setConfirmPin(''); setStep('set');
    } finally { setLoading(false); }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.root}>
      <View style={styles.hero}>
        <View style={styles.iconCircle}>
          <Ionicons name="shield-checkmark-outline" size={32} color={Colors.white} />
        </View>
        {step === 'confirm' && (
          <TouchableOpacity style={styles.backBtn} onPress={() => { setStep('set'); setConfirmPin(''); }}>
            <Ionicons name="arrow-back" size={20} color={Colors.white} />
          </TouchableOpacity>
        )}
        <Text style={styles.heroTitle}>{step === 'set' ? 'Create PIN' : 'Confirm PIN'}</Text>
        <Text style={styles.heroSub}>
          {step === 'set' ? 'Set a 4-digit transaction PIN' : 'Re-enter your PIN to confirm'}
        </Text>
      </View>

      <View style={styles.card}>
        {/* Step dots */}
        <View style={styles.stepRow}>
          <View style={[styles.stepDot, styles.stepDotActive]} />
          <View style={[styles.stepLine, step === 'confirm' && styles.stepLineDone]} />
          <View style={[styles.stepDot, step === 'confirm' && styles.stepDotActive]} />
        </View>
        <Text style={styles.stepLabel}>Step {step === 'set' ? '1' : '2'} of 2</Text>

        {/* PIN dots */}
        <View style={styles.pinDots}>
          {[0, 1, 2, 3].map(i => (
            <View key={i} style={[styles.dot, i < current.length && styles.dotFilled]}>
              {i < current.length && <View style={styles.dotInner} />}
            </View>
          ))}
        </View>

        {loading && (
          <View style={styles.loadRow}>
            <ActivityIndicator color={Colors.primary} size="small" />
            <Text style={styles.loadText}>Setting up PIN...</Text>
          </View>
        )}

        <TextInput style={styles.hiddenInput} value={current} onChangeText={handleInput}
          keyboardType="number-pad" maxLength={4} autoFocus caretHidden />

        <Text style={styles.tapHint}>Tap anywhere to show keyboard</Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.primaryDeep },
  hero: { paddingTop: 80, paddingBottom: 36, alignItems: 'center' },
  backBtn: { position: 'absolute', top: 0, left: 20, padding: 8 },
  iconCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: Colors.success, justifyContent: 'center', alignItems: 'center', marginBottom: 16, shadowColor: Colors.success, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 16, elevation: 8 },
  heroTitle: { ...Typography.h2, color: Colors.white, marginBottom: 8 },
  heroSub: { ...Typography.small, color: 'rgba(255,255,255,0.7)', textAlign: 'center', paddingHorizontal: 40 },
  card: { flex: 1, backgroundColor: Colors.white, borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingTop: 44, paddingBottom: 48, alignItems: 'center' },
  stepRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  stepDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.border },
  stepDotActive: { backgroundColor: Colors.primary },
  stepLine: { width: 44, height: 2, backgroundColor: Colors.border, marginHorizontal: 8 },
  stepLineDone: { backgroundColor: Colors.primary },
  stepLabel: { ...Typography.caption, color: Colors.muted, marginBottom: 40 },
  pinDots: { flexDirection: 'row', gap: 20, marginBottom: 28 },
  dot: { width: 22, height: 22, borderRadius: 11, borderWidth: 2.5, borderColor: Colors.borderMid, justifyContent: 'center', alignItems: 'center' },
  dotFilled: { borderColor: Colors.primary, backgroundColor: Colors.primaryMuted },
  dotInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.primary },
  hiddenInput: { position: 'absolute', opacity: 0, width: 1, height: 1 },
  loadRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  loadText: { ...Typography.small, color: Colors.muted },
  tapHint: { ...Typography.caption, color: Colors.borderMid, marginTop: 24 },
});
