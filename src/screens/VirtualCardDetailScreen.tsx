import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  Platform,
} from 'react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedScreen } from '../components/ui/ThemedScreen';
import { GradientButton } from '../components/ui/GradientButton';
import { VirtualCardVisual } from '../components/virtual-cards/VirtualCardVisual';
import { VirtualCardBottomSheet } from '../components/virtual-cards/VirtualCardBottomSheet';
import { VirtualCardRevealPanel } from '../components/virtual-cards/VirtualCardRevealPanel';
import { TransactionLockSheet } from '../components/security/TransactionLockSheet';
import type { TransactionAuthPayload } from '../hooks/useTransactionLockAuth';
import {
  api,
  formatCurrency,
  isResponseSuccess,
  type VirtualCardConfig,
  type VirtualCardCredentials,
  type VirtualCardSummary,
  type VirtualCardTransaction,
} from '../lib/api';
import {
  getVirtualCardConfig,
  getVirtualCardDetail,
  hasVirtualCardDetailCache,
  peekVirtualCardDetail,
  peekVirtualCardsList,
  pullToRefreshVirtualCardDetail,
  refreshVirtualCardsListIfStale,
  removeVirtualCardFromCaches,
  setVirtualCardDetailCache,
  type VirtualCardDetailSnapshot,
} from '../lib/virtual-cards-cache';
import { Colors, Radius, useThemedStyles } from '../theme';
import { useColors } from '../theme/hooks';
import { useLayout } from '../lib/platform-ui';
import { navigateBack } from '../lib/navigation';
import {
  formatUsd,
  formatCardTransactionWhen,
  formatSignedUsd,
  parseUsdInput,
  sanitizeUsdInput,
  virtualCardTxnMerchant,
  isVirtualCardTxnDeclined,
  virtualCardDeclineLabel,
} from '../lib/virtual-card-utils';
import { newVirtualCardIdempotencyKey } from '../lib/virtual-card-idempotency';
import { useWalletAffordability } from '../hooks/useWalletAffordability';
import { showToast } from '../components/ui/Toast';
import {
  virtualCardUserMessage,
  VIRTUAL_CARD_RATE_UNAVAILABLE,
} from '../lib/virtual-card-user-message';
import { refreshDashboardData } from '../lib/dashboard-data';
import * as Clipboard from 'expo-clipboard';
import { useStatusBarStyle } from '../hooks/useStatusBarStyle';

type LockAction = 'fund' | 'terminate' | 'reveal';
type DetailSheet = 'menu' | 'fund' | 'reveal' | 'terminate';
type RevealPhase = 'auth' | 'shown';

function resolveInitialCard(cardId: string): VirtualCardSummary | null {
  return peekVirtualCardDetail(cardId)?.card
    ?? peekVirtualCardsList()?.cards.find((entry) => entry.id === cardId)
    ?? null;
}

function clearEphemeralCredentials(setter: (v: VirtualCardCredentials | null) => void) {
  setter(null);
}

export default function VirtualCardDetailScreen() {
  useStatusBarStyle('dark');
  const styles = useStyles();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { pagePadding } = useLayout();
  const { id } = useLocalSearchParams<{ id: string }>();
  const initialCard = id ? resolveInitialCard(id) : null;
  const initialDetail = id ? peekVirtualCardDetail(id) : null;

  const [card, setCard] = useState<VirtualCardSummary | null>(initialCard);
  const [config, setConfig] = useState<VirtualCardConfig | null>(peekVirtualCardsList()?.config ?? null);
  const [transactions, setTransactions] = useState<VirtualCardTransaction[]>(
    (initialDetail?.transactions as VirtualCardTransaction[] | undefined) ?? [],
  );
  const [fundQuote, setFundQuote] = useState<{
    providerFeesUsd: string;
    platformFeesUsd: string;
    totalChargeUsd: string;
    totalDebitKobo: string;
    effectiveUsdRateNaira?: string;
  } | null>(null);
  const [fundQuoteError, setFundQuoteError] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(id) && !initialCard);
  const [syncing, setSyncing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [fundAmount, setFundAmount] = useState('');
  const [fundDebitKobo, setFundDebitKobo] = useState(0);
  const [quotingFund, setQuotingFund] = useState(false);
  const [activeSheet, setActiveSheet] = useState<DetailSheet | null>(null);
  const [showLock, setShowLock] = useState(false);
  const [lockAction, setLockAction] = useState<LockAction>('fund');
  const [revealPhase, setRevealPhase] = useState<RevealPhase>('auth');
  const [ephemeralCredentials, setEphemeralCredentials] = useState<VirtualCardCredentials | null>(null);
  const [terminateConfirm, setTerminateConfirm] = useState('');

  const quoteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingAutoSyncRef = useRef(false);
  const fundIdempotencyKeyRef = useRef<string | null>(null);

  const fundUsd = parseUsdInput(fundAmount);
  const fundAffordability = useWalletAffordability(fundDebitKobo, activeSheet === 'fund');

  const applyDetail = useCallback((detail: VirtualCardDetailSnapshot) => {
    setCard(detail.card);
    setTransactions(detail.transactions as VirtualCardTransaction[]);
  }, []);

  const closeSheets = useCallback(() => {
    setActiveSheet(null);
    setRevealPhase('auth');
    setTerminateConfirm('');
    clearEphemeralCredentials(setEphemeralCredentials);
  }, []);

  const hideRevealedCredentials = useCallback(() => {
    clearEphemeralCredentials(setEphemeralCredentials);
    setRevealPhase('auth');
    setActiveSheet(null);
  }, []);

  useEffect(() => {
    if (revealPhase !== 'shown') return;
    let cancelled = false;
    void import('expo-screen-capture')
      .then(({ preventScreenCaptureAsync, allowScreenCaptureAsync }) => {
        if (!cancelled) void preventScreenCaptureAsync();
        return allowScreenCaptureAsync;
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
      void import('expo-screen-capture')
        .then(({ allowScreenCaptureAsync }) => allowScreenCaptureAsync())
        .catch(() => undefined);
    };
  }, [revealPhase]);

  useEffect(() => {
    if (!id) return;
    void (async () => {
      if (!hasVirtualCardDetailCache(id) && !initialCard) setLoading(true);
      const [detail, nextConfig] = await Promise.all([
        getVirtualCardDetail(id),
        getVirtualCardConfig(),
      ]);
      if (detail) applyDetail(detail);
      if (nextConfig) setConfig(nextConfig);
      setLoading(false);
    })();
  }, [applyDetail, id, initialCard]);

  useFocusEffect(
    useCallback(() => {
      if (!id) return;
      void getVirtualCardDetail(id).then((detail) => {
        if (detail) applyDetail(detail);
        setLoading(false);
      });
      void refreshVirtualCardsListIfStale();
    }, [applyDetail, id]),
  );

  const handleSync = useCallback(async () => {
    if (!id) return;
    setSyncing(true);
    try {
      const detail = await pullToRefreshVirtualCardDetail(id);
      if (detail) {
        applyDetail(detail);
        showToast({ type: 'success', text1: 'Card synced' });
      } else {
        showToast({ type: 'error', text1: 'Sync failed', text2: 'Could not refresh from issuer.' });
      }
    } catch {
      showToast({ type: 'error', text1: 'Sync failed', text2: 'Try again shortly.' });
    } finally {
      setSyncing(false);
    }
  }, [applyDetail, id]);

  useEffect(() => {
    if (!id || card?.status !== 'PENDING' || pendingAutoSyncRef.current) return;
    pendingAutoSyncRef.current = true;
    void pullToRefreshVirtualCardDetail(id)
      .then((detail) => { if (detail) applyDetail(detail); })
      .finally(() => { pendingAutoSyncRef.current = false; });
  }, [applyDetail, card?.status, id]);

  useEffect(() => {
    if (activeSheet !== 'fund' || fundUsd <= 0) {
      setFundDebitKobo(0);
      setFundQuote(null);
      setFundQuoteError(null);
      return;
    }
    if (quoteTimer.current) clearTimeout(quoteTimer.current);
    quoteTimer.current = setTimeout(async () => {
      setQuotingFund(true);
      try {
        const res = await api.quoteVirtualCardCharge({
          action: 'funding',
          amountUsd: fundUsd.toFixed(2),
        });
        if (isResponseSuccess(res) && res.data) {
          setFundDebitKobo(Number(res.data.totalDebitKobo));
          setFundQuote({
            providerFeesUsd: res.data.providerFeesUsd,
            platformFeesUsd: res.data.platformFeesUsd,
            totalChargeUsd: res.data.totalChargeUsd,
            totalDebitKobo: res.data.totalDebitKobo,
            effectiveUsdRateNaira: res.data.effectiveUsdRateNaira,
          });
          setFundQuoteError(null);
        } else {
          setFundDebitKobo(0);
          setFundQuote(null);
          setFundQuoteError(virtualCardUserMessage(res.message, VIRTUAL_CARD_RATE_UNAVAILABLE));
        }
      } finally {
        setQuotingFund(false);
      }
    }, 400);
    return () => {
      if (quoteTimer.current) clearTimeout(quoteTimer.current);
    };
  }, [fundUsd, activeSheet]);

  const openLock = (action: LockAction) => {
    setLockAction(action);
    setShowLock(true);
  };

  const fetchRevealCredentials = async (auth: TransactionAuthPayload) => {
    if (!id || card?.status === 'FROZEN') return;
    setActionLoading(true);
    try {
      const res = await api.revealVirtualCard(id, auth);
      if (!isResponseSuccess(res) || !res.data) {
        showToast({ type: 'error', text1: 'Could not reveal card', text2: res.message });
        setShowLock(false);
        return;
      }
      const creds = res.data;
      setActiveSheet(null);
      setShowLock(false);
      setTimeout(() => {
        setEphemeralCredentials(creds);
        setRevealPhase('shown');
      }, 200);
    } finally {
      setActionLoading(false);
    }
  };

  const handleFund = async (auth: TransactionAuthPayload) => {
    if (!id || !card || card.status === 'FROZEN') return;
    setActionLoading(true);
    try {
      if (!fundIdempotencyKeyRef.current) {
        fundIdempotencyKeyRef.current = await newVirtualCardIdempotencyKey('vc-fund');
      }
      const res = await api.fundVirtualCard(id, {
        amountUsd: fundUsd,
        idempotencyKey: fundIdempotencyKeyRef.current,
        ...auth,
      });
      if (!isResponseSuccess(res) || !res.data?.card) {
        showToast({ type: 'error', text1: 'Funding failed', text2: res.message });
        return;
      }
      setCard(res.data.card);
      setVirtualCardDetailCache(res.data.card);
      closeSheets();
      setFundAmount('');
      fundIdempotencyKeyRef.current = null;
      showToast({ type: 'success', text1: 'Card funded', text2: res.data.message || res.message });
      void refreshDashboardData();
      void pullToRefreshVirtualCardDetail(id).then((detail) => {
        if (detail) applyDetail(detail);
      });
    } finally {
      setActionLoading(false);
      setShowLock(false);
    }
  };

  const handleTerminate = async (auth: TransactionAuthPayload) => {
    if (!id) return;
    setActionLoading(true);
    try {
      const res = await api.terminateVirtualCard(id, auth);
      if (!isResponseSuccess(res) || !res.data?.card) {
        showToast({ type: 'error', text1: 'Could not terminate card', text2: res.message });
        return;
      }
      closeSheets();
      showToast({ type: 'success', text1: 'Card terminated', text2: res.message });
      removeVirtualCardFromCaches(id);
      router.replace('/wallet/virtual-cards');
    } finally {
      setActionLoading(false);
      setShowLock(false);
    }
  };

  const handleFreezeToggle = async () => {
    if (!id || !card) return;
    setActionLoading(true);
    try {
      const frozen = card.status === 'FROZEN';
      const res = frozen ? await api.unfreezeVirtualCard(id) : await api.freezeVirtualCard(id);
      if (isResponseSuccess(res) && res.data?.card) {
        setCard(res.data.card);
        setVirtualCardDetailCache(res.data.card);
        if (!frozen) {
          closeSheets();
          clearEphemeralCredentials(setEphemeralCredentials);
        }
        showToast({
          type: 'success',
          text1: frozen ? 'Card unfrozen' : 'Card frozen',
          text2: res.message,
        });
      } else {
        showToast({ type: 'error', text1: 'Action failed', text2: res.message });
      }
    } finally {
      setActionLoading(false);
    }
  };

  const onLockAuthorized = async (auth: TransactionAuthPayload) => {
    if (lockAction === 'fund') return handleFund(auth);
    if (lockAction === 'terminate') return handleTerminate(auth);
    return fetchRevealCredentials(auth);
  };

  const copyValue = async (label: string, value: string) => {
    await Clipboard.setStringAsync(value);
    showToast({ type: 'success', text1: `${label} copied` });
  };

  if (loading || !card) {
    return (
      <ThemedScreen style={styles.centered}>
        <ActivityIndicator color={Colors.primary} />
        <Text style={styles.loadingText}>Loading card…</Text>
      </ThemedScreen>
    );
  }

  const isActive = card.status === 'ACTIVE' || card.status === 'FROZEN';
  const isFrozen = card.status === 'FROZEN';
  const canFundOrReveal = card.status === 'ACTIVE';
  const lockAmount = lockAction === 'fund' ? formatCurrency(String(fundDebitKobo)) : undefined;
  const holderLine = card.cardName || 'Virtual card';
  const terminateOk = terminateConfirm.trim().toUpperCase() === 'TERMINATE';
  const issuerFees = fundQuote ? Number(fundQuote.providerFeesUsd) : 0;
  const platformFees = fundQuote ? Number(fundQuote.platformFeesUsd) : 0;
  const totalFundFeesUsd = issuerFees + platformFees;

  return (
    <ThemedScreen style={styles.screenRoot}>
      <View style={[styles.topBar, { paddingTop: insets.top + 8, paddingHorizontal: pagePadding }]}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigateBack()} activeOpacity={0.85}>
          <Ionicons name="chevron-back" size={20} color={colors.dark} />
        </TouchableOpacity>
        <View style={styles.topTitles}>
          <Text style={styles.topTitle} numberOfLines={1}>{holderLine}</Text>
          <Text style={styles.topSub} numberOfLines={1}>{card.cardName ? card.brand : 'USD virtual card'}</Text>
        </View>
        <TouchableOpacity style={styles.iconBtn} onPress={() => setActiveSheet('menu')} activeOpacity={0.85}>
          <Ionicons name="ellipsis-vertical" size={18} color={colors.dark} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingHorizontal: pagePadding, paddingBottom: insets.bottom + 28 }]}
        refreshControl={
          <RefreshControl refreshing={syncing} onRefresh={() => void handleSync()} tintColor={Colors.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        {card.status === 'PENDING' ? (
          <View style={styles.pendingBanner}>
            <ActivityIndicator size="small" color={Colors.primary} />
            <Text style={styles.pendingText}>Issuing your card — check back shortly.</Text>
          </View>
        ) : null}

        <VirtualCardVisual
          designId={card.cardDesign}
          brand={card.brand}
          cardName={card.cardName}
          maskedPan={card.maskedPan}
          balanceUsd={card.balanceUsd}
          expiry={card.expiry}
          status={card.status}
          size="list"
          showBalance={false}
          style={styles.cardVisual}
        />

        <View style={styles.balanceRow}>
          <Text style={styles.balanceLabel}>Card balance</Text>
          <Text style={styles.balanceValue}>{formatUsd(card.balanceUsd)}</Text>
        </View>

        {isActive ? (
          <View style={styles.actionRow}>
              <DetailAction
                icon="wallet-outline"
                label="Fund"
                disabled={!canFundOrReveal}
                onPress={() => {
                  if (!canFundOrReveal) return;
                  void newVirtualCardIdempotencyKey('vc-fund').then((key) => {
                    fundIdempotencyKeyRef.current = key;
                  });
                  setActiveSheet('fund');
                }}
              />
            <DetailAction
              icon={isFrozen ? 'snow-outline' : 'snow-outline'}
              label={isFrozen ? 'Unfreeze' : 'Freeze'}
              onPress={() => void handleFreezeToggle()}
              active={isFrozen}
              loading={actionLoading}
            />
            <DetailAction
              icon="eye-outline"
              label="Reveal"
              disabled={!canFundOrReveal}
              onPress={() => {
                if (!canFundOrReveal) return;
                setRevealPhase('auth');
                clearEphemeralCredentials(setEphemeralCredentials);
                setActiveSheet('reveal');
              }}
            />
          </View>
        ) : (
          <TouchableOpacity style={styles.refreshOnlyBtn} onPress={() => void handleSync()}>
            <Ionicons name="refresh-outline" size={18} color={Colors.primary} />
            <Text style={styles.refreshOnlyText}>Refresh</Text>
          </TouchableOpacity>
        )}

        <Text style={styles.activityHeading}>RECENT ACTIVITY</Text>
        {transactions.length === 0 ? (
          <Text style={styles.activityEmpty}>No transactions yet — purchases will show up here.</Text>
        ) : (
          transactions.slice(0, 15).map((entry) => {
            const declined = isVirtualCardTxnDeclined(entry.status);
            const amount = Number(entry.amountUsd);
            const credit = amount > 0;
            return (
              <View key={entry.id} style={styles.txRow}>
                <View style={[
                  styles.txIcon,
                  declined && styles.txIconDeclined,
                  credit && !declined && styles.txIconCredit,
                ]}>
                  <Ionicons
                    name={credit ? 'arrow-down-outline' : 'arrow-up-outline'}
                    size={16}
                    color={declined ? Colors.error : credit ? Colors.success : Colors.primary}
                  />
                </View>
                <View style={styles.txBody}>
                  <Text style={styles.txMerchant} numberOfLines={1}>{virtualCardTxnMerchant(entry)}</Text>
                  <Text style={[styles.txMeta, declined && styles.txMetaDeclined]} numberOfLines={2}>
                    {declined
                      ? `Declined · ${virtualCardDeclineLabel(entry)}`
                      : formatCardTransactionWhen(entry.createdAt) || entry.type}
                  </Text>
                </View>
                <Text style={[
                  styles.txAmount,
                  declined && styles.txAmountDeclined,
                  credit && !declined && styles.txAmountCredit,
                ]}>
                  {formatSignedUsd(entry.amountUsd)}
                </Text>
              </View>
            );
          })
        )}
      </ScrollView>

      <VirtualCardBottomSheet visible={activeSheet === 'menu'} onClose={closeSheets}>
        <Text style={styles.sheetTitle}>Manage card</Text>
        <SheetRow
          icon="refresh-outline"
          label="Refresh"
          sub="Update balance & transactions"
          onPress={() => {
            closeSheets();
            void handleSync();
          }}
        />
        <View style={styles.sheetDivider} />
        <SheetRow
          icon="trash-outline"
          label="Terminate card"
          sub="Irreversible — balance refunds to wallet"
          danger
          onPress={() => {
            setTerminateConfirm('');
            setActiveSheet('terminate');
          }}
        />
      </VirtualCardBottomSheet>

      <VirtualCardBottomSheet
        visible={activeSheet === 'fund' && canFundOrReveal}
        onClose={closeSheets}
        keyboardAvoiding
      >
        <Text style={styles.sheetTitle}>Fund card</Text>
        <Text style={styles.fieldLabel}>Amount (USD)</Text>
        <TextInput
          style={styles.fundInput}
          value={fundAmount}
          onChangeText={(v) => setFundAmount(sanitizeUsdInput(v))}
          placeholder="0.00"
          placeholderTextColor={Colors.mutedLight}
          keyboardType="decimal-pad"
        />
        <Text style={styles.fundBounds}>
          Min {formatUsd(config?.minFundUsd || config?.minPrefundUsd || '3.00')}
          {' · '}
          Max {formatUsd(config?.maxFundUsd || config?.maxPrefundUsd || '1000.00')}
        </Text>
        <View style={styles.quoteBox}>
          <QuoteLine
            label="Amount"
            value={fundUsd > 0 ? formatUsd(fundUsd) : '—'}
          />
          <QuoteLine
            label="Fee"
            value={fundQuote && totalFundFeesUsd > 0 ? formatUsd(totalFundFeesUsd) : fundQuote ? formatUsd(0) : '—'}
          />
          <QuoteLine
            label="Total (USD)"
            value={
              quotingFund
                ? '…'
                : fundQuote?.totalChargeUsd
                  ? formatUsd(fundQuote.totalChargeUsd)
                  : '—'
            }
          />
          <QuoteLine
            label="Total amount"
            value={quotingFund ? '…' : fundDebitKobo > 0 ? formatCurrency(String(fundDebitKobo)) : '—'}
            bold
          />
        </View>
        {fundQuoteError ? <Text style={styles.warn}>{fundQuoteError}</Text> : null}
        {fundAffordability.insufficientFunds && fundUsd > 0 ? (
          <Text style={styles.warn}>Insufficient wallet balance</Text>
        ) : null}
        <GradientButton
          title="Confirm & pay"
          onPress={() => {
            if (fundUsd <= 0) {
              showToast({ type: 'error', text1: 'Enter an amount' });
              return;
            }
            if (fundDebitKobo <= 0) {
              showToast({ type: 'error', text1: 'Charges unavailable', text2: fundQuoteError || 'Try again.' });
              return;
            }
            if (fundAffordability.insufficientFunds) {
              showToast({ type: 'error', text1: 'Insufficient balance' });
              return;
            }
            openLock('fund');
          }}
          disabled={quotingFund || actionLoading}
        />
      </VirtualCardBottomSheet>

      <VirtualCardBottomSheet
        visible={activeSheet === 'reveal' && revealPhase === 'auth' && canFundOrReveal}
        onClose={closeSheets}
        scroll={false}
      >
        <View style={styles.revealAuth}>
          <View style={styles.revealIconWrap}>
            <Ionicons name="finger-print-outline" size={28} color={Colors.primary} />
          </View>
          <Text style={styles.sheetTitle}>Confirm it&apos;s you</Text>
          <Text style={styles.revealSub}>
            We verify your identity each time before showing full card details. Nothing is saved on this device.
          </Text>
          <GradientButton
            title="Use Face ID / passcode"
            onPress={() => openLock('reveal')}
            disabled={actionLoading}
          />
        </View>
      </VirtualCardBottomSheet>

      <VirtualCardBottomSheet visible={activeSheet === 'terminate'} onClose={closeSheets}>
        <View style={styles.terminateIconWrap}>
          <Ionicons name="warning-outline" size={28} color={Colors.error} />
        </View>
        <Text style={[styles.sheetTitle, styles.centerText]}>Terminate this card?</Text>
        <Text style={[styles.revealSub, styles.centerText]}>
          This can&apos;t be undone. The card stops working immediately, and your remaining balance of{' '}
          <Text style={styles.bold}>{formatUsd(card.balanceUsd)}</Text> is refunded to your NGN wallet when the issuer completes closure.
        </Text>
        <Text style={styles.fieldLabel}>Type TERMINATE to confirm</Text>
        <TextInput
          style={styles.fundInput}
          value={terminateConfirm}
          onChangeText={setTerminateConfirm}
          placeholder="TERMINATE"
          placeholderTextColor={Colors.mutedLight}
          autoCapitalize="characters"
          autoCorrect={false}
        />
        <GradientButton
          title="Terminate card"
          onPress={() => openLock('terminate')}
          disabled={!terminateOk || actionLoading}
        />
        <TouchableOpacity onPress={closeSheets} style={styles.keepBtn}>
          <Text style={styles.keepBtnText}>Keep card</Text>
        </TouchableOpacity>
      </VirtualCardBottomSheet>

      <TransactionLockSheet
        visible={showLock}
        onClose={() => setShowLock(false)}
        onAuthorized={onLockAuthorized}
        title={
          lockAction === 'fund'
            ? 'Authorize funding'
            : lockAction === 'terminate'
              ? 'Authorize termination'
              : 'Verify to reveal card'
        }
        subtitle={
          lockAction === 'fund'
            ? `Funding ${formatUsd(fundUsd)}`
            : lockAction === 'terminate'
              ? 'This permanently closes the card'
              : 'Full card details are fetched from the issuer and not stored locally'
        }
        amount={lockAmount}
        processing={actionLoading}
        processingMessage={
          lockAction === 'fund'
            ? 'Funding your card…'
            : lockAction === 'terminate'
              ? 'Terminating card…'
              : 'Fetching card details…'
        }
        processingSubmessage={
          lockAction === 'reveal'
            ? 'Securely loading your card from the issuer'
            : lockAction === 'fund'
              ? 'Debiting your wallet and crediting the card'
              : 'Closing the card with the issuer'
        }
        processingIcon={
          lockAction === 'reveal'
            ? 'card-outline'
            : lockAction === 'fund'
              ? 'wallet-outline'
              : 'close-circle-outline'
        }
      />

      {ephemeralCredentials && revealPhase === 'shown' && canFundOrReveal ? (
        <VirtualCardRevealPanel
          visible
          card={card}
          credentials={ephemeralCredentials}
          onClose={closeSheets}
          onSessionEnd={hideRevealedCredentials}
          onCopy={copyValue}
        />
      ) : null}
    </ThemedScreen>
  );
}

function DetailAction({
  icon,
  label,
  onPress,
  active,
  loading,
  disabled,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  active?: boolean;
  loading?: boolean;
  disabled?: boolean;
}) {
  const styles = useStyles();
  const colors = useColors();
  const inactive = Boolean(disabled || loading);
  const iconColor = inactive ? colors.muted : active ? Colors.warning : Colors.primary;
  return (
    <TouchableOpacity
      style={[styles.detailAction, inactive && styles.detailActionDisabled]}
      onPress={onPress}
      activeOpacity={inactive ? 1 : 0.88}
      disabled={inactive}
    >
      <View style={[styles.detailActionIcon, active && !inactive && styles.detailActionIconActive]}>
        {loading ? (
          <ActivityIndicator size="small" color={iconColor} />
        ) : (
          <Ionicons name={icon} size={18} color={iconColor} />
        )}
      </View>
      <Text style={[styles.detailActionLabel, inactive && styles.detailActionLabelDisabled]}>{label}</Text>
    </TouchableOpacity>
  );
}

function SheetRow({
  icon,
  label,
  sub,
  onPress,
  danger,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  sub?: string;
  onPress: () => void;
  danger?: boolean;
}) {
  const styles = useStyles();
  return (
    <TouchableOpacity style={styles.sheetRow} onPress={onPress} activeOpacity={0.85}>
      <View style={[styles.sheetRowIcon, danger && styles.sheetRowIconDanger]}>
        <Ionicons name={icon} size={17} color={danger ? Colors.error : Colors.primary} />
      </View>
      <View style={styles.sheetRowText}>
        <Text style={[styles.sheetRowLabel, danger && styles.dangerText]}>{label}</Text>
        {sub ? <Text style={styles.sheetRowSub}>{sub}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={16} color={Colors.mutedLight} />
    </TouchableOpacity>
  );
}

function QuoteLine({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  const styles = useStyles();
  return (
    <View style={styles.quoteLine}>
      <Text style={styles.quoteLabel}>{label}</Text>
      <Text style={[styles.quoteValue, bold && styles.quoteValueBold]}>{value}</Text>
    </View>
  );
}

const createStyles = (colors: import('../theme/types').ThemeColors) => StyleSheet.create({
  screenRoot: { flex: 1 },
  centered: { alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: colors.muted, fontSize: 14 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingBottom: 8,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 99,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topTitles: { flex: 1, alignItems: 'center' },
  topTitle: { fontSize: 15, fontWeight: '700', color: colors.dark },
  topSub: { fontSize: 12, color: colors.muted, marginTop: 2 },
  scroll: { gap: 14, paddingTop: 6 },
  pendingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: Radius.md,
    backgroundColor: `${Colors.primary}10`,
  },
  pendingText: { flex: 1, fontSize: 12, color: colors.dark },
  cardVisual: { marginTop: 4, width: '100%' },
  balanceRow: {
    marginTop: 4,
    gap: 4,
  },
  balanceLabel: { fontSize: 12, fontWeight: '600', color: colors.muted },
  balanceValue: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.dark,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 6 },
  detailAction: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: Radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  detailActionIcon: {
    width: 36,
    height: 36,
    borderRadius: 99,
    backgroundColor: `${Colors.primary}14`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailActionIconActive: { backgroundColor: `${Colors.warning}20` },
  detailActionDisabled: { opacity: 0.45 },
  detailActionLabel: { fontSize: 11.5, fontWeight: '600', color: colors.dark },
  detailActionLabelDisabled: { color: colors.muted },
  refreshOnlyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 14,
    borderRadius: Radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  refreshOnlyText: { fontSize: 14, fontWeight: '600', color: Colors.primary },
  activityHeading: {
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.muted,
    letterSpacing: 0.4,
    marginTop: 8,
  },
  activityEmpty: { fontSize: 13, color: colors.muted, paddingVertical: 20, textAlign: 'center' },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  txIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: `${Colors.primary}14`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txIconCredit: { backgroundColor: `${Colors.success}18` },
  txIconDeclined: { backgroundColor: `${Colors.error}14` },
  txBody: { flex: 1 },
  txMerchant: { fontSize: 13.5, fontWeight: '600', color: colors.dark },
  txMeta: { fontSize: 11.5, color: colors.muted, marginTop: 2 },
  txMetaDeclined: { color: Colors.error },
  txAmount: { fontSize: 13.5, fontWeight: '700', color: colors.dark },
  txAmountCredit: { color: Colors.success },
  txAmountDeclined: { color: colors.muted, textDecorationLine: 'line-through' },
  sheetTitle: { fontSize: 16, fontWeight: '700', color: colors.dark },
  sheetDivider: { height: 1, backgroundColor: colors.border, marginVertical: 6 },
  sheetRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  sheetRowIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: `${Colors.primary}14`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetRowIconDanger: { backgroundColor: `${Colors.error}14` },
  sheetRowText: { flex: 1 },
  sheetRowLabel: { fontSize: 14.5, fontWeight: '600', color: colors.dark },
  sheetRowSub: { fontSize: 12, color: colors.muted, marginTop: 2 },
  dangerText: { color: Colors.error },
  fieldLabel: { fontSize: 12, color: colors.muted, marginBottom: 6 },
  fundInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 20,
    fontWeight: '700',
    color: colors.dark,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  fundBounds: { fontSize: 11, color: colors.muted },
  quoteBox: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: Radius.md,
    padding: 12,
    gap: 8,
  },
  quoteLine: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  quoteLabel: { fontSize: 12.5, color: colors.muted },
  quoteValue: { fontSize: 12.5, color: colors.muted },
  quoteValueBold: { fontWeight: '700', color: colors.dark },
  warn: { fontSize: 12, color: Colors.error },
  revealAuth: { alignItems: 'center', gap: 10, paddingBottom: 8 },
  revealIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 99,
    backgroundColor: `${Colors.primary}14`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  revealSub: { fontSize: 13, color: colors.muted, lineHeight: 20, textAlign: 'center' },
  terminateIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 99,
    backgroundColor: `${Colors.error}14`,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 8,
  },
  centerText: { textAlign: 'center' },
  bold: { fontWeight: '700' },
  keepBtn: { alignItems: 'center', paddingVertical: 10 },
  keepBtnText: { fontSize: 13.5, fontWeight: '600', color: colors.muted },
});

function useStyles() {
  return useThemedStyles(createStyles);
}
