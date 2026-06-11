import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  RefreshControl, Dimensions,
} from 'react-native';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { router } from 'expo-router';
import { useTabContext } from '../stores/tab-context';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore, useWalletStore } from '../stores';
import { formatCurrency, MASKED_BALANCE } from '../lib/api';
import { dedupeTransactionsForDisplay, enrichTransaction, formatInsightAmount } from '../lib/transaction-display';
import { TransactionListItem } from '../components/TransactionListItem';
import {
  getHomeInsights,
  getHomeLastUpdated,
  pullToRefreshHome,
  refreshDashboardData,
} from '../lib/dashboard-data';
import { Colors, Spacing } from '../theme';
import { Skeleton } from '../components/ui/Skeleton';
import { preloadTransferBanks } from '../lib/transfer-banks-cache';
import { useServiceAvailability } from '../hooks/useServiceAvailability';
import { SERVICE_CODES } from '../lib/service-availability';
import { HOME_QUICK_ACTIONS } from '../lib/service-catalog-ui';
import { showToast } from '../components/ui/Toast';

const PAGE_BG = '#F4F5FA';
const CARD_DARK = '#1A0A3C';
const BRAND = '#7C3AED';
const BORDER = 'rgba(15, 23, 42, 0.08)';

const QA_COLS = 3;
const QA_GAP = 10;
const QA_PAD = Spacing.page;
const QA_TILE_W = (Dimensions.get('window').width - QA_PAD * 2 - QA_GAP * (QA_COLS - 1)) / QA_COLS;

function getBalanceParts(kobo: string) {
  const raw = formatCurrency(kobo).replace('₦', '').trim();
  const [whole, decimal = '00'] = raw.split('.');
  return { whole, decimal: `.${decimal}` };
}

function formatLastUpdated(date: Date | null) {
  if (!date) return 'Updating…';
  return `Last updated ${date.toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })}`;
}

function QuickActionTile({
  item,
  available,
}: {
  item: typeof HOME_QUICK_ACTIONS[0];
  available: boolean;
}) {
  const { setTab } = useTabContext();
  const onPress = () => {
    if (!available) {
      showToast({
        type: 'info',
        text1: 'Unavailable',
        text2: `${item.title} is currently disabled`,
      });
      return;
    }
    if (item.route.startsWith('TAB:')) setTab(item.route.replace('TAB:', '') as any);
    else router.push(item.route as any);
  };

  return (
    <TouchableOpacity
      style={[styles.qaTile, !available && styles.qaTileDisabled]}
      onPress={onPress}
      activeOpacity={available ? 0.72 : 1}
    >
      <View style={[styles.qaTileIcon, { backgroundColor: item.bg }, !available && styles.qaTileIconDisabled]}>
        <Ionicons name={item.icon as any} size={20} color={available ? item.color : Colors.mutedLight} />
      </View>
      <Text style={[styles.qaTileLabel, !available && styles.qaTileLabelDisabled]}>{item.title}</Text>
      {!available && (
        <View style={styles.qaSoonBadge}>
          <Text style={styles.qaSoonText}>Unavailable</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

function BalanceAmount({ kobo, visible }: { kobo: string; visible: boolean }) {
  if (!visible) return <Text style={styles.balanceHidden}>{MASKED_BALANCE}</Text>;
  const { whole, decimal } = getBalanceParts(kobo);
  return (
    <View style={styles.balanceRow}>
      <Text style={styles.balanceSymbol}>₦</Text>
      <Text style={styles.balanceWhole}>{whole}</Text>
      <Text style={styles.balanceDecimal}>{decimal}</Text>
    </View>
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const { balance, homeTransactions, balanceVisible, toggleBalanceVisible, dataHydrated, dashboardVersion } = useWalletStore();
  const [refreshing, setRefreshing] = useState(false);
  const { setTab } = useTabContext();
  const { isUsable } = useServiceAvailability();
  const transferUsable = isUsable(SERVICE_CODES.localTransfer);
  const fundUsable = isUsable(SERVICE_CODES.walletFund);

  const insights = useMemo(() => getHomeInsights(), [dashboardVersion]);
  const lastUpdated = useMemo(() => getHomeLastUpdated(), [dashboardVersion]);
  const recentTransactions = useMemo(
    () => dedupeTransactionsForDisplay(homeTransactions)
      .map((tx) => enrichTransaction(tx))
      .slice(0, 10),
    [homeTransactions, dashboardVersion],
  );
  const showInitialLoading = !dataHydrated;

  useEffect(() => {
    preloadTransferBanks();
    void refreshDashboardData();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await pullToRefreshHome();
    } finally {
      setRefreshing(false);
    }
  }, []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const firstName = user?.firstName || 'there';
  const monthLabel = new Date().toLocaleDateString('en-NG', { month: 'long' });

  return (
    <View style={styles.root}>
      {/* Fixed header — greeting + notifications only */}
      <View style={[styles.fixedHeader, { paddingTop: insets.top + 10 }]}>
        <View style={styles.topBar}>
          <View style={styles.greetRow}>
            <View style={styles.avatarRing}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{firstName[0]?.toUpperCase()}</Text>
              </View>
            </View>
            <View>
              <Text style={styles.greetSmall}>{greeting}</Text>
              <Text style={styles.greetName}>{firstName}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.notifBtn} activeOpacity={0.8}>
            <Ionicons name="notifications-outline" size={20} color={Colors.primary} />
            <View style={styles.notifDot} />
          </TouchableOpacity>
        </View>
        <View style={styles.fixedDivider} />
      </View>

      {/* Scrollable body — balance card + rest of dashboard */}
      <ScrollView
        style={styles.scrollBody}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        alwaysBounceVertical
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={BRAND}
            colors={[BRAND]}
            progressBackgroundColor={Colors.white}
          />
        }
      >
        <View style={styles.scrollInner}>
        <View style={styles.balanceCard}>
          <View style={styles.blob1} />
          <View style={styles.blob2} />
          <View style={styles.blob3} />
          <View style={styles.cardShine} />

          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardBalLabel}>Available Balance</Text>
            <TouchableOpacity
              style={styles.eyeBtn}
              activeOpacity={0.75}
              onPress={toggleBalanceVisible}
            >
              <Ionicons
                name={balanceVisible ? 'eye-outline' : 'eye-off-outline'}
                size={16}
                color="rgba(255,255,255,0.85)"
              />
            </TouchableOpacity>
          </View>

          {showInitialLoading ? (
            <Skeleton width={200} height={44} borderRadius={10} style={{ marginBottom: 6 }} />
          ) : (
            <BalanceAmount kobo={balance} visible={balanceVisible} />
          )}

          <View style={styles.lastUpdatedRow}>
            {refreshing ? (
              <View style={styles.liveDot} />
            ) : lastUpdated ? (
              <View style={styles.liveDotIdle} />
            ) : null}
            <Text style={styles.lastUpdated}>{formatLastUpdated(lastUpdated)}</Text>
          </View>

          <View style={styles.inlineActions}>
            <TouchableOpacity
              style={[styles.btnFund, !fundUsable && styles.btnActionDisabled]}
              activeOpacity={fundUsable ? 0.85 : 1}
              onPress={() => {
                if (!fundUsable) {
                  showToast({ type: 'info', text1: 'Funding unavailable', text2: 'Wallet funding is currently disabled' });
                  return;
                }
                router.push('/wallet/fund' as any);
              }}
            >
              <Ionicons name="add" size={18} color={Colors.white} />
              <Text style={styles.btnFundText}>Fund</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btnSend, !transferUsable && styles.btnActionDisabled]}
              activeOpacity={transferUsable ? 0.85 : 1}
              onPress={() => {
                if (!transferUsable) {
                  showToast({ type: 'info', text1: 'Transfers unavailable', text2: 'Bank transfers are currently disabled' });
                  return;
                }
                router.push('/wallet/transfer' as any);
              }}
            >
              <Ionicons name="paper-plane-outline" size={16} color={Colors.white} />
              <Text style={styles.btnSendText}>Send</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.insightRow}>
          <View style={styles.insightCard}>
            <Text style={styles.insightLabel}>Money In</Text>
            <Text style={styles.insightValueIn}>
              {showInitialLoading ? '—' : formatInsightAmount(insights.moneyIn, balanceVisible)}
            </Text>
            <Text style={styles.insightSub}>
              {showInitialLoading ? '…' : `${insights.inCount} transaction${insights.inCount === 1 ? '' : 's'}`} · {monthLabel}
            </Text>
          </View>
          <View style={styles.insightCard}>
            <Text style={styles.insightLabel}>Money Out</Text>
            <Text style={styles.insightValueOut}>
              {showInitialLoading ? '—' : formatInsightAmount(insights.moneyOut, balanceVisible)}
            </Text>
            <Text style={styles.insightSub}>
              {showInitialLoading ? '…' : `${insights.outCount} transaction${insights.outCount === 1 ? '' : 's'}`} · {monthLabel}
            </Text>
          </View>
        </View>

        {user && user.kycStatus !== 'VERIFIED' && (
          <TouchableOpacity style={styles.kycBanner} activeOpacity={0.85} onPress={() => router.push('/kyc')}>
            <View style={styles.kycBannerIcon}>
              <Ionicons name="shield-checkmark-outline" size={16} color={Colors.primary} />
            </View>
            <View style={styles.kycBannerText}>
              <Text style={styles.kycBannerTitle}>Verify your identity</Text>
              <Text style={styles.kycBannerSub}>Unlock higher transaction limits</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={Colors.muted} />
          </TouchableOpacity>
        )}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
        </View>
        <View style={styles.qaGrid}>
          {HOME_QUICK_ACTIONS.map((item) => (
            <QuickActionTile
              key={item.title}
              item={item}
              available={!item.serviceCode || isUsable(item.serviceCode)}
            />
          ))}
        </View>

        <View style={[styles.sectionHeader, { marginTop: 24 }]}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <TouchableOpacity style={styles.seeAllBtn} onPress={() => setTab('history')}>
            <Text style={styles.seeAll}>See all</Text>
            <Ionicons name="chevron-forward" size={14} color={BRAND} />
          </TouchableOpacity>
        </View>

        <View style={styles.txCard}>
          {showInitialLoading ? (
            [1, 2, 3].map((i) => (
              <View key={i} style={[styles.txItem, i < 3 && styles.txBorder]}>
                <Skeleton width={40} height={40} borderRadius={12} />
                <View style={{ flex: 1, gap: 6 }}>
                  <Skeleton width="50%" height={12} />
                  <Skeleton width="70%" height={10} />
                </View>
                <Skeleton width={64} height={14} />
              </View>
            ))
          ) : recentTransactions.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Ionicons name="receipt-outline" size={32} color={Colors.mutedLight} />
              <Text style={styles.emptyTitle}>No transactions yet</Text>
              <Text style={styles.emptySub}>Your activity will appear here</Text>
            </View>
          ) : (
            recentTransactions.map((tx, idx) => (
                <TransactionListItem
                  key={tx.id}
                  transaction={tx}
                  balanceVisible={balanceVisible}
                  variant="embedded"
                  showStatus
                  isLast={idx === recentTransactions.length - 1}
                  onPress={() => router.push(`/transactions/${tx.id}`)}
                />
              ))
          )}
        </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: PAGE_BG },

  fixedHeader: {
    paddingHorizontal: Spacing.page,
    paddingBottom: 0,
    backgroundColor: PAGE_BG,
    zIndex: 10,
  },
  fixedDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: BORDER,
    marginTop: 12,
  },
  scrollBody: { flex: 1 },
  scrollContent: {
    paddingHorizontal: Spacing.page,
    paddingTop: 14,
    paddingBottom: 32,
    flexGrow: 1,
  },
  scrollInner: {
    gap: 16,
  },

  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greetRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatarRing: {
    padding: 2,
    borderRadius: 24,
    backgroundColor: 'rgba(124, 58, 237, 0.12)',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: BRAND,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { fontSize: 16, color: Colors.white, fontWeight: '700' },
  greetSmall: { fontSize: 13, color: Colors.muted, marginBottom: 1 },
  greetName: { fontSize: 18, fontWeight: '700', color: Colors.dark, letterSpacing: -0.3 },
  notifBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: BORDER,
  },
  notifDot: {
    position: 'absolute',
    top: 9,
    right: 9,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: Colors.error,
    borderWidth: 1.5,
    borderColor: Colors.white,
  },

  // Dark balance card
  balanceCard: {
    backgroundColor: CARD_DARK,
    borderRadius: 22,
    padding: 20,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.08)',
    shadowColor: '#1A0A3C',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 16,
    elevation: 8,
  },
  cardShine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  blob1: {
    position: 'absolute',
    top: -50,
    right: -40,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(124, 58, 237, 0.35)',
  },
  blob2: {
    position: 'absolute',
    bottom: -30,
    left: -20,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(99, 102, 241, 0.25)',
  },
  blob3: {
    position: 'absolute',
    top: 60,
    right: 40,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardBalLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.65)',
    fontWeight: '500',
  },
  eyeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 4,
  },
  balanceSymbol: {
    fontSize: 20,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
    marginRight: 2,
    marginBottom: 5,
  },
  balanceWhole: {
    fontSize: 40,
    fontWeight: '800',
    color: Colors.white,
    letterSpacing: -1.5,
    lineHeight: 46,
  },
  balanceDecimal: {
    fontSize: 18,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.55)',
    marginBottom: 5,
  },
  balanceHidden: {
    fontSize: 34,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.85)',
    letterSpacing: 3,
    marginBottom: 4,
  },
  lastUpdatedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 18,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#A78BFA',
  },
  liveDotIdle: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(167, 139, 250, 0.45)',
  },
  lastUpdated: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.45)',
    fontWeight: '500',
  },
  inlineActions: {
    flexDirection: 'row',
    gap: 10,
  },
  btnFund: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: BRAND,
    borderRadius: 14,
    paddingVertical: 13,
    shadowColor: BRAND,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  btnFundText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.white,
  },
  btnSend: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 14,
    paddingVertical: 13,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  btnSendText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.white,
  },
  btnActionDisabled: {
    opacity: 0.45,
  },

  // Insights
  insightRow: {
    flexDirection: 'row',
    gap: 10,
  },
  insightCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: BORDER,
  },
  insightLabel: {
    fontSize: 12,
    color: Colors.muted,
    fontWeight: '500',
    marginBottom: 4,
  },
  insightValueIn: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.success,
    letterSpacing: -0.3,
    marginBottom: 2,
  },
  insightValueOut: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.error,
    letterSpacing: -0.3,
    marginBottom: 2,
  },
  insightSub: {
    fontSize: 10,
    color: Colors.mutedLight,
    fontWeight: '500',
  },

  // KYC banner
  kycBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.white,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  kycBannerIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: Colors.primaryMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  kycBannerText: { flex: 1 },
  kycBannerTitle: { fontSize: 13, fontWeight: '700', color: Colors.dark, marginBottom: 1 },
  kycBannerSub: { fontSize: 11, color: Colors.muted },

  // Sections
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: -4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.dark,
    letterSpacing: -0.2,
  },
  seeAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  seeAll: { fontSize: 13, color: BRAND, fontWeight: '600' },

  // Quick actions — square tiles
  qaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: QA_GAP,
  },
  qaTile: {
    width: QA_TILE_W,
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    gap: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: BORDER,
  },
  qaTileIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qaTileLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.mid,
    textAlign: 'center',
  },
  qaTileDisabled: { opacity: 0.65 },
  qaTileIconDisabled: { opacity: 0.7 },
  qaTileLabelDisabled: { color: Colors.muted },
  qaSoonBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(15, 23, 42, 0.08)',
    borderRadius: 999,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  qaSoonText: {
    fontSize: 7,
    fontWeight: '700',
    color: Colors.muted,
  },

  // Transactions
  txCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: BORDER,
  },
  txItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 12,
  },
  txBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER },
  txIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  txMeta: { flex: 1 },
  txTitle: { fontSize: 14, fontWeight: '600', color: Colors.dark, marginBottom: 2 },
  txSub: { fontSize: 11, color: Colors.muted },
  txAmt: { fontSize: 14, fontWeight: '700' },
  emptyWrap: { alignItems: 'center', paddingVertical: 32, gap: 6 },
  emptyTitle: { fontSize: 14, fontWeight: '600', color: Colors.muted },
  emptySub: { fontSize: 12, color: Colors.mutedLight },
});
