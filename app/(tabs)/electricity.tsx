import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Keyboard,
} from 'react-native';
import { useState, useCallback, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { api, formatCurrency, isResponseSuccess, parseWalletBalanceKobo, type ElectricityProvider } from '../../src/lib/api';
import { useWalletStore } from '../../src/stores';
import {Colors, Typography, Radius , Overlays, useThemedStyles } from '../../src/theme';
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
import { nairaToKobo } from '../../src/lib/wallet-affordability';
import { ScreenBody } from '../../src/components/ui/ScreenBody';
import { DiscoPickerModal } from '../../src/components/DiscoPickerModal';
import { DiscoLogo } from '../../src/components/DiscoLogo';
import { getDiscoDisplayName, getDiscoLogo } from '../../src/lib/disco-providers';
import { useElectricityDiscos } from '../../src/hooks/useElectricityDiscos';
import {
  getCachedElectricityDiscos,
  peekCachedElectricityDiscos,
  preloadElectricityDiscos,
} from '../../src/lib/electricity-discos-cache';

const QUICK_AMOUNTS = [1000, 2000, 5000, 10000, 20000];

export default function ElectricityScreen() {
  const styles = useStyles();

  const { balance, setBalance } = useWalletStore();
  const { discos, loading: loadingDiscos } = useElectricityDiscos();
  const [selectedDiscoProvider, setSelectedDiscoProvider] = useState<ElectricityProvider | null>(null);
  const [showDiscoPicker, setShowDiscoPicker] = useState(false);
  const [meterNumber, setMeterNumber] = useState('');
  const [meterType, setMeterType] = useState<'prepaid' | 'postpaid'>('prepaid');
  const [amount, setAmount] = useState('');
  const [phone, setPhone] = useState('');
  const [step, setStep] = useState<'details' | 'amount' | 'confirm'>('details');
  const [showLock, setShowLock] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verification, setVerification] = useState<{ customerName?: string; address?: string } | null>(null);

  const selectedDisco = selectedDiscoProvider?.code || '';
  const selectedDiscoName = selectedDiscoProvider ? getDiscoDisplayName(selectedDiscoProvider) : '';

  const openDiscoPicker = useCallback(() => {
    setShowDiscoPicker(true);
    if (discos.length === 0) {
      void getCachedElectricityDiscos();
    }
  }, [discos.length]);

  const handleSelectDisco = useCallback((provider: ElectricityProvider) => {
    setSelectedDiscoProvider(provider);
    setShowDiscoPicker(false);
  }, []);

  const handleVerify = async () => {
    if (!selectedDisco) { showToast({ type: 'error', text1: 'Select DISCO', text2: 'Please select a DISCO provider' }); return; }
    if (!meterNumber) { showToast({ type: 'error', text1: 'Enter Meter Number', text2: 'Please enter your meter number' }); return; }
    Keyboard.dismiss(); setVerifying(true);
    try {
      const res = await api.verifyElectricityMeter({ disco: selectedDisco, meterNumber, meterType });
      if (res.success && res.data) {
        setVerification(res.data); setStep('amount');
        showToast({ type: 'success', text1: 'Meter Verified ✓', text2: res.data.customerName || 'Customer verified' });
      } else {
        showToast({ type: 'error', text1: 'Verification Failed', text2: res.message || 'Check meter number and try again' });
      }
    } catch (err: any) {
      showToast({ type: 'error', text1: 'Verification Failed', text2: err?.data?.message || err?.message || 'Could not verify meter' });
    } finally { setVerifying(false); }
  };

  const handleContinueToConfirm = () => {
    if (!amount || parseFloat(amount) < 100) {
      showToast({ type: 'error', text1: 'Invalid Amount', text2: 'Minimum amount is ₦100' });
      return;
    }
    Keyboard.dismiss();
    setStep('confirm');
  };

  const handlePay = async (auth: TransactionAuthPayload) => {
    setLoading(true);
    try {
      const res = await api.purchaseElectricity({ disco: selectedDisco, meterNumber, meterType, amount: parseFloat(amount), phone: phone || undefined, ...auth });
      if (res.success) {
        const balRes = await api.getWalletBalance();
        if (isResponseSuccess(balRes)) setBalance(parseWalletBalanceKobo(balRes.data));
        const token = res.data?.token || res.data?.purchasedToken;
        showToast({ type: 'success', text1: 'Payment Successful! ⚡', text2: token ? `Token: ${token}` : `₦${parseFloat(amount).toLocaleString()} electricity purchased` });
        setTimeout(() => {
          setMeterNumber('');
          setAmount('');
          setPhone('');
          setVerification(null);
          setSelectedDiscoProvider(null);
          setStep('details');
        }, 2000);
      } else {
        showToast({ type: 'error', text1: 'Payment Failed', text2: res.message || 'Please try again' });
      }
    } catch (err: any) {
      showToast({ type: 'error', text1: 'Payment Failed', text2: err?.data?.message || err?.message || 'Please try again' });
    } finally {
      setLoading(false);
      setShowLock(false);
    }
  };

  const stepIndex = step === 'details' ? 0 : step === 'amount' ? 1 : 2;
  const STEPS = ['Meter', 'Amount', 'Confirm'];
  const requiredKobo = nairaToKobo(parseFloat(amount || '0'));
  const afford = useWalletAffordability(requiredKobo, step === 'confirm');

  const handleBack = useCallback(() => {
    if (showLock) {
      setShowLock(false);
      return;
    }
    if (showDiscoPicker) {
      setShowDiscoPicker(false);
      return;
    }
    if (step === 'confirm') {
      setStep('amount');
      return;
    }
    if (step === 'amount') {
      setStep('details');
      setVerification(null);
      setAmount('');
      return;
    }
    navigateBack();
  }, [step, showLock, showDiscoPicker]);

  useHardwareBack(handleBack);

  useEffect(() => {
    preloadElectricityDiscos();
  }, []);

  return (
    <ThemedScreen>
      <ServiceScreenHeader
        title="Pay Electricity"
        subtitle="Power your home instantly"
        icon="flash-outline"
        balanceLabel={formatCurrency(balance)}
        onBack={handleBack}
        stepProgress={{
          activeIndex: stepIndex,
          labels: STEPS,
        }}
      />

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <ScreenBody>

        {step === 'details' && (
          <>
            <ServicePurchaseCard>
              <ServiceSectionLabel title="Select DISCO" icon="flash-outline" />
              <TouchableOpacity style={styles.discoSelector} onPress={openDiscoPicker} activeOpacity={0.85}>
                {selectedDiscoProvider ? (
                  <View style={styles.discoSelectorInner}>
                    <DiscoLogo provider={selectedDiscoProvider} size={32} />
                    <View style={styles.discoSelectorTextWrap}>
                      <Text style={styles.discoSelectorText}>{selectedDiscoName}</Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.discoSelectorInner}>
                    <View style={styles.discoSelectorIcon}>
                      <Ionicons name="flash-outline" size={16} color={Colors.primary} />
                    </View>
                    <Text style={styles.discoSelectorPlaceholder}>Choose distribution company</Text>
                  </View>
                )}
                <Ionicons name="chevron-down" size={16} color={Colors.mutedLight} />
              </TouchableOpacity>
            </ServicePurchaseCard>

            <ServicePurchaseCard>
              <ServiceSectionLabel title="Meter type" icon="speedometer-outline" />
              <View style={styles.typeRow}>
                {(['prepaid', 'postpaid'] as const).map(t => (
                  <TouchableOpacity key={t} style={[styles.typeBtn, meterType === t && styles.typeBtnActive]} onPress={() => setMeterType(t)}>
                    <Ionicons name={t === 'prepaid' ? 'battery-charging-outline' : 'receipt-outline'} size={17} color={meterType === t ? Colors.white : Colors.muted} />
                    <Text style={[styles.typeLabel, meterType === t && styles.typeLabelActive]}>{t.charAt(0).toUpperCase() + t.slice(1)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ServicePurchaseCard>

            <ServicePurchaseCard>
              <ServiceSectionLabel title="Meter number" icon="barcode-outline" />
              <View style={styles.inputWrap}>
                <Ionicons name="barcode-outline" size={18} color={Colors.muted} style={{ marginHorizontal: 12 }} />
                <TextInput style={styles.input} placeholder="Enter meter number"
                  placeholderTextColor={Colors.mutedLight} value={meterNumber}
                  onChangeText={setMeterNumber} keyboardType="number-pad" />
              </View>
            </ServicePurchaseCard>

            <ServiceContinueButton
              label={verifying ? 'Verifying...' : 'Verify Meter'}
              onPress={handleVerify}
              disabled={verifying || !selectedDisco || !meterNumber}
              loading={verifying}
            />
          </>
        )}

        {step === 'amount' && (
          <>
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

            <ServicePurchaseCard>
              <ServiceSectionLabel title="Amount" hint="Min ₦100" icon="cash-outline" />
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
            </ServicePurchaseCard>

            <ServicePurchaseCard>
              <ServiceSectionLabel title="Phone" hint="Optional" icon="call-outline" />
              <View style={styles.inputWrap}>
                <Ionicons name="phone-portrait-outline" size={16} color={Colors.muted} style={{ marginHorizontal: 12 }} />
                <TextInput style={styles.input} placeholder="08012345678 (optional)"
                  placeholderTextColor={Colors.mutedLight} value={phone}
                  onChangeText={setPhone} keyboardType="phone-pad" maxLength={11} />
              </View>
            </ServicePurchaseCard>

            <ServiceContinueButton
              label="Continue"
              onPress={handleContinueToConfirm}
              disabled={!amount || parseFloat(amount) < 100}
            />
          </>
        )}

        {step === 'confirm' && (
          <>
            <PurchaseConfirmCard
              eyebrow="You're paying"
              amount={`₦${parseFloat(amount || '0').toLocaleString()}`}
              title={`Electricity · ${selectedDiscoName}`}
              chip={`${meterType} · ${meterNumber}`}
              logo={selectedDiscoProvider ? getDiscoLogo(selectedDiscoProvider) : undefined}
              icon="flash-outline"
              rows={[
                { label: 'DISCO', value: selectedDiscoName },
                { label: 'Meter type', value: meterType.charAt(0).toUpperCase() + meterType.slice(1) },
                { label: 'Meter number', value: meterNumber },
                { label: 'Customer', value: verification?.customerName || '—' },
                ...(phone ? [{ label: 'Phone', value: phone }] : []),
                { label: 'You pay', value: `₦${parseFloat(amount).toLocaleString()}`, highlight: true },
              ]}
              walletBalanceKobo={afford.walletBalanceKobo}
              requiredKobo={requiredKobo}
              insufficientFunds={afford.insufficientFunds}
            />

            <ServiceContinueButton
              label={afford.insufficientFunds ? 'Insufficient balance' : `Pay ₦${parseFloat(amount || '0').toLocaleString()}`}
              onPress={() => setShowLock(true)}
              disabled={loading || afford.insufficientFunds}
              icon="flash"
            />

            <ServiceEditLink onPress={() => setStep('amount')} />
          </>
        )}
      </ScreenBody>
      </ScrollView>

      <DiscoPickerModal
        visible={showDiscoPicker}
        providers={discos.length > 0 ? discos : (peekCachedElectricityDiscos() ?? [])}
        loading={loadingDiscos && discos.length === 0}
        selectedCode={selectedDisco}
        onClose={() => setShowDiscoPicker(false)}
        onSelect={handleSelectDisco}
      />

      <TransactionLockSheet
        visible={showLock}
        onClose={() => {
          if (loading) return;
          setShowLock(false);
        }}
        onAuthorized={handlePay}
        title="Confirm electricity payment"
        subtitle={`Authorize ₦${parseFloat(amount || '0').toLocaleString()} for meter ${meterNumber}`}
        amount={`₦${parseFloat(amount || '0').toLocaleString()}`}
        processing={loading}
        processingMessage="Processing payment"
        processingSubmessage="Purchasing electricity token for your meter"
        processingIcon="flash-outline"
      />
    </ThemedScreen>
  );
}

const createStyles = (colors: import('../../src/theme/types').ThemeColors) => StyleSheet.create({
  scroll: { paddingTop: SERVICE_SCROLL_TOP_INSET, paddingBottom: 40 },
  discoSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: Overlays.borderPrimary22,
    borderRadius: Radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.primaryMuted,
    minHeight: 52,
  },
  discoSelectorInner: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  discoSelectorIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  discoSelectorTextWrap: { flex: 1 },
  discoSelectorText: { ...Typography.smallMed, color: colors.dark },
  discoSelectorPlaceholder: { ...Typography.small, color: colors.mutedLight, flex: 1 },
  typeRow: { flexDirection: 'row', gap: 10 },
  typeBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    paddingVertical: 12, borderRadius: Radius.md, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface,
  },
  typeBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  typeLabel: { ...Typography.smallMed, color: colors.muted },
  typeLabelActive: { color: colors.white },
  inputWrap: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: colors.border, borderRadius: Radius.md, backgroundColor: colors.surface, height: 52 },
  input: { flex: 1, fontSize: 15, color: colors.dark, paddingVertical: 0 },
  amountWrap: { flexDirection: 'row', alignItems: 'center', borderWidth: 2, borderColor: colors.primary, borderRadius: Radius.md, backgroundColor: colors.card, paddingHorizontal: 16, height: 60, gap: 8 },
  nairaSign: { fontSize: 24, fontWeight: '700', color: colors.primary },
  amountInput: { flex: 1, fontSize: 26, fontWeight: '800', color: colors.primary, paddingVertical: 0 },
  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  quickBtn: { paddingVertical: 7, paddingHorizontal: 14, borderRadius: Radius.full, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  quickBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  quickText: { ...Typography.captionMed, color: colors.muted },
  quickTextActive: { color: colors.white, fontWeight: '700' },
  verifiedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.successLight,
    borderRadius: Radius.xl,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.success + '33',
  },
  verifiedIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.surfaceAlt, justifyContent: 'center', alignItems: 'center' },
  verifiedName: { ...Typography.smallMed, color: colors.successDark, marginBottom: 2 },
  verifiedAddr: { ...Typography.caption, color: colors.success, marginBottom: 2 },
  verifiedMeter: { ...Typography.caption, color: colors.success },
  changeBtn: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: colors.surfaceAlt, borderRadius: Radius.sm },
  changeText: { ...Typography.captionMed, color: colors.primary },
});

function useStyles() {
  return useThemedStyles(createStyles);
}
