import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Keyboard,
} from 'react-native';
import { useState, useCallback } from 'react';
import { api, formatCurrency, isResponseSuccess, parseWalletBalanceKobo } from '../lib/api';
import { useWalletStore } from '../stores';
import { Colors, Spacing, Typography, Radius } from '../theme';
import { showToast } from '../components/ui/Toast';
import { NetworkProviderGrid } from '../components/NetworkProviderGrid';
import { PhoneNumberInput } from '../components/PhoneNumberInput';
import { ServiceScreenHeader } from '../components/ServiceScreenHeader';
import { getProviderLogo, getProviderCode } from '../lib/providers';
import { useHardwareBack } from '../hooks/useHardwareBack';
import { navigateBack } from '../lib/navigation';
import { ThemedScreen } from '../components/ui/ThemedScreen';
import { PurchaseConfirmCard } from '../components/purchase/PurchaseConfirmCard';
import {
  ServiceSectionLabel,
  ServicePurchaseCard,
  ServiceContinueButton,
  ServiceDetectedBadge,
  ServiceSecureNote,
  ServiceCardDivider,
  ServiceEditLink,
} from '../components/purchase/ServicePurchaseUi';
import { TransactionLockSheet } from '../components/security/TransactionLockSheet';
import type { TransactionAuthPayload } from '../hooks/useTransactionLockAuth';
import { useCachedServiceProviders } from '../hooks/useServiceCatalog';
import { useNetworkAutoDetect } from '../hooks/useNetworkAutoDetect';
import { formatPhoneDisplay } from '../lib/phone';
import { ScreenBody } from '../components/ui/ScreenBody';

const QUICK_AMOUNTS = [100, 200, 500, 1000, 2000, 5000];

export default function AirtimePurchaseScreen() {
  const { balance, setBalance } = useWalletStore();
  const { providers, loading: loadingProviders } = useCachedServiceProviders('airtime');
  const [selectedNetwork, setSelectedNetwork] = useState('');
  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState('');
  const [step, setStep] = useState<'details' | 'confirm'>('details');
  const [showLock, setShowLock] = useState(false);
  const [loading, setLoading] = useState(false);
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

  const handleContinue = () => {
    if (!selectedNetwork) { showToast({ type: 'error', text1: 'Select Network', text2: 'Please select a network provider' }); return; }
    if (!isPhoneComplete) { showToast({ type: 'error', text1: 'Invalid Phone', text2: 'Enter a valid Nigerian phone number' }); return; }
    const amt = parseFloat(amount);
    if (!amount || isNaN(amt) || amt < 100) { showToast({ type: 'error', text1: 'Invalid Amount', text2: 'Minimum airtime amount is ₦100' }); return; }
    Keyboard.dismiss();
    setStep('confirm');
  };

  const handlePurchase = async (auth: TransactionAuthPayload) => {
    setLoading(true);
    try {
      const res = await api.purchaseAirtime({ network: selectedNetwork, phone: normalizedPhone, amount: parseFloat(amount), ...auth });
      if (res.success) {
        const balRes = await api.getWalletBalance();
        if (isResponseSuccess(balRes)) setBalance(parseWalletBalanceKobo(balRes.data));
        showToast({ type: 'success', text1: 'Airtime Sent! 🎉', text2: `₦${parseFloat(amount).toLocaleString()} sent to ${normalizedPhone}` });
        setShowLock(false);
        setTimeout(() => { setPhone(''); setAmount(''); setStep('details'); setSelectedNetwork(''); }, 1500);
      } else {
        showToast({ type: 'error', text1: 'Purchase Failed', text2: res.message || 'Please try again' });
      }
    } catch (err: any) {
      showToast({ type: 'error', text1: 'Purchase Failed', text2: err?.data?.message || err?.message || 'Please try again' });
    } finally { setLoading(false); }
  };

  const selectedProv = providers.find(p => getProviderCode(p) === selectedNetwork.toLowerCase());
  const parsedAmount = parseFloat(amount);

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
        title="Buy Airtime"
        subtitle="Instant recharge"
        icon="phone-portrait-outline"
        balanceLabel={formatCurrency(balance)}
        onBack={handleBack}
        stepProgress={{
          activeIndex: step === 'confirm' ? 1 : 0,
          labels: ['Details', 'Confirm'],
        }}
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
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

            <ServicePurchaseCard>
              <ServiceSectionLabel title="Amount" hint="Min ₦100" icon="cash-outline" />
              <View style={[styles.amountWrap, amount ? styles.amountWrapFilled : null]}>
                <Text style={styles.nairaSign}>₦</Text>
                <TextInput
                  style={styles.amountInput}
                  placeholder="0"
                  placeholderTextColor={Colors.mutedLight}
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="number-pad"
                />
              </View>
              <View style={styles.quickGrid}>
                {QUICK_AMOUNTS.map(a => {
                  const active = amount === String(a);
                  return (
                    <TouchableOpacity
                      key={a}
                      style={[styles.quickChip, active && styles.quickChipActive]}
                      onPress={() => setAmount(String(a))}
                      activeOpacity={0.75}
                    >
                      <Text style={[styles.quickText, active && styles.quickTextActive]}>
                        ₦{a >= 1000 ? `${a / 1000}k` : a}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ServicePurchaseCard>

            <ServiceContinueButton label="Continue" onPress={handleContinue} />
          </>
        )}

        {step === 'confirm' && (
          <>
            <PurchaseConfirmCard
              accent="airtime"
              eyebrow="You're paying"
              amount={`₦${parsedAmount.toLocaleString()}`}
              title={`Airtime to ${selectedProv?.name || selectedNetwork}`}
              chip={formatPhoneDisplay(phone)}
              logo={selectedProv ? getProviderLogo(selectedProv) : undefined}
              icon="phone-portrait-outline"
              rows={[
                { label: 'Recipient', value: formatPhoneDisplay(phone) },
                { label: 'Network', value: selectedProv?.name || selectedNetwork },
                { label: 'You pay', value: `₦${parsedAmount.toLocaleString()}`, highlight: true },
              ]}
            />

            <ServiceSecureNote text="Secured payment · Instant delivery" />

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
        title="Confirm airtime purchase"
        subtitle={`Authorize ₦${parsedAmount.toLocaleString()} airtime to ${formatPhoneDisplay(phone)}`}
        amount={`₦${parsedAmount.toLocaleString()}`}
        processing={loading}
      />
    </ThemedScreen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: 40 },
  amountWrap: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: Colors.borderMid,
    borderRadius: Radius.lg, backgroundColor: Colors.surface,
    paddingHorizontal: 18, height: 64, gap: 6,
  },
  amountWrapFilled: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryMuted,
  },
  nairaSign: { fontSize: 22, fontWeight: '700', color: Colors.primary },
  amountInput: {
    flex: 1, fontSize: 32, fontWeight: '800',
    color: Colors.primaryDeep, paddingVertical: 0,
  },
  quickGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14,
  },
  quickChip: {
    width: '30%', flexGrow: 1,
    paddingVertical: 11, borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center',
  },
  quickChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  quickText: { ...Typography.smallMed, color: Colors.mid, fontWeight: '600' },
  quickTextActive: { color: Colors.white },
});
