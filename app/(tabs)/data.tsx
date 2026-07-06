import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Keyboard,
} from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { api, formatCurrency, isResponseSuccess, parseWalletBalanceKobo, type DataPlan } from '../../src/lib/api';
import { useWalletStore } from '../../src/stores';
import {Colors, Typography, Radius, useThemedStyles } from '../../src/theme';
import { showToast } from '../../src/components/ui/Toast';
import { NetworkProviderGrid } from '../../src/components/NetworkProviderGrid';
import { PhoneNumberInput } from '../../src/components/PhoneNumberInput';
import { ServiceScreenHeader, SERVICE_SCROLL_TOP_INSET } from '../../src/components/ServiceScreenHeader';
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
import { useWalletAffordability } from '../../src/hooks/useWalletAffordability';
import { useNetworkAutoDetect } from '../../src/hooks/useNetworkAutoDetect';
import { useCachedDataCatalog, useCachedServiceProviders } from '../../src/hooks/useServiceCatalog';
import { formatPhoneDisplay } from '../../src/lib/phone';
import { ScreenBody } from '../../src/components/ui/ScreenBody';
import { DataPlanPickerSheet, DataPlanSelectField } from '../../src/components/DataPlanPickerSheet';
import {
  filterDataPlansByType,
  shouldShowDataTypeFilters,
} from '../../src/lib/data-plans';

export default function DataScreen() {
  const styles = useStyles();

  const { balance, setBalance } = useWalletStore();
  const { providers, loading: loadingProviders } = useCachedServiceProviders('data');
  const [selectedNetwork, setSelectedNetwork] = useState('');
  const { categories, plans, loadingPlans } = useCachedDataCatalog(selectedNetwork);
  const [selectedPlan, setSelectedPlan] = useState<DataPlan | null>(null);
  const [phone, setPhone] = useState('');
  const [step, setStep] = useState<'details' | 'confirm'>('details');
  const [showLock, setShowLock] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPlanPicker, setShowPlanPicker] = useState(false);
  const [selectedDataType, setSelectedDataType] = useState('all');
  const {
    onPhoneChange,
    detectedNet,
    detecting,
    normalizedPhone,
    isPhoneComplete,
    networkResolvedByPrefix,
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
    setShowPlanPicker(false);
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
      const res = await api.purchaseData({
        provider: selectedNetwork,
        phone: normalizedPhone,
        bundleId: selectedPlan!.id,
        bypassValidation: networkResolvedByPrefix,
        ...auth,
      });
      if (res.success) {
        const balRes = await api.getWalletBalance();
        if (isResponseSuccess(balRes)) setBalance(parseWalletBalanceKobo(balRes.data));
        showToast({ type: 'success', text1: 'Data Activated! 📶', text2: `${selectedPlan!.name} sent to ${normalizedPhone}` });
        setTimeout(() => { setPhone(''); setStep('details'); setSelectedPlan(null); setSelectedNetwork(''); }, 1500);
      } else {
        showToast({ type: 'error', text1: 'Purchase Failed', text2: res.message || 'Please try again' });
      }
    } catch (err: any) {
      showToast({ type: 'error', text1: 'Purchase Failed', text2: err?.data?.message || err?.message || 'Please try again' });
    } finally {
      setLoading(false);
      setShowLock(false);
    }
  };

  const showDataTypeFilters = shouldShowDataTypeFilters(plans);
  const typeFilteredPlans = filterDataPlansByType(plans, selectedDataType, showDataTypeFilters);

  useEffect(() => {
    if (!showDataTypeFilters && selectedDataType !== 'all') {
      setSelectedDataType('all');
    }
  }, [showDataTypeFilters, selectedDataType]);

  const selectedProv = providers.find(p => String(p.code || '').toLowerCase() === selectedNetwork.toLowerCase());
  const requiredKobo = selectedPlan?.price ?? 0;
  const afford = useWalletAffordability(requiredKobo, step === 'confirm');

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
                <DataPlanSelectField
                  selectedPlan={selectedPlan}
                  planCount={typeFilteredPlans.length}
                  loading={loadingPlans}
                  disabled={typeFilteredPlans.length === 0 && !loadingPlans}
                  onPress={() => setShowPlanPicker(true)}
                />
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
              networkProvider={selectedProv ?? { code: selectedNetwork, id: selectedNetwork }}
              icon="wifi-outline"
              rows={[
                { label: 'Phone number', value: formatPhoneDisplay(phone) },
                { label: 'Network', value: selectedProv?.name || selectedNetwork },
                { label: 'Plan', value: selectedPlan?.name || '—' },
                { label: 'Validity', value: selectedPlan?.validity || '—' },
                { label: 'You pay', value: formatCurrency(selectedPlan?.price ?? 0), highlight: true },
              ]}
              walletBalanceKobo={afford.walletBalanceKobo}
              requiredKobo={requiredKobo}
              insufficientFunds={afford.insufficientFunds}
            />

            <ServiceSecureNote text="Secured payment · Instant activation" />

            <ServiceContinueButton
              label={afford.insufficientFunds ? 'Insufficient balance' : 'Confirm Purchase'}
              onPress={() => setShowLock(true)}
              disabled={loading || afford.insufficientFunds}
            />

            <ServiceEditLink onPress={() => setStep('details')} />
          </>
        )}
        </ScreenBody>
      </ScrollView>

      <DataPlanPickerSheet
        visible={showPlanPicker}
        plans={typeFilteredPlans}
        selectedPlanId={selectedPlan?.id}
        loading={loadingPlans}
        onClose={() => setShowPlanPicker(false)}
        onSelect={setSelectedPlan}
      />

      <TransactionLockSheet
        visible={showLock}
        onClose={() => {
          if (loading) return;
          setShowLock(false);
        }}
        onAuthorized={handlePurchase}
        title="Confirm data purchase"
        subtitle={`Authorize ${formatCurrency(selectedPlan?.price ?? 0)} for ${selectedPlan?.name || 'data bundle'}`}
        amount={formatCurrency(selectedPlan?.price ?? 0)}
        processing={loading}
        processingMessage="Sending your data"
        processingSubmessage="Processing payment and delivering bundle to your line"
        processingIcon="wifi-outline"
      />
    </ThemedScreen>
  );
}

const createStyles = (colors: import('../../src/theme/types').ThemeColors) => StyleSheet.create({
  scroll: { paddingTop: SERVICE_SCROLL_TOP_INSET, paddingBottom: 40 },
  typePills: { gap: 8, paddingVertical: 2 },
  typePill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  typePillActive: {
    borderColor: colors.primary,
    backgroundColor: colors.inputFilled,
  },
  typePillText: { ...Typography.small, color: colors.muted, fontWeight: '600' },
  typePillTextActive: { color: colors.primary },
});

function useStyles() {
  return useThemedStyles(createStyles);
}
