import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Keyboard, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import {
  api,
  formatCurrency,
  formatCurrencyVisible,
  isResponseSuccess,
  isSessionExpiredError,
  parseWalletBalanceKobo,
  MASKED_BALANCE,
  type Bank,
  type BankAccountMatch,
  type TransferConfig,
} from '../../src/lib/api';
import { getCachedTransferBanks, peekCachedTransferBanks, preloadTransferBanks } from '../../src/lib/transfer-banks-cache';
import {
  findRecentTransferRecipient,
  searchRecentTransferRecipients,
  getCachedRecentTransferRecipients,
  hasRecentTransferRecipientsCache,
  peekCachedRecentTransferRecipients,
  peekRecentlyVerifiedAccount,
  preloadRecentTransferRecipients,
  removeRecentTransferRecipients,
  rememberVerifiedAccount,
  transferRecipientKey,
  upsertRecentTransferRecipient,
  type TransferRecentRecipient,
} from '../../src/lib/transfer-recipients-cache';
import {
  DEFAULT_TRANSFER_CONFIG,
  getCachedTransferConfig,
  peekCachedTransferConfig,
} from '../../src/lib/transfer-config-cache';
import { isServiceUsable } from '../../src/lib/service-availability';
import { useServiceAvailabilityStore } from '../../src/stores/service-availability-store';
import {
  computeTransferFeeNaira,
  enrichTransferBank,
  formatAccountNumberDisplay,
  sanitizeAccountNumber,
} from '../../src/lib/transfer-banks';
import { TransferBankPickerModal } from '../../src/components/TransferBankPickerModal';
import { TransferSuccessModal } from '../../src/components/TransferSuccessModal';
import { BankLogo } from '../../src/components/BankLogo';
import { promptTransferScanSource, scanTransferDetails } from '../../src/lib/transfer-scan';
import { refreshDashboardData, refreshHistoryData } from '../../src/lib/dashboard-data';
import { useWalletStore } from '../../src/stores';
import { Colors, Gradients, Spacing, Radius, Shadow } from '../../src/theme';
import { useColors, useGradients } from '../../src/theme/hooks';
import { gradientStops } from '../../src/theme/gradient-utils';
import { LoadingOverlay } from '../../src/components/ui/LoadingOverlay';
import { ThemedScreen } from '../../src/components/ui/ThemedScreen';
import { GradientButton } from '../../src/components/ui/GradientButton';
import { GlassCard } from '../../src/components/ui/GlassCard';
import { showToast } from '../../src/components/ui/Toast';
import { useHardwareBack } from '../../src/hooks/useHardwareBack';
import { useStatusBarStyle } from '../../src/hooks/useStatusBarStyle';
import { navigateBack } from '../../src/lib/navigation';
import { TransactionLockSheet } from '../../src/components/security/TransactionLockSheet';
import type { TransactionAuthPayload } from '../../src/hooks/useTransactionLockAuth';
import { SERVICE_CODES } from '../../src/lib/service-availability';


const QUICK_AMOUNTS = [1000, 2000, 5000, 10000, 20000, 50000];

const ACCOUNT_VERIFY_ERROR = {
  text1: 'Wrong account details',
  text2: 'Check and try again',
} as const;

type BankSuggestion = {
  bank: Bank;
  accountName: string;
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

function recipientInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function matchToBank(match: BankAccountMatch, banks: Bank[]): Bank {
  const existing = banks.find((bank) => bank.code === match.bankCode);
  if (existing) return existing;
  return {
    code: match.bankCode,
    name: match.bankName,
    shortName: match.shortName,
    logoUrl: match.logoUrl,
  };
}

export default function TransferScreen() {
  useStatusBarStyle('light');
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const gradients = useGradients();
  const { balance, balanceVisible, setBalance } = useWalletStore();

  const availabilityLoadedAt = useServiceAvailabilityStore((s) => s.loadedAt);
  const availability = useServiceAvailabilityStore((s) => s.availability);

  const [banks, setBanks] = useState<Bank[]>(() => peekCachedTransferBanks() ?? []);
  const [transferConfig, setTransferConfig] = useState<TransferConfig>(
    () => peekCachedTransferConfig() ?? DEFAULT_TRANSFER_CONFIG,
  );
  const [selectedBank, setSelectedBank] = useState<Bank | null>(null);
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [verifiedBankCode, setVerifiedBankCode] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [narration, setNarration] = useState('');
  const [step, setStep] = useState<'form' | 'confirm'>('form');
  const [showLock, setShowLock] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [loadingBanks, setLoadingBanks] = useState(() => !peekCachedTransferBanks()?.length);
  const [showBankPicker, setShowBankPicker] = useState(false);
  const [suggestions, setSuggestions] = useState<BankSuggestion[]>([]);
  const [recentRecipients, setRecentRecipients] = useState<TransferRecentRecipient[]>([]);
  const [recentEditMode, setRecentEditMode] = useState(false);
  const [pendingRecentRemovals, setPendingRecentRemovals] = useState<Set<string>>(() => new Set());
  const [savingRecentEdits, setSavingRecentEdits] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const serviceDisabled = Boolean(
    availabilityLoadedAt && !isServiceUsable(availability, SERVICE_CODES.localTransfer),
  );
  const showDisabled = serviceDisabled || !transferConfig.isEnabled;
  const [successMeta, setSuccessMeta] = useState<{
    amount: number;
    fee: number;
    totalDebit: number;
    name: string;
    accountNumber: string;
    bank: Bank | null;
    bankName?: string;
    reference?: string;
  } | null>(null);

  const resolveRequestId = useRef(0);
  const resolveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastResolvedAccount = useRef('');
  const lastResolvedBankCode = useRef('');
  const verifiedSnapshot = useRef<{
    accountNumber: string;
    bankCode: string;
    accountName: string;
  } | null>(null);
  const banksHydrated = useRef(false);

  const isAccountVerified = Boolean(
    accountName
    && selectedBank
    && verifiedBankCode === selectedBank.code
    && accountNumber.length === 10,
  );

  const markVerified = useCallback((accNum: string, bankCode: string, name: string) => {
    verifiedSnapshot.current = { accountNumber: accNum, bankCode, accountName: name };
    lastResolvedAccount.current = accNum;
    lastResolvedBankCode.current = bankCode;
    rememberVerifiedAccount({ accountNumber: accNum, bankCode, accountName: name });
    setAccountName(name);
    setVerifiedBankCode(bankCode);
  }, []);

  const tryRestoreVerified = useCallback((accNum: string, bankCode?: string | null): boolean => {
    if (!bankCode || accNum.length !== 10) return false;

    const snap = verifiedSnapshot.current;
    if (snap?.accountNumber === accNum && snap.bankCode === bankCode) {
      setAccountName(snap.accountName);
      setVerifiedBankCode(snap.bankCode);
      return true;
    }

    const cached = peekRecentlyVerifiedAccount(accNum, bankCode);
    if (cached) {
      markVerified(accNum, bankCode, cached.accountName);
      return true;
    }

    const recent = findRecentTransferRecipient(accNum, bankCode);
    if (recent?.accountName) {
      markVerified(accNum, bankCode, recent.accountName);
      return true;
    }

    return false;
  }, [markVerified]);

  const resetVerifiedUi = useCallback(() => {
    verifiedSnapshot.current = null;
    lastResolvedAccount.current = '';
    lastResolvedBankCode.current = '';
    setAccountName('');
    setVerifiedBankCode(null);
    setSuggestions([]);
  }, []);

  const numericAmount = parseFloat(amount.replace(/,/g, ''));
  const isValidAmount = Number.isFinite(numericAmount) && numericAmount >= (transferConfig.minAmount || 100);
  const displayAmount = useMemo(() => formatAmountDisplay(amount), [amount]);
  const displayAccount = formatAccountNumberDisplay(accountNumber);

  const transferFee = useMemo(
    () => computeTransferFeeNaira(numericAmount, transferConfig.feeType, transferConfig.feeValue),
    [numericAmount, transferConfig.feeType, transferConfig.feeValue],
  );
  const totalDebit = (Number.isFinite(numericAmount) ? numericAmount : 0) + transferFee;

  const selectedBankDisplay = selectedBank ? enrichTransferBank(selectedBank) : null;

  const recentAccountSuggestions = useMemo(() => {
    if (accountNumber.length < 3) return [];
    if (isAccountVerified) return [];
    if (suggestions.length > 0 || resolving) return [];

    return searchRecentTransferRecipients(accountNumber, { limit: 5 });
  }, [accountNumber, isAccountVerified, suggestions.length, resolving]);

  const handleBack = useCallback(() => {
    if (recentEditMode) {
      setRecentEditMode(false);
      setPendingRecentRemovals(new Set());
      return;
    }
    if (showLock) {
      setShowLock(false);
      return;
    }
    if (step === 'confirm') {
      setStep('form');
      return;
    }
    navigateBack();
  }, [recentEditMode, step, showLock]);

  useHardwareBack(handleBack);

  const cancelRecentEdit = useCallback(() => {
    setRecentEditMode(false);
    setPendingRecentRemovals(new Set());
  }, []);

  const togglePendingRecentRemoval = useCallback((recipient: TransferRecentRecipient) => {
    const key = transferRecipientKey(recipient);
    setPendingRecentRemovals((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const confirmRecentEdits = useCallback(async () => {
    if (savingRecentEdits) return;

    const toRemove = recentRecipients.filter((recipient) =>
      pendingRecentRemovals.has(transferRecipientKey(recipient)),
    );

    if (toRemove.length === 0) {
      cancelRecentEdit();
      return;
    }

    setSavingRecentEdits(true);
    try {
      const res = await api.removeRecentTransferRecipients(
        toRemove.map((recipient) => ({
          bankCode: recipient.bankCode,
          accountNumber: recipient.accountNumber,
        })),
      );

      if (!isResponseSuccess(res)) {
        showToast({
          type: 'error',
          text1: 'Could not update recent',
          text2: res.message || 'Please try again',
        });
        return;
      }

      setRecentRecipients(removeRecentTransferRecipients(toRemove));
      cancelRecentEdit();
      showToast({ type: 'success', text1: 'Recent updated' });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Please try again';
      showToast({ type: 'error', text1: 'Could not update recent', text2: message });
    } finally {
      setSavingRecentEdits(false);
    }
  }, [cancelRecentEdit, pendingRecentRemovals, recentRecipients, savingRecentEdits]);

  const loadBanksAndConfig = useCallback(async (options?: { forceRefresh?: boolean }) => {
    const cached = peekCachedTransferBanks();
    if (cached?.length) {
      setBanks(cached);
      setLoadingBanks(false);
    } else {
      setLoadingBanks(true);
    }

    try {
      const [banksList, config] = await Promise.all([
        getCachedTransferBanks({ forceRefresh: options?.forceRefresh }),
        getCachedTransferConfig({ forceRefresh: options?.forceRefresh }),
      ]);
      setBanks(banksList);
      setTransferConfig(config);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load banks';
      showToast({ type: 'error', text1: 'Could not load banks', text2: message });
    } finally {
      setLoadingBanks(false);
    }
  }, []);

  useEffect(() => {
    preloadTransferBanks();
    preloadRecentTransferRecipients();
    void loadBanksAndConfig();

    if (hasRecentTransferRecipientsCache()) {
      setRecentRecipients(peekCachedRecentTransferRecipients() ?? []);
      return;
    }

    void getCachedRecentTransferRecipients()
      .then(setRecentRecipients)
      .catch(() => {});
  }, [loadBanksAndConfig]);

  useEffect(() => () => {
    if (resolveTimer.current) clearTimeout(resolveTimer.current);
  }, []);

  const resolveAccount = useCallback(async (accNum: string, bank?: Bank | null) => {
    if (accNum.length !== 10) return;

    const bankCode = bank?.code ?? '';
    if (bankCode && tryRestoreVerified(accNum, bankCode)) {
      return;
    }
    if (!bank && verifiedSnapshot.current?.accountNumber === accNum) {
      const snap = verifiedSnapshot.current;
      setAccountName(snap.accountName);
      setVerifiedBankCode(snap.bankCode);
      return;
    }

    const requestId = ++resolveRequestId.current;
    setResolving(true);

    try {
      const res = await api.resolveBankAccount(accNum, bank?.code);
      if (requestId !== resolveRequestId.current) return;

      if (!isResponseSuccess(res) || !res.data) {
        setSuggestions([]);
        if (bank) {
          setAccountName('');
          setVerifiedBankCode(null);
          showToast({ type: 'error', ...ACCOUNT_VERIFY_ERROR });
        }
        return;
      }

      const { matches } = res.data;
      lastResolvedAccount.current = accNum;
      lastResolvedBankCode.current = bankCode;

      if (matches.length === 0) {
        setAccountName('');
        setVerifiedBankCode(null);
        setSuggestions([]);
        if (bank) {
          showToast({ type: 'error', ...ACCOUNT_VERIFY_ERROR });
        }
        return;
      }

      if (bank || matches.length === 1) {
        const match = matches[0];
        const resolvedBank = matchToBank(match, banks);
        setSelectedBank(resolvedBank);
        markVerified(accNum, resolvedBank.code, match.accountName);
        setSuggestions([]);
        return;
      }

      setAccountName('');
      setVerifiedBankCode(null);
      verifiedSnapshot.current = null;
      setSuggestions(
        matches.map((match) => ({
          bank: matchToBank(match, banks),
          accountName: match.accountName,
        })),
      );
    } catch (err: unknown) {
      setSuggestions([]);
      if (bank && !isSessionExpiredError(err)) {
        setAccountName('');
        setVerifiedBankCode(null);
        showToast({ type: 'error', ...ACCOUNT_VERIFY_ERROR });
      }
    } finally {
      if (requestId === resolveRequestId.current) setResolving(false);
    }
  }, [banks, markVerified, tryRestoreVerified]);

  const scheduleResolve = useCallback((accNum: string, bank?: Bank | null) => {
    if (bank?.code && tryRestoreVerified(accNum, bank.code)) return;
    if (resolveTimer.current) clearTimeout(resolveTimer.current);
    if (accNum.length !== 10) return;

    resolveTimer.current = setTimeout(() => {
      void resolveAccount(accNum, bank ?? null);
    }, 350);
  }, [resolveAccount, tryRestoreVerified]);

  const handleAccountChange = (value: string) => {
    const digits = sanitizeAccountNumber(value);
    if (digits === accountNumber) return;

    setAccountNumber(digits);

    if (digits.length < 10) {
      if (resolveTimer.current) clearTimeout(resolveTimer.current);
      resolveRequestId.current += 1;
      resetVerifiedUi();
      return;
    }

    if (tryRestoreVerified(digits, selectedBank?.code)) {
      return;
    }

    resetVerifiedUi();

    if (!selectedBank && searchRecentTransferRecipients(digits).length > 0) {
      return;
    }

    scheduleResolve(digits, selectedBank);
  };

  const handlePasteAccount = useCallback(async () => {
    const text = await Clipboard.getStringAsync();
    const digits = sanitizeAccountNumber(text);
    if (!digits) {
      showToast({ type: 'warning', text1: 'Nothing to paste', text2: 'Copy an account number first' });
      return;
    }
    handleAccountChange(digits);
  }, [selectedBank, scheduleResolve]);

  const handleSelectRecent = useCallback((recipient: TransferRecentRecipient) => {
    if (resolveTimer.current) clearTimeout(resolveTimer.current);
    resolveRequestId.current += 1;

    const bank = banks.find((item) => item.code === recipient.bankCode) ?? {
      code: recipient.bankCode,
      name: recipient.bankCode,
      shortName: recipient.bankCode,
    };

    setAccountNumber(recipient.accountNumber);
    setSelectedBank(bank);
    setSuggestions([]);
    markVerified(recipient.accountNumber, bank.code, recipient.accountName);
    Keyboard.dismiss();
  }, [banks, markVerified]);

  const pollTransferCompletion = useCallback((reference: string, sessionId?: string) => {
    let attempts = 0;
    const timer = setInterval(async () => {
      attempts += 1;
      if (attempts > 12) {
        clearInterval(timer);
        return;
      }
      try {
        const res = await api.checkTransferStatus(reference, sessionId);
        if (isResponseSuccess(res) && res.data) {
          const status = String(res.data.status || '').toLowerCase();
          if (status === 'success' || status === 'failed') {
            clearInterval(timer);
            void refreshDashboardData({ force: true });
            void refreshHistoryData({ force: true });
          }
        }
      } catch {
        // Keep polling quietly
      }
    }, 4000);
  }, []);

  const handleSelectBank = (bank: Bank) => {
    setShowBankPicker(false);
    if (bank.code === selectedBank?.code) return;

    setSelectedBank(bank);
    setSuggestions([]);

    if (accountNumber.length !== 10) return;

    if (tryRestoreVerified(accountNumber, bank.code)) {
      return;
    }

    if (resolveTimer.current) clearTimeout(resolveTimer.current);
    resolveRequestId.current += 1;
    resetVerifiedUi();
    scheduleResolve(accountNumber, bank);
  };

  useEffect(() => {
    if (banks.length === 0 || banksHydrated.current) return;
    banksHydrated.current = true;
    if (accountNumber.length === 10 && !tryRestoreVerified(accountNumber, selectedBank?.code)) {
      if (!selectedBank && searchRecentTransferRecipients(accountNumber).length > 0) {
        return;
      }
      scheduleResolve(accountNumber, selectedBank);
    }
  }, [accountNumber, banks.length, scheduleResolve, selectedBank, tryRestoreVerified]);

  const handleSelectSuggestion = (item: BankSuggestion) => {
    setSelectedBank(item.bank);
    markVerified(accountNumber, item.bank.code, item.accountName);
    setSuggestions([]);
    Keyboard.dismiss();
  };

  const handleContinue = () => {
    if (!selectedBank) {
      showToast({ type: 'error', text1: 'Select bank', text2: 'Choose or confirm the recipient bank' });
      return;
    }
    if (accountNumber.length !== 10) {
      showToast({ type: 'error', text1: 'Invalid account', text2: 'Enter a valid 10-digit account number' });
      return;
    }
    const isVerifiedForBank = Boolean(
      accountName?.trim()
      && selectedBank
      && verifiedBankCode === selectedBank.code,
    );
    if (!isVerifiedForBank || resolving) {
      showToast({
        type: 'error',
        text1: resolving ? 'Verifying account' : 'Verify account',
        text2: resolving
          ? 'Please wait while we confirm this account'
          : 'We could not verify this account yet',
      });
      return;
    }
    if (!isValidAmount) {
      showToast({
        type: 'error',
        text1: 'Invalid amount',
        text2: `Minimum transfer is ₦${(transferConfig.minAmount || 100).toLocaleString()}`,
      });
      return;
    }
    Keyboard.dismiss();
    setStep('confirm');
  };

  const handleTransfer = async (auth: TransactionAuthPayload) => {
    setLoading(true);
    try {
      const res = await api.initiateTransfer({
        bankCode: selectedBank!.code,
        accountNumber,
        accountName,
        amount: numericAmount,
        narration: narration || `Transfer to ${accountName}`,
        ...auth,
      });
      if (isResponseSuccess(res)) {
        const balRes = await api.getWalletBalance();
        if (isResponseSuccess(balRes)) setBalance(parseWalletBalanceKobo(balRes.data));
        setSuccessMeta({
          amount: numericAmount,
          fee: transferFee,
          totalDebit,
          name: accountName,
          accountNumber: displayAccount,
          bank: selectedBank,
          bankName: selectedBankDisplay?.shortName || selectedBank?.name,
          reference: res.data?.reference,
        });
        setShowSuccessModal(true);
        setShowLock(false);
        setRecentRecipients(
          upsertRecentTransferRecipient({
            accountNumber,
            accountName,
            bankCode: selectedBank!.code,
            lastTransferAt: new Date().toISOString(),
          }),
        );
        if (res.data?.reference) {
          pollTransferCompletion(res.data.reference, res.data.sessionId);
        }
      } else {
        showToast({ type: 'error', text1: 'Transfer failed', text2: res.message || 'Please try again' });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Please try again';
      if (/timeout/i.test(message)) {
        showToast({
          type: 'info',
          text1: 'Still processing',
          text2: 'Your transfer may still complete. Check your wallet and history shortly.',
        });
      } else {
        showToast({ type: 'error', text1: 'Transfer failed', text2: message });
      }
    } finally {
      setLoading(false);
    }
  };

  const openBankPicker = useCallback(() => {
    if (recentEditMode) cancelRecentEdit();
    setShowBankPicker(true);
    if (banks.length === 0) {
      void loadBanksAndConfig();
    }
  }, [banks.length, cancelRecentEdit, loadBanksAndConfig, recentEditMode]);

  const handleScanAccount = useCallback(async () => {
    const source = await promptTransferScanSource();
    if (!source) return;

    setScanning(true);
    try {
      let bankList = banks.length > 0 ? banks : peekCachedTransferBanks() ?? [];
      if (bankList.length === 0) {
        bankList = await getCachedTransferBanks();
        setBanks(bankList);
      }

      const result = await scanTransferDetails(bankList, source);
      if (!result) return;

      const { accountNumber: scannedAccount, bank: scannedBank } = result;

      if (!scannedAccount && !scannedBank) {
        showToast({
          type: 'warning',
          text1: 'Could not read details',
          text2: 'Try a clearer photo with the account number visible',
        });
        return;
      }

      if (scannedBank) {
        setSelectedBank(scannedBank);
      }

      if (scannedAccount) {
        setAccountNumber(scannedAccount);
        setAccountName('');
        setVerifiedBankCode(null);
        setSuggestions([]);
        lastResolvedAccount.current = '';
        lastResolvedBankCode.current = '';
        scheduleResolve(scannedAccount, scannedBank);
      }

      const parts: string[] = [];
      if (scannedAccount) parts.push('account number');
      if (scannedBank) parts.push('bank');
      showToast({
        type: 'success',
        text1: 'Details captured',
        text2: parts.length ? `Found ${parts.join(' and ')}` : 'Review the fields below',
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Could not scan image';
      if (message !== 'cancelled') {
        showToast({ type: 'error', text1: 'Scan failed', text2: message });
      }
    } finally {
      setScanning(false);
    }
  }, [banks, scheduleResolve]);

  if (showDisabled) {
    return (
      <ThemedScreen>
        <LinearGradient
          colors={gradientStops(gradients.hero)}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.header, { paddingTop: insets.top + 12 }]}
        >
          <View style={styles.headerRow}>
            <TouchableOpacity style={styles.backBtn} onPress={handleBack} activeOpacity={0.8}>
              <Ionicons name="arrow-back" size={20} color={Colors.white} />
            </TouchableOpacity>
            <View style={styles.headerText}>
              <Text style={styles.headerTitle}>Transfer Funds</Text>
              <Text style={styles.headerSub}>Send money to any Nigerian bank</Text>
            </View>
          </View>
        </LinearGradient>
        <GlassCard
          variant="solid"
          borderRadius={Radius.xl}
          padding={24}
          style={{ marginTop: 24, marginHorizontal: Spacing.page }}
          contentStyle={styles.disabledCard}
        >
          <View style={styles.disabledIconWrap}>
            <Ionicons name="ban-outline" size={28} color={Colors.primary} />
          </View>
          <Text style={styles.stateTitle}>Transfers currently disabled</Text>
          <Text style={styles.stateSub}>
            Bank transfers are temporarily unavailable. Please check back later or contact support.
          </Text>
        </GlassCard>
      </ThemedScreen>
    );
  }

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
          <TouchableOpacity style={styles.backBtn} onPress={handleBack} activeOpacity={0.8}>
            <Ionicons name="arrow-back" size={20} color={Colors.white} />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Transfer Funds</Text>
            <Text style={styles.headerSub}>Send money to any Nigerian bank</Text>
          </View>
          <View style={styles.balPill}>
            <Text style={styles.balLabel}>Balance</Text>
            <Text style={styles.balText}>
              {balanceVisible ? formatCurrencyVisible(balance, true) : MASKED_BALANCE}
            </Text>
          </View>
        </View>

        <View style={styles.stepRow}>
          <View style={[styles.stepPill, step === 'form' && styles.stepPillActive]}>
            <Text style={[styles.stepText, step === 'form' && styles.stepTextActive]}>1. Details</Text>
          </View>
          <View style={styles.stepLine} />
          <View style={[styles.stepPill, step === 'confirm' && styles.stepPillActive]}>
            <Text style={[styles.stepText, step === 'confirm' && styles.stepTextActive]}>2. Confirm</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={[styles.contentCurve, { backgroundColor: colors.pageBg }]} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={8}
      >
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 100 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {step === 'form' ? (
            <>
              {recentRecipients.length > 0 && (
                <GlassCard variant="solid" borderRadius={Radius.lg} padding={14} contentStyle={styles.recentCard}>
                  <View style={styles.recentHeader}>
                    <Text style={styles.fieldLabel}>Recent</Text>
                    <View style={styles.recentHeaderActions}>
                      {recentEditMode ? (
                        <View style={styles.recentEditActions}>
                          <TouchableOpacity
                            style={styles.recentEditActionBtn}
                            onPress={cancelRecentEdit}
                            hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
                            activeOpacity={0.7}
                          >
                            <Text style={styles.recentCancelText}>Cancel</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.recentEditActionBtn}
                            onPress={() => void confirmRecentEdits()}
                            disabled={savingRecentEdits}
                            hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
                            activeOpacity={0.7}
                          >
                            {savingRecentEdits ? (
                              <ActivityIndicator size="small" color={Colors.primary} />
                            ) : (
                              <Text style={styles.recentSaveText}>
                                {pendingRecentRemovals.size > 0 ? 'Save' : 'Done'}
                              </Text>
                            )}
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <TouchableOpacity
                          style={styles.recentEditBtn}
                          onPress={() => setRecentEditMode(true)}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="create-outline" size={16} color={Colors.muted} />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.recentRow}>
                    {recentRecipients.map((recipient) => {
                      const bank = banks.find((item) => item.code === recipient.bankCode);
                      const enriched = bank ? enrichTransferBank(bank) : null;
                      const removalKey = transferRecipientKey(recipient);
                      const isPendingRemoval = pendingRecentRemovals.has(removalKey);

                      return (
                        <TouchableOpacity
                          key={removalKey}
                          style={[
                            styles.recentChip,
                            recentEditMode && styles.recentChipEditing,
                            isPendingRemoval && styles.recentChipPending,
                          ]}
                          onPress={() => {
                            if (recentEditMode) {
                              togglePendingRecentRemoval(recipient);
                              return;
                            }
                            handleSelectRecent(recipient);
                          }}
                          activeOpacity={0.85}
                        >
                          <View style={styles.recentChipAvatarWrap}>
                            {enriched ? (
                              <BankLogo bank={enriched} size={34} />
                            ) : (
                              <View style={styles.recentAvatar}>
                                <Text style={styles.recentAvatarText}>
                                  {recipientInitials(recipient.accountName)}
                                </Text>
                              </View>
                            )}
                            {recentEditMode ? (
                              <View
                                style={[
                                  styles.recentRemoveBadge,
                                  isPendingRemoval && styles.recentRemoveBadgeActive,
                                ]}
                              >
                                <Ionicons
                                  name={isPendingRemoval ? 'close' : 'remove'}
                                  size={11}
                                  color="#fff"
                                />
                              </View>
                            ) : null}
                          </View>
                          <Text
                            style={[
                              styles.recentName,
                              isPendingRemoval && styles.recentNamePending,
                            ]}
                            numberOfLines={2}
                          >
                            {recipient.accountName.split(' ')[0]}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </GlassCard>
              )}

              <GlassCard variant="solid" borderRadius={Radius.lg} padding={0} contentStyle={styles.formSheet}>
                <View style={styles.formSection}>
                  <Text style={styles.fieldLabel}>Account number</Text>
                <View style={styles.accountRow}>
                  <View style={[styles.accountInputWrap, scanning && styles.inputBusy]}>
                    <TextInput
                      style={styles.accountInput}
                      placeholder="0123456789"
                      placeholderTextColor={Colors.mutedLight}
                      value={displayAccount.replace(/\s/g, '')}
                      onChangeText={handleAccountChange}
                      onFocus={() => {
                        if (recentEditMode) cancelRecentEdit();
                      }}
                      keyboardType="number-pad"
                      maxLength={10}
                    />
                    <TouchableOpacity style={styles.pasteBtn} onPress={() => void handlePasteAccount()} activeOpacity={0.8}>
                      <Ionicons name="clipboard-outline" size={13} color={Colors.primary} />
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity
                    style={styles.scanIconBtn}
                    onPress={() => void handleScanAccount()}
                    disabled={scanning}
                    activeOpacity={0.85}
                  >
                    {scanning ? (
                      <ActivityIndicator size="small" color={Colors.primary} />
                    ) : (
                      <Ionicons name="scan-outline" size={20} color={Colors.primary} />
                    )}
                  </TouchableOpacity>
                </View>

                {recentAccountSuggestions.length > 0 && (
                  <View style={styles.suggestBlock}>
                    <Text style={styles.suggestSectionLabel}>From recent</Text>
                    {recentAccountSuggestions.map((recipient) => {
                      const bank = banks.find((item) => item.code === recipient.bankCode);
                      const enriched = bank ? enrichTransferBank(bank) : null;
                      return (
                        <TouchableOpacity
                          key={`recent-${recipient.bankCode}-${recipient.accountNumber}`}
                          style={styles.suggestRow}
                          onPress={() => handleSelectRecent(recipient)}
                          activeOpacity={0.85}
                        >
                          {enriched ? (
                            <BankLogo bank={enriched} size={32} />
                          ) : (
                            <View style={styles.recentSuggestAvatar}>
                              <Text style={styles.recentSuggestAvatarText}>
                                {recipientInitials(recipient.accountName)}
                              </Text>
                            </View>
                          )}
                          <View style={styles.suggestText}>
                            <Text style={styles.suggestName}>{recipient.accountName}</Text>
                            <Text style={styles.suggestMeta}>
                              <Text style={styles.suggestAccount}>{recipient.accountNumber}</Text>
                              {enriched ? (
                                <>
                                  {' · '}
                                  {enriched.shortName || enriched.name}
                                </>
                              ) : null}
                            </Text>
                          </View>
                          <Ionicons name="chevron-forward" size={18} color={Colors.muted} />
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}

                {suggestions.length > 0 && (
                  <View style={styles.suggestBlock}>
                    {suggestions.map((item) => {
                      const enriched = enrichTransferBank(item.bank);
                      return (
                        <TouchableOpacity
                          key={item.bank.code}
                          style={styles.suggestRow}
                          onPress={() => handleSelectSuggestion(item)}
                          activeOpacity={0.85}
                        >
                          <BankLogo bank={enriched} size={32} />
                          <View style={styles.suggestText}>
                            <Text style={styles.suggestName}>{item.accountName}</Text>
                            <Text style={styles.suggestMeta}>
                              <Text style={styles.suggestAccount}>{accountNumber}</Text>
                              {' · '}
                              {enriched.shortName || enriched.name}
                            </Text>
                          </View>
                          <Ionicons name="chevron-forward" size={18} color={Colors.muted} />
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}

                {accountName
                  && selectedBank
                  && isAccountVerified
                  && !resolving
                  && suggestions.length === 0
                  && recentAccountSuggestions.length === 0 ? (
                  <View style={styles.verifiedCard}>
                    <View
                      style={[
                        styles.verifiedAvatar,
                        !selectedBankDisplay && styles.verifiedAvatarInitials,
                      ]}
                    >
                      {selectedBankDisplay ? (
                        <BankLogo bank={selectedBankDisplay} size={32} />
                      ) : (
                        <Text style={styles.verifiedAvatarText}>{recipientInitials(accountName)}</Text>
                      )}
                    </View>
                    <View style={styles.verifiedText}>
                      <Text style={styles.verifiedName}>{accountName}</Text>
                      <Text style={styles.verifiedMeta}>
                        <Text style={styles.verifiedAccount}>{accountNumber}</Text>
                        {' · '}
                        {selectedBankDisplay?.shortName || selectedBank.name}
                      </Text>
                    </View>
                    <Ionicons name="checkmark-circle" size={18} color={Colors.success} />
                  </View>
                ) : null}
                </View>

                <View style={styles.formDivider} />

                <View style={styles.formSection}>
                <Text style={styles.fieldLabel}>Bank</Text>
                <TouchableOpacity style={styles.bankSelector} onPress={openBankPicker} activeOpacity={0.85}>
                  {selectedBankDisplay ? (
                    <View style={styles.bankSelectorInner}>
                      <BankLogo bank={selectedBankDisplay} size={28} />
                      <View style={styles.bankSelectorTextWrap}>
                        <Text style={styles.bankSelectorText}>{selectedBankDisplay.shortName || selectedBank!.name}</Text>
                      </View>
                    </View>
                  ) : (
                    <View style={styles.bankSelectorInner}>
                      <View style={styles.bankSelectorIcon}>
                        <Ionicons name="business-outline" size={16} color={Colors.primary} />
                      </View>
                      <Text style={styles.bankSelectorPlaceholder}>Choose bank</Text>
                    </View>
                  )}
                  <Ionicons name="chevron-down" size={16} color={Colors.mutedLight} />
                </TouchableOpacity>
                {resolving && accountNumber.length === 10 && !isAccountVerified && (
                  <View style={styles.matchingRow}>
                    <ActivityIndicator size="small" color={Colors.primary} />
                    <Text style={styles.matchingText}>
                      {selectedBank ? 'Verifying account…' : 'Matching banks…'}
                    </Text>
                  </View>
                )}
                </View>

                <View style={styles.formDivider} />

                <View style={styles.formSection}>
                <Text style={styles.fieldLabel}>Amount</Text>
                <View style={[styles.amountWrap, amount ? styles.amountWrapFilled : null]}>
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
                <Text style={styles.amountHint}>
                  Minimum ₦{(transferConfig.minAmount || 100).toLocaleString()}
                </Text>
                <View style={styles.quickGrid}>
                  {QUICK_AMOUNTS.map((value) => {
                    const active = amount === String(value);
                    return (
                      <TouchableOpacity
                        key={value}
                        style={[styles.quickChip, active && styles.quickChipActive]}
                        onPress={() => setAmount(String(value))}
                        activeOpacity={0.75}
                      >
                        <Text style={[styles.quickText, active && styles.quickTextActive]}>
                          ₦{value >= 1000 ? `${value / 1000}k` : value}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                {transferFee > 0 && isValidAmount && (
                  <View style={styles.feeCard}>
                    <View style={styles.feeRow}>
                      <Text style={styles.feeLabel}>Transfer fee</Text>
                      <Text style={styles.feeValue}>₦{transferFee.toLocaleString()}</Text>
                    </View>
                    <View style={styles.feeRow}>
                      <Text style={styles.feeTotalLabel}>Total debit</Text>
                      <Text style={styles.feeTotalValue}>₦{totalDebit.toLocaleString()}</Text>
                    </View>
                  </View>
                )}
                </View>

                <View style={styles.formDivider} />

                <View style={styles.formSection}>
                <Text style={styles.fieldLabel}>Narration (optional)</Text>
                <View style={styles.narrationWrap}>
                  <TextInput
                    style={styles.narrationInput}
                    placeholder="What's this for?"
                    placeholderTextColor={Colors.mutedLight}
                    value={narration}
                    onChangeText={setNarration}
                  />
                </View>
                </View>
              </GlassCard>
            </>
          ) : (
            <>
              <View style={styles.confirmTopRow}>
                <View style={styles.confirmVerifiedBadge}>
                  <Ionicons name="shield-checkmark" size={13} color={Colors.primary} />
                  <Text style={styles.confirmVerifiedText}>Verified recipient</Text>
                </View>
                <TouchableOpacity
                  style={styles.confirmEditBtn}
                  onPress={() => setStep('form')}
                  activeOpacity={0.8}
                >
                  <Ionicons name="pencil-outline" size={13} color={Colors.primary} />
                  <Text style={styles.confirmEditText}>Edit</Text>
                </TouchableOpacity>
              </View>

              <GlassCard variant="solid" borderRadius={Radius.xl} padding={0} style={styles.confirmSheet} contentStyle={styles.confirmSheetInner}>
                <LinearGradient
                  colors={gradientStops(gradients.card)}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.confirmHero}
                >
                  <View style={styles.confirmHeroBlob1} />
                  <View style={styles.confirmHeroBlob2} />

                  <View style={styles.confirmHeroRow}>
                    <View style={styles.confirmLogoRing}>
                      {selectedBankDisplay ? (
                        <BankLogo bank={selectedBankDisplay} size={54} />
                      ) : (
                        <View style={styles.confirmLogoFallback}>
                          <Text style={styles.confirmLogoFallbackText}>{recipientInitials(accountName)}</Text>
                        </View>
                      )}
                    </View>

                    <View style={styles.confirmHeroInfo}>
                      <Text style={styles.confirmSendingLabel}>You're sending</Text>
                      <Text style={styles.confirmAmount}>₦{numericAmount.toLocaleString()}</Text>
                      <Text style={styles.confirmRecipient} numberOfLines={2}>
                        {accountName.toUpperCase()}
                      </Text>
                      <View style={styles.confirmAccountChip}>
                        <Text style={styles.confirmAccountChipText}>
                          {selectedBankDisplay?.shortName || selectedBank?.name} · {displayAccount}
                        </Text>
                      </View>
                    </View>
                  </View>
                </LinearGradient>

                <View style={styles.confirmBody}>
                  {narration.trim() ? (
                    <View style={styles.confirmNarrationRow}>
                      <Ionicons name="chatbubble-ellipses-outline" size={15} color={Colors.muted} />
                      <Text style={styles.confirmNarrationText} numberOfLines={2}>{narration.trim()}</Text>
                    </View>
                  ) : null}

                  <View style={styles.confirmTotals}>
                    {transferFee > 0 ? (
                      <>
                        <View style={styles.confirmTotalCol}>
                          <Text style={styles.confirmTotalLabel}>Transfer fee</Text>
                          <Text style={styles.confirmTotalValue}>₦{transferFee.toLocaleString()}</Text>
                        </View>
                        <View style={styles.confirmTotalDivider} />
                      </>
                    ) : null}
                    <View style={styles.confirmTotalCol}>
                      <Text style={styles.confirmTotalLabelStrong}>Total debit</Text>
                      <Text style={styles.confirmTotalValueStrong}>₦{totalDebit.toLocaleString()}</Text>
                    </View>
                  </View>
                </View>
              </GlassCard>
            </>
          )}
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: insets.bottom + 12, paddingHorizontal: Spacing.page, paddingTop: 12 }]}>
          {step === 'form' ? (
            <GradientButton
              title="Review transfer"
              onPress={handleContinue}
              inactive={!accountName || !selectedBank || !isValidAmount || resolving || scanning}
              disabled={!accountName || !selectedBank || !isValidAmount || resolving || scanning}
              rightIcon={<Ionicons name="arrow-forward" size={18} color={Colors.white} />}
              gradientStyle={styles.cta}
            />
          ) : (
            <GradientButton
              onPress={() => setShowLock(true)}
              disabled={loading}
              isLoading={loading}
              gradientStyle={styles.cta}
            >
              <Ionicons name="paper-plane" size={18} color={Colors.white} />
              <Text style={styles.ctaText}>
                Send ₦{(transferFee > 0 ? totalDebit : numericAmount).toLocaleString()}
              </Text>
            </GradientButton>
          )}
          <View style={styles.secureRow}>
            <Ionicons name="shield-checkmark" size={12} color={Colors.primary} />
            <Text style={styles.secureNote}>Secured transfer · Instant verification</Text>
          </View>
        </View>
      </KeyboardAvoidingView>

      <TransferBankPickerModal
        visible={showBankPicker}
        banks={banks}
        loading={loadingBanks && banks.length === 0}
        selectedCode={selectedBank?.code}
        onClose={() => setShowBankPicker(false)}
        onSelect={handleSelectBank}
      />

      <TransactionLockSheet
        visible={showLock}
        onClose={() => setShowLock(false)}
        onAuthorized={handleTransfer}
        title="Confirm transfer"
        subtitle={`Authorize ₦${(transferFee > 0 ? totalDebit : numericAmount).toLocaleString()} to ${accountName}`}
        amount={`₦${(transferFee > 0 ? totalDebit : numericAmount).toLocaleString()}`}
        processing={loading}
      />

      <LoadingOverlay
        visible={loading}
        message="Sending your transfer"
        submessage="Securing payment and confirming with your bank"
        icon="paper-plane"
      />

      {successMeta && (
        <TransferSuccessModal
          visible={showSuccessModal}
          amount={successMeta.amount}
          fee={successMeta.fee}
          totalDebit={successMeta.totalDebit}
          recipientName={successMeta.name}
          accountNumber={successMeta.accountNumber}
          bank={successMeta.bank}
          bankName={successMeta.bankName}
          reference={successMeta.reference}
          onDone={() => {
            setShowSuccessModal(false);
            navigateBack();
          }}
        />
      )}
    </ThemedScreen>
  );
}

const styles = StyleSheet.create({
  centeredState: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: Spacing.page,
  },
  disabledCard: {
    alignItems: 'center',
    gap: 0,
  },
  disabledIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  stateTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.dark,
    textAlign: 'center',
    marginBottom: 8,
  },
  stateSub: {
    fontSize: 14,
    lineHeight: 20,
    color: Colors.muted,
    textAlign: 'center',
  },
  flex: { flex: 1 },
  contentCurve: {
    height: 22,
    marginTop: -22,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  header: {
    paddingHorizontal: Spacing.page,
    paddingBottom: 20,
    overflow: 'hidden',
  },
  headerBlob1: {
    position: 'absolute',
    top: -20,
    right: -30,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  headerBlob2: {
    position: 'absolute',
    bottom: 24,
    left: -16,
    width: 72,
    height: 72,
    borderRadius: 36,
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
    alignItems: 'flex-end',
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  balLabel: { fontSize: 10, color: 'rgba(255,255,255,0.55)', fontWeight: '600' },
  balText: { fontSize: 13, fontWeight: '700', color: Colors.white },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 18,
    gap: 8,
  },
  stepPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  stepPillActive: { backgroundColor: 'rgba(255,255,255,0.18)' },
  stepText: { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.55)' },
  stepTextActive: { color: Colors.white },
  stepLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.15)' },
  scroll: { paddingHorizontal: Spacing.page, paddingTop: 4, gap: 12 },
  formSheet: {
    overflow: 'hidden',
  },
  formSection: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 8,
  },
  formDivider: {
    height: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.06)',
    marginHorizontal: 16,
  },
  heroCard: {
    gap: 8,
  },
  card: {
    gap: 8,
  },
  fieldLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  scanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.full,
    backgroundColor: '#FAF5FF',
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.2)',
    minWidth: 72,
    justifyContent: 'center',
  },
  scanBtnText: { fontSize: 12, fontWeight: '600', color: Colors.primary },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.muted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  fieldHint: { fontSize: 12, color: Colors.muted, lineHeight: 17 },
  recentCard: { gap: 10 },
  recentSection: { gap: 10 },
  recentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  recentHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recentEditActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  recentEditActionBtn: {
    minHeight: 44,
    minWidth: 72,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recentCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.muted,
  },
  recentSaveText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
  },
  recentEditBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recentRow: { gap: 12, paddingRight: 8 },
  recentChip: {
    width: 72,
    alignItems: 'center',
    gap: 8,
  },
  recentChipEditing: {
    opacity: 1,
  },
  recentChipPending: {
    opacity: 0.45,
  },
  recentChipAvatarWrap: {
    position: 'relative',
  },
  recentRemoveBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Colors.white,
  },
  recentRemoveBadgeActive: {
    backgroundColor: Colors.mid,
  },
  recentAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recentAvatarText: { fontSize: 14, fontWeight: '700', color: Colors.primary },
  recentName: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.mid,
    textAlign: 'center',
    lineHeight: 14,
  },
  recentNamePending: {
    textDecorationLine: 'line-through',
    color: Colors.muted,
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  pasteBtn: {
    width: 32,
    height: 32,
    borderRadius: Radius.sm,
    backgroundColor: Colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanIconBtn: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.15)',
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  matchingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  matchingText: {
    fontSize: 13,
    color: Colors.muted,
  },
  accountInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.18)',
    borderRadius: Radius.md,
    backgroundColor: Colors.white,
    paddingLeft: 14,
    paddingRight: 6,
    height: 48,
  },
  inputBusy: { borderColor: 'rgba(124, 58, 237, 0.4)' },
  accountInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: Colors.heroDark,
    letterSpacing: 0.5,
    paddingVertical: 0,
  },
  suggestBlock: { marginTop: 6, gap: 8 },
  suggestSectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.muted,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  recentSuggestAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recentSuggestAvatarText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
  },
  suggestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.05)',
  },
  suggestText: { flex: 1 },
  suggestName: { fontSize: 13, fontWeight: '600', color: Colors.dark },
  suggestMeta: { fontSize: 12, color: Colors.muted, marginTop: 3 },
  suggestAccount: { color: Colors.success, fontWeight: '600' },
  verifiedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 2,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: Radius.md,
    backgroundColor: Colors.primaryMuted,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.1)',
  },
  verifiedAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  verifiedAvatarInitials: {
    backgroundColor: Colors.primary,
  },
  verifiedAvatarText: { fontSize: 14, fontWeight: '700', color: Colors.white },
  verifiedText: { flex: 1 },
  verifiedName: { fontSize: 13, fontWeight: '600', color: Colors.dark },
  verifiedMeta: { fontSize: 12, color: Colors.muted, marginTop: 2 },
  verifiedAccount: { color: Colors.primary, fontWeight: '600' },
  bankSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.08)',
    borderRadius: Radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: Colors.white,
    minHeight: 48,
  },
  bankSelectorInner: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  bankSelectorIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bankSelectorTextWrap: { flex: 1 },
  bankSelectorText: { fontSize: 14, fontWeight: '600', color: Colors.dark },
  bankSelectorPlaceholder: { fontSize: 14, color: Colors.mutedLight, flex: 1 },
  amountWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(124, 58, 237, 0.22)',
    borderRadius: Radius.lg,
    backgroundColor: Colors.primaryMuted,
    paddingHorizontal: 16,
    height: 60,
    gap: 6,
  },
  amountWrapFilled: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryMuted,
  },
  nairaSign: { fontSize: 22, fontWeight: '700', color: Colors.primary },
  amountInput: {
    flex: 1,
    fontSize: 28,
    fontWeight: '800',
    color: Colors.primaryDeep,
    paddingVertical: 0,
    letterSpacing: -0.5,
  },
  amountHint: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.muted,
    marginTop: -2,
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  quickChip: {
    width: '31%',
    flexGrow: 1,
    paddingVertical: 11,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.07)',
    alignItems: 'center',
  },
  quickChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  quickText: { fontSize: 13, fontWeight: '600', color: Colors.mid },
  quickTextActive: { color: Colors.white },
  feeCard: {
    marginTop: 2,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: Radius.md,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.15)',
    gap: 4,
  },
  feeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  feeLabel: { fontSize: 12, color: Colors.warningDark },
  feeValue: { fontSize: 12, fontWeight: '600', color: Colors.warningDark },
  feeTotalLabel: { fontSize: 13, fontWeight: '700', color: Colors.warningDark },
  feeTotalValue: { fontSize: 14, fontWeight: '800', color: Colors.warningDark },
  narrationWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.08)',
    borderRadius: Radius.md,
    paddingHorizontal: 14,
    height: 44,
    backgroundColor: Colors.white,
  },
  narrationInput: { flex: 1, fontSize: 14, color: Colors.dark, paddingVertical: 0 },
  confirmTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  confirmVerifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryMuted,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.12)',
  },
  confirmVerifiedText: { fontSize: 12, fontWeight: '600', color: Colors.primary },
  confirmEditBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  confirmEditText: { fontSize: 13, fontWeight: '600', color: Colors.primary },
  confirmSheet: {
    overflow: 'hidden',
  },
  confirmSheetInner: {
    padding: 0,
    overflow: 'hidden',
  },
  confirmHero: {
    paddingVertical: 20,
    paddingHorizontal: 18,
    overflow: 'hidden',
  },
  confirmHeroBlob1: {
    position: 'absolute',
    top: -24,
    right: -20,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  confirmHeroBlob2: {
    position: 'absolute',
    bottom: -16,
    left: -12,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  confirmHeroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  confirmLogoRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.96)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.7)',
    ...Shadow.sm,
  },
  confirmLogoFallback: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmLogoFallbackText: { fontSize: 20, fontWeight: '700', color: Colors.white },
  confirmHeroInfo: { flex: 1, gap: 2 },
  confirmSendingLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.65)',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  confirmAmount: {
    fontSize: 30,
    fontWeight: '800',
    color: Colors.white,
    letterSpacing: -0.6,
    marginTop: 1,
  },
  confirmRecipient: {
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.92)',
    marginTop: 4,
    lineHeight: 17,
  },
  confirmAccountChip: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  confirmAccountChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.88)',
  },
  confirmBody: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 18,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  confirmNarrationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 12,
    borderRadius: Radius.lg,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.05)',
  },
  confirmNarrationText: {
    flex: 1,
    fontSize: 13,
    color: Colors.mid,
    lineHeight: 18,
  },
  confirmTotals: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primaryMuted,
    borderRadius: Radius.lg,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.1)',
  },
  confirmTotalCol: { flex: 1, alignItems: 'center', gap: 3 },
  confirmTotalDivider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(124, 58, 237, 0.14)',
  },
  confirmTotalLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  confirmTotalValue: { fontSize: 15, fontWeight: '700', color: Colors.mid },
  confirmTotalLabelStrong: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  confirmTotalValueStrong: { fontSize: 18, fontWeight: '800', color: Colors.primary },
  pinCard: {
    gap: 14,
  },
  pinCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  pinIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: Colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinCardHeaderText: { flex: 1, gap: 2 },
  pinCardTitle: { fontSize: 14, fontWeight: '700', color: Colors.dark },
  pinHint: { fontSize: 12, color: Colors.muted },
  pinWrap: { position: 'relative', alignItems: 'center' },
  pinRow: { flexDirection: 'row', justifyContent: 'center', gap: 12 },
  pinBox: {
    width: 54,
    height: 58,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: Colors.borderSubtle,
    backgroundColor: '#FAFBFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinBoxFilled: { borderColor: Colors.primary, backgroundColor: '#FAF5FF' },
  pinDot: {
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: Colors.primary,
  },
  pinInputOverlay: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0,
  },
  footer: {
    backgroundColor: Colors.white,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.borderSubtle,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: Radius.lg,
    paddingVertical: 16,
    ...Shadow.sm,
  },
  ctaText: { fontSize: 16, fontWeight: '700', color: Colors.white },
  secureRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 10 },
  secureNote: { fontSize: 11, color: Colors.muted },
});
