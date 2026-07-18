import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  ScrollView,
  Alert,
} from 'react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';
import { ProfileSubScreen } from '../components/profile/ProfileSubScreen';
import { GlassCard } from '../components/ui/GlassCard';
import { GradientButton } from '../components/ui/GradientButton';
import { TransactionLockSheet } from '../components/security/TransactionLockSheet';
import type { TransactionAuthPayload } from '../hooks/useTransactionLockAuth';
import {
  api,
  formatCurrency,
  isResponseSuccess,
  type VirtualCardConfig,
  type VirtualCardCredentials,
  type VirtualCardSummary,
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
  syncVirtualCardDetail,
} from '../lib/virtual-cards-cache';
import { Colors, Radius, Spacing, useThemedStyles } from '../theme';
import { useGradients } from '../theme/hooks';
import { gradientStops } from '../theme/gradient-utils';
import {
  formatUsd,
  parseUsdInput,
  sanitizeUsdInput,
  virtualCardStatusMeta,
} from '../lib/virtual-card-utils';
import { useWalletAffordability } from '../hooks/useWalletAffordability';
import { showToast } from '../components/ui/Toast';
import {
  virtualCardUserMessage,
  VIRTUAL_CARD_RATE_UNAVAILABLE,
} from '../lib/virtual-card-user-message';
import { refreshDashboardData } from '../lib/dashboard-data';

type LockAction = 'fund' | 'terminate' | 'reveal';

function resolveInitialCard(cardId: string): VirtualCardSummary | null {
  return peekVirtualCardDetail(cardId)?.card
    ?? peekVirtualCardsList()?.cards.find((entry) => entry.id === cardId)
    ?? null;
}

export default function VirtualCardDetailScreen() {
  const styles = useStyles();
  const gradients = useGradients();
  const { id } = useLocalSearchParams<{ id: string }>();
  const initialCard = id ? resolveInitialCard(id) : null;
  const initialDetail = id ? peekVirtualCardDetail(id) : null;
  const [card, setCard] = useState<VirtualCardSummary | null>(initialCard);
  const [config, setConfig] = useState<VirtualCardConfig | null>(peekVirtualCardsList()?.config ?? null);
  const [transactions, setTransactions] = useState<unknown[]>(initialDetail?.transactions ?? []);
  const [loading, setLoading] = useState(Boolean(id) && !initialCard);
  const [syncing, setSyncing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [fundAmount, setFundAmount] = useState('');
  const [fundDebitKobo, setFundDebitKobo] = useState(0);
  const [quotingFund, setQuotingFund] = useState(false);
  const [showFundForm, setShowFundForm] = useState(false);
  const [showLock, setShowLock] = useState(false);
  const [lockAction, setLockAction] = useState<LockAction>('fund');
  const [credentials, setCredentials] = useState<VirtualCardCredentials | null>(null);
  const [showCredentials, setShowCredentials] = useState(false);
  const quoteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fundUsd = parseUsdInput(fundAmount);
  const fundAffordability = useWalletAffordability(fundDebitKobo, showFundForm);

  const applyDetail = useCallback((detail: { card: VirtualCardSummary; transactions: unknown[] }) => {
    setCard(detail.card);
    setTransactions(detail.transactions);
  }, []);

  const load = useCallback(async (options?: { sync?: boolean }) => {
    if (!id) return;
    const detail = options?.sync
      ? await syncVirtualCardDetail(id)
      : await getVirtualCardDetail(id);
    if (detail) applyDetail(detail);
  }, [applyDetail, id]);

  useEffect(() => {
    if (!id) return;
    void (async () => {
      if (!hasVirtualCardDetailCache(id) && !initialCard) {
        setLoading(true);
      }
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
      void (async () => {
        const detail = await getVirtualCardDetail(id);
        if (detail) applyDetail(detail);
        setLoading(false);
      })();
      void refreshVirtualCardsListIfStale();
    }, [applyDetail, id]),
  );

  const handleSync = useCallback(async () => {
    if (!id) return;
    setSyncing(true);
    try {
      const detail = await pullToRefreshVirtualCardDetail(id);
      if (detail) applyDetail(detail);
    } finally {
      setSyncing(false);
    }
  }, [applyDetail, id]);

  useEffect(() => {
    if (!showFundForm || fundUsd <= 0) {
      setFundDebitKobo(0);
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
        } else {
          setFundDebitKobo(0);
          showToast({
            type: 'error',
            text1: 'Rate unavailable',
            text2: virtualCardUserMessage(res.message, VIRTUAL_CARD_RATE_UNAVAILABLE),
          });
        }
      } finally {
        setQuotingFund(false);
      }
    }, 400);
    return () => {
      if (quoteTimer.current) clearTimeout(quoteTimer.current);
    };
  }, [fundUsd, showFundForm]);

  const openLock = (action: LockAction) => {
    setLockAction(action);
    setShowLock(true);
  };

  const handleFund = async (auth: TransactionAuthPayload) => {
    if (!id || !card) return;
    setActionLoading(true);
    try {
      const res = await api.fundVirtualCard(id, { amountUsd: fundUsd, ...auth });
      if (!isResponseSuccess(res) || !res.data?.card) {
        showToast({ type: 'error', text1: 'Funding failed', text2: res.message });
        return;
      }
      setCard(res.data.card);
      setVirtualCardDetailCache(res.data.card);
      setShowFundForm(false);
      setFundAmount('');
      showToast({ type: 'success', text1: 'Card funded', text2: res.data.message || res.message });
      void refreshDashboardData();
      void load();
    } finally {
      setActionLoading(false);
      setShowLock(false);
    }
  };

  const handleReveal = async () => {
    if (!id) return;
    setActionLoading(true);
    try {
      const res = await api.revealVirtualCard(id);
      if (!isResponseSuccess(res) || !res.data) {
        showToast({ type: 'error', text1: 'Could not reveal card', text2: res.message });
        return;
      }
      setCredentials(res.data);
      setShowCredentials(true);
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
      showToast({ type: 'success', text1: 'Card terminated', text2: res.message });
      if (id) removeVirtualCardFromCaches(id);
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
    return handleReveal();
  };

  const confirmTerminate = () => {
    Alert.alert(
      'Terminate card?',
      'This permanently closes the card. Any remaining balance may be forfeited.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Terminate', style: 'destructive', onPress: () => openLock('terminate') },
      ],
    );
  };

  const copyCredential = async (label: string, value: string) => {
    await Clipboard.setStringAsync(value);
    showToast({ type: 'success', text1: `${label} copied` });
  };

  if (loading || !card) {
    return (
      <ProfileSubScreen title="Virtual Card" subtitle="Loading…" headerIcon="card-outline">
        <ActivityIndicator color={Colors.primary} style={{ marginTop: 24 }} />
      </ProfileSubScreen>
    );
  }

  const status = virtualCardStatusMeta(card.status);
  const isActive = card.status === 'ACTIVE' || card.status === 'FROZEN';
  const lockAmount = lockAction === 'fund' ? formatCurrency(String(fundDebitKobo)) : undefined;

  return (
    <>
      <ProfileSubScreen title="Virtual Card" subtitle={card.cardName || card.brand} headerIcon="card-outline">
        <LinearGradient
          colors={gradientStops(gradients.hero)}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.cardVisual}
        >
          <View style={styles.cardTop}>
            <Text style={styles.cardBrand}>{card.brand}</Text>
            <View style={[styles.cardStatus, { backgroundColor: `${status.color}33` }]}>
              <Text style={[styles.cardStatusText, { color: Colors.white }]}>{status.label}</Text>
            </View>
          </View>
          <Text style={styles.cardPan}>{card.maskedPan || '•••• •••• •••• ••••'}</Text>
          <View style={styles.cardBottom}>
            <View>
              <Text style={styles.cardMetaLabel}>Balance</Text>
              <Text style={styles.cardBalance}>{formatUsd(card.balanceUsd)}</Text>
            </View>
            {card.expiry ? (
              <View>
                <Text style={styles.cardMetaLabel}>Expires</Text>
                <Text style={styles.cardExpiry}>{card.expiry}</Text>
              </View>
            ) : null}
          </View>
        </LinearGradient>

        <View style={styles.actions}>
          {isActive ? (
            <>
              <ActionButton icon="add-circle-outline" label="Fund" onPress={() => setShowFundForm(true)} />
              <ActionButton icon="eye-outline" label="Reveal" onPress={() => openLock('reveal')} />
              <ActionButton
                icon={card.status === 'FROZEN' ? 'lock-open-outline' : 'snow-outline'}
                label={card.status === 'FROZEN' ? 'Unfreeze' : 'Freeze'}
                onPress={() => void handleFreezeToggle()}
              />
            </>
          ) : null}
          <ActionButton icon="refresh-outline" label={syncing ? 'Syncing…' : 'Sync'} onPress={() => void handleSync()} />
          {isActive ? (
            <ActionButton icon="trash-outline" label="Terminate" danger onPress={confirmTerminate} />
          ) : null}
        </View>

        {showFundForm && isActive ? (
          <GlassCard contentStyle={styles.fundSection}>
            <Text style={styles.fundTitle}>Fund card</Text>
            <TextInput
              style={styles.input}
              value={fundAmount}
              onChangeText={(v) => setFundAmount(sanitizeUsdInput(v))}
              placeholder="Amount in USD"
              placeholderTextColor={Colors.mutedLight}
              keyboardType="decimal-pad"
            />
            <Text style={styles.fundHint}>
              Wallet debit: {quotingFund ? '…' : formatCurrency(String(fundDebitKobo))}
            </Text>
            {!fundAffordability.insufficientFunds || fundUsd <= 0 ? null : (
              <Text style={styles.warn}>Insufficient wallet balance</Text>
            )}
            <GradientButton
              title="Continue"
              onPress={() => {
                if (fundUsd <= 0) {
                  showToast({ type: 'error', text1: 'Enter an amount' });
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
          </GlassCard>
        ) : null}

        <GlassCard contentStyle={styles.txSection}>
          <Text style={styles.txTitle}>Recent activity</Text>
          {transactions.length === 0 ? (
            <Text style={styles.txEmpty}>No card transactions yet</Text>
          ) : (
            transactions.slice(0, 8).map((entry, index) => {
              const row = (entry && typeof entry === 'object') ? entry as Record<string, unknown> : {};
              const description = String(row.description || row.narration || row.type || 'Transaction');
              const amount = row.amount_usd ?? row.amount ?? row.value;
              return (
                <View key={`${index}-${description}`} style={styles.txRow}>
                  <Text style={styles.txDesc} numberOfLines={1}>{description}</Text>
                  <Text style={styles.txAmount}>{amount != null ? formatUsd(String(amount)) : '—'}</Text>
                </View>
              );
            })
          )}
        </GlassCard>
      </ProfileSubScreen>

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
              : 'View full card credentials'
        }
        amount={lockAmount}
        processing={actionLoading}
      />

      <Modal visible={showCredentials} animationType="slide" transparent onRequestClose={() => setShowCredentials(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <ScrollView contentContainerStyle={styles.modalContent}>
              <Text style={styles.modalTitle}>Card credentials</Text>
              <Text style={styles.modalWarn}>Do not share these details. They will hide when you close this screen.</Text>
              {credentials ? (
                <>
                  <CredentialRow label="Number" value={credentials.cardNumber} onCopy={copyCredential} />
                  <CredentialRow label="CVV" value={credentials.cvv} onCopy={copyCredential} />
                  <CredentialRow label="Expiry" value={credentials.expiry} onCopy={copyCredential} />
                  {credentials.cardName ? (
                    <CredentialRow label="Name" value={credentials.cardName} onCopy={copyCredential} />
                  ) : null}
                </>
              ) : null}
              <GradientButton title="Close" onPress={() => {
                setShowCredentials(false);
                setCredentials(null);
              }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

function ActionButton({
  icon,
  label,
  onPress,
  danger,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  danger?: boolean;
}) {
  const styles = useStyles();
  return (
    <TouchableOpacity style={styles.actionBtn} onPress={onPress} activeOpacity={0.85}>
      <Ionicons name={icon} size={18} color={danger ? Colors.error : Colors.primary} />
      <Text style={[styles.actionLabel, danger && styles.actionLabelDanger]}>{label}</Text>
    </TouchableOpacity>
  );
}

function CredentialRow({
  label,
  value,
  onCopy,
}: {
  label: string;
  value: string;
  onCopy: (label: string, value: string) => void;
}) {
  const styles = useStyles();
  return (
    <View style={styles.credentialRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.credentialLabel}>{label}</Text>
        <Text style={styles.credentialValue}>{value}</Text>
      </View>
      <TouchableOpacity onPress={() => onCopy(label, value)} style={styles.copyBtn}>
        <Ionicons name="copy-outline" size={18} color={Colors.primary} />
      </TouchableOpacity>
    </View>
  );
}

const createStyles = (colors: import('../theme/types').ThemeColors) => StyleSheet.create({
  cardVisual: {
    borderRadius: 20,
    padding: 20,
    minHeight: 180,
    marginBottom: 16,
    justifyContent: 'space-between',
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardBrand: { color: Colors.white, fontSize: 16, fontWeight: '800' },
  cardStatus: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  cardStatusText: { fontSize: 11, fontWeight: '700' },
  cardPan: { color: Colors.white, fontSize: 20, letterSpacing: 2, fontWeight: '600', marginVertical: 20 },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between' },
  cardMetaLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 11 },
  cardBalance: { color: Colors.white, fontSize: 22, fontWeight: '800' },
  cardExpiry: { color: Colors.white, fontSize: 14, fontWeight: '700' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: Radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionLabel: { fontSize: 13, fontWeight: '600', color: colors.dark },
  actionLabelDanger: { color: Colors.error },
  fundSection: { gap: Spacing.sm, marginBottom: 12 },
  fundTitle: { fontSize: 15, fontWeight: '700', color: colors.dark },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.dark,
    backgroundColor: colors.surface,
  },
  fundHint: { fontSize: 12, color: colors.muted },
  warn: { fontSize: 12, color: Colors.error },
  txSection: { gap: 8 },
  txTitle: { fontSize: 15, fontWeight: '700', color: colors.dark },
  txEmpty: { fontSize: 13, color: colors.muted },
  txRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 8 },
  txDesc: { flex: 1, fontSize: 13, color: colors.dark },
  txAmount: { fontSize: 13, fontWeight: '700', color: colors.dark },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  modalContent: { padding: 20, gap: 12 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: colors.dark },
  modalWarn: { fontSize: 12, color: colors.muted, lineHeight: 18 },
  credentialRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: Radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  credentialLabel: { fontSize: 11, color: colors.muted },
  credentialValue: { fontSize: 16, fontWeight: '700', color: colors.dark, marginTop: 2 },
  copyBtn: { padding: 8 },
});

function useStyles() {
  return useThemedStyles(createStyles);
}
