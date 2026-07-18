import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatCurrency, MASKED_BALANCE } from '../lib/api';
import {
  getHomeInsights,
  getHomeLastUpdated,
  pullToRefreshHome,
  refreshHomeInsights,
  refreshWalletFundingData,
} from '../lib/dashboard-data';
import { useWalletStore } from '../stores';
import { useTabContext } from '../stores/tab-context';
import {Colors, Spacing, Radius , Palette, FormColors, BRAND, Overlays, useColors, useThemedStyles } from '../theme';
import { gradientStops, withAlpha } from '../theme/gradient-utils';
import { Skeleton } from '../components/ui/Skeleton';
import { useServiceAvailability } from '../hooks/useServiceAvailability';
import { SERVICE_CODES } from '../lib/service-availability';
import { showToast } from '../components/ui/Toast';
import { AdBanner } from '../components/ads/AdBanner';
import { BroadcastBanner } from '../components/broadcast/BroadcastBanner';
import {
  dedupeTransactionsForDisplay,
  enrichTransaction,
  formatInsightAmount,
  type MonthlyInsights,
} from '../lib/transaction-display';
import { TransactionListItem } from '../components/TransactionListItem';
import { ThemedScreen } from '../components/ui/ThemedScreen';
import { useGradients } from '../theme/hooks';
import { GlassCard } from '../components/ui/GlassCard';
import { ScreenBody } from '../components/ui/ScreenBody';
import { useLayout } from '../lib/platform-ui';

const WALLET_FUNDING_PAGE_SIZE = 6;
function getBalanceParts(kobo: string) {
  const raw = formatCurrency(kobo).replace('₦', '').trim();
  const [whole, decimal = '00'] = raw.split('.');
  return { whole, decimal: `.${decimal}` };
}

function formatLastUpdated(date: Date | null) {
  if (!date) return 'Updating…';
  const time = date.toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' });
  return `Last updated ${time}`;
}

function WalletMoneyOverview({
  monthLabel,
  insights,
  loading,
  balanceVisible,
}: {
  monthLabel: string;
  insights: MonthlyInsights;
  loading: boolean;
  balanceVisible: boolean;
}) {
  const styles = useStyles();
  const colors = useColors();

  const totalFlow = insights.moneyIn + insights.moneyOut;
  const inShare = totalFlow > 0n
    ? Math.min(100, Math.max(8, Number((insights.moneyIn * 100n) / totalFlow)))
    : 50;
  const netPositive = insights.moneyIn >= insights.moneyOut;
  const netAmount = insights.moneyIn >= insights.moneyOut
    ? insights.moneyIn - insights.moneyOut
    : insights.moneyOut - insights.moneyIn;
  const netLabel = netPositive ? 'Net inflow' : 'Net outflow';
  const txTotal = insights.inCount + insights.outCount;

  return (
    <GlassCard variant="solid" borderRadius={20} contentStyle={styles.overviewCard}>
      <View style={styles.overviewHeader}>
        <View style={styles.overviewHeaderLeft}>
          <View style={styles.overviewHeaderIcon}>
            <Ionicons name="calendar-outline" size={15} color={colors.primary} />
          </View>
          <Text style={styles.overviewTitle}>{monthLabel} overview</Text>
        </View>
        {!loading && txTotal > 0 ? (
          <View style={styles.overviewTxBadge}>
            <Text style={styles.overviewTxBadgeText}>{txTotal} txns</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.overviewTiles}>
        <View style={[styles.overviewTile, styles.overviewTileIn]}>
          <View style={styles.overviewTileTop}>
            <View style={[styles.overviewTileIcon, styles.overviewTileIconIn]}>
              <Ionicons name="arrow-down" size={16} color={colors.success} />
            </View>
            <Text style={styles.overviewTileLabel}>Money in</Text>
          </View>
          <Text style={styles.overviewIn}>
            {loading ? '—' : formatInsightAmount(insights.moneyIn, balanceVisible)}
          </Text>
          {!loading && insights.inCount > 0 ? (
            <Text style={styles.overviewTileMeta}>
              {insights.inCount} credit{insights.inCount === 1 ? '' : 's'}
            </Text>
          ) : (
            <Text style={styles.overviewTileMeta}>No credits yet</Text>
          )}
        </View>

        <View style={[styles.overviewTile, styles.overviewTileOut]}>
          <View style={styles.overviewTileTop}>
            <View style={[styles.overviewTileIcon, styles.overviewTileIconOut]}>
              <Ionicons name="arrow-up" size={16} color={colors.error} />
            </View>
            <Text style={styles.overviewTileLabel}>Money out</Text>
          </View>
          <Text style={styles.overviewOut}>
            {loading ? '—' : formatInsightAmount(insights.moneyOut, balanceVisible)}
          </Text>
          {!loading && insights.outCount > 0 ? (
            <Text style={styles.overviewTileMeta}>
              {insights.outCount} debit{insights.outCount === 1 ? '' : 's'}
            </Text>
          ) : (
            <Text style={styles.overviewTileMeta}>No debits yet</Text>
          )}
        </View>
      </View>

      {!loading && totalFlow > 0n ? (
        <View style={styles.overviewFlow}>
          <View style={styles.overviewFlowTrack}>
            <View style={[styles.overviewFlowIn, { width: `${inShare}%` }]} />
          </View>
          <View style={styles.overviewFlowFoot}>
            <Text style={[styles.overviewFlowNet, netPositive ? styles.overviewFlowNetPos : styles.overviewFlowNetNeg]}>
              {netLabel} · {formatInsightAmount(netAmount, balanceVisible)}
            </Text>
            <Text style={styles.overviewFlowRatio}>{inShare}% in · {100 - inShare}% out</Text>
          </View>
        </View>
      ) : null}
    </GlassCard>
  );
}

function BalanceAmount({ kobo, visible }: { kobo: string; visible: boolean }) {
  const styles = useStyles();

  if (!visible) {
    return <Text style={styles.balanceHidden}>{MASKED_BALANCE}</Text>;
  }
  const { whole, decimal } = getBalanceParts(kobo);
  return (
    <View style={styles.balanceRow}>
      <Text style={styles.balanceWhole}>{whole}</Text>
      <Text style={styles.balanceDecimal}>{decimal}</Text>
    </View>
  );
}

export default function WalletScreen() {
  const styles = useStyles();
  const colors = useColors();

  const insets = useSafeAreaInsets();
  const gradients = useGradients();
  const { pagePadding } = useLayout();
  const { setTab } = useTabContext();
  const {
    balance,
    balanceVisible,
    toggleBalanceVisible,
    dataHydrated,
    dashboardVersion,
    walletFundingTransactions,
  } = useWalletStore();
  const [refreshing, setRefreshing] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const refreshInFlight = useRef(false);
  const showInitialLoading = !dataHydrated;
  const { isUsable } = useServiceAvailability();
  const fundUsable = isUsable(SERVICE_CODES.walletFund);
  const transferUsable = isUsable(SERVICE_CODES.localTransfer);
  const virtualCardUsable = isUsable(SERVICE_CODES.virtualCard);

  const insights = useMemo(() => getHomeInsights(), [dashboardVersion]);
  const lastUpdated = useMemo(() => getHomeLastUpdated(), [dashboardVersion]);
  const monthLabel = new Date().toLocaleDateString('en-NG', { month: 'long' });

  const walletActivity = useMemo(
    () =>
      dedupeTransactionsForDisplay(walletFundingTransactions)
        .map((tx) => enrichTransaction(tx))
        .slice(0, WALLET_FUNDING_PAGE_SIZE),
    [walletFundingTransactions, dashboardVersion],
  );

  useEffect(() => {
    void refreshHomeInsights();
    void refreshWalletFundingData();
  }, []);

  const onRefresh = useCallback(async () => {
    if (refreshInFlight.current) return;

    refreshInFlight.current = true;
    setRefreshing(true);
    scrollRef.current?.scrollTo({ y: 0, animated: false });

    try {
      await pullToRefreshHome();
    } finally {
      refreshInFlight.current = false;
      setRefreshing(false);
    }
  }, []);

  const handleRefreshPress = useCallback(() => {
    void onRefresh();
  }, [onRefresh]);

  const openFund = () => {
    if (!fundUsable) {
      showToast({ type: 'info', text1: 'Unavailable', text2: 'Wallet funding is currently disabled' });
      return;
    }
    router.push('/wallet/fund');
  };

  const openTransfer = () => {
    if (!transferUsable) {
      showToast({ type: 'info', text1: 'Unavailable', text2: 'Bank transfers are currently disabled' });
      return;
    }
    router.push('/wallet/transfer');
  };

  const openVirtualCards = () => {
    if (!virtualCardUsable) {
      showToast({ type: 'info', text1: 'Unavailable', text2: 'Virtual cards are currently disabled' });
      return;
    }
    router.push('/wallet/virtual-cards');
  };

  return (
    <ThemedScreen>
      <LinearGradient
        colors={gradientStops(gradients.hero)}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.hero, { paddingTop: insets.top + 8, paddingHorizontal: pagePadding }]}
      >
        <View style={styles.blobA} />
        <View style={styles.blobB} />

        <View style={styles.heroTop}>
          <View>
            <Text style={styles.heroEyebrow}>Wallet</Text>
            <Text style={styles.heroTitle}>Your balance</Text>
          </View>
          <TouchableOpacity
            style={styles.heroIconBtn}
            onPress={handleRefreshPress}
            activeOpacity={0.8}
            disabled={refreshing}
            accessibilityRole="button"
            accessibilityLabel="Refresh wallet"
          >
            {refreshing ? (
              <ActivityIndicator size="small" color={Overlays.white95} />
            ) : (
              <Ionicons name="refresh-outline" size={18} color={Overlays.white90} />
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.balanceBlock}>
          <View style={styles.balanceMeta}>
            <Text style={styles.balanceNaira}>₦</Text>
            {showInitialLoading ? (
              <Skeleton width={160} height={40} borderRadius={8} />
            ) : (
              <BalanceAmount kobo={balance} visible={balanceVisible} />
            )}
            <TouchableOpacity style={styles.eyeBtn} onPress={toggleBalanceVisible} activeOpacity={0.75}>
              <Ionicons
                name={balanceVisible ? 'eye-outline' : 'eye-off-outline'}
                size={17}
                color={Overlays.white75}
              />
            </TouchableOpacity>
          </View>
          <Text style={styles.syncText}>
            {refreshing ? 'Refreshing…' : formatLastUpdated(lastUpdated)}
          </Text>
        </View>

        <View style={styles.heroActions}>
          <TouchableOpacity
            style={[styles.heroActionPrimary, !fundUsable && styles.heroActionDisabled]}
            onPress={openFund}
            activeOpacity={fundUsable ? 0.88 : 1}
          >
            <Ionicons name="add" size={18} color={colors.white} />
            <Text style={styles.heroActionPrimaryText}>Add money</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.heroActionGhost, !transferUsable && styles.heroActionDisabled]}
            onPress={openTransfer}
            activeOpacity={transferUsable ? 0.88 : 1}
          >
            <Ionicons name="paper-plane-outline" size={16} color={Colors.white} />
            <Text style={styles.heroActionGhostText}>Send</Text>
          </TouchableOpacity>

          {virtualCardUsable ? (
            <TouchableOpacity
              style={styles.heroActionGhost}
              onPress={openVirtualCards}
              activeOpacity={0.88}
            >
              <Ionicons name="card-outline" size={16} color={Colors.white} />
              <Text style={styles.heroActionGhostText}>Cards</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </LinearGradient>

      <ScrollView
        ref={scrollRef}
        style={styles.sheet}
        contentContainerStyle={[styles.sheetContent, { paddingBottom: insets.bottom + 28 }]}
        showsVerticalScrollIndicator={false}
        alwaysBounceVertical
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
            progressBackgroundColor={colors.card}
          />
        }
      >
        <ScreenBody>
        <BroadcastBanner screen="WALLET" />
        <WalletMoneyOverview
          monthLabel={monthLabel}
          insights={insights}
          loading={showInitialLoading}
          balanceVisible={balanceVisible}
        />

        <AdBanner screen="WALLET" placement="BANNER" />

        <View style={styles.activitySection}>
          <View style={styles.activityHeader}>
            <Text style={styles.activityTitle}>Recent funding</Text>
            <TouchableOpacity onPress={() => setTab('history')} activeOpacity={0.7} hitSlop={8}>
              <Text style={styles.activityLink}>View all</Text>
            </TouchableOpacity>
          </View>

          {showInitialLoading ? (
            <View style={styles.activityList}>
              <Skeleton width="100%" height={64} borderRadius={14} style={{ marginBottom: 8 }} />
              <Skeleton width="100%" height={64} borderRadius={14} />
            </View>
          ) : walletActivity.length === 0 ? (
            <GlassCard borderRadius={Radius.xl} variant="solid" contentStyle={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Ionicons name="swap-horizontal-outline" size={22} color={Colors.primary} />
              </View>
              <Text style={styles.emptyTitle}>Nothing here yet</Text>
              <Text style={styles.emptySub}>
                Wallet top-ups and credits will show up in this list.
              </Text>
            </GlassCard>
          ) : (
            <View style={styles.activityList}>
              {walletActivity.map((tx, index) => (
                <GlassCard
                  key={tx.id}
                  variant="solid"
                  borderRadius={Radius.lg}
                  padding={0}
                  style={index < walletActivity.length - 1 ? styles.activityItemGap : undefined}
                >
                  <TransactionListItem
                    transaction={tx}
                    balanceVisible={balanceVisible}
                    variant="embedded"
                    onPress={() => router.push(`/transactions/${tx.id}` as any)}
                  />
                </GlassCard>
              ))}
            </View>
          )}
        </View>

        <View style={styles.trustRow}>
          <Ionicons name="shield-checkmark-outline" size={14} color={Colors.mutedLight} />
          <Text style={styles.trustText}>Secured with bank-grade encryption</Text>
        </View>
        </ScreenBody>
      </ScrollView>
    </ThemedScreen>
  );
}

const createStyles = (colors: import('../theme/types').ThemeColors, gradients: import('../theme/types').ThemeGradients) => StyleSheet.create({
  root: { flex: 1 },

  hero: {
    paddingBottom: 28,
    overflow: 'hidden',
  },
  blobA: {
    position: 'absolute',
    top: -40,
    right: -30,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: withAlpha(gradients.hero[2], 0.38),
  },
  blobB: {
    position: 'absolute',
    bottom: 10,
    left: -50,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: withAlpha(gradients.hero[1], 0.28),
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
    zIndex: 2,
  },
  heroEyebrow: {
    fontSize: 12,
    color: Overlays.white55,
    fontWeight: '500',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.textOnHero,
    letterSpacing: -0.3,
  },
  heroIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Overlays.white10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Overlays.white12,
    zIndex: 2,
  },

  balanceBlock: { marginBottom: 22 },
  balanceMeta: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
    marginBottom: 8,
  },
  balanceNaira: {
    fontSize: 26,
    fontWeight: '500',
    color: Overlays.white65,
    marginBottom: 6,
    marginRight: 2,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  balanceWhole: {
    fontSize: 42,
    fontWeight: '600',
    color: colors.textOnHero,
    letterSpacing: -1.5,
    lineHeight: 48,
  },
  balanceDecimal: {
    fontSize: 20,
    fontWeight: '500',
    color: Overlays.rgba255_255_255_05,
    marginBottom: 5,
    marginLeft: 1,
  },
  balanceHidden: {
    fontSize: 36,
    fontWeight: '500',
    color: Overlays.white85,
    letterSpacing: 4,
  },
  eyeBtn: {
    marginLeft: 10,
    marginBottom: 8,
    padding: 4,
  },
  syncText: {
    fontSize: 12,
    color: Overlays.white65,
    fontWeight: '400',
  },

  heroActions: {
    flexDirection: 'row',
    gap: 10,
  },
  heroActionPrimary: {
    flex: 1.15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 13,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  heroActionPrimaryText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.white,
  },
  heroActionGhost: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: withAlpha(colors.primaryDeep, 0.82),
    borderRadius: 14,
    paddingVertical: 13,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: withAlpha(colors.white, 0.16),
  },
  heroActionGhostText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textOnHero,
  },
  heroActionDisabled: { opacity: 0.45 },

  sheet: {
    flex: 1,
    backgroundColor: colors.pageBg,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    marginTop: -6,
  },
  sheetContent: {
    paddingTop: 22,
    gap: 14,
  },

  overviewCard: {
    gap: 14,
  },
  overviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  overviewHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  overviewHeaderIcon: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overviewTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.dark,
    letterSpacing: -0.2,
  },
  overviewTxBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.full,
    backgroundColor: colors.primaryMuted,
  },
  overviewTxBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primaryLight,
  },
  overviewTiles: {
    flexDirection: 'row',
    gap: 10,
  },
  overviewTile: {
    flex: 1,
    borderRadius: 16,
    padding: 12,
    gap: 6,
  },
  overviewTileIn: {
    backgroundColor: colors.successLight,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Overlays.borderSuccess12,
  },
  overviewTileOut: {
    backgroundColor: colors.errorLight,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Overlays.borderDanger10,
  },
  overviewTileTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  overviewTileIcon: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overviewTileIconIn: {
    backgroundColor: Overlays.emerald14,
  },
  overviewTileIconOut: {
    backgroundColor: Overlays.walletOutIconBg,
  },
  overviewTileLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.mid,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  overviewIn: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.success,
    letterSpacing: -0.4,
  },
  overviewOut: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.error,
    letterSpacing: -0.4,
  },
  overviewTileMeta: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.mid,
  },
  overviewFlow: {
    gap: 8,
    paddingTop: 2,
  },
  overviewFlowTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.errorLight,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  overviewFlowIn: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: colors.success,
  },
  overviewFlowFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  overviewFlowNet: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  overviewFlowNetPos: {
    color: colors.success,
  },
  overviewFlowNetNeg: {
    color: colors.error,
  },
  overviewFlowRatio: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.mid,
  },

  activitySection: { gap: 10 },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  activityTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.dark,
    letterSpacing: -0.2,
  },
  activityLink: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.primary,
  },
  activityList: { gap: 0 },
  activityItemGap: { marginBottom: 8 },

  emptyState: {
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  emptyIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.dark,
    marginBottom: 4,
  },
  emptySub: {
    fontSize: 13,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 18,
    fontWeight: '400',
  },

  trustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingTop: 6,
  },
  trustText: {
    fontSize: 11,
    color: colors.muted,
    fontWeight: '400',
  },
});

function useStyles() {
  return useThemedStyles(createStyles);
}
