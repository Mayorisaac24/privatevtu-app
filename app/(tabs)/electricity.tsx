import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Keyboard,
} from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { api, formatCurrency, isResponseSuccess, parseWalletBalanceKobo, type ElectricityProvider } from '../../src/lib/api';
import { useWalletStore } from '../../src/stores';
import { Colors, Spacing, Typography, Radius, Shadow } from '../../src/theme';
import { Toast } from '../../src/components/ui/Toast';
import { ServiceScreenHeader } from '../../src/components/ServiceScreenHeader';
import { useHardwareBack } from '../../src/hooks/useHardwareBack';
import { navigateBack } from '../../src/lib/navigation';

const QUICK_AMOUNTS = [1000, 2000, 5000, 10000, 20000];

export default function ElectricityScreen() {
  const { balance, setBalance } = useWalletStore();
  const [discos, setDiscos] = useState<ElectricityProvider[]>([]);
  const [selectedDisco, setSelectedDisco] = useState('');
  const [meterNumber, setMeterNumber] = useState('');
  const [meterType, setMeterType] = useState<'prepaid' | 'postpaid'>('prepaid');
  const [amount, setAmount] = useState('');
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [step, setStep] = useState<'details' | 'amount' | 'confirm'>('details');
  const [loading, setLoading] = useState(false);
  const [loadingDiscos, setLoadingDiscos] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [verification, setVerification] = useState<{ customerName?: string; address?: string } | null>(null);

  useEffect(() => { loadDiscos(); }, []);

  const loadDiscos = async () => {
    try { const res = await api.getElectricityProviders(); if (res.success) setDiscos(res.data ?? []); }
    finally { setLoadingDiscos(false); }
  };

  const handleVerify = async () => {
    if (!selectedDisco) { Toast.show({ type: 'error', text1: 'Select DISCO', text2: 'Please select a DISCO provider' }); return; }
    if (!meterNumber) { Toast.show({ type: 'error', text1: 'Enter Meter Number', text2: 'Please enter your meter number' }); return; }
    Keyboard.dismiss(); setVerifying(true);
    try {
      const res = await api.verifyElectricityMeter({ disco: selectedDisco, meterNumber, meterType });
      if (res.success && res.data) {
        setVerification(res.data); setStep('amount');
        Toast.show({ type: 'success', text1: 'Meter Verified ✓', text2: res.data.customerName || 'Customer verified' });
      } else {
        Toast.show({ type: 'error', text1: 'Verification Failed', text2: res.message || 'Check meter number and try again' });
      }
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Verification Failed', text2: err?.data?.message || err?.message || 'Could not verify meter' });
    } finally { setVerifying(false); }
  };

  const handlePay = async () => {
    if (!pin || pin.length !== 4) { Toast.show({ type: 'error', text1: 'Enter PIN', text2: 'Enter your 4-digit transaction PIN' }); return; }
    setLoading(true);
    try {
      const res = await api.purchaseElectricity({ disco: selectedDisco, meterNumber, meterType, amount: parseFloat(amount), pin, phone: phone || undefined });
      if (res.success) {
        const balRes = await api.getWalletBalance();
        if (isResponseSuccess(balRes)) setBalance(parseWalletBalanceKobo(balRes.data));
        const token = res.data?.token || res.data?.purchasedToken;
        Toast.show({ type: 'success', text1: 'Payment Successful! ⚡', text2: token ? `Token: ${token}` : `₦${parseFloat(amount).toLocaleString()} electricity purchased` });
        setTimeout(() => { setMeterNumber(''); setAmount(''); setPin(''); setPhone(''); setVerification(null); setSelectedDisco(''); setStep('details'); }, 2000);
      } else {
        Toast.show({ type: 'error', text1: 'Payment Failed', text2: res.message || 'Please try again' });
      }
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Payment Failed', text2: err?.data?.message || err?.message || 'Please try again' });
    } finally { setLoading(false); }
  };

  const stepIndex = step === 'details' ? 0 : step === 'amount' ? 1 : 2;
  const STEPS = ['Meter', 'Amount', 'Confirm'];
  const selectedDiscoName = discos.find(d => d.code === selectedDisco)?.name || selectedDisco;

  const handleBack = useCallback(() => {
    if (step === 'confirm') {
      setStep('amount');
      setPin('');
      return;
    }
    if (step === 'amount') {
      setStep('details');
      setVerification(null);
      setAmount('');
      return;
    }
    navigateBack();
  }, [step]);

  useHardwareBack(handleBack);

  return (
    <View style={styles.root}>
      <ServiceScreenHeader
        title="Pay Electricity"
        subtitle="Power your home instantly"
        icon="flash-outline"
        iconColor={Colors.electricity}
        iconBg={Colors.electricityBg}
        balanceLabel={formatCurrency(balance)}
        onBack={handleBack}
      />

      {/* Step bar */}
      <View style={styles.stepBar}>
        {STEPS.map((s, i) => {
          const active = i === stepIndex, done = i < stepIndex;
          return (
            <View key={s} style={styles.stepItem}>
              <View style={[styles.stepDot, active && styles.stepActive, done && styles.stepDone]}>
                {done ? <Ionicons name="checkmark" size={10} color={Colors.white} /> : <Text style={[styles.stepNum, active && { color: Colors.white }]}>{i + 1}</Text>}
              </View>
              <Text style={[styles.stepLabel, active && styles.stepLabelActive]}>{s}</Text>
              {i < STEPS.length - 1 && <View style={[styles.stepLine, done && styles.stepLineDone]} />}
            </View>
          );
        })}
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        {step === 'details' && (
          <>
            {/* DISCO grid */}
            <View style={styles.card}>
              <Text style={styles.fieldLabel}>Select DISCO</Text>
              {loadingDiscos ? (
                <View style={styles.loadRow}><ActivityIndicator size="small" color={Colors.primary} /><Text style={styles.loadText}>Loading...</Text></View>
              ) : (
                <View style={styles.discoGrid}>
                  {discos.map(d => {
                    const sel = selectedDisco === d.code;
                    return (
                      <TouchableOpacity key={d.id}
                        style={[styles.discoBtn, sel && styles.discoBtnActive]}
                        onPress={() => setSelectedDisco(d.code)} activeOpacity={0.75}>
                        <Ionicons name="flash" size={14} color={sel ? Colors.white : Colors.electricity} />
                        <Text style={[styles.discoLabel, sel && { color: Colors.white }]} numberOfLines={2}>{d.name}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>

            {/* Meter type */}
            <View style={styles.card}>
              <Text style={styles.fieldLabel}>Meter Type</Text>
              <View style={styles.typeRow}>
                {(['prepaid', 'postpaid'] as const).map(t => (
                  <TouchableOpacity key={t} style={[styles.typeBtn, meterType === t && styles.typeBtnActive]} onPress={() => setMeterType(t)}>
                    <Ionicons name={t === 'prepaid' ? 'battery-charging-outline' : 'receipt-outline'} size={17} color={meterType === t ? Colors.white : Colors.muted} />
                    <Text style={[styles.typeLabel, meterType === t && styles.typeLabelActive]}>{t.charAt(0).toUpperCase() + t.slice(1)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Meter number */}
            <View style={styles.card}>
              <Text style={styles.fieldLabel}>Meter Number</Text>
              <View style={styles.inputWrap}>
                <Ionicons name="barcode-outline" size={18} color={Colors.muted} style={{ marginHorizontal: 12 }} />
                <TextInput style={styles.input} placeholder="Enter meter number"
                  placeholderTextColor={Colors.mutedLight} value={meterNumber}
                  onChangeText={setMeterNumber} keyboardType="number-pad" />
              </View>
            </View>

            <TouchableOpacity
              style={[styles.cta, (verifying || !selectedDisco || !meterNumber) && styles.ctaDisabled]}
              onPress={handleVerify} disabled={verifying || !selectedDisco || !meterNumber} activeOpacity={0.85}>
              {verifying ? (
                <><ActivityIndicator color={Colors.white} size="small" /><Text style={styles.ctaText}> Verifying...</Text></>
              ) : (
                <><Text style={styles.ctaText}>Verify Meter</Text><Ionicons name="arrow-forward" size={18} color={Colors.white} /></>
              )}
            </TouchableOpacity>
          </>
        )}

        {step === 'amount' && (
          <>
            {/* Verified banner */}
            <View style={styles.verifiedBanner}>
              <View style={styles.verifiedIcon}><Ionicons name="checkmark-circle" size={22} color={Colors.success} /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.verifiedName}>{verification?.customerName || 'Customer Verified'}</Text>
                {verification?.address ? <Text style={styles.verifiedAddr} numberOfLines={1}>{verification.address}</Text> : null}
                <Text style={styles.verifiedMeter}>{meterNumber} · {meterType}</Text>
              </View>
              <TouchableOpacity onPress={() => setStep('details')} style={styles.changeBtn}>
                <Text style={styles.changeText}>Change</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.card}>
              <Text style={styles.fieldLabel}>Amount</Text>
              <View style={styles.amountWrap}>
                <Text style={styles.nairaSign}>₦</Text>
                <TextInput style={styles.amountInput} placeholder="0.00"
                  placeholderTextColor={Colors.borderMid} value={amount}
                  onChangeText={setAmount} keyboardType="number-pad" autoFocus />
              </View>
              <View style={styles.quickRow}>
                {QUICK_AMOUNTS.map(a => (
                  <TouchableOpacity key={a} style={[styles.quickBtn, amount === String(a) && styles.quickBtnActive]} onPress={() => setAmount(String(a))}>
                    <Text style={[styles.quickText, amount === String(a) && styles.quickTextActive]}>₦{a >= 1000 ? (a/1000)+'k' : a}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.fieldLabel}>Phone (Optional — token delivery)</Text>
              <View style={styles.inputWrap}>
                <Ionicons name="phone-portrait-outline" size={16} color={Colors.muted} style={{ marginHorizontal: 12 }} />
                <TextInput style={styles.input} placeholder="08012345678 (optional)"
                  placeholderTextColor={Colors.mutedLight} value={phone}
                  onChangeText={setPhone} keyboardType="phone-pad" maxLength={11} />
              </View>
            </View>

            <TouchableOpacity
              style={[styles.cta, (!amount || parseFloat(amount) < 100) && styles.ctaDisabled]}
              onPress={() => { if (!amount || parseFloat(amount) < 100) { Toast.show({ type: 'error', text1: 'Invalid Amount', text2: 'Minimum amount is ₦100' }); return; } Keyboard.dismiss(); setStep('confirm'); }}
              disabled={!amount || parseFloat(amount) < 100} activeOpacity={0.85}>
              <Text style={styles.ctaText}>Continue</Text>
              <Ionicons name="arrow-forward" size={18} color={Colors.white} />
            </TouchableOpacity>
          </>
        )}

        {step === 'confirm' && (
          <>
            <View style={[styles.card, { overflow: 'hidden' }]}>
              <View style={styles.summaryHeader}>
                <View style={[styles.summaryIcon, { backgroundColor: Colors.electricityBg }]}>
                  <Ionicons name="flash-outline" size={24} color={Colors.electricity} />
                </View>
                <View>
                  <Text style={styles.summaryTitle}>Electricity Payment</Text>
                  <Text style={styles.summaryNet}>{selectedDiscoName}</Text>
                </View>
              </View>
              <View style={styles.summaryRows}>
                {[
                  ['DISCO', selectedDiscoName],
                  ['Meter Type', meterType.charAt(0).toUpperCase() + meterType.slice(1)],
                  ['Meter Number', meterNumber],
                  ['Customer', verification?.customerName || '—'],
                  ...(phone ? [['Phone', phone]] : []),
                  ['Amount', `₦${parseFloat(amount).toLocaleString()}`],
                ].map(([k, v], i, arr) => (
                  <View key={k} style={[styles.summaryRow, i < arr.length - 1 && styles.summaryRowBorder]}>
                    <Text style={styles.summaryKey}>{k}</Text>
                    <Text style={[styles.summaryVal, k === 'Amount' && { color: Colors.primary, fontWeight: '800', fontSize: 16 }]}>{v}</Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.fieldLabel}>Transaction PIN</Text>
              <Text style={styles.pinHint}>Enter your 4-digit PIN to authorize</Text>
              <View style={styles.inputWrap}>
                <Ionicons name="lock-closed-outline" size={18} color={Colors.muted} style={{ marginHorizontal: 12 }} />
                <TextInput style={[styles.input, { flex: 1, letterSpacing: 8, fontSize: 18 }]}
                  placeholder="• • • •" placeholderTextColor={Colors.borderMid}
                  value={pin} onChangeText={setPin} keyboardType="number-pad" maxLength={4} secureTextEntry autoFocus />
              </View>
            </View>

            <TouchableOpacity style={[styles.cta, (loading || pin.length < 4) && styles.ctaDisabled]}
              onPress={handlePay} disabled={loading || pin.length < 4} activeOpacity={0.85}>
              {loading ? <ActivityIndicator color={Colors.white} /> : (
                <><Text style={styles.ctaText}>Pay ₦{parseFloat(amount || '0').toLocaleString()}</Text><Ionicons name="flash" size={18} color={Colors.white} /></>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.backBtn} onPress={() => { setStep('amount'); setPin(''); }}>
              <Ionicons name="arrow-back" size={14} color={Colors.muted} />
              <Text style={styles.backText}>Edit details</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.surface },
  stepBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, paddingHorizontal: 40, backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border },
  stepItem: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  stepDot: { width: 24, height: 24, borderRadius: 12, backgroundColor: Colors.border, justifyContent: 'center', alignItems: 'center' },
  stepActive: { backgroundColor: Colors.primary },
  stepDone: { backgroundColor: Colors.success },
  stepNum: { ...Typography.captionMed, color: Colors.muted },
  stepLabel: { ...Typography.caption, color: Colors.muted, marginLeft: 6 },
  stepLabelActive: { color: Colors.primary, fontWeight: '600' },
  stepLine: { flex: 1, height: 2, backgroundColor: Colors.border, marginHorizontal: 6 },
  stepLineDone: { backgroundColor: Colors.success },
  scroll: { padding: Spacing.page, paddingBottom: 40 },
  card: { backgroundColor: Colors.white, borderRadius: Radius.xl, padding: 18, marginBottom: 14, ...Shadow.card },
  fieldLabel: { ...Typography.label, color: Colors.muted, marginBottom: 12 },
  loadRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 },
  loadText: { ...Typography.small, color: Colors.muted },
  discoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  discoBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingVertical: 9, paddingHorizontal: 12, borderRadius: Radius.md,
    backgroundColor: Colors.electricityBg, borderWidth: 1.5, borderColor: '#FDE68A',
    maxWidth: '48%', flex: 1,
  },
  discoBtnActive: { backgroundColor: Colors.electricity, borderColor: Colors.electricity },
  discoLabel: { ...Typography.smallMed, color: Colors.electricity, flex: 1 },
  typeRow: { flexDirection: 'row', gap: 10 },
  typeBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    paddingVertical: 12, borderRadius: Radius.md, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.surface,
  },
  typeBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  typeLabel: { ...Typography.smallMed, color: Colors.muted },
  typeLabelActive: { color: Colors.white },
  inputWrap: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.md, backgroundColor: Colors.surface, height: 52 },
  input: { flex: 1, fontSize: 15, color: Colors.dark, paddingVertical: 0 },
  amountWrap: { flexDirection: 'row', alignItems: 'center', borderWidth: 2, borderColor: Colors.primary, borderRadius: Radius.md, backgroundColor: Colors.primaryMuted, paddingHorizontal: 16, height: 60, gap: 8 },
  nairaSign: { fontSize: 24, fontWeight: '700', color: Colors.primary },
  amountInput: { flex: 1, fontSize: 26, fontWeight: '800', color: Colors.primary, paddingVertical: 0 },
  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  quickBtn: { paddingVertical: 7, paddingHorizontal: 14, borderRadius: Radius.full, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  quickBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  quickText: { ...Typography.captionMed, color: Colors.muted },
  quickTextActive: { color: Colors.white, fontWeight: '700' },
  verifiedBanner: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Colors.successLight, borderRadius: Radius.xl, padding: 16, marginBottom: 14 },
  verifiedIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: Colors.white, justifyContent: 'center', alignItems: 'center' },
  verifiedName: { ...Typography.smallMed, color: Colors.successDark, marginBottom: 2 },
  verifiedAddr: { ...Typography.caption, color: Colors.success, marginBottom: 2 },
  verifiedMeter: { ...Typography.caption, color: Colors.success },
  changeBtn: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: Colors.white, borderRadius: Radius.sm },
  changeText: { ...Typography.captionMed, color: Colors.primary },
  cta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.primary, borderRadius: Radius.md, paddingVertical: 16, ...Shadow.md },
  ctaDisabled: { opacity: 0.5 },
  ctaText: { ...Typography.bodyMed, color: Colors.white, fontWeight: '700', fontSize: 16 },
  backBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, marginTop: 14 },
  backText: { ...Typography.small, color: Colors.muted },
  summaryHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: Colors.surface },
  summaryIcon: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  summaryTitle: { ...Typography.smallMed, color: Colors.dark, fontWeight: '600' },
  summaryNet: { ...Typography.caption, color: Colors.muted },
  summaryRows: { gap: 12 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 12 },
  summaryRowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.surface },
  summaryKey: { ...Typography.small, color: Colors.muted },
  summaryVal: { ...Typography.smallMed, color: Colors.dark },
  pinHint: { ...Typography.small, color: Colors.muted, marginBottom: 12, marginTop: -6 },
});
