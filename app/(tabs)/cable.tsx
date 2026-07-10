import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Keyboard,
} from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { api, formatCurrency, type CablePlan } from '../../src/lib/api';
import { useWalletStore } from '../../src/stores';
import {Colors, Typography, Radius, useThemedStyles } from '../../src/theme';
import { showToast } from '../../src/components/ui/Toast';
import { ServiceScreenHeader, SERVICE_SCROLL_TOP_INSET } from '../../src/components/ServiceScreenHeader';
import { useHardwareBack } from '../../src/hooks/useHardwareBack';
import { navigateBack } from '../../src/lib/navigation';
import { ThemedScreen } from '../../src/components/ui/ThemedScreen';
import { PurchaseConfirmCard } from '../../src/components/purchase/PurchaseConfirmCard';
import {
  ServiceSectionLabel,
  ServicePurchaseCard,
  ServiceContinueButton,
  ServiceEditLink,
} from '../../src/components/purchase/ServicePurchaseUi';
import { TransactionLockSheet } from '../../src/components/security/TransactionLockSheet';
import type { TransactionAuthPayload } from '../../src/hooks/useTransactionLockAuth';
import { useWalletAffordability } from '../../src/hooks/useWalletAffordability';
import { useCachedCablePlans, useCachedServiceProviders } from '../../src/hooks/useServiceCatalog';
import { ScreenBody } from '../../src/components/ui/ScreenBody';
import { CableProviderGrid } from '../../src/components/CableProviderGrid';
import { getCableProviderDisplayName, getCableProviderLogo } from '../../src/lib/cable-providers';
import { DataPlanPickerSheet, DataPlanSelectField } from '../../src/components/DataPlanPickerSheet';
import { PurchaseSuccessModal } from '../../src/components/purchase/PurchaseSuccessModal';
import { ServicePurchaseScroll } from '../../src/components/purchase/ServicePurchaseScroll';
import { useNumericInputAccessory } from '../../src/components/ui/KeyboardAccessoryProvider';
import { BeneficiaryPicker } from '../../src/components/beneficiary/BeneficiaryPicker';
import { SaveBeneficiaryPrompt } from '../../src/components/beneficiary/SaveBeneficiaryPrompt';
import { useBeneficiarySelection } from '../../src/hooks/useBeneficiarySelection';
import {
  refreshAfterPurchase,
  usePurchaseSuccessModal,
  isPurchaseSuccess,
  extractPurchaseResultData,
  getPurchaseSuccessPresentation,
} from '../../src/lib/purchase-success';

export default function CableScreen() {
  const styles = useStyles();

  const { balance, setBalance } = useWalletStore();
  const { providers, loading: loadingProviders } = useCachedServiceProviders('cable');
  const [selectedProvider, setSelectedProvider] = useState('');
  const { plans, loadingPlans } = useCachedCablePlans(selectedProvider);
  const [selectedPlan, setSelectedPlan] = useState<CablePlan | null>(null);
  const [smartCard, setSmartCard] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [step, setStep] = useState<'details' | 'confirm'>('details');
  const [showLock, setShowLock] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [showPlanPicker, setShowPlanPicker] = useState(false);
  const numericAccessory = useNumericInputAccessory();

  const {
    selectedBeneficiaryId,
    setSelectedBeneficiaryId,
    handleFieldEdited,
    completePurchase,
    saveDraft,
    dismissSaveDraft,
  } = useBeneficiarySelection('cable');

  useEffect(() => {
    if (!selectedProvider) return;
    setSelectedPlan(null);
    setShowPlanPicker(false);
  }, [selectedProvider]);

  const handleVerify = async () => {
    if (!selectedProvider) { showToast({ type: 'error', text1: 'Select Provider', text2: 'Please select a cable provider' }); return; }
    if (!smartCard) { showToast({ type: 'error', text1: 'Enter Smart Card', text2: 'Enter your smart card/IUC number' }); return; }
    Keyboard.dismiss(); setVerifying(true); setCustomerName('');
    try {
      const res = await api.verifyCableSmartCard({ provider: selectedProvider, smartCardNumber: smartCard });
      if (res.success && res.data?.customerName) {
        setCustomerName(res.data.customerName);
        showToast({ type: 'success', text1: 'Card Verified ✓', text2: res.data.customerName });
      } else {
        showToast({ type: 'error', text1: 'Verification Failed', text2: res.message || 'Check smart card number' });
      }
    } catch (err: any) {
      showToast({ type: 'error', text1: 'Verification Failed', text2: err?.data?.message || err?.message || 'Could not verify card' });
    } finally { setVerifying(false); }
  };

  const handleContinue = () => {
    if (!customerName) { showToast({ type: 'error', text1: 'Verify Card', text2: 'Please verify your smart card first' }); return; }
    if (!selectedPlan) { showToast({ type: 'error', text1: 'Select Plan', text2: 'Please select a subscription plan' }); return; }
    Keyboard.dismiss(); setStep('confirm');
  };

  const resetForm = useCallback(() => {
    setSmartCard('');
    setCustomerName('');
    setSelectedPlan(null);
    setSelectedProvider('');
    setStep('details');
  }, []);

  const {
    meta: successMeta,
    visible: showSuccessModal,
    showSuccess,
    handleDone: handleSuccessDone,
    handleViewReceipt,
  } = usePurchaseSuccessModal(resetForm);

  const handlePurchase = async (auth: TransactionAuthPayload) => {
    setLoading(true);
    try {
      const res = await api.purchaseCable({ provider: selectedProvider, smartCardNumber: smartCard, planId: selectedPlan!.id, ...auth });
      if (isPurchaseSuccess(res)) {
        const payload = extractPurchaseResultData<{
          transactionId?: string;
          status?: string;
          amount?: number;
        }>(res);
        completePurchase(smartCard, 'smartCardNumber', selectedProvider);
        showSuccess({
          transactionId: payload?.transactionId,
          amountKobo: selectedPlan?.price ?? payload?.amount ?? 0,
          ...getPurchaseSuccessPresentation('cable', payload?.status),
          recipientLabel: 'Customer',
          recipientName: customerName,
          recipientMeta: `${selectedProvName} · ${smartCard}`,
          serviceIcon: 'tv-outline',
          detailRows: [
            { label: 'Provider', value: selectedProvName },
            { label: 'Plan', value: selectedPlan!.name },
            { label: 'Validity', value: selectedPlan?.validity || '—' },
          ],
        });
        void refreshAfterPurchase(setBalance);
      } else {
        showToast({ type: 'error', text1: 'Subscription Failed', text2: res.message || 'Please try again' });
      }
    } catch (err: any) {
      showToast({ type: 'error', text1: 'Subscription Failed', text2: err?.data?.message || err?.message || 'Please try again' });
    } finally {
      setLoading(false);
      setShowLock(false);
    }
  };

  const selectedProv = providers.find(p => p.code === selectedProvider);
  const selectedProvName = selectedProv ? getCableProviderDisplayName(selectedProv) : selectedProvider;
  const requiredKobo = selectedPlan?.price ?? 0;
  const afford = useWalletAffordability(requiredKobo, step === 'confirm');
  const canContinue = Boolean(customerName && selectedPlan);

  const handleSelectProvider = useCallback((code: string) => {
    setSelectedProvider(code);
    setCustomerName('');
    setSmartCard('');
    setSelectedPlan(null);
  }, []);

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
        title="Cable TV"
        subtitle="Pay your subscription"
        icon="tv-outline"
        balanceLabel={formatCurrency(balance)}
        onBack={handleBack}
        stepProgress={{
          activeIndex: step === 'confirm' ? 1 : 0,
          labels: ['Details', 'Confirm'],
        }}
      />

      <ServicePurchaseScroll contentContainerStyle={styles.scroll}>
        <ScreenBody>
        {step === 'details' && (
          <>
            {/* Provider */}
            <ServicePurchaseCard>
              <ServiceSectionLabel title="Select provider" icon="tv-outline" />
              <CableProviderGrid
                providers={providers}
                selectedCode={selectedProvider}
                onSelect={handleSelectProvider}
                loading={loadingProviders}
              />
            </ServicePurchaseCard>

            {selectedProvider && (
              <ServicePurchaseCard>
                <ServiceSectionLabel title="Smart card / IUC" icon="card-outline" />
                <View style={styles.verifyRow}>
                  <View style={[styles.inputWrap, { flex: 1 }]}>
                    <Ionicons name="card-outline" size={16} color={Colors.muted} style={{ marginHorizontal: 12 }} />
                    <TextInput style={styles.input} placeholder="Enter card number"
                      placeholderTextColor={Colors.mutedLight} value={smartCard}
                      onChangeText={(value) => {
                        handleFieldEdited();
                        setSmartCard(value);
                        setCustomerName('');
                      }}
                      keyboardType="number-pad" {...numericAccessory} />
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
                <BeneficiaryPicker
                  serviceType="cable"
                  identifierField="smartCardNumber"
                  selectedId={selectedBeneficiaryId}
                  onSelect={(beneficiary) => {
                    setSmartCard(beneficiary.smartCardNumber || '');
                    if (beneficiary.provider) setSelectedProvider(beneficiary.provider);
                    setSelectedBeneficiaryId(beneficiary.id);
                    setCustomerName('');
                    setSelectedPlan(null);
                  }}
                />
              </ServicePurchaseCard>
            )}

            {selectedProvider && customerName && (
              <ServicePurchaseCard>
                <ServiceSectionLabel title="Select plan" icon="albums-outline" />
                <DataPlanSelectField
                  selectedPlan={selectedPlan}
                  planCount={plans.length}
                  loading={loadingPlans}
                  disabled={plans.length === 0 && !loadingPlans}
                  onPress={() => setShowPlanPicker(true)}
                />
              </ServicePurchaseCard>
            )}

            <ServiceContinueButton
              label="Continue"
              onPress={handleContinue}
              disabled={!canContinue}
            />
          </>
        )}

        {step === 'confirm' && (
          <>
            <PurchaseConfirmCard
              eyebrow="You're subscribing"
              amount={formatCurrency(selectedPlan?.price ?? 0)}
              title={selectedPlan?.name || 'Cable plan'}
              chip={`${selectedProvName} · ${smartCard}`}
              logo={selectedProv ? getCableProviderLogo(selectedProv) : undefined}
              icon="tv-outline"
              rows={[
                { label: 'Provider', value: selectedProvName },
                { label: 'Smart card', value: smartCard },
                { label: 'Customer', value: customerName },
                { label: 'Plan', value: selectedPlan?.name || '—' },
                { label: 'Validity', value: selectedPlan?.validity || '—' },
                { label: 'You pay', value: formatCurrency(selectedPlan?.price ?? 0), highlight: true },
              ]}
              walletBalanceKobo={afford.walletBalanceKobo}
              requiredKobo={requiredKobo}
              insufficientFunds={afford.insufficientFunds}
            />

            <ServiceContinueButton
              label={afford.insufficientFunds ? 'Insufficient balance' : 'Confirm Subscription'}
              onPress={() => setShowLock(true)}
              disabled={loading || afford.insufficientFunds}
            />

            <ServiceEditLink onPress={() => setStep('details')} />
          </>
        )}
        </ScreenBody>
      </ServicePurchaseScroll>

      <DataPlanPickerSheet
        visible={showPlanPicker}
        plans={plans}
        selectedPlanId={selectedPlan?.id}
        loading={loadingPlans}
        title="Select cable plan"
        onClose={() => setShowPlanPicker(false)}
        onSelect={(plan) => setSelectedPlan(plan as CablePlan)}
      />

      <TransactionLockSheet
        visible={showLock}
        onClose={() => {
          if (loading) return;
          setShowLock(false);
        }}
        onAuthorized={handlePurchase}
        title="Confirm cable subscription"
        subtitle={`Authorize ${formatCurrency(selectedPlan?.price ?? 0)} for ${selectedPlan?.name || 'subscription'}`}
        amount={formatCurrency(selectedPlan?.price ?? 0)}
        processing={loading}
        processingMessage="Processing subscription"
        processingSubmessage="Activating your cable TV plan"
        processingIcon="tv-outline"
      />

      {successMeta ? (
        <PurchaseSuccessModal
          visible={showSuccessModal}
          {...successMeta}
          onDone={() => {
            dismissSaveDraft();
            handleSuccessDone();
          }}
          onViewReceipt={handleViewReceipt}
          footerExtra={
            saveDraft ? <SaveBeneficiaryPrompt draft={saveDraft} onSaved={dismissSaveDraft} /> : null
          }
        />
      ) : null}
    </ThemedScreen>
  );
}

const createStyles = (colors: import('../../src/theme/types').ThemeColors) => StyleSheet.create({
  scroll: { paddingTop: SERVICE_SCROLL_TOP_INSET, paddingBottom: 40 },
  verifyRow: { flexDirection: 'row', gap: 8 },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.borderMid,
    borderRadius: Radius.lg,
    backgroundColor: colors.surface,
    height: 52,
  },
  input: { flex: 1, fontSize: 15, color: colors.dark, paddingVertical: 0 },
  verifyBtn: { backgroundColor: colors.primary, borderRadius: Radius.md, paddingHorizontal: 16, justifyContent: 'center', height: 52 },
  verifyBtnDis: { opacity: 0.5 },
  verifyBtnText: { ...Typography.smallMed, color: colors.white, fontWeight: '700' },
  customerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.successLight,
    borderRadius: Radius.md,
    padding: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: colors.success + '33',
  },
  customerText: { ...Typography.smallMed, color: colors.successDark },
});

function useStyles() {
  return useThemedStyles(createStyles);
}
