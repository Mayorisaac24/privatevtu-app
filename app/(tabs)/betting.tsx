import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Keyboard,
} from 'react-native';
import { useState, useCallback, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { api, formatCurrency, isResponseSuccess, parseWalletBalanceKobo, type BettingPlatform } from '../../src/lib/api';
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
import { ScreenBody } from '../../src/components/ui/ScreenBody';
import { BettingPlatformPickerModal } from '../../src/components/BettingPlatformPickerModal';
import { BettingPlatformLogo } from '../../src/components/BettingPlatformLogo';
import { getBettingPlatformDisplayName } from '../../src/lib/betting-platforms';

const QUICK_AMOUNTS = [500, 1000, 2000, 5000, 10000];

export default function BettingScreen() {
  const { balance, setBalance } = useWalletStore();
  const [platforms, setPlatforms] = useState<BettingPlatform[]>([]);
  const [loadingPlatforms, setLoadingPlatforms] = useState(true);
  const [selectedPlatform, setSelectedPlatform] = useState<BettingPlatform | null>(null);
  const [showPlatformPicker, setShowPlatformPicker] = useState(false);
  const [accountNumber, setAccountNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [step, setStep] = useState<'details' | 'amount' | 'confirm'>('details');
  const [showLock, setShowLock] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verificationMessage, setVerificationMessage] = useState<string | null>(null);

  const minAmountNaira = selectedPlatform ? Math.max(100, Math.round(Number(selectedPlatform.minAmount || 10000) / 100)) : 100;
  const maxAmountNaira = selectedPlatform ? Math.round(Number(selectedPlatform.maxAmount || 100000000) / 100) : 1000000;

  const openPlatformPicker = useCallback(() => {
    setShowPlatformPicker(true);
  }, []);

  const handleSelectPlatform = useCallback((platform: BettingPlatform) => {
    setSelectedPlatform(platform);
    setVerificationMessage(null);
    setShowPlatformPicker(false);
  }, []);

  useEffect(() => {
    (async () => {
      setLoadingPlatforms(true);
      try {
        const res = await api.getBettingPlatforms();
        if (res.success && Array.isArray(res.data)) {
          setPlatforms(res.data);
        } else {
          setPlatforms([]);
        }
      } catch {
        setPlatforms([]);
      } finally {
        setLoadingPlatforms(false);
      }
    })();
  }, []);

  const handleVerify = async () => {
    if (!selectedPlatform) {
      showToast({ type: 'error', text1: 'Select platform', text2: 'Choose a betting platform first' });
      return;
    }
    if (!accountNumber.trim()) {
      showToast({ type: 'error', text1: 'Enter account ID', text2: 'Please enter your betting account ID' });
      return;
    }
    Keyboard.dismiss();
    setVerifying(true);
    try {
      const res = await api.verifyBettingAccount({
        platform: selectedPlatform.code,
        accountNumber: accountNumber.trim(),
      });
      if (res.success) {
        setVerificationMessage(res.data?.message || res.message || 'Account validated');
        setStep('amount');
        showToast({ type: 'success', text1: 'Account verified', text2: res.data?.message || 'You can proceed to fund' });
      } else {
        showToast({ type: 'error', text1: 'Verification failed', text2: res.message || 'Check account ID and try again' });
      }
    } catch (err: any) {
      showToast({ type: 'error', text1: 'Verification failed', text2: err?.data?.message || err?.message || 'Could not verify account' });
    } finally {
      setVerifying(false);
    }
  };

  const handleContinueToConfirm = () => {
    const value = parseFloat(amount);
    if (!value || value < minAmountNaira) {
      showToast({ type: 'error', text1: 'Invalid amount', text2: `Minimum amount is ₦${minAmountNaira.toLocaleString()}` });
      return;
    }
    if (value > maxAmountNaira) {
      showToast({ type: 'error', text1: 'Invalid amount', text2: `Maximum amount is ₦${maxAmountNaira.toLocaleString()}` });
      return;
    }
    Keyboard.dismiss();
    setStep('confirm');
  };

  const handlePay = async (auth: TransactionAuthPayload) => {
    if (!selectedPlatform) return;
    setLoading(true);
    try {
      const res = await api.fundBettingAccount({
        platform: selectedPlatform.code,
        accountNumber: accountNumber.trim(),
        amount: parseFloat(amount),
        ...auth,
      });
      if (res.success) {
        const balRes = await api.getWalletBalance();
        if (isResponseSuccess(balRes)) setBalance(parseWalletBalanceKobo(balRes.data));
        showToast({
          type: 'success',
          text1: 'Funding submitted',
          text2: res.message || `₦${parseFloat(amount).toLocaleString()} betting wallet funding is processing`,
        });
        setShowLock(false);
        setTimeout(() => {
          setAccountNumber('');
          setAmount('');
          setVerificationMessage(null);
          setSelectedPlatform(null);
          setStep('details');
        }, 2000);
      } else {
        showToast({ type: 'error', text1: 'Funding failed', text2: res.message || 'Please try again' });
      }
    } catch (err: any) {
      showToast({ type: 'error', text1: 'Funding failed', text2: err?.data?.message || err?.message || 'Please try again' });
    } finally {
      setLoading(false);
    }
  };

  const stepIndex = step === 'details' ? 0 : step === 'amount' ? 1 : 2;
  const STEPS = ['Account', 'Amount', 'Confirm'];

  const handleBack = useCallback(() => {
    if (showLock) {
      setShowLock(false);
      return;
    }
    if (showPlatformPicker) {
      setShowPlatformPicker(false);
      return;
    }
    if (step === 'confirm') {
      setStep('amount');
      return;
    }
    if (step === 'amount') {
      setStep('details');
      setAmount('');
      return;
    }
    navigateBack();
  }, [step, showLock, showPlatformPicker]);

  useHardwareBack(handleBack);

  return (
    <ThemedScreen>
      <ServiceScreenHeader
        title="Fund Betting"
        subtitle="Top up your betting wallet"
        icon="trophy-outline"
        balanceLabel={formatCurrency(balance)}
        onBack={handleBack}
        stepProgress={{ activeIndex: stepIndex, labels: STEPS }}
      />

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <ScreenBody>
          {step === 'details' && (
            <>
              <ServicePurchaseCard>
                <ServiceSectionLabel title="Select platform" icon="trophy-outline" />
                <TouchableOpacity style={styles.platformSelector} onPress={openPlatformPicker} activeOpacity={0.85}>
                  {selectedPlatform ? (
                    <View style={styles.platformSelectorInner}>
                      <BettingPlatformLogo platform={selectedPlatform} size={32} />
                      <View style={styles.platformSelectorTextWrap}>
                        <Text style={styles.platformSelectorText}>{getBettingPlatformDisplayName(selectedPlatform)}</Text>
                      </View>
                    </View>
                  ) : (
                    <View style={styles.platformSelectorInner}>
                      <View style={styles.platformSelectorIcon}>
                        <Ionicons name="trophy-outline" size={16} color={Colors.primary} />
                      </View>
                      <Text style={styles.platformSelectorPlaceholder}>Choose betting platform</Text>
                    </View>
                  )}
                  <Ionicons name="chevron-down" size={16} color={Colors.mutedLight} />
                </TouchableOpacity>
              </ServicePurchaseCard>

              <ServicePurchaseCard>
                <ServiceSectionLabel title="Account ID" icon="person-outline" />
                <View style={styles.inputWrap}>
                  <Ionicons name="person-outline" size={18} color={Colors.muted} style={{ marginHorizontal: 12 }} />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter betting account ID"
                    placeholderTextColor={Colors.mutedLight}
                    value={accountNumber}
                    onChangeText={setAccountNumber}
                    keyboardType="number-pad"
                  />
                </View>
              </ServicePurchaseCard>

              <ServiceContinueButton
                label={verifying ? 'Verifying...' : 'Verify Account'}
                onPress={handleVerify}
                disabled={verifying || !selectedPlatform || !accountNumber.trim()}
                loading={verifying}
              />
            </>
          )}

          {step === 'amount' && (
            <>
              <View style={styles.verifiedBanner}>
                <View style={styles.verifiedIcon}><Ionicons name="checkmark-circle" size={22} color={Colors.success} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.verifiedName}>{selectedPlatform?.name || 'Account verified'}</Text>
                  <Text style={styles.verifiedMeter}>{accountNumber}</Text>
                  {verificationMessage ? <Text style={styles.verifiedAddr} numberOfLines={2}>{verificationMessage}</Text> : null}
                </View>
                <TouchableOpacity onPress={() => setStep('details')} style={styles.changeBtn}>
                  <Text style={styles.changeText}>Change</Text>
                </TouchableOpacity>
              </View>

              <ServicePurchaseCard>
                <ServiceSectionLabel title="Amount" hint={`Min ₦${minAmountNaira.toLocaleString()}`} icon="cash-outline" />
                <View style={styles.amountWrap}>
                  <Text style={styles.nairaSign}>₦</Text>
                  <TextInput
                    style={styles.amountInput}
                    placeholder="0.00"
                    placeholderTextColor={Colors.borderMid}
                    value={amount}
                    onChangeText={setAmount}
                    keyboardType="number-pad"
                    autoFocus
                  />
                </View>
                <View style={styles.quickRow}>
                  {QUICK_AMOUNTS.filter((a) => a >= minAmountNaira && a <= maxAmountNaira).map((a) => (
                    <TouchableOpacity key={a} style={[styles.quickBtn, amount === String(a) && styles.quickBtnActive]} onPress={() => setAmount(String(a))}>
                      <Text style={[styles.quickText, amount === String(a) && styles.quickTextActive]}>₦{a >= 1000 ? `${a / 1000}k` : a}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ServicePurchaseCard>

              <ServiceContinueButton label="Continue" onPress={handleContinueToConfirm} disabled={!amount || parseFloat(amount) < minAmountNaira} />
            </>
          )}

          {step === 'confirm' && selectedPlatform && (
            <>
              <PurchaseConfirmCard
                eyebrow="You're funding"
                amount={`₦${parseFloat(amount || '0').toLocaleString()}`}
                title={`Betting · ${selectedPlatform.name}`}
                chip={accountNumber}
                icon="trophy-outline"
                rows={[
                  { label: 'Platform', value: selectedPlatform.name },
                  { label: 'Account ID', value: accountNumber },
                  { label: 'You pay', value: `₦${parseFloat(amount).toLocaleString()}`, highlight: true },
                ]}
              />

              <ServiceContinueButton
                label={`Fund ₦${parseFloat(amount || '0').toLocaleString()}`}
                onPress={() => setShowLock(true)}
                disabled={loading}
                loading={loading}
                icon="trophy"
              />

              <ServiceEditLink onPress={() => setStep('amount')} />
            </>
          )}
        </ScreenBody>
      </ScrollView>

      <BettingPlatformPickerModal
        visible={showPlatformPicker}
        platforms={platforms}
        loading={loadingPlatforms}
        selectedCode={selectedPlatform?.code}
        onClose={() => setShowPlatformPicker(false)}
        onSelect={handleSelectPlatform}
      />

      <TransactionLockSheet
        visible={showLock}
        onClose={() => setShowLock(false)}
        onAuthorized={handlePay}
        title="Confirm betting funding"
        subtitle={`Authorize ₦${parseFloat(amount || '0').toLocaleString()} for ${accountNumber}`}
        amount={`₦${parseFloat(amount || '0').toLocaleString()}`}
      />
    </ThemedScreen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: 40 },
  platformSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.22)',
    borderRadius: Radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: Colors.primaryMuted,
    minHeight: 52,
  },
  platformSelectorInner: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  platformSelectorIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  platformSelectorTextWrap: { flex: 1 },
  platformSelectorText: { ...Typography.smallMed, color: Colors.dark },
  platformSelectorPlaceholder: { ...Typography.small, color: Colors.mutedLight, flex: 1 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.md, backgroundColor: Colors.surface, height: 52 },
  input: { flex: 1, fontSize: 15, color: Colors.dark, paddingVertical: 0, paddingRight: 14 },
  verifiedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.successLight,
    borderRadius: Radius.xl,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.success + '33',
  },
  verifiedIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: Colors.white, justifyContent: 'center', alignItems: 'center' },
  verifiedName: { ...Typography.smallMed, color: Colors.successDark, marginBottom: 2 },
  verifiedMeter: { ...Typography.caption, color: Colors.success },
  verifiedAddr: { ...Typography.caption, color: Colors.success, marginTop: 2 },
  changeBtn: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: Colors.white, borderRadius: Radius.sm },
  changeText: { ...Typography.captionMed, color: Colors.primary },
  amountWrap: { flexDirection: 'row', alignItems: 'center', borderWidth: 2, borderColor: Colors.primary, borderRadius: Radius.md, backgroundColor: Colors.primaryMuted, paddingHorizontal: 16, height: 60, gap: 8 },
  nairaSign: { fontSize: 24, fontWeight: '700', color: Colors.primary },
  amountInput: { flex: 1, fontSize: 26, fontWeight: '800', color: Colors.primary, paddingVertical: 0 },
  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  quickBtn: { paddingVertical: 7, paddingHorizontal: 14, borderRadius: Radius.full, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  quickBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  quickText: { ...Typography.captionMed, color: Colors.muted },
  quickTextActive: { color: Colors.white, fontWeight: '700' },
});
