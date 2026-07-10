import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Keyboard,
} from 'react-native';
import { useState, useCallback, useMemo, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { api, formatCurrency, type EducationPlan } from '../../src/lib/api';
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
import { ServiceGate } from '../../src/components/ServiceGate';
import { SERVICE_CODES } from '../../src/lib/service-availability';
import { ScreenBody } from '../../src/components/ui/ScreenBody';
import { EducationProviderGrid } from '../../src/components/EducationProviderGrid';
import { getEducationProviderDisplayName, getEducationProviderLogo } from '../../src/lib/education-providers';
import { useCachedEducationPlans, useCachedEducationProviders } from '../../src/hooks/useEducationCatalog';
import { PurchaseSuccessModal } from '../../src/components/purchase/PurchaseSuccessModal';
import { ServicePurchaseScroll } from '../../src/components/purchase/ServicePurchaseScroll';
import { useNumericInputAccessory } from '../../src/components/ui/KeyboardAccessoryProvider';
import {
  refreshAfterPurchase,
  usePurchaseSuccessModal,
  isPurchaseSuccess,
  extractPurchaseResultData,
  getPurchaseSuccessPresentation,
} from '../../src/lib/purchase-success';

function EducationScreen() {
  const styles = useStyles();

  const { balance, setBalance } = useWalletStore();
  const { providers, loading: loadingProviders } = useCachedEducationProviders();
  const [selectedProvider, setSelectedProvider] = useState('');
  const { plans, loadingPlans } = useCachedEducationPlans(selectedProvider);
  const [selectedPlan, setSelectedPlan] = useState<EducationPlan | null>(null);
  const [phone, setPhone] = useState('');
  const [profileId, setProfileId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [step, setStep] = useState<'details' | 'confirm'>('details');
  const [showLock, setShowLock] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const numericAccessory = useNumericInputAccessory();

  const requiresProfile = useMemo(
    () => selectedProvider === 'jamb' || providers.find((p) => p.code === selectedProvider)?.requiresProfile,
    [providers, selectedProvider],
  );

  useEffect(() => {
    if (!selectedProvider) return;
    setSelectedPlan(null);
    setCustomerName('');
    setProfileId('');
  }, [selectedProvider]);

  const handleVerifyProfile = async () => {
    if (!selectedProvider) {
      showToast({ type: 'error', text1: 'Select Provider', text2: 'Choose an exam body first' });
      return;
    }
    if (!profileId.trim()) {
      showToast({ type: 'error', text1: 'Enter Profile ID', text2: 'JAMB profile ID is required' });
      return;
    }
    Keyboard.dismiss();
    setVerifying(true);
    setCustomerName('');
    try {
      const res = await api.verifyJambProfile({
        provider: selectedProvider,
        profileId: profileId.trim(),
        profileType: selectedPlan?.description || 'utme',
      });
      if (res.success && res.data?.customerName) {
        setCustomerName(res.data.customerName);
        showToast({ type: 'success', text1: 'Profile Verified ✓', text2: res.data.customerName });
      } else {
        showToast({ type: 'error', text1: 'Verification Failed', text2: res.message || 'Check profile ID' });
      }
    } catch (err: any) {
      showToast({ type: 'error', text1: 'Verification Failed', text2: err?.data?.message || err?.message || 'Could not verify profile' });
    } finally {
      setVerifying(false);
    }
  };

  const handleContinue = () => {
    if (!selectedProvider) {
      showToast({ type: 'error', text1: 'Select Provider', text2: 'Choose WAEC or JAMB' });
      return;
    }
    if (!selectedPlan) {
      showToast({ type: 'error', text1: 'Select Plan', text2: 'Choose a PIN package' });
      return;
    }
    if (!phone.trim() || phone.trim().length < 10) {
      showToast({ type: 'error', text1: 'Enter Phone', text2: 'A valid phone number is required' });
      return;
    }
    if (requiresProfile && !customerName) {
      showToast({ type: 'error', text1: 'Verify Profile', text2: 'Verify JAMB profile ID first' });
      return;
    }
    Keyboard.dismiss();
    setStep('confirm');
  };

  const resetForm = useCallback(() => {
    setPhone('');
    setProfileId('');
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
      const res = await api.purchaseEducation({
        provider: selectedProvider,
        planId: selectedPlan!.id,
        phone: phone.trim(),
        profileId: requiresProfile ? profileId.trim() : undefined,
        profileType: selectedPlan?.description || undefined,
        ...auth,
      });
      if (isPurchaseSuccess(res)) {
        const payload = extractPurchaseResultData<{
          transactionId?: string;
          status?: string;
          message?: string;
        }>(res);
        showSuccess({
          transactionId: payload?.transactionId,
          amountKobo: requiredKobo,
          ...getPurchaseSuccessPresentation('education', payload?.status),
          recipientLabel: 'Delivered to',
          recipientName: phone.trim(),
          recipientMeta: `${selectedProvName} · ${selectedPlan!.name}`,
          serviceIcon: 'school-outline',
          detailRows: [
            { label: 'Provider', value: selectedProvName },
            { label: 'Package', value: selectedPlan!.name },
            ...(requiresProfile ? [{ label: 'Profile', value: customerName || profileId }] : []),
          ],
        });
        void refreshAfterPurchase(setBalance);
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

  const selectedProv = providers.find((p) => p.code === selectedProvider);
  const selectedProvName = selectedProv ? getEducationProviderDisplayName(selectedProv) : selectedProvider;
  const requiredKobo = selectedPlan?.platformPrice ?? selectedPlan?.price ?? 0;
  const afford = useWalletAffordability(requiredKobo, step === 'confirm');

  const handleSelectProvider = useCallback((code: string) => {
    setSelectedProvider(code);
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
        title="Education"
        subtitle="WAEC & JAMB exam pins"
        icon="school-outline"
        balanceLabel={formatCurrency(balance)}
        onBack={handleBack}
        stepProgress={{
          activeIndex: step === 'confirm' ? 1 : 0,
          labels: ['Details', 'Confirm'],
        }}
      />
      <ServicePurchaseScroll contentContainerStyle={styles.scrollWrap}>
        <ScreenBody>
          {step === 'details' ? (
            <View style={styles.stack}>
              <ServicePurchaseCard>
                <ServiceSectionLabel>Exam body</ServiceSectionLabel>
                <EducationProviderGrid
                  providers={providers}
                  selectedCode={selectedProvider}
                  onSelect={handleSelectProvider}
                  loading={loadingProviders}
                />
              </ServicePurchaseCard>

              {selectedProvider ? (
                <ServicePurchaseCard>
                  <ServiceSectionLabel>PIN package</ServiceSectionLabel>
                  {loadingPlans && plans.length === 0 ? (
                    <View style={styles.loadRow}>
                      <ActivityIndicator color={Colors.primary} />
                      <Text style={styles.loadText}>Loading packages...</Text>
                    </View>
                  ) : plans.length === 0 ? (
                    <Text style={styles.muted}>No plans available for this provider yet.</Text>
                  ) : (
                    <View style={styles.planList}>
                      {plans.map((plan) => {
                        const active = selectedPlan?.id === plan.id;
                        return (
                          <TouchableOpacity
                            key={plan.id}
                            style={[styles.planItem, active && styles.planItemActive]}
                            onPress={() => setSelectedPlan(plan)}
                            activeOpacity={0.75}
                          >
                            <View style={styles.planLeft}>
                              <Text style={[styles.planName, active && styles.planNameActive]}>{plan.name}</Text>
                              {plan.description ? (
                                <View style={styles.planMeta}>
                                  <Ionicons name="document-text-outline" size={11} color={Colors.muted} />
                                  <Text style={styles.planMetaText}>{plan.description}</Text>
                                </View>
                              ) : null}
                            </View>
                            <View style={styles.planRight}>
                              <Text style={[styles.planPrice, active && styles.planPriceActive]}>
                                {formatCurrency(plan.price)}
                              </Text>
                              {active ? <Ionicons name="checkmark-circle" size={16} color={Colors.primary} /> : null}
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                </ServicePurchaseCard>
              ) : null}

              {selectedPlan ? (
                <ServicePurchaseCard>
                  {requiresProfile ? (
                    <>
                      <ServiceSectionLabel>JAMB profile ID</ServiceSectionLabel>
                      <TextInput
                        style={styles.input}
                        value={profileId}
                        onChangeText={(v) => { setProfileId(v); setCustomerName(''); }}
                        placeholder="0123456789"
                        keyboardType="number-pad"
                        placeholderTextColor={Colors.muted}
                        {...numericAccessory}
                      />
                      <TouchableOpacity style={styles.verifyBtn} onPress={handleVerifyProfile} disabled={verifying}>
                        {verifying ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.verifyBtnText}>Verify Profile</Text>}
                      </TouchableOpacity>
                      {customerName ? (
                        <View style={styles.customerBadge}>
                          <Ionicons name="checkmark-circle" size={14} color={Colors.successDark} />
                          <Text style={styles.customerText}>{customerName}</Text>
                        </View>
                      ) : null}
                    </>
                  ) : null}

                  <ServiceSectionLabel>Phone number</ServiceSectionLabel>
                  <TextInput
                    style={styles.input}
                    value={phone}
                    onChangeText={setPhone}
                    placeholder="08012345678"
                    keyboardType="phone-pad"
                    placeholderTextColor={Colors.muted}
                    {...numericAccessory}
                  />
                  <ServiceContinueButton onPress={handleContinue} />
                </ServicePurchaseCard>
              ) : null}
            </View>
          ) : (
            <View style={styles.stack}>
              <PurchaseConfirmCard
                eyebrow="You're buying"
                amount={formatCurrency(requiredKobo)}
                title={selectedPlan?.name || 'Exam PIN'}
                chip={selectedProvName}
                logo={selectedProv ? getEducationProviderLogo(selectedProv) ?? undefined : undefined}
                icon="school-outline"
                rows={[
                  { label: 'Provider', value: selectedProvName },
                  { label: 'Package', value: selectedPlan?.name || '' },
                  { label: 'Phone', value: phone },
                  ...(requiresProfile ? [{ label: 'Profile', value: customerName || profileId }] : []),
                  { label: 'You pay', value: formatCurrency(requiredKobo), highlight: true },
                ]}
                walletBalanceKobo={afford.walletBalanceKobo}
                requiredKobo={requiredKobo}
                insufficientFunds={afford.insufficientFunds}
              />
              <ServiceEditLink onPress={() => setStep('details')} />
              <ServiceContinueButton
                label={afford.insufficientFunds ? 'Insufficient balance' : 'Pay with wallet'}
                onPress={() => setShowLock(true)}
                disabled={loading || afford.insufficientFunds}
              />
            </View>
          )}
        </ScreenBody>
      </ServicePurchaseScroll>

      <TransactionLockSheet
        visible={showLock}
        onClose={() => {
          if (loading) return;
          setShowLock(false);
        }}
        onAuthorized={handlePurchase}
        title="Confirm PIN purchase"
        subtitle={`Authorize ${formatCurrency(requiredKobo)} for ${selectedPlan?.name || 'exam PIN'}`}
        amount={formatCurrency(requiredKobo)}
        processing={loading}
        processingMessage="Processing purchase"
        processingSubmessage="Completing your exam PIN order"
        processingIcon="school-outline"
      />

      {successMeta ? (
        <PurchaseSuccessModal
          visible={showSuccessModal}
          {...successMeta}
          onDone={handleSuccessDone}
          onViewReceipt={handleViewReceipt}
        />
      ) : null}
    </ThemedScreen>
  );
}

export default function EducationRoute() {
  const styles = useStyles();

  return (
    <ServiceGate serviceCode={SERVICE_CODES.education} title="Education">
      <EducationScreen />
    </ServiceGate>
  );
}

const createStyles = (colors: import('../../src/theme/types').ThemeColors) => StyleSheet.create({
  scrollWrap: { flexGrow: 1 },
  stack: { gap: 14, paddingTop: SERVICE_SCROLL_TOP_INSET, paddingBottom: 24 },
  loadRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, justifyContent: 'center' },
  loadText: { ...Typography.small, color: colors.muted },
  planList: { gap: 8 },
  planItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: Radius.md,
    padding: 14,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  planItemActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryMuted,
  },
  planLeft: { flex: 1, paddingRight: 10 },
  planRight: { alignItems: 'flex-end', gap: 4 },
  planName: { ...Typography.smallMed, color: colors.dark, marginBottom: 4 },
  planNameActive: { color: colors.primary },
  planMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  planMetaText: { ...Typography.caption, color: colors.muted, textTransform: 'capitalize' },
  planPrice: { ...Typography.bodyMed, color: colors.dark, fontWeight: '700' },
  planPriceActive: { color: colors.primary },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    ...Typography.body,
    color: colors.dark,
    backgroundColor: colors.card,
    marginBottom: 10,
  },
  verifyBtn: {
    backgroundColor: colors.primary,
    borderRadius: Radius.md,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 8,
  },
  verifyBtnText: { color: colors.white, fontWeight: '700' },
  customerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.successLight,
    borderRadius: Radius.md,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.success + '33',
  },
  customerText: { ...Typography.smallMed, color: colors.successDark },
  muted: { ...Typography.body, color: colors.muted, textAlign: 'center', paddingVertical: 12 },
});

function useStyles() {
  return useThemedStyles(createStyles);
}
