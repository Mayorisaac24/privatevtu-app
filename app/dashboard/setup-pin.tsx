import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView,
} from 'react-native';
import { useState, useRef } from 'react';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../src/lib/api';
import { showToast } from '../../src/components/ui/Toast';
import { useAuthStore } from '../../src/stores';
import { useStatusBarStyle } from '../../src/hooks/useStatusBarStyle';
import { useKeyboardInsets } from '../../src/hooks/useKeyboardInsets';
import {Colors, Typography , Overlays, useThemedStyles } from '../../src/theme';
import { GlassSurface } from '../../src/components/ui/GlassSurface';
import { KeyboardDismissView } from '../../src/components/ui/KeyboardDismissView';
import { hiddenNumericInputStyle } from '../../src/lib/platform-ui';

export default function SetupPinScreen() {
  const styles = useStyles();

  useStatusBarStyle('light');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [step, setStep] = useState<'set' | 'confirm'>('set');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const { keyboardVisible, keyboardHeight } = useKeyboardInsets();

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
      showToast({ type: 'error', text1: "PINs Don't Match", text2: 'Please try again from the beginning' });
      setPin(''); setConfirmPin(''); setStep('set');
      return;
    }
    setLoading(true);
    try {
      const res = await api.setPin(pin, pin);
      if (res.success) {
        useAuthStore.getState().updateUser({ hasPin: true });
        showToast({ type: 'success', text1: 'PIN Set! 🔐', text2: 'Your transaction PIN is ready' });
        setTimeout(() => router.replace('/(tabs)'), 700);
      } else {
        showToast({ type: 'error', text1: 'Failed to Set PIN', text2: res.message || 'Please try again' });
        setPin(''); setConfirmPin(''); setStep('set');
      }
    } catch (err: any) {
      showToast({ type: 'error', text1: 'Failed to Set PIN', text2: err?.data?.message || err?.message || 'Please try again' });
      setPin(''); setConfirmPin(''); setStep('set');
    } finally { setLoading(false); }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.root}>
      <KeyboardDismissView style={styles.flex}>
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            keyboardVisible ? { paddingBottom: keyboardHeight + 24 } : null,
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          showsVerticalScrollIndicator={false}
        >
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

          <GlassSurface variant="light" borderRadius={32} style={styles.card} contentStyle={styles.cardContent}>
            <View style={styles.stepRow}>
              <View style={[styles.stepDot, styles.stepDotActive]} />
              <View style={[styles.stepLine, step === 'confirm' && styles.stepLineDone]} />
              <View style={[styles.stepDot, step === 'confirm' && styles.stepDotActive]} />
            </View>
            <Text style={styles.stepLabel}>Step {step === 'set' ? '1' : '2'} of 2</Text>

            <TouchableOpacity activeOpacity={1} onPress={() => inputRef.current?.focus()} style={styles.pinTapArea}>
              <View style={styles.pinDots}>
                {[0, 1, 2, 3].map((i) => (
                  <View key={i} style={[styles.dot, i < current.length && styles.dotFilled]}>
                    {i < current.length ? <View style={styles.dotInner} /> : null}
                  </View>
                ))}
              </View>
            </TouchableOpacity>

            {loading ? (
              <View style={styles.loadRow}>
                <ActivityIndicator color={Colors.primary} size="small" />
                <Text style={styles.loadText}>Setting up PIN...</Text>
              </View>
            ) : null}

            <TextInput
              ref={inputRef}
              style={styles.hiddenInput}
              value={current}
              onChangeText={handleInput}
              keyboardType="number-pad"
              maxLength={4}
              autoFocus
              caretHidden
              pointerEvents="none"
            />

            <Text style={styles.tapHint}>Tap outside the keyboard to hide it</Text>
          </GlassSurface>
        </ScrollView>
      </KeyboardDismissView>
    </KeyboardAvoidingView>
  );
}

const createStyles = (colors: import('../../src/theme/types').ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.primaryDeep },
  flex: { flex: 1 },
  scroll: { flexGrow: 1 },
  hero: { paddingTop: 80, paddingBottom: 36, alignItems: 'center' },
  backBtn: { position: 'absolute', top: 0, left: 20, padding: 8 },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.success,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: colors.success,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  heroTitle: { ...Typography.h2, color: colors.white, marginBottom: 8 },
  heroSub: { ...Typography.small, color: Overlays.rgba255_255_255_07, textAlign: 'center', paddingHorizontal: 40 },
  card: { flex: 1, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 },
  cardContent: { paddingTop: 44, paddingBottom: 48, alignItems: 'center' },
  stepRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  stepDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.border },
  stepDotActive: { backgroundColor: colors.primary },
  stepLine: { width: 44, height: 2, backgroundColor: colors.border, marginHorizontal: 8 },
  stepLineDone: { backgroundColor: colors.primary },
  stepLabel: { ...Typography.caption, color: colors.muted, marginBottom: 40 },
  pinTapArea: { alignItems: 'center' },
  pinDots: { flexDirection: 'row', gap: 20, marginBottom: 28 },
  dot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2.5,
    borderColor: colors.borderMid,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dotFilled: { borderColor: colors.primary, backgroundColor: colors.primaryMuted },
  dotInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
  hiddenInput: hiddenNumericInputStyle,
  loadRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  loadText: { ...Typography.small, color: colors.muted },
  tapHint: { ...Typography.caption, color: colors.borderMid, marginTop: 24 },
});

function useStyles() {
  return useThemedStyles(createStyles);
}
