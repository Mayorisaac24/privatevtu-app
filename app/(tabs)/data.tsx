import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Keyboard,
} from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { api, formatCurrency, isResponseSuccess, parseWalletBalanceKobo, type AirtimeProvider, type DataPlan } from '../../src/lib/api';
import { useWalletStore } from '../../src/stores';
import { Colors, Spacing, Typography, Radius, Shadow } from '../../src/theme';
import { Toast } from '../../src/components/ui/Toast';
import { NetworkProviderGrid } from '../../src/components/NetworkProviderGrid';
import { ServiceScreenHeader } from '../../src/components/ServiceScreenHeader';
import { useHardwareBack } from '../../src/hooks/useHardwareBack';
import { navigateBack } from '../../src/lib/navigation';

function PlanCard({ plan, selected, onSelect }: { plan: DataPlan; selected: boolean; onSelect: () => void }) {
  return (
    <TouchableOpacity
      style={[styles.planCard, selected && styles.planCardActive]}
      onPress={onSelect} activeOpacity={0.75}
    >
      <View style={styles.planTop}>
        <Text style={[styles.planName, selected && { color: Colors.primary }]}>{plan.name}</Text>
        {selected && <Ionicons name="checkmark-circle" size={18} color={Colors.primary} />}
      </View>
      {plan.validity ? (
        <View style={styles.planValidity}>
          <Ionicons name="time-outline" size={11} color={Colors.muted} />
          <Text style={styles.planValidityText}>{plan.validity}</Text>
        </View>
      ) : null}
      <Text style={[styles.planPrice, selected && { color: Colors.primary }]}>
        {formatCurrency(plan.price)}
      </Text>
    </TouchableOpacity>
  );
}

export default function DataScreen() {
  const { balance, setBalance } = useWalletStore();
  const [providers, setProviders] = useState<AirtimeProvider[]>([]);
  const [plans, setPlans] = useState<DataPlan[]>([]);
  const [selectedNetwork, setSelectedNetwork] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<DataPlan | null>(null);
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [step, setStep] = useState<'details' | 'confirm'>('details');
  const [loading, setLoading] = useState(false);
  const [loadingProviders, setLoadingProviders] = useState(true);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => { loadProviders(); }, []);
  useEffect(() => { if (selectedNetwork) loadPlans(selectedNetwork); }, [selectedNetwork]);

  const loadProviders = async () => {
    try { const res = await api.getDataProviders(); if (res.success) setProviders(res.data ?? []); }
    finally { setLoadingProviders(false); }
  };

  const loadPlans = async (net: string) => {
    setLoadingPlans(true); setPlans([]); setSelectedPlan(null); setSearch('');
    try { const res = await api.getDataPlans(net); if (res.success) setPlans(res.data ?? []); }
    finally { setLoadingPlans(false); }
  };

  const handleContinue = () => {
    if (!selectedNetwork) { Toast.show({ type: 'error', text1: 'Select Network', text2: 'Please select a network provider' }); return; }
    if (!selectedPlan) { Toast.show({ type: 'error', text1: 'Select Plan', text2: 'Please select a data plan' }); return; }
    if (!phone || phone.length < 11) { Toast.show({ type: 'error', text1: 'Invalid Phone', text2: 'Enter a valid 11-digit phone number' }); return; }
    Keyboard.dismiss(); setStep('confirm');
  };

  const handlePurchase = async () => {
    if (!pin || pin.length !== 4) { Toast.show({ type: 'error', text1: 'Enter PIN', text2: 'Enter your 4-digit transaction PIN' }); return; }
    setLoading(true);
    try {
      const res = await api.purchaseData({ provider: selectedNetwork, phone, bundleId: selectedPlan!.id, pin });
      if (res.success) {
        const balRes = await api.getWalletBalance();
        if (isResponseSuccess(balRes)) setBalance(parseWalletBalanceKobo(balRes.data));
        Toast.show({ type: 'success', text1: 'Data Activated! 📶', text2: `${selectedPlan!.name} sent to ${phone}` });
        setTimeout(() => { setPhone(''); setPin(''); setStep('details'); setSelectedPlan(null); setSelectedNetwork(''); }, 1500);
      } else {
        Toast.show({ type: 'error', text1: 'Purchase Failed', text2: res.message || 'Please try again' });
      }
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Purchase Failed', text2: err?.data?.message || err?.message || 'Please try again' });
    } finally { setLoading(false); }
  };

  const filteredPlans = plans.filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()));
  const selectedProv = providers.find(p => p.code === selectedNetwork);

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
        title="Buy Data"
        subtitle="Browse without limits"
        icon="wifi-outline"
        iconColor={Colors.data}
        iconBg={Colors.dataBg}
        balanceLabel={formatCurrency(balance)}
        onBack={handleBack}
      />

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {step === 'details' && (
          <>
            {/* Network */}
            <View style={styles.card}>
              <Text style={styles.fieldLabel}>Network</Text>
              <NetworkProviderGrid
                providers={providers}
                selectedCode={selectedNetwork}
                onSelect={setSelectedNetwork}
                loading={loadingProviders}
              />
            </View>

            {/* Phone */}
            <View style={styles.card}>
              <Text style={styles.fieldLabel}>Phone Number</Text>
              <View style={styles.inputWrap}>
                <Text style={styles.prefix}>🇳🇬 +234</Text>
                <View style={styles.inputDivider} />
                <TextInput style={styles.input} placeholder="08012345678"
                  placeholderTextColor={Colors.mutedLight} value={phone}
                  onChangeText={setPhone} keyboardType="phone-pad" maxLength={11} />
                {phone.length === 11 && <Ionicons name="checkmark-circle" size={18} color={Colors.success} style={{ marginRight: 8 }} />}
              </View>
            </View>

            {/* Plans */}
            {selectedNetwork && (
              <View style={styles.card}>
                <Text style={styles.fieldLabel}>Select Plan</Text>
                {loadingPlans ? (
                  <View style={styles.loadRow}><ActivityIndicator size="small" color={Colors.primary} /><Text style={styles.loadText}>Loading plans...</Text></View>
                ) : (
                  <>
                    <View style={styles.searchWrap}>
                      <Ionicons name="search-outline" size={15} color={Colors.muted} />
                      <TextInput style={styles.searchInput} placeholder="Search plans..."
                        placeholderTextColor={Colors.mutedLight} value={search} onChangeText={setSearch} />
                    </View>
                    {filteredPlans.length === 0 ? (
                      <Text style={styles.noPlans}>No plans available</Text>
                    ) : (
                      <View style={styles.planGrid}>
                        {filteredPlans.slice(0, 20).map(p => (
                          <PlanCard key={p.id} plan={p} selected={selectedPlan?.id === p.id} onSelect={() => setSelectedPlan(p)} />
                        ))}
                      </View>
                    )}
                  </>
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
                <View style={[styles.summaryIcon, { backgroundColor: Colors.dataBg }]}>
                  <Ionicons name="wifi-outline" size={24} color={Colors.data} />
                </View>
                <View>
                  <Text style={styles.summaryTitle}>Data Purchase</Text>
                  <Text style={styles.summaryNet}>{selectedProv?.name || selectedNetwork}</Text>
                </View>
              </View>
              <View style={styles.summaryRows}>
                {[
                  ['Phone Number', phone],
                  ['Network', selectedProv?.name || selectedNetwork],
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
                  value={pin} onChangeText={setPin}
                  keyboardType="number-pad" maxLength={4} secureTextEntry autoFocus />
              </View>
            </View>

            <TouchableOpacity style={[styles.cta, (loading || pin.length < 4) && styles.ctaDisabled]}
              onPress={handlePurchase} disabled={loading || pin.length < 4} activeOpacity={0.85}>
              {loading ? <ActivityIndicator color={Colors.white} /> : (
                <><Text style={styles.ctaText}>Confirm Purchase</Text><Ionicons name="checkmark" size={18} color={Colors.white} /></>
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
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: Colors.border,
    borderRadius: Radius.md, backgroundColor: Colors.surface, height: 52,
  },
  prefix: { ...Typography.small, color: Colors.dark, paddingHorizontal: 12 },
  inputDivider: { width: 1, height: 28, backgroundColor: Colors.border, marginRight: 12 },
  input: { flex: 1, fontSize: 15, color: Colors.dark, paddingVertical: 0 },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.surface, borderRadius: Radius.sm,
    paddingHorizontal: 12, height: 40, marginBottom: 12,
    borderWidth: 1, borderColor: Colors.border,
  },
  searchInput: { flex: 1, fontSize: 14, color: Colors.dark },
  noPlans: { ...Typography.small, color: Colors.muted, textAlign: 'center', paddingVertical: 16 },
  planGrid: { gap: 8 },
  planCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.md, padding: 14,
    borderWidth: 1.5, borderColor: 'transparent',
  },
  planCardActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryMuted },
  planTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  planName: { ...Typography.smallMed, color: Colors.dark, flex: 1 },
  planValidity: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 },
  planValidityText: { ...Typography.caption, color: Colors.muted },
  planPrice: { ...Typography.bodyMed, color: Colors.dark, fontWeight: '700' },
  cta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.primary, borderRadius: Radius.md, paddingVertical: 16, ...Shadow.md,
  },
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
