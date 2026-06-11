import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Keyboard,
} from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { api, formatCurrency, isResponseSuccess, parseWalletBalanceKobo, type CableProvider, type CablePlan } from '../../src/lib/api';
import { useWalletStore } from '../../src/stores';
import { Colors, Spacing, Typography, Radius, Shadow } from '../../src/theme';
import { Toast } from '../../src/components/ui/Toast';
import { ServiceScreenHeader } from '../../src/components/ServiceScreenHeader';
import { useHardwareBack } from '../../src/hooks/useHardwareBack';
import { navigateBack } from '../../src/lib/navigation';

const PROVIDERS: Record<string, { bg: string; border: string; text: string }> = {
  DSTV:      { bg: '#EFF6FF', border: '#93C5FD', text: '#1D4ED8' },
  GOTV:      { bg: '#F0FDF4', border: '#86EFAC', text: '#15803D' },
  STARTIMES: { bg: '#FFF7ED', border: '#FCD34D', text: '#B45309' },
  SHOWMAX:   { bg: '#FDF4FF', border: '#D8B4FE', text: '#7C3AED' },
};

export default function CableScreen() {
  const { balance, setBalance } = useWalletStore();
  const [providers, setProviders] = useState<CableProvider[]>([]);
  const [plans, setPlans] = useState<CablePlan[]>([]);
  const [selectedProvider, setSelectedProvider] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<CablePlan | null>(null);
  const [smartCard, setSmartCard] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [pin, setPin] = useState('');
  const [step, setStep] = useState<'details' | 'confirm'>('details');
  const [loading, setLoading] = useState(false);
  const [loadingProviders, setLoadingProviders] = useState(true);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => { loadProviders(); }, []);
  useEffect(() => { if (selectedProvider) loadPlans(selectedProvider); }, [selectedProvider]);

  const loadProviders = async () => {
    try { const res = await api.getCableProviders(); if (res.success) setProviders(res.data ?? []); }
    finally { setLoadingProviders(false); }
  };

  const loadPlans = async (prov: string) => {
    setLoadingPlans(true); setPlans([]); setSelectedPlan(null);
    try { const res = await api.getCablePlans(prov); if (res.success) setPlans(res.data ?? []); }
    finally { setLoadingPlans(false); }
  };

  const handleVerify = async () => {
    if (!selectedProvider) { Toast.show({ type: 'error', text1: 'Select Provider', text2: 'Please select a cable provider' }); return; }
    if (!smartCard) { Toast.show({ type: 'error', text1: 'Enter Smart Card', text2: 'Enter your smart card/IUC number' }); return; }
    Keyboard.dismiss(); setVerifying(true); setCustomerName('');
    try {
      const res = await api.verifyCableSmartCard({ provider: selectedProvider, smartCardNumber: smartCard });
      if (res.success && res.data?.customerName) {
        setCustomerName(res.data.customerName);
        Toast.show({ type: 'success', text1: 'Card Verified ✓', text2: res.data.customerName });
      } else {
        Toast.show({ type: 'error', text1: 'Verification Failed', text2: res.message || 'Check smart card number' });
      }
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Verification Failed', text2: err?.data?.message || err?.message || 'Could not verify card' });
    } finally { setVerifying(false); }
  };

  const handleContinue = () => {
    if (!customerName) { Toast.show({ type: 'error', text1: 'Verify Card', text2: 'Please verify your smart card first' }); return; }
    if (!selectedPlan) { Toast.show({ type: 'error', text1: 'Select Plan', text2: 'Please select a subscription plan' }); return; }
    Keyboard.dismiss(); setStep('confirm');
  };

  const handlePurchase = async () => {
    if (!pin || pin.length !== 4) { Toast.show({ type: 'error', text1: 'Enter PIN', text2: 'Enter your 4-digit transaction PIN' }); return; }
    setLoading(true);
    try {
      const res = await api.purchaseCable({ provider: selectedProvider, smartCardNumber: smartCard, planId: selectedPlan!.id, pin });
      if (res.success) {
        const balRes = await api.getWalletBalance();
        if (isResponseSuccess(balRes)) setBalance(parseWalletBalanceKobo(balRes.data));
        Toast.show({ type: 'success', text1: 'Subscription Active! 📺', text2: `${selectedPlan!.name} activated for ${customerName}` });
        setTimeout(() => { setSmartCard(''); setPin(''); setCustomerName(''); setSelectedPlan(null); setSelectedProvider(''); setStep('details'); }, 1500);
      } else {
        Toast.show({ type: 'error', text1: 'Subscription Failed', text2: res.message || 'Please try again' });
      }
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Subscription Failed', text2: err?.data?.message || err?.message || 'Please try again' });
    } finally { setLoading(false); }
  };

  const selectedProv = providers.find(p => p.code === selectedProvider);

  const handleBack = useCallback(() => {
    if (step === 'confirm') {
      setStep('details');
      setPin('');
      return;
    }
    navigateBack();
  }, [step]);

  useHardwareBack(handleBack);

  return (
    <View style={styles.root}>
      <ServiceScreenHeader
        title="Cable TV"
        subtitle="Pay your subscription"
        icon="tv-outline"
        iconColor={Colors.cable}
        iconBg={Colors.cableBg}
        balanceLabel={formatCurrency(balance)}
        onBack={handleBack}
      />

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {step === 'details' && (
          <>
            {/* Provider */}
            <View style={styles.card}>
              <Text style={styles.fieldLabel}>Select Provider</Text>
              {loadingProviders ? (
                <View style={styles.loadRow}><ActivityIndicator size="small" color={Colors.primary} /><Text style={styles.loadText}>Loading...</Text></View>
              ) : (
                <View style={styles.provGrid}>
                  {providers.map(p => {
                    const ps = PROVIDERS[p.code.toUpperCase()] ?? { bg: Colors.primaryMuted, border: Colors.primary, text: Colors.primary };
                    const sel = selectedProvider === p.code;
                    return (
                      <TouchableOpacity key={p.id}
                        style={[styles.provBtn, { backgroundColor: sel ? Colors.primary : ps.bg, borderColor: sel ? Colors.primary : ps.border }]}
                        onPress={() => { setSelectedProvider(p.code); setCustomerName(''); setSmartCard(''); setSelectedPlan(null); }} activeOpacity={0.75}>
                        <Ionicons name="tv-outline" size={15} color={sel ? Colors.white : ps.text} />
                        <Text style={[styles.provLabel, { color: sel ? Colors.white : ps.text }]}>{p.displayName || p.name}</Text>
                        {sel && <Ionicons name="checkmark-circle" size={13} color={Colors.white} />}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>

            {/* Smart card + verify */}
            {selectedProvider && (
              <View style={styles.card}>
                <Text style={styles.fieldLabel}>Smart Card / IUC Number</Text>
                <View style={styles.verifyRow}>
                  <View style={[styles.inputWrap, { flex: 1 }]}>
                    <Ionicons name="card-outline" size={16} color={Colors.muted} style={{ marginHorizontal: 12 }} />
                    <TextInput style={styles.input} placeholder="Enter card number"
                      placeholderTextColor={Colors.mutedLight} value={smartCard}
                      onChangeText={(v) => { setSmartCard(v); setCustomerName(''); }}
                      keyboardType="number-pad" />
                    {verifying && <ActivityIndicator size="small" color={Colors.warning} style={{ marginRight: 8 }} />}
                    {!verifying && customerName && <Ionicons name="checkmark-circle" size={18} color={Colors.success} style={{ marginRight: 8 }} />}
                  </View>
                  <TouchableOpacity style={[styles.verifyBtn, (!smartCard || verifying) && styles.verifyBtnDis]}
                    onPress={handleVerify} disabled={!smartCard || verifying}>
                    <Text style={styles.verifyBtnText}>Verify</Text>
                  </TouchableOpacity>
                </View>
                {customerName ? (
                  <View style={styles.customerBadge}>
                    <Ionicons name="person-circle-outline" size={14} color={Colors.success} />
                    <Text style={styles.customerText}>{customerName}</Text>
                  </View>
                ) : null}
              </View>
            )}

            {/* Plans */}
            {selectedProvider && customerName && (
              <View style={styles.card}>
                <Text style={styles.fieldLabel}>Select Plan</Text>
                {loadingPlans ? (
                  <View style={styles.loadRow}><ActivityIndicator size="small" color={Colors.primary} /><Text style={styles.loadText}>Loading plans...</Text></View>
                ) : plans.length === 0 ? (
                  <Text style={styles.noPlans}>No plans available</Text>
                ) : (
                  <View style={styles.planList}>
                    {plans.map(p => {
                      const sel = selectedPlan?.id === p.id;
                      return (
                        <TouchableOpacity key={p.id} style={[styles.planItem, sel && styles.planItemActive]}
                          onPress={() => setSelectedPlan(p)} activeOpacity={0.75}>
                          <View style={styles.planLeft}>
                            <Text style={[styles.planName, sel && { color: Colors.primary }]}>{p.name}</Text>
                            {p.validity && (
                              <View style={styles.planValidity}>
                                <Ionicons name="time-outline" size={11} color={Colors.muted} />
                                <Text style={styles.planValidityText}>{p.validity}</Text>
                              </View>
                            )}
                          </View>
                          <View style={styles.planRight}>
                            <Text style={[styles.planPrice, sel && { color: Colors.primary }]}>{formatCurrency(p.price)}</Text>
                            {sel && <Ionicons name="checkmark-circle" size={16} color={Colors.primary} />}
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </View>
            )}

            <TouchableOpacity style={styles.cta} onPress={handleContinue} activeOpacity={0.85}>
              <Text style={styles.ctaText}>Continue</Text>
              <Ionicons name="arrow-forward" size={18} color={Colors.white} />
            </TouchableOpacity>
          </>
        )}

        {step === 'confirm' && (
          <>
            <View style={[styles.card, { overflow: 'hidden' }]}>
              <View style={styles.summaryHeader}>
                <View style={[styles.summaryIcon, { backgroundColor: Colors.cableBg }]}>
                  <Ionicons name="tv-outline" size={24} color={Colors.cable} />
                </View>
                <View>
                  <Text style={styles.summaryTitle}>Cable Subscription</Text>
                  <Text style={styles.summaryNet}>{selectedProv?.displayName || selectedProvider}</Text>
                </View>
              </View>
              <View style={styles.summaryRows}>
                {[
                  ['Provider', selectedProv?.displayName || selectedProvider],
                  ['Smart Card', smartCard],
                  ['Customer', customerName],
                  ['Plan', selectedPlan?.name],
                  ['Validity', selectedPlan?.validity || '—'],
                  ['Amount', formatCurrency(selectedPlan?.price ?? 0)],
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
              onPress={handlePurchase} disabled={loading || pin.length < 4} activeOpacity={0.85}>
              {loading ? <ActivityIndicator color={Colors.white} /> : (
                <><Text style={styles.ctaText}>Confirm Subscription</Text><Ionicons name="checkmark" size={18} color={Colors.white} /></>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.backBtn} onPress={() => { setStep('details'); setPin(''); }}>
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
  scroll: { padding: Spacing.page, paddingBottom: 40 },
  card: { backgroundColor: Colors.white, borderRadius: Radius.xl, padding: 18, marginBottom: 14, ...Shadow.card },
  fieldLabel: { ...Typography.label, color: Colors.muted, marginBottom: 12 },
  loadRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 },
  loadText: { ...Typography.small, color: Colors.muted },
  provGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  provBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 9, paddingHorizontal: 14, borderRadius: Radius.md, borderWidth: 1.5 },
  provLabel: { ...Typography.smallMed, fontWeight: '700' },
  verifyRow: { flexDirection: 'row', gap: 8 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.md, backgroundColor: Colors.surface, height: 52 },
  input: { flex: 1, fontSize: 15, color: Colors.dark, paddingVertical: 0 },
  verifyBtn: { backgroundColor: Colors.primary, borderRadius: Radius.md, paddingHorizontal: 16, justifyContent: 'center', height: 52 },
  verifyBtnDis: { opacity: 0.5 },
  verifyBtnText: { ...Typography.smallMed, color: Colors.white, fontWeight: '700' },
  customerBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: Colors.successLight, borderRadius: Radius.sm, padding: 8, marginTop: 10 },
  customerText: { ...Typography.smallMed, color: Colors.successDark },
  noPlans: { ...Typography.small, color: Colors.muted, textAlign: 'center', paddingVertical: 16 },
  planList: { gap: 8 },
  planItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: Radius.md, padding: 14, borderWidth: 1.5, borderColor: 'transparent' },
  planItemActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryMuted },
  planLeft: { flex: 1 },
  planName: { ...Typography.smallMed, color: Colors.dark, marginBottom: 4 },
  planValidity: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  planValidityText: { ...Typography.caption, color: Colors.muted },
  planRight: { alignItems: 'flex-end', gap: 4 },
  planPrice: { ...Typography.bodyMed, color: Colors.dark, fontWeight: '700' },
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
