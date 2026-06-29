import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Keyboard,
} from 'react-native';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { api, formatCurrency, isResponseSuccess, parseWalletBalanceKobo, type EducationPlan, type EducationProvider } from '../../src/lib/api';
import { useWalletStore } from '../../src/stores';
import { Colors, Typography, Radius } from '../../src/theme';
import { showToast } from '../../src/components/ui/Toast';
import { ServiceScreenHeader } from '../../src/components/ServiceScreenHeader';
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
import { ServiceGate } from '../../src/components/ServiceGate';
import { SERVICE_CODES } from '../../src/lib/service-availability';
import { ScreenBody } from '../../src/components/ui/ScreenBody';
import { EducationProviderGrid } from '../../src/components/EducationProviderGrid';
import { getEducationProviderDisplayName } from '../../src/lib/education-providers';

function mapEducationPlan(raw: Record<string, unknown>): EducationPlan {
  const platformPrice = Number(raw.platformPrice || 0);
  return {
    id: String(raw.id || ''),
    name: String(raw.name || 'Plan'),
    price: platformPrice / 100,
    platformPrice,
    description: raw.description ? String(raw.description) : null,
  };
}

function EducationScreen() {
  const { balance, setBalance } = useWalletStore();
  const [providers, setProviders] = useState<EducationProvider[]>([]);
  const [loadingProviders, setLoadingProviders] = useState(true);
  const [selectedProvider, setSelectedProvider] = useState('');
  const [plans, setPlans] = useState<EducationPlan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<EducationPlan | null>(null);
  const [phone, setPhone] = useState('');
  const [profileId, setProfileId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [step, setStep] = useState<'details' | 'confirm'>('details');
  const [showLock, setShowLock] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const requiresProfile = useMemo(
    () => selectedProvider === 'jamb' || providers.find((p) => p.code === selectedProvider)?.requiresProfile,
    [providers, selectedProvider],
  );

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await api.getEducationProviders();
        if (active && res.success && Array.isArray(res.data)) {
          setProviders(res.data);
        }
      } catch {
        if (active) setProviders([]);
      } finally {
        if (active) setLoadingProviders(false);
      }
    })();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!selectedProvider) {
      setPlans([]);
      setSelectedPlan(null);
      return;
    }
    let active = true;
    setLoadingPlans(true);
    setSelectedPlan(null);
    (async () => {
      try {
        const res = await api.getEducationPlans(selectedProvider);
        if (active && res.success && Array.isArray(res.data)) {
          setPlans((res.data as Record<string, unknown>[]).map(mapEducationPlan));
        } else if (active) {
          setPlans([]);
        }
      } catch {
        if (active) setPlans([]);
      } finally {
        if (active) setLoadingPlans(false);
      }
    })();
    return () => { active = false; };
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
      if (res.success) {
        const balRes = await api.getWalletBalance();
        if (isResponseSuccess(balRes)) setBalance(parseWalletBalanceKobo(balRes.data));
        showToast({ type: 'success', text1: 'PIN Purchase Started', text2: 'You will be notified when your PIN is ready' });
        setShowLock(false);
        setTimeout(() => {
          setPhone('');
          setProfileId('');
          setCustomerName('');
          setSelectedPlan(null);
          setSelectedProvider('');
          setStep('details');
        }, 1500);
      } else {
        showToast({ type: 'error', text1: 'Purchase Failed', text2: res.message || 'Please try again' });
      }
    } catch (err: any) {
      showToast({ type: 'error', text1: 'Purchase Failed', text2: err?.data?.message || err?.message || 'Please try again' });
    } finally {
      setLoading(false);
    }
  };

  const selectedProv = providers.find((p) => p.code === selectedProvider);
  const selectedProvName = selectedProv ? getEducationProviderDisplayName(selectedProv) : selectedProvider;

  const handleSelectProvider = useCallback((code: string) => {
    setSelectedProvider(code);
    setCustomerName('');
    setProfileId('');
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
        title="Education"
        subtitle="WAEC & JAMB exam pins"
        icon="school-outline"
        balanceLabel={formatCurrency(balance)}
        onBack={handleBack}
        stepProgress={{
          current: step === 'confirm' ? 2 : 1,
          total: 2,
          labels: ['Details', 'Confirm'],
        }}
      />
      <ScreenBody>
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {step === 'details' ? (
            <View style={styles.stack}>
              <ServicePurchaseCard>
                <ServiceSectionLabel>Exam body</ServiceSectionLabel>
                {loadingProviders ? (
                  <ActivityIndicator color={Colors.primary} style={{ marginVertical: 12 }} />
                ) : (
                  <EducationProviderGrid
                    providers={providers}
                    selectedCode={selectedProvider}
                    onSelect={handleSelectProvider}
                    loading={loadingProviders}
                  />
                )}
              </ServicePurchaseCard>

              {selectedProvider ? (
                <ServicePurchaseCard>
                  <ServiceSectionLabel>PIN package</ServiceSectionLabel>
                  {loadingPlans ? (
                    <ActivityIndicator color={Colors.primary} style={{ marginVertical: 12 }} />
                  ) : plans.length === 0 ? (
                    <Text style={styles.muted}>No plans available for this provider yet.</Text>
                  ) : (
                    <View style={styles.planList}>
                      {plans.map((plan) => {
                        const active = selectedPlan?.id === plan.id;
                        return (
                          <TouchableOpacity
                            key={plan.id}
                            style={[styles.planRow, active && styles.planRowActive]}
                            onPress={() => setSelectedPlan(plan)}
                          >
                            <View style={{ flex: 1 }}>
                              <Text style={styles.planName}>{plan.name}</Text>
                            </View>
                            <Text style={styles.planPrice}>{formatCurrency(plan.price)}</Text>
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
                      />
                      <TouchableOpacity style={styles.verifyBtn} onPress={handleVerifyProfile} disabled={verifying}>
                        {verifying ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.verifyBtnText}>Verify Profile</Text>}
                      </TouchableOpacity>
                      {customerName ? <Text style={styles.verifiedName}>✓ {customerName}</Text> : null}
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
                  />
                  <ServiceContinueButton onPress={handleContinue} />
                </ServicePurchaseCard>
              ) : null}
            </View>
          ) : (
            <View style={styles.stack}>
              <PurchaseConfirmCard
                title="Confirm PIN purchase"
                rows={[
                  { label: 'Provider', value: selectedProvName },
                  { label: 'Package', value: selectedPlan?.name || '' },
                  { label: 'Amount', value: formatCurrency(selectedPlan?.price || 0), emphasize: true },
                  { label: 'Phone', value: phone },
                  ...(requiresProfile ? [{ label: 'Profile', value: customerName || profileId }] : []),
                ]}
              />
              <ServiceEditLink onPress={() => setStep('details')} />
              <ServiceContinueButton label="Pay with wallet" onPress={() => setShowLock(true)} />
            </View>
          )}
        </ScrollView>
      </ScreenBody>

      <TransactionLockSheet
        visible={showLock}
        onClose={() => setShowLock(false)}
        onAuthorize={handlePurchase}
        loading={loading}
        amountLabel={formatCurrency(selectedPlan?.price || 0)}
      />
    </ThemedScreen>
  );
}

export default function EducationRoute() {
  return (
    <ServiceGate serviceCode={SERVICE_CODES.education} title="Education">
      <EducationScreen />
    </ServiceGate>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 14, paddingBottom: 24 },
  providerGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  providerChip: {
    minWidth: '47%',
    flexGrow: 1,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingVertical: 12,
    paddingHorizontal: 10,
    backgroundColor: Colors.white,
  },
  providerChipActive: { borderColor: Colors.primary, backgroundColor: Colors.primary + '12' },
  providerChipText: { ...Typography.body, color: Colors.dark, textAlign: 'center' },
  providerChipTextActive: { color: Colors.primary, fontWeight: '700' },
  planList: { gap: 8 },
  planRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    padding: 12,
    backgroundColor: Colors.white,
  },
  planRowActive: { borderColor: Colors.primary, backgroundColor: Colors.primary + '10' },
  planName: { ...Typography.body, color: Colors.dark, fontWeight: '600' },
  planPrice: { ...Typography.body, color: Colors.primary, fontWeight: '700' },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    ...Typography.body,
    color: Colors.dark,
    backgroundColor: Colors.white,
    marginBottom: 10,
  },
  verifyBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 8,
  },
  verifyBtnText: { color: Colors.white, fontWeight: '700' },
  verifiedName: { ...Typography.caption, color: Colors.success, marginBottom: 8 },
  muted: { ...Typography.body, color: Colors.muted },
});
