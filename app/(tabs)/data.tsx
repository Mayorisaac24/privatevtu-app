import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Keyboard,
} from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { api, formatCurrency, isResponseSuccess, parseWalletBalanceKobo, type DataPlan } from '../../src/lib/api';
import { useWalletStore } from '../../src/stores';
import { Colors, Typography, Radius } from '../../src/theme';
import { showToast } from '../../src/components/ui/Toast';
import { NetworkProviderGrid } from '../../src/components/NetworkProviderGrid';
import { PhoneNumberInput } from '../../src/components/PhoneNumberInput';
import { ServiceScreenHeader } from '../../src/components/ServiceScreenHeader';
import { useHardwareBack } from '../../src/hooks/useHardwareBack';
import { navigateBack } from '../../src/lib/navigation';
import { ThemedScreen } from '../../src/components/ui/ThemedScreen';
import { PurchaseConfirmCard } from '../../src/components/purchase/PurchaseConfirmCard';
import {
  ServiceSectionLabel,
  ServicePurchaseCard,
  ServiceContinueButton,
  ServiceDetectedBadge,
  ServiceSecureNote,
  ServiceCardDivider,
  ServiceEditLink,
} from '../../src/components/purchase/ServicePurchaseUi';
import { TransactionLockSheet } from '../../src/components/security/TransactionLockSheet';
import type { TransactionAuthPayload } from '../../src/hooks/useTransactionLockAuth';
import { getProviderLogo } from '../../src/lib/providers';
import { useNetworkAutoDetect } from '../../src/hooks/useNetworkAutoDetect';
import { useCachedDataCatalog, useCachedServiceProviders } from '../../src/hooks/useServiceCatalog';
import { formatPhoneDisplay } from '../../src/lib/phone';
import { ScreenBody } from '../../src/components/ui/ScreenBody';
import {
  filterDataPlansByType,
  shouldShowDataTypeFilters,
} from '../../src/lib/data-plans';

function PlanCard({ plan, selected, onSelect }: { plan: DataPlan; selected: boolean; onSelect: () => void }) {
  return (
    <TouchableOpacity
      style={[styles.planCard, selected && styles.planCardActive]}
      onPress={onSelect} activeOpacity={0.75}
    >
      <View style={styles.planTop}>
        <Text style={[styles.planName, selected && { color: Colors.primary }]}>{plan.name}</Text>
        {selected ? (
          <View style={styles.planCheck}>
            <Ionicons name="checkmark" size={12} color={Colors.white} />
          </View>
        ) : null}
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
  const { providers, loading: loadingProviders } = useCachedServiceProviders('data');
  const [selectedNetwork, setSelectedNetwork] = useState('');
  const { categories, plans, loadingPlans } = useCachedDataCatalog(selectedNetwork);
  const [selectedPlan, setSelectedPlan] = useState<DataPlan | null>(null);
  const [phone, setPhone] = useState('');
  const [step, setStep] = useState<'details' | 'confirm'>('details');
  const [showLock, setShowLock] = useState(false);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedDataType, setSelectedDataType] = useState('all');
  const {
    onPhoneChange,
    detectedNet,
    detecting,
    normalizedPhone,
    isPhoneComplete,
  } = useNetworkAutoDetect({
    phone,
    setPhone,
    selectedNetwork,
    setSelectedNetwork,
    providers,
  });

  useEffect(() => {
    if (!selectedNetwork) return;
    setSelectedPlan(null);
    setSelectedDataType('all');
    setSearch('');
  }, [selectedNetwork]);

  const handleContinue = () => {
    if (!selectedNetwork) { showToast({ type: 'error', text1: 'Select Network', text2: 'Please select a network provider' }); return; }
    if (!selectedPlan) { showToast({ type: 'error', text1: 'Select Plan', text2: 'Please select a data plan' }); return; }
    if (!isPhoneComplete) { showToast({ type: 'error', text1: 'Invalid Phone', text2: 'Enter a valid Nigerian phone number' }); return; }
    Keyboard.dismiss(); setStep('confirm');
  };

  const handlePurchase = async (auth: TransactionAuthPayload) => {
    setLoading(true);
    try {
      const res = await api.purchaseData({ provider: selectedNetwork, phone: normalizedPhone, bundleId: selectedPlan!.id, ...auth });
      if (res.success) {
        const balRes = await api.getWalletBalance();
        if (isResponseSuccess(balRes)) setBalance(parseWalletBalanceKobo(balRes.data));
        showToast({ type: 'success', text1: 'Data Activated! 📶', text2: `${selectedPlan!.name} sent to ${normalizedPhone}` });
        setShowLock(false);
        setTimeout(() => { setPhone(''); setStep('details'); setSelectedPlan(null); setSelectedNetwork(''); }, 1500);
      } else {
        showToast({ type: 'error', text1: 'Purchase Failed', text2: res.message || 'Please try again' });
      }
    } catch (err: any) {
      showToast({ type: 'error', text1: 'Purchase Failed', text2: err?.data?.message || err?.message || 'Please try again' });
    } finally { setLoading(false); }
  };

  const showDataTypeFilters = shouldShowDataTypeFilters(plans);
  const typeFilteredPlans = filterDataPlansByType(plans, selectedDataType, showDataTypeFilters);
  const filteredPlans = typeFilteredPlans.filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()));

  useEffect(() => {
    if (!showDataTypeFilters && selectedDataType !== 'all') {
      setSelectedDataType('all');
    }
  }, [showDataTypeFilters, selectedDataType]);

  const selectedProv = providers.find(p => String(p.code || '').toLowerCase() === selectedNetwork.toLowerCase());

  const handleBack = useCallback(() => {
    if (showLock) {
      setShowLock(false);
      return;
    }
    if (step === 'confirm') {
      setStep('details');
      return;
    }
    navigateBack();
  }, [step, showLock]);

  useHardwareBack(handleBack);

  return (
    <ThemedScreen>
      <ServiceScreenHeader
        title="Buy Data"
        subtitle="Browse without limits"
        icon="wifi-outline"
        balanceLabel={formatCurrency(balance)}
        onBack={handleBack}
        stepProgress={{
          activeIndex: step === 'confirm' ? 1 : 0,
          labels: ['Details', 'Confirm'],
        }}
      />

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <ScreenBody>
        {step === 'details' && (
          <>
            <ServicePurchaseCard>
              <ServiceSectionLabel title="Network" icon="cellular-outline" />
              <NetworkProviderGrid
                providers={providers}
                selectedCode={selectedNetwork}
                onSelect={setSelectedNetwork}
                loading={loadingProviders}
              />

              <ServiceCardDivider />

              <ServiceSectionLabel title="Phone number" icon="call-outline" />
              <PhoneNumberInput
                value={phone}
                onChangeText={onPhoneChange}
                detecting={detecting}
                isComplete={isPhoneComplete}
              />
              {detectedNet ? <ServiceDetectedBadge label={detectedNet} /> : null}
            </ServicePurchaseCard>

            {selectedNetwork && showDataTypeFilters && categories.length > 0 && (
              <ServicePurchaseCard>
                <ServiceSectionLabel title="Data type" icon="layers-outline" />
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.typePills}
                >
                  <TouchableOpacity
                    style={[styles.typePill, selectedDataType === 'all' && styles.typePillActive]}
                    onPress={() => { setSelectedDataType('all'); setSelectedPlan(null); }}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.typePillText, selectedDataType === 'all' && styles.typePillTextActive]}>
                      All types
                    </Text>
                  </TouchableOpacity>
                  {[...categories]
                    .sort((a, b) => a.sortOrder - b.sortOrder)
                    .map((category) => (
                      <TouchableOpacity
                        key={category.id}
                        style={[styles.typePill, selectedDataType === category.name && styles.typePillActive]}
                        onPress={() => { setSelectedDataType(category.name); setSelectedPlan(null); }}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.typePillText, selectedDataType === category.name && styles.typePillTextActive]}>
                          {category.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                </ScrollView>
              </ServicePurchaseCard>
            )}

            {selectedNetwork && (
              <ServicePurchaseCard>
                <ServiceSectionLabel title="Select plan" icon="albums-outline" />
                {loadingPlans ? (
                  <View style={styles.loadRow}>
                    <ActivityIndicator size="small" color={Colors.primary} />
                    <Text style={styles.loadText}>Loading plans...</Text>
                  </View>
                ) : (
                  <>
                    <View style={styles.searchWrap}>
                      <Ionicons name="search-outline" size={15} color={Colors.muted} />
                      <TextInput
                        style={styles.searchInput}
                        placeholder="Search plans..."
                        placeholderTextColor={Colors.mutedLight}
                        value={search}
                        onChangeText={setSearch}
                      />
                    </View>
                    {filteredPlans.length === 0 ? (
                      <Text style={styles.noPlans}>No plans available</Text>
                    ) : (
                      <View style={styles.planGrid}>
                        {filteredPlans.slice(0, 20).map(p => (
                          <PlanCard
                            key={p.id}
                            plan={p}
                            selected={selectedPlan?.id === p.id}
                            onSelect={() => setSelectedPlan(p)}
                          />
                        ))}
                      </View>
                    )}
                  </>
                )}
              </ServicePurchaseCard>
            )}

            <ServiceContinueButton label="Continue" onPress={handleContinue} />
          </>
        )}

        {step === 'confirm' && (
          <>
            <PurchaseConfirmCard
              accent="data"
              eyebrow="You're buying"
              amount={formatCurrency(selectedPlan?.price ?? 0)}
              title={selectedPlan?.name || 'Data bundle'}
              chip={`${selectedProv?.name || selectedNetwork} · ${formatPhoneDisplay(phone)}`}
              logo={selectedProv ? getProviderLogo(selectedProv) : undefined}
              icon="wifi-outline"
              rows={[
                { label: 'Phone number', value: formatPhoneDisplay(phone) },
                { label: 'Network', value: selectedProv?.name || selectedNetwork },
                { label: 'Plan', value: selectedPlan?.name || '—' },
                { label: 'Validity', value: selectedPlan?.validity || '—' },
                { label: 'You pay', value: formatCurrency(selectedPlan?.price ?? 0), highlight: true },
              ]}
            />

            <ServiceSecureNote text="Secured payment · Instant activation" />

            <ServiceContinueButton
              label="Confirm Purchase"
              onPress={() => setShowLock(true)}
              disabled={loading}
              loading={loading}
            />

            <ServiceEditLink onPress={() => setStep('details')} />
          </>
        )}
        </ScreenBody>
      </ScrollView>

      <TransactionLockSheet
        visible={showLock}
        onClose={() => setShowLock(false)}
        onAuthorized={handlePurchase}
        title="Confirm data purchase"
        subtitle={`Authorize ${formatCurrency(selectedPlan?.price ?? 0)} for ${selectedPlan?.name || 'data bundle'}`}
        amount={formatCurrency(selectedPlan?.price ?? 0)}
        processing={loading}
      />
    </ThemedScreen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: 40 },
  loadRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 },
  loadText: { ...Typography.small, color: Colors.muted },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.surface, borderRadius: Radius.md,
    paddingHorizontal: 12, height: 44, marginBottom: 12,
    borderWidth: 1, borderColor: Colors.border,
  },
  searchInput: { flex: 1, fontSize: 14, color: Colors.dark },
  noPlans: { ...Typography.small, color: Colors.muted, textAlign: 'center', paddingVertical: 16 },
  planGrid: { gap: 8 },
  planCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: 14,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  planCardActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryMuted,
  },
  planTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  planName: { ...Typography.smallMed, color: Colors.dark, flex: 1 },
  planCheck: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planValidity: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 },
  planValidityText: { ...Typography.caption, color: Colors.muted },
  planPrice: { ...Typography.bodyMed, color: Colors.dark, fontWeight: '700' },
  typePills: { gap: 8, paddingVertical: 2 },
  typePill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  typePillActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryMuted,
  },
  typePillText: { ...Typography.small, color: Colors.muted, fontWeight: '600' },
  typePillTextActive: { color: Colors.primary },
});
