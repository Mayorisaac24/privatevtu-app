import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, Linking, KeyboardAvoidingView, Platform, Alert, RefreshControl,
  useWindowDimensions,
} from 'react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import {
  api,
  formatCurrencyVisible,
  isResponseSuccess,
  MASKED_BALANCE,
  type FundingBank,
  type PayvesselCheckoutSdkSession,
  type VirtualAccount,
  type WalletFundingMethods,
} from '../../src/lib/api';
import {
  filterDynamicBanks,
  filterStaticBanks,
  getBankDisplayName,
  normalizeBankCode,
  normalizeFundingBank,
} from '../../src/lib/funding-banks';
import { BankLogo } from '../../src/components/BankLogo';
import { BankPickerModal } from '../../src/components/BankPickerModal';
import { PayvesselCheckoutModal } from '../../src/components/PayvesselCheckoutModal';
import { LoadingOverlay } from '../../src/components/ui/LoadingOverlay';
import { ThemedScreen } from '../../src/components/ui/ThemedScreen';
import { GradientButton } from '../../src/components/ui/GradientButton';
import { GlassCard } from '../../src/components/ui/GlassCard';
import { GlassSurface } from '../../src/components/ui/GlassSurface';
import {
  EMPTY_FUNDING_METHODS,
  getWalletFundingData,
  hasWalletFundingCache,
  peekWalletFundingCache,
  pullToRefreshWalletFunding,
} from '../../src/lib/wallet-funding-cache';
import { refreshDashboardData } from '../../src/lib/dashboard-data';
import { formatAccountNumberDisplay } from '../../src/lib/transfer-banks';
import { useWalletStore } from '../../src/stores';
import { Colors, Spacing, Shadow, Radius } from '../../src/theme';
import { useGradients, useColors } from '../../src/theme/hooks';
import { gradientStops } from '../../src/theme/gradient-utils';
import { showToast } from '../../src/components/ui/Toast';
import { useHardwareBack } from '../../src/hooks/useHardwareBack';
import { useStatusBarStyle } from '../../src/hooks/useStatusBarStyle';
import { navigateBack } from '../../src/lib/navigation';
import { ServiceGate } from '../../src/components/ServiceGate';
import { SERVICE_CODES } from '../../src/lib/service-availability';
import { isAndroid, textStyle } from '../../src/lib/platform-ui';


const QUICK_AMOUNTS = [1000, 2000, 5000, 10000, 20000, 50000];

type FundMethod = 'checkout' | 'static' | 'dynamic' | 'paystack';

const METHOD_META: Record<FundMethod, { label: string; icon: string; subtitle: string }> = {
  checkout: { label: 'Checkout', icon: 'globe-outline', subtitle: 'Bank transfer page' },
  static: { label: 'Permanent', icon: 'wallet-outline', subtitle: 'Dedicated account' },
  dynamic: { label: 'One-time', icon: 'time-outline', subtitle: 'Expires in 5 min' },
  paystack: { label: 'Paystack', icon: 'card-outline', subtitle: 'Card & bank' },
};

function sanitizeAmountInput(raw: string): string {
  const cleaned = raw.replace(/[^\d.]/g, '');
  const parts = cleaned.split('.');
  if (parts.length <= 1) return parts[0];
  return `${parts[0]}.${parts[1].slice(0, 2)}`;
}

function formatAmountDisplay(raw: string): string {
  if (!raw) return '';
  const [whole, decimal] = raw.split('.');
  const formattedWhole = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return decimal !== undefined ? `${formattedWhole}.${decimal}` : formattedWhole;
}

function enabledMethods(m: WalletFundingMethods): FundMethod[] {
  const list: FundMethod[] = [];
  if (m.permanentVirtualAccount) list.push('static');
  if (m.payvesselCheckout) list.push('checkout');
  if (m.dynamicVirtualAccount) list.push('dynamic');
  if (m.paystackCheckout) list.push('paystack');
  return list;
}

function formatExpiry(expiresAt?: string | null): string {
  if (!expiresAt) return '';
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return 'Expired';
  const mins = Math.floor(diff / 60000);
  const secs = Math.floor((diff % 60000) / 1000);
  return `${mins}m ${secs}s left`;
}

function FundWalletScreen() {
  useStatusBarStyle('light');
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const colors = useColors();
  const gradients = useGradients();
  const { balance, balanceVisible } = useWalletStore();
  const fundingCache = peekWalletFundingCache();

  const [methods, setMethods] = useState<WalletFundingMethods>(
    () => fundingCache?.methods ?? EMPTY_FUNDING_METHODS,
  );
  const [activeMethod, setActiveMethod] = useState<FundMethod>('static');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(() => !hasWalletFundingCache());
  const [virtualAccounts, setVirtualAccounts] = useState<VirtualAccount[]>(
    () => fundingCache?.virtualAccounts ?? [],
  );
  const [dynamicAccount, setDynamicAccount] = useState<VirtualAccount | null>(null);
  const [selectedBanks, setSelectedBanks] = useState<Set<string>>(new Set());
  const [pendingCheckoutRef, setPendingCheckoutRef] = useState<string | null>(null);
  const [pendingCheckoutGateway, setPendingCheckoutGateway] = useState<'payvessel' | 'paystack' | null>(null);
  const [staticBanks, setStaticBanks] = useState<FundingBank[]>(() => fundingCache?.staticBanks ?? []);
  const [dynamicBanks, setDynamicBanks] = useState<FundingBank[]>(() => fundingCache?.dynamicBanks ?? []);
  const [expiryLabel, setExpiryLabel] = useState('');
  const [hasBvn, setHasBvn] = useState<boolean | null>(() => (fundingCache ? fundingCache.hasBvn : null));
  const [showDynamicBankPicker, setShowDynamicBankPicker] = useState(false);
  const [pickerBanks, setPickerBanks] = useState<FundingBank[]>([]);
  const [pendingDynamicForceCreate, setPendingDynamicForceCreate] = useState(false);
  const [fetchingDynamicBanks, setFetchingDynamicBanks] = useState(false);
  const [payvesselCheckoutSession, setPayvesselCheckoutSession] = useState<PayvesselCheckoutSdkSession | null>(null);
  const [payvesselCheckoutVisible, setPayvesselCheckoutVisible] = useState(false);
  const [checkoutOverlayVisible, setCheckoutOverlayVisible] = useState(false);
  const [staticAccountOverlayVisible, setStaticAccountOverlayVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const numericAmount = parseFloat(amount.replace(/,/g, ''));
  const isValidAmount = !isNaN(numericAmount) && numericAmount >= 100;
  const displayAmount = useMemo(() => formatAmountDisplay(amount), [amount]);

  const staticAccounts = useMemo(
    () => virtualAccounts.filter((a) => a.isPermanent && a.isActive !== false),
    [virtualAccounts]
  );

  const existingBankCodes = useMemo(() => {
    const codes = new Set<string>();
    for (const account of staticAccounts) {
      if (account.bankCode) {
        codes.add(normalizeBankCode(account.bankCode));
        continue;
      }
      const matched = staticBanks.find(
        (b) =>
          account.bankName?.toLowerCase().includes(b.name.toLowerCase().split(' ')[0])
          || b.name.toLowerCase().includes(account.bankName?.toLowerCase() ?? '')
      );
      if (matched) codes.add(normalizeBankCode(matched.code));
    }
    return codes;
  }, [staticAccounts, staticBanks]);

  const availableBanksToCreate = useMemo(
    () => staticBanks.filter((b) => !existingBankCodes.has(normalizeBankCode(b.code))),
    [staticBanks, existingBankCodes]
  );

  const bankByCode = useMemo(() => {
    const map = new Map<string, FundingBank>();
    [...staticBanks, ...dynamicBanks].forEach((bank) => map.set(bank.code, bank));
    return map;
  }, [staticBanks, dynamicBanks]);

  const selectedBanksToCreate = useMemo(
    () => availableBanksToCreate.filter((b) => selectedBanks.has(b.code)),
    [availableBanksToCreate, selectedBanks]
  );

  const availableMethods = useMemo(() => enabledMethods(methods), [methods]);
  const dynamicMethodAvailable = methods.dynamicVirtualAccount;

  const methodTabsLayout = useMemo(() => {
    const count = availableMethods.length;
    const gap = 10;
    const maxWidth = 118;
    const minWidth = 76;
    const availableWidth = screenWidth - Spacing.page * 2;

    if (count === 0) {
      return { tabWidth: maxWidth, scrollable: false, tight: false, gap };
    }

    const maxTotal = count * maxWidth + (count - 1) * gap;
    if (maxTotal <= availableWidth) {
      return { tabWidth: maxWidth, scrollable: false, tight: false, gap };
    }

    const fitted = (availableWidth - (count - 1) * gap) / count;
    const tabWidth = Math.floor(fitted);
    if (tabWidth >= minWidth) {
      return { tabWidth, scrollable: false, tight: tabWidth < 100, gap };
    }

    return { tabWidth: minWidth, scrollable: true, tight: true, gap };
  }, [availableMethods.length, screenWidth]);

  useHardwareBack(navigateBack);

  const refreshFundingBanks = useCallback(async () => {
    const [staticBanksRes, dynamicBanksRes] = await Promise.allSettled([
      api.getVirtualAccountBanks('STATIC'),
      api.getVirtualAccountBanks('DYNAMIC'),
    ]);
    let nextStatic: FundingBank[] = [];
    let nextDynamic: FundingBank[] = [];
    if (staticBanksRes.status === 'fulfilled' && isResponseSuccess(staticBanksRes.value) && staticBanksRes.value.data) {
      nextStatic = filterStaticBanks(staticBanksRes.value.data.map(normalizeFundingBank));
      setStaticBanks(nextStatic);
    }
    if (dynamicBanksRes.status === 'fulfilled' && isResponseSuccess(dynamicBanksRes.value) && dynamicBanksRes.value.data) {
      nextDynamic = filterDynamicBanks(dynamicBanksRes.value.data.map(normalizeFundingBank));
      setDynamicBanks(nextDynamic);
    }
    return { staticBanks: nextStatic, dynamicBanks: nextDynamic };
  }, []);

  const applyFundingSnapshot = useCallback((snapshot: NonNullable<ReturnType<typeof peekWalletFundingCache>>) => {
    setMethods(snapshot.methods);
    setVirtualAccounts(snapshot.virtualAccounts);
    setStaticBanks(snapshot.staticBanks);
    setDynamicBanks(snapshot.dynamicBanks);
    setHasBvn(snapshot.hasBvn);
    setInitializing(false);
  }, []);

  const loadInitial = useCallback(async (options?: { force?: boolean }) => {
    try {
      const snapshot = await getWalletFundingData(options);
      applyFundingSnapshot(snapshot);
      void refreshDashboardData();
    } finally {
      setInitializing(false);
    }
  }, [applyFundingSnapshot]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const snapshot = await pullToRefreshWalletFunding();
      applyFundingSnapshot(snapshot);
      void refreshDashboardData();
    } finally {
      setRefreshing(false);
    }
  }, [applyFundingSnapshot]);

  useEffect(() => { void loadInitial(); }, [loadInitial]);

  const skipFocusRefresh = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (skipFocusRefresh.current) {
        skipFocusRefresh.current = false;
        return;
      }
      void loadInitial();
    }, [loadInitial])
  );

  useEffect(() => {
    if (availableMethods.length && !availableMethods.includes(activeMethod)) {
      setActiveMethod(availableMethods[0]);
    }
  }, [availableMethods, activeMethod]);

  useEffect(() => {
    setSelectedBanks((prev) => {
      const valid = new Set(
        [...prev].filter((code) => availableBanksToCreate.some((b) => b.code === code))
      );
      return valid.size === prev.size ? prev : valid;
    });
  }, [availableBanksToCreate]);

  useEffect(() => {
    if (activeMethod === 'static') setSelectedBanks(new Set());
  }, [activeMethod]);

  useEffect(() => {
    if (!dynamicAccount?.expiresAt) {
      setExpiryLabel('');
      return;
    }
    const tick = () => setExpiryLabel(formatExpiry(dynamicAccount.expiresAt));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [dynamicAccount?.expiresAt]);

  const copyAccount = useCallback(async (accountNumber: string) => {
    try {
      await Clipboard.setStringAsync(accountNumber);
      showToast({ type: 'success', text1: 'Account number copied' });
    } catch {
      showToast({ type: 'error', text1: 'Could not copy account number' });
    }
  }, []);

  const handlePaystackFund = async () => {
    if (!isValidAmount) {
      showToast({ type: 'error', text1: 'Minimum amount is ₦100' });
      return;
    }
    setLoading(true);
    try {
      const res = await api.fundWallet(numericAmount);
      if (isResponseSuccess(res) && res.data?.authorizationUrl) {
        await Linking.openURL(res.data.authorizationUrl);
        if (res.data.reference) {
          setPendingCheckoutRef(res.data.reference);
          setPendingCheckoutGateway('paystack');
        }
      } else {
        showToast({ type: 'error', text1: 'Payment failed', text2: res.message });
      }
    } catch (err: any) {
      showToast({ type: 'error', text1: 'Payment failed', text2: err?.message });
    } finally {
      setLoading(false);
    }
  };

  const verifyPayvesselPayment = async (reference: string, showPendingToast = true) => {
    setPendingCheckoutRef(reference);
    setPendingCheckoutGateway('payvessel');
    setLoading(true);
    try {
      const maxAttempts = 4;
      for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        const res = await api.verifyPayvesselCheckout(reference);
        if (isResponseSuccess(res) && res.data?.success) {
          showToast({ type: 'success', text1: 'Wallet funded successfully' });
          setPendingCheckoutRef(null);
          setPendingCheckoutGateway(null);
          await loadInitial({ force: true });
          return true;
        }

        const isPending = res.data?.status === 'PENDING'
          || String(res.data?.message || res.message || '').toLowerCase().includes('pending')
          || String(res.data?.message || res.message || '').toLowerCase().includes('not completed');

        if (isPending && attempt < maxAttempts - 1) {
          await new Promise((resolve) => setTimeout(resolve, 2000));
          continue;
        }

        if (isPending && showPendingToast) {
          showToast({
            type: 'info',
            text1: 'Payment processing',
            text2: 'Your wallet will update automatically once confirmed. Tap “Completed payment?” to check again.',
          });
        } else if (showPendingToast) {
          showToast({
            type: 'error',
            text1: 'Payment not verified yet',
            text2: res.message || res.data?.message,
          });
        }
        return false;
      }
      return false;
    } catch {
      if (showPendingToast) {
        showToast({ type: 'error', text1: 'Could not verify payment' });
      }
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handlePayvesselCheckoutInitialized = async (
    merchantReference: string,
    providerReference: string,
  ) => {
    try {
      await api.syncPayvesselCheckoutReference(merchantReference, providerReference);
    } catch {
      // Non-blocking — webhook may still credit; verify uses merchant reference fallback.
    }
  };

  const handlePayvesselCheckout = async () => {
    if (!isValidAmount) {
      showToast({ type: 'error', text1: 'Minimum amount is ₦100' });
      return;
    }
    setCheckoutOverlayVisible(true);
    try {
      const res = await api.createPayvesselCheckout(numericAmount, { sdk: true });
      if (isResponseSuccess(res) && res.data?.mode === 'sdk') {
        setPayvesselCheckoutSession(res.data);
        setPayvesselCheckoutVisible(true);
      } else {
        setCheckoutOverlayVisible(false);
        showToast({ type: 'error', text1: 'Checkout failed', text2: res.message });
      }
    } catch (err: any) {
      setCheckoutOverlayVisible(false);
      const message = err?.message || 'Checkout failed';
      showToast({ type: 'error', text1: 'Checkout failed', text2: message });
    }
  };

  const handlePayvesselCheckoutClose = () => {
    setPayvesselCheckoutVisible(false);
    setPayvesselCheckoutSession(null);
    setCheckoutOverlayVisible(false);
  };

  const handlePayvesselCheckoutSuccess = async (merchantReference: string) => {
    setPayvesselCheckoutVisible(false);
    setPayvesselCheckoutSession(null);
    await verifyPayvesselPayment(merchantReference, true);
  };

  const handleVerifyCheckout = async () => {
    if (!pendingCheckoutRef) return;
    setLoading(true);
    try {
      if (pendingCheckoutGateway === 'paystack') {
        const res = await api.verifyFunding(pendingCheckoutRef);
        if (isResponseSuccess(res) && res.data?.amount) {
          showToast({ type: 'success', text1: 'Wallet funded successfully' });
          setPendingCheckoutRef(null);
          setPendingCheckoutGateway(null);
          await loadInitial({ force: true });
        } else {
          showToast({ type: 'error', text1: 'Not verified yet', text2: res.message });
        }
        return;
      }

      await verifyPayvesselPayment(pendingCheckoutRef, true);
    } catch (err: any) {
      showToast({ type: 'error', text1: 'Verification failed', text2: err?.message });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateStatic = async () => {
    const bankCodes = selectedBanksToCreate.map((b) => b.code);
    if (bankCodes.length === 0) {
      showToast({ type: 'error', text1: 'Select at least one bank' });
      return;
    }
    setStaticAccountOverlayVisible(true);
    try {
      const res = await api.createStaticVirtualAccount(bankCodes);
      if (isResponseSuccess(res) && res.data) {
        const createdCount = res.data.allAccounts?.length ?? bankCodes.length;
        showToast({
          type: 'success',
          text1: createdCount > 1 ? `${createdCount} accounts created` : 'Permanent account ready',
        });
        const accountsRes = await api.getVirtualAccounts();
        if (isResponseSuccess(accountsRes)) setVirtualAccounts(accountsRes.data ?? []);
        setSelectedBanks(new Set());
        await refreshFundingBanks();
      } else {
        showToast({
          type: 'error',
          text1: res.message || 'Error creating permanent virtual account',
        });
      }
    } catch {
      showToast({ type: 'error', text1: 'Error creating permanent virtual account' });
    } finally {
      setStaticAccountOverlayVisible(false);
    }
  };

  const openDynamicBankPicker = async (forceCreate = false) => {
    setPendingDynamicForceCreate(forceCreate);
    setPickerBanks([]);
    setShowDynamicBankPicker(true);
    setFetchingDynamicBanks(true);
    try {
      const { dynamicBanks: latestDynamic } = await refreshFundingBanks();
      if (latestDynamic.length === 0) {
        setShowDynamicBankPicker(false);
        showToast({ type: 'error', text1: 'No banks available for one-time accounts' });
        return;
      }
      setPickerBanks(latestDynamic);
    } catch (err: any) {
      setShowDynamicBankPicker(false);
      showToast({ type: 'error', text1: 'Could not load banks', text2: err?.message });
    } finally {
      setFetchingDynamicBanks(false);
    }
  };

  const handleDiscardDynamicAccount = async () => {
    setLoading(true);
    try {
      const res = await api.discardDynamicVirtualAccount(dynamicAccount?.id);
      if (isResponseSuccess(res)) {
        setDynamicAccount(null);
        setExpiryLabel('');
        const accountsRes = await api.getVirtualAccounts();
        if (isResponseSuccess(accountsRes)) setVirtualAccounts(accountsRes.data ?? []);
        showToast({
          type: 'success',
          text1: 'Account discarded',
          text2: 'You can generate a new one-time account now.',
        });
      } else {
        showToast({ type: 'error', text1: 'Could not discard account', text2: res.message });
      }
    } catch (err: any) {
      showToast({ type: 'error', text1: 'Could not discard account', text2: err?.message });
    } finally {
      setLoading(false);
    }
  };

  const confirmDiscardDynamicAccount = () => {
    Alert.alert(
      'Discard this account?',
      'This one-time account will be removed so you can generate another. Your wallet will still be credited automatically if the transfer arrives later.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Discard account', style: 'destructive', onPress: handleDiscardDynamicAccount },
      ],
    );
  };

  const handleCreateDynamic = async (bankCode: string, forceCreate = false) => {
    setShowDynamicBankPicker(false);
    setLoading(true);
    try {
      const res = await api.createDynamicVirtualAccount(
        isValidAmount ? numericAmount : undefined,
        forceCreate,
        bankCode,
      );
      if (isResponseSuccess(res) && res.data) {
        setDynamicAccount(res.data);
        showToast({
          type: 'success',
          text1: res.data.existing ? 'Using existing account' : 'Account generated',
        });
      } else {
        showToast({
          type: 'error',
          text1: res.message || 'Error creating dynamic virtual account',
        });
      }
    } catch {
      showToast({ type: 'error', text1: 'Error creating dynamic virtual account' });
    } finally {
      setLoading(false);
    }
  };

  const toggleBank = (code: string) => {
    if (!availableBanksToCreate.some((b) => b.code === code)) return;
    setSelectedBanks((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  const renderAmountInput = (optional = false) => (
    <GlassCard borderRadius={Radius.xl} padding={18} contentStyle={styles.card}>
      <Text style={styles.fieldLabel}>
        {optional ? 'Expected amount (optional)' : 'Amount to add'}
      </Text>
      <View style={styles.amountWrap}>
        <Text style={styles.nairaSign}>₦</Text>
        <TextInput
          style={styles.amountInput}
          placeholder="0.00"
          placeholderTextColor={Colors.mutedLight}
          value={displayAmount}
          onChangeText={(v) => setAmount(sanitizeAmountInput(v.replace(/,/g, '')))}
          keyboardType="decimal-pad"
        />
      </View>
      {!optional && (
        <>
          <Text style={styles.minHint}>Minimum ₦100</Text>
          <View style={styles.quickGrid}>
            {QUICK_AMOUNTS.map((a) => {
              const active = amount === String(a);
              return (
                <TouchableOpacity
                  key={a}
                  style={[styles.quickBtn, active && styles.quickBtnActive]}
                  onPress={() => setAmount(String(a))}
                >
                  <Text style={[styles.quickText, active && styles.quickTextActive]}>
                    ₦{a >= 1000 ? `${a / 1000}k` : a}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </>
      )}
    </GlassCard>
  );

  const renderMethodBody = () => {
    if (activeMethod === 'checkout' || activeMethod === 'paystack') {
      return (
        <>
          {renderAmountInput()}
          <View style={styles.infoBanner}>
            <Ionicons name="shield-checkmark" size={18} color={Colors.primary} />
            <Text style={styles.infoText}>
              {activeMethod === 'checkout'
                ? 'Pay in-app with Payvessel secure checkout (bank transfer). Wallet credits automatically after payment.'
                : 'Opens Paystack checkout (card, bank transfer, USSD). Wallet credits after successful payment.'}
            </Text>
          </View>
          {pendingCheckoutRef && (activeMethod === 'checkout' || activeMethod === 'paystack') && (
            <TouchableOpacity onPress={handleVerifyCheckout} disabled={loading} activeOpacity={0.85}>
              <GlassCard borderRadius={16} padding={14} contentStyle={styles.verifyCard}>
                <Ionicons name="checkmark-circle-outline" size={22} color={Colors.success} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.verifyTitle}>Completed payment?</Text>
                  <Text style={styles.verifySub}>Tap to verify ref {pendingCheckoutRef.slice(0, 16)}…</Text>
                </View>
                {loading ? <ActivityIndicator color={Colors.primary} /> : <Ionicons name="chevron-forward" size={18} color={Colors.muted} />}
              </GlassCard>
            </TouchableOpacity>
          )}
        </>
      );
    }

    if (activeMethod === 'static') {
      if (hasBvn === null) {
        return (
          <GlassCard borderRadius={Radius.xl} padding={18} contentStyle={[styles.card, styles.bvnGateLoading]}>
            <ActivityIndicator color={Colors.primary} size="large" />
          </GlassCard>
        );
      }

      if (!hasBvn && staticAccounts.length === 0) {
        return (
          <GlassCard borderRadius={Radius.xl} padding={18} contentStyle={styles.card}>
            <View style={styles.bvnGateIcon}>
              <Ionicons name="shield-outline" size={28} color={Colors.primary} />
            </View>
            <Text style={styles.bvnGateTitle}>BVN required</Text>
            <Text style={styles.bvnGateMessage}>
              BVN is required to create a permanent virtual account. Complete KYC verification or use a one-time account instead.
            </Text>
            <TouchableOpacity style={styles.bvnGatePrimary} onPress={() => router.push('/kyc')}>
              <Ionicons name="id-card-outline" size={18} color={Colors.white} />
              <Text style={styles.bvnGatePrimaryText}>Complete KYC</Text>
            </TouchableOpacity>
            {dynamicMethodAvailable ? (
              <TouchableOpacity style={styles.bvnGateSecondary} onPress={() => setActiveMethod('dynamic')}>
                <Ionicons name="time-outline" size={18} color={Colors.primary} />
                <Text style={styles.bvnGateSecondaryText}>Use one-time account</Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.bvnGateNote}>One-time accounts are not available right now.</Text>
            )}
          </GlassCard>
        );
      }

      return (
        <>
          {hasBvn && staticAccounts.length === 0 && methods.permanentVirtualAccount ? (
            <GlassCard borderRadius={Radius.xl} padding={18} contentStyle={styles.card}>
              <View style={styles.accountsRefreshHint}>
                <View style={styles.accountsRefreshIcon}>
                  <Ionicons name="refresh-outline" size={22} color={Colors.primary} />
                </View>
                <Text style={styles.accountsRefreshTitle}>Permanent accounts</Text>
                <Text style={styles.accountsRefreshMessage}>
                  {refreshing
                    ? 'Fetching your accounts…'
                    : 'If you already have a permanent account, pull down to refresh and load it.'}
                </Text>
              </View>
            </GlassCard>
          ) : null}

          {staticAccounts.length > 0 && (
            <GlassCard borderRadius={Radius.xl} padding={18} contentStyle={styles.card}>
              <Text style={styles.fieldLabel}>
                Your permanent accounts ({staticAccounts.length})
              </Text>
              <Text style={styles.accountHint}>
                Transfer to any account below — your wallet is credited automatically.
              </Text>
              {staticAccounts.map((account, index) => (
                <View
                  key={account.id ?? `${account.accountNumber}-${account.bankCode ?? index}`}
                  style={[styles.staticAccountCard, index > 0 && styles.staticAccountCardGap]}
                >
                  <View style={styles.staticAccountRow}>
                    <View style={styles.staticBankLogoWrap}>
                      {account.bankCode && bankByCode.get(account.bankCode) ? (
                        <BankLogo bank={bankByCode.get(account.bankCode)!} size={isAndroid ? 40 : 48} />
                      ) : (
                        <View style={styles.staticBankLogoFallback}>
                          <Ionicons name="business-outline" size={24} color={Colors.primary} />
                        </View>
                      )}
                    </View>

                    <View style={styles.staticAccountBody}>
                      <Text style={styles.staticBankLabel} numberOfLines={1}>
                        {account.bankName}
                      </Text>
                      <Text
                        style={styles.staticAccountNumber}
                        selectable
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.82}
                      >
                        {formatAccountNumberDisplay(account.accountNumber)}
                      </Text>
                      <View style={styles.staticMetaLine}>
                        {account.accountName ? (
                          <Text style={styles.staticAccountName} numberOfLines={1}>
                            {account.accountName}
                          </Text>
                        ) : (
                          <View style={styles.staticMetaSpacer} />
                        )}
                        <View style={styles.staticReadyPill}>
                          <View style={styles.staticReadyDot} />
                          <Text style={styles.staticReadyText}>Active</Text>
                        </View>
                      </View>
                    </View>

                    <TouchableOpacity
                      style={styles.staticCopyIconBtn}
                      onPress={() => copyAccount(account.accountNumber)}
                      activeOpacity={0.75}
                      accessibilityRole="button"
                      accessibilityLabel="Copy account number"
                    >
                      <Ionicons name="copy-outline" size={isAndroid ? 18 : 20} color={Colors.primary} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </GlassCard>
          )}

          {hasBvn && availableBanksToCreate.length > 0 && (
            <GlassCard borderRadius={Radius.xl} padding={18} contentStyle={styles.card}>
              <Text style={styles.fieldLabel}>
                {staticAccounts.length > 0 ? 'Add bank' : 'Create permanent account'}
              </Text>
              <Text style={styles.accountHint}>
                {staticAccounts.length > 0
                  ? `${availableBanksToCreate.length} more bank${availableBanksToCreate.length > 1 ? 's' : ''} available. Select one or more to generate.`
                  : 'Requires verified KYC (BVN). Select a bank to generate your permanent account.'}
              </Text>
              <View style={styles.bankRowWrap}>
                {availableBanksToCreate.map((b) => {
                  const selected = selectedBanks.has(b.code);
                  return (
                    <TouchableOpacity
                      key={b.code}
                      style={[styles.bankChip, selected && styles.bankChipActive]}
                      onPress={() => toggleBank(b.code)}
                      activeOpacity={0.82}
                    >
                      <View style={[styles.bankLogoWrap, selected && styles.bankLogoWrapActive]}>
                        <BankLogo bank={b} size={32} />
                      </View>
                      <Text style={[styles.bankChipText, selected && styles.bankChipTextActive]} numberOfLines={2}>
                        {getBankDisplayName(b)}
                      </Text>
                      {selected && (
                        <View style={styles.bankCheckBadge}>
                          <Ionicons name="checkmark" size={12} color={Colors.white} />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </GlassCard>
          )}

          {staticAccounts.length > 0 && availableBanksToCreate.length === 0 && (
            <View style={styles.infoBanner}>
              <Ionicons name="checkmark-done" size={18} color={Colors.primary} />
              <Text style={styles.infoText}>
                You have permanent accounts on all available banks. Transfer to any account above to fund your wallet.
              </Text>
            </View>
          )}
        </>
      );
    }

    // dynamic
    return (
      <>
        {!dynamicAccount ? renderAmountInput(true) : null}
        <GlassCard borderRadius={Radius.xl} padding={18} contentStyle={styles.card}>
          {dynamicAccount ? (
            <>
              <View style={styles.dynamicHeader}>
                <Text style={styles.fieldLabel}>One-time account</Text>
                {expiryLabel ? (
                  <View style={styles.expiryBadge}>
                    <Ionicons name="time-outline" size={12} color={Colors.warning} />
                    <Text style={styles.expiryText}>{expiryLabel}</Text>
                  </View>
                ) : null}
              </View>
              <View style={styles.accountHero}>
                {dynamicAccount.bankCode && bankByCode.get(dynamicAccount.bankCode) ? (
                  <BankLogo bank={bankByCode.get(dynamicAccount.bankCode)!} size={48} />
                ) : null}
                <Text style={styles.accountNumber}>{dynamicAccount.accountNumber}</Text>
                <Text style={styles.accountBank}>{dynamicAccount.bankName}</Text>
              </View>
              <Text style={styles.accountHint}>
                Transfer the exact amount to this account before it expires. Single use only.
              </Text>
              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={() => copyAccount(dynamicAccount.accountNumber)}
              >
                <Ionicons name="copy-outline" size={18} color={Colors.primary} />
                <Text style={styles.secondaryBtnText}>Copy account number</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.sentPaymentBtn}
                onPress={confirmDiscardDynamicAccount}
                disabled={loading}
              >
                <Ionicons name="checkmark-circle-outline" size={18} color={Colors.success} />
                <Text style={styles.sentPaymentBtnText}>I&apos;ve sent the payment</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.fieldLabel}>Generate one-time account</Text>
              <Text style={styles.accountHint}>
                A temporary virtual account valid for 5 minutes. Ideal for a single transfer.
              </Text>
            </>
          )}
        </GlassCard>
      </>
    );
  };

  const handlePrimaryAction = () => {
    if (activeMethod === 'paystack') return handlePaystackFund();
    if (activeMethod === 'checkout') return handlePayvesselCheckout();
    if (activeMethod === 'static' && availableBanksToCreate.length > 0) return handleCreateStatic();
    if (activeMethod === 'dynamic' && !dynamicAccount) return openDynamicBankPicker(false);
  };

  const isButtonLoading = loading || fetchingDynamicBanks;
  const isOverlayActive = checkoutOverlayVisible || staticAccountOverlayVisible;

  const primaryLabel = () => {
    if (fetchingDynamicBanks) return 'Loading banks…';
    if (loading) return 'Please wait…';
    if (activeMethod === 'paystack') {
      return isValidAmount ? `Pay ₦${numericAmount.toLocaleString('en-NG')} via Paystack` : 'Enter amount';
    }
    if (activeMethod === 'checkout') {
      return isValidAmount ? `Pay ₦${numericAmount.toLocaleString('en-NG')} via Payvessel` : 'Enter amount';
    }
    if (activeMethod === 'static') {
      if (availableBanksToCreate.length === 0) {
        return staticAccounts.length > 0
          ? 'All accounts ready — transfer to fund'
          : 'No banks available';
      }
      const count = selectedBanksToCreate.length;
      if (count === 0) return staticAccounts.length > 0 ? 'Select a bank to add' : 'Select a bank to continue';
      return count === 1 ? 'Add 1 bank account' : `Add ${count} bank accounts`;
    }
    return dynamicAccount ? 'Account active — transfer to fund' : 'Generate account';
  };

  const primaryDisabled = () => {
    if (isButtonLoading || isOverlayActive || initializing) return true;
    if (activeMethod === 'paystack' || activeMethod === 'checkout') return !isValidAmount;
    if (activeMethod === 'static') {
      if (!hasBvn) return true;
      return availableBanksToCreate.length === 0 || selectedBanksToCreate.length === 0;
    }
    if (activeMethod === 'dynamic' && dynamicAccount) return true;
    return false;
  };

  return (
    <ThemedScreen>
      <LinearGradient
        colors={gradientStops(gradients.hero)}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 12 }]}
      >
        <View style={styles.headerBlob1} />
        <View style={styles.headerBlob2} />

        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigateBack()} activeOpacity={0.8}>
            <Ionicons name="arrow-back" size={20} color={Colors.white} />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Fund Wallet</Text>
            <Text style={styles.headerSub}>Choose how to add money</Text>
          </View>
          <View style={styles.balPill}>
            <View style={styles.balPillIcon}>
              <Ionicons name="wallet-outline" size={14} color="#E9D5FF" />
            </View>
            <View>
              <Text style={styles.balLabel}>Balance</Text>
              <Text style={styles.balText}>
                {balanceVisible ? formatCurrencyVisible(balance, true) : MASKED_BALANCE}
              </Text>
            </View>
          </View>
        </View>
      </LinearGradient>

      <View style={[styles.contentCurve, { backgroundColor: colors.pageBg }]} />

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {initializing ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={Colors.primary} size="large" />
          </View>
        ) : availableMethods.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Ionicons name="alert-circle-outline" size={40} color={Colors.muted} />
            <Text style={styles.emptyTitle}>Funding unavailable</Text>
            <Text style={styles.emptySub}>No payment methods are enabled. Contact support.</Text>
          </View>
        ) : (
          <>
            <ScrollView
              contentContainerStyle={styles.scroll}
              showsVerticalScrollIndicator={false}
              alwaysBounceVertical
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor={Colors.primary}
                  colors={[Colors.primary]}
                  progressBackgroundColor={Colors.white}
                />
              }
            >
              <Text style={styles.sectionEyebrow}>Funding method</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                scrollEnabled={methodTabsLayout.scrollable}
                contentContainerStyle={[
                  styles.methodTabsScroll,
                  { gap: methodTabsLayout.gap },
                  !methodTabsLayout.scrollable && { width: screenWidth - Spacing.page * 2 },
                ]}
              >
                {availableMethods.map((m) => {
                  const meta = METHOD_META[m];
                  const active = activeMethod === m;
                  const tight = methodTabsLayout.tight;
                  return (
                    <TouchableOpacity
                      key={m}
                      onPress={() => setActiveMethod(m)}
                      activeOpacity={0.82}
                    >
                      <GlassCard
                        variant={active ? 'tinted' : 'light'}
                        borderRadius={Radius.lg}
                        padding={tight ? 10 : 14}
                        style={[
                          styles.methodTab,
                          { width: methodTabsLayout.tabWidth },
                          active && styles.methodTabActive,
                        ]}
                        contentStyle={styles.methodTabContent}
                      >
                        {active && <View style={styles.methodTabAccent} />}
                        <View
                          style={[
                            styles.methodIconRing,
                            tight && styles.methodIconRingCompact,
                            active && styles.methodIconRingActive,
                          ]}
                        >
                          <Ionicons
                            name={meta.icon as any}
                            size={tight ? 18 : 20}
                            color={active ? Colors.primary : Colors.muted}
                          />
                        </View>
                        <Text
                          style={[
                            styles.methodTabLabel,
                            tight && styles.methodTabLabelCompact,
                            active && styles.methodTabLabelActive,
                          ]}
                          numberOfLines={1}
                        >
                          {meta.label}
                        </Text>
                        <Text
                          style={[
                            styles.methodTabSub,
                            tight && styles.methodTabSubCompact,
                            active && styles.methodTabSubActive,
                          ]}
                          numberOfLines={1}
                        >
                          {meta.subtitle}
                        </Text>
                      </GlassCard>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {renderMethodBody()}
            </ScrollView>

            {!(
              (activeMethod === 'static' && !hasBvn && staticAccounts.length === 0)
              || (activeMethod === 'static' && hasBvn && availableBanksToCreate.length === 0)
            ) && (
              <GlassSurface
                variant="light"
                borderRadius={0}
                style={styles.footer}
                contentStyle={{ paddingBottom: insets.bottom + 12, paddingHorizontal: Spacing.page, paddingTop: 14 }}
              >
                <GradientButton
                  onPress={handlePrimaryAction}
                  disabled={primaryDisabled()}
                  inactive={primaryDisabled()}
                  isLoading={isButtonLoading}
                  title={primaryLabel()}
                  size="compact"
                  style={primaryDisabled() ? styles.ctaDisabled : undefined}
                  leftIcon={
                    !isButtonLoading ? (
                      <Ionicons
                        name={
                          activeMethod === 'static' || activeMethod === 'dynamic'
                            ? 'wallet-outline'
                            : 'lock-closed'
                        }
                        size={18}
                        color={Colors.white}
                      />
                    ) : undefined
                  }
                />
                <View style={styles.secureRow}>
                  <View style={styles.secureIconWrap}>
                    <Ionicons name="shield-checkmark" size={12} color={Colors.primary} />
                  </View>
                  <Text style={styles.secureNote}>Secured payment · Server-side verification</Text>
                </View>
              </GlassSurface>
            )}
          </>
        )}
      </KeyboardAvoidingView>
      <BankPickerModal
        visible={showDynamicBankPicker}
        title="Choose bank"
        subtitle="Select the bank you want for your one-time virtual account."
        banks={pickerBanks}
        loading={fetchingDynamicBanks}
        onClose={() => {
          if (!fetchingDynamicBanks) setShowDynamicBankPicker(false);
        }}
        onSelect={(bank) => handleCreateDynamic(bank.code, pendingDynamicForceCreate)}
      />
      <PayvesselCheckoutModal
        session={payvesselCheckoutSession}
        visible={payvesselCheckoutVisible}
        onInitialized={handlePayvesselCheckoutInitialized}
        onSuccess={handlePayvesselCheckoutSuccess}
        onClose={handlePayvesselCheckoutClose}
        onPreparing={() => setCheckoutOverlayVisible(true)}
        onPrepared={() => setCheckoutOverlayVisible(false)}
        onError={() => {
          setCheckoutOverlayVisible(false);
          showToast({ type: 'error', text1: 'Checkout unavailable', text2: 'Please try again later or use another funding method.' });
        }}
      />
      <LoadingOverlay
        visible={isOverlayActive}
        message={
          checkoutOverlayVisible
            ? 'Preparing secure checkout…'
            : 'Generating your account…'
        }
        submessage={
          checkoutOverlayVisible
            ? 'Connecting to Payvessel'
            : 'Setting up your permanent virtual account'
        }
        icon={checkoutOverlayVisible ? 'lock-closed' : 'wallet-outline'}
      />
    </ThemedScreen>
  );
}

export default function FundWalletRoute() {
  return (
    <ServiceGate serviceCode={SERVICE_CODES.walletFund} title="Wallet funding">
      <FundWalletScreen />
    </ServiceGate>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  contentCurve: {
    height: 22,
    marginTop: -22,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  header: {
    paddingHorizontal: Spacing.page,
    paddingBottom: 28,
    overflow: 'hidden',
  },
  headerBlob1: {
    position: 'absolute',
    top: -24,
    right: -36,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  headerBlob2: {
    position: 'absolute',
    bottom: 8,
    left: -20,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  headerText: { flex: 1 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: Colors.white, letterSpacing: -0.3 },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.68)', marginTop: 3 },
  balPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  balPillIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  balLabel: { fontSize: 10, color: 'rgba(255,255,255,0.55)', fontWeight: '600' },
  balText: { fontSize: 13, fontWeight: '700', color: Colors.white },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: Colors.dark },
  emptySub: { fontSize: 13, color: Colors.muted, textAlign: 'center' },
  scroll: { paddingHorizontal: Spacing.page, paddingTop: 4, paddingBottom: 16, gap: 16 },
  sectionEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.muted,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: -6,
  },
  methodTabsScroll: {
    paddingVertical: 4,
    paddingRight: 4,
  },
  methodTab: {
    overflow: 'hidden',
  },
  methodTabActive: {},
  methodTabContent: {
    gap: 6,
    overflow: 'hidden',
  },
  methodTabAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: Colors.primary,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
  },
  methodIconRing: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.pageBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodIconRingCompact: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  methodIconRingActive: {
    backgroundColor: '#EDE9FE',
  },
  methodTabLabel: { fontSize: 13, fontWeight: '700', color: Colors.mid },
  methodTabLabelCompact: { fontSize: 12 },
  methodTabLabelActive: { color: Colors.primary },
  methodTabSub: { fontSize: 10, color: Colors.muted, lineHeight: 14 },
  methodTabSubCompact: { fontSize: 9, lineHeight: 13 },
  methodTabSubActive: { color: '#7C6A9E' },
  card: {
    gap: 10,
  },
  fieldLabel: {
    fontSize: 11, fontWeight: '700', color: Colors.muted,
    letterSpacing: 0.5, textTransform: 'uppercase',
  },
  amountWrap: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: 'rgba(124, 58, 237, 0.35)',
    borderRadius: 16, backgroundColor: '#FAF5FF',
    paddingHorizontal: 18, height: 68, gap: 6,
  },
  nairaSign: { fontSize: 24, fontWeight: '700', color: Colors.primary },
  amountInput: { flex: 1, fontSize: 30, fontWeight: '800', color: Colors.heroDark, paddingVertical: 0 },
  minHint: { fontSize: 11, color: Colors.mutedLight },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  quickBtn: {
    width: '31%', paddingVertical: 10, borderRadius: 12,
    backgroundColor: Colors.pageBg, borderWidth: StyleSheet.hairlineWidth, borderColor: Colors.borderSubtle,
    alignItems: 'center',
  },
  quickBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  quickText: { fontSize: 13, fontWeight: '600', color: Colors.mid },
  quickTextActive: { color: Colors.white },
  infoBanner: {
    flexDirection: 'row', gap: 10, alignItems: 'flex-start',
    backgroundColor: '#F5F3FF', borderRadius: 16, padding: 14,
    borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(124, 58, 237, 0.12)',
  },
  infoText: { flex: 1, fontSize: 13, color: '#5B21B6', lineHeight: 19 },
  verifyCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  verifyTitle: { fontSize: 14, fontWeight: '700', color: Colors.dark },
  verifySub: { fontSize: 11, color: Colors.muted, marginTop: 2 },
  accountHero: {
    backgroundColor: Colors.pageBg, borderRadius: 16, padding: 18,
    alignItems: 'center', borderWidth: StyleSheet.hairlineWidth, borderColor: Colors.borderSubtle,
  },
  accountNumber: { fontSize: 28, fontWeight: '800', color: Colors.heroDark, letterSpacing: 1 },
  accountBank: { fontSize: 14, fontWeight: '600', color: Colors.mid, marginTop: 6 },
  accountName: { fontSize: 12, color: Colors.muted, marginTop: 4 },
  accountHint: { fontSize: 13, color: Colors.muted, lineHeight: 19 },
  secondaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 14, borderRadius: 14,
    backgroundColor: '#F5F3FF', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(124, 58, 237, 0.2)',
  },
  secondaryBtnText: { fontSize: 14, fontWeight: '700', color: Colors.primary },
  sentPaymentBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 14, borderRadius: 14, marginTop: 4,
    backgroundColor: Colors.successLight,
    borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(22, 163, 74, 0.2)',
  },
  sentPaymentBtnText: { fontSize: 14, fontWeight: '700', color: Colors.success },
  linkBtn: { alignItems: 'center', paddingVertical: 8 },
  linkBtnText: { fontSize: 13, fontWeight: '600', color: Colors.primary },
  staticAccountCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.borderSubtle,
    ...Shadow.sm,
  },
  staticAccountCardGap: { marginTop: 12 },
  staticAccountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: isAndroid ? 10 : 14,
  },
  staticBankLogoWrap: {
    width: isAndroid ? 48 : 56,
    height: isAndroid ? 48 : 56,
    borderRadius: isAndroid ? 14 : 16,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  staticBankLogoFallback: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: Colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  staticAccountBody: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  staticMetaLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 1,
  },
  staticMetaSpacer: {
    flex: 1,
  },
  staticBankLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  staticReadyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: Radius.full,
    backgroundColor: Colors.successLight,
    flexShrink: 0,
  },
  staticReadyDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.success,
  },
  staticReadyText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.successDark,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  staticAccountNumber: textStyle({
    fontSize: isAndroid ? 16 : 19,
    fontWeight: isAndroid ? '700' : '800',
    color: Colors.heroDark,
    letterSpacing: isAndroid ? 0.1 : 0.35,
  }),
  staticAccountName: {
    flex: 1,
    fontSize: 12,
    fontWeight: '500',
    color: Colors.muted,
  },
  staticCopyIconBtn: {
    width: isAndroid ? 36 : 40,
    height: isAndroid ? 36 : 40,
    borderRadius: isAndroid ? 10 : 12,
    backgroundColor: Colors.primaryMuted,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  accountsRefreshHint: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
  },
  accountsRefreshIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountsRefreshTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.dark,
  },
  accountsRefreshMessage: {
    fontSize: 13,
    color: Colors.muted,
    textAlign: 'center',
    lineHeight: 19,
    maxWidth: 300,
  },
  bvnGateLoading: { alignItems: 'center', paddingVertical: 40 },
  bvnGateIcon: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#F5F3FF', alignItems: 'center', justifyContent: 'center',
    alignSelf: 'center',
  },
  bvnGateTitle: { fontSize: 18, fontWeight: '700', color: Colors.dark, textAlign: 'center' },
  bvnGateMessage: { fontSize: 14, color: Colors.muted, lineHeight: 21, textAlign: 'center' },
  bvnGatePrimary: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 15, marginTop: 4,
  },
  bvnGatePrimaryText: { fontSize: 15, fontWeight: '700', color: Colors.white },
  bvnGateSecondary: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#F5F3FF', borderRadius: 14, paddingVertical: 15,
    borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(124, 58, 237, 0.25)',
  },
  bvnGateSecondaryText: { fontSize: 15, fontWeight: '700', color: Colors.primary },
  bvnGateNote: { fontSize: 12, color: Colors.muted, textAlign: 'center' },
  bankRowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 6 },
  bankChip: {
    width: '47%',
    flexGrow: 1,
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.borderSubtle,
    gap: 10,
    position: 'relative',
    ...Shadow.sm,
  },
  bankLogoWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.pageBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bankLogoWrapActive: {
    backgroundColor: '#EDE9FE',
  },
  bankCheckBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bankChipActive: {
    backgroundColor: '#FAF5FF',
    borderColor: Colors.primary,
    ...Shadow.md,
  },
  bankChipText: { fontSize: 13, fontWeight: '600', color: Colors.mid, textAlign: 'center' },
  bankChipTextActive: { color: Colors.primary },
  dynamicHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  expiryBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.warningLight, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
  },
  expiryText: { fontSize: 11, fontWeight: '600', color: Colors.warningDark },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.borderSubtle,
  },
  ctaDisabled: { opacity: 0.72 },
  secureRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 12 },
  secureIconWrap: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#F5F3FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secureNote: { fontSize: 11, color: Colors.muted },
});
