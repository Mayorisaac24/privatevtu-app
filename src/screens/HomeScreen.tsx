import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  RefreshControl, Platform, ActivityIndicator,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { useTabContext } from '../stores/tab-context';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore, useWalletStore } from '../stores';
import { useNotificationsStore } from '../stores/notifications-store';
import { formatCurrency, MASKED_BALANCE } from '../lib/api';
import {
  dedupeTransactionsForDisplay,
  enrichTransaction,
} from '../lib/transaction-display';
import { TransactionListItem } from '../components/TransactionListItem';
import { WalletAccountCard } from '../components/WalletAccountCard';
import {
  getHomeLastUpdated,
  preloadHistoryData,
  pullToRefreshHome,
} from '../lib/dashboard-data';
import {
  getWalletFundingData,
  getWalletFundingDataForHome,
  getPermanentVirtualAccounts,
  hasWalletFundingAccountsReady,
  peekWalletFundingCache,
  pullToRefreshWalletFunding,
  type WalletFundingSnapshot,
} from '../lib/wallet-funding-cache';
import {Colors, Spacing , Palette, FormColors, BRAND, Overlays, useColors, useTheme, useCardGlassVariant, useThemedStyles, useGradients } from '../theme';
import { gradientStops, withAlpha } from '../theme/gradient-utils';
import { Skeleton } from '../components/ui/Skeleton';
import { openNotifications } from '../lib/navigation';
import { useServiceAvailability } from '../hooks/useServiceAvailability';
import { SERVICE_CODES } from '../lib/service-availability';
import { HOME_QUICK_ACTIONS } from '../lib/service-catalog-ui';
import { showToast } from '../components/ui/Toast';
import { GlassSurface } from '../components/ui/GlassSurface';
import { ThemedScreen } from '../components/ui/ThemedScreen';
import { AdBanner } from '../components/ads/AdBanner';
import { BroadcastBanner } from '../components/broadcast/BroadcastBanner';
import { UserAvatar } from '../components/ui/UserAvatar';
import { ScreenContent } from '../components/ui/ScreenContent';
import { useGridTileWidth, useLayout } from '../lib/platform-ui';
import { getKycStatusData, peekKycStatusCache } from '../lib/kyc-status-cache';
import { shouldShowHomeKycBanner } from '../lib/kyc-display';
import type { KycStatusData } from '../lib/api';

const HEADER_ROW_H = 52;
const HEADER_DIVIDER_H = 13;

const QA_COLS = 3;
const QA_GAP = 10;

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
  tileWidth,
}: {
  item: typeof HOME_QUICK_ACTIONS[0];
  available: boolean;
  tileWidth: number;
}) {
  const styles = useStyles();
  const colors = useColors();
  const cardVariant = useCardGlassVariant();

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
      style={[styles.qaTileWrap, { width: tileWidth }, !available && styles.qaTileDisabled]}
      onPress={onPress}
      activeOpacity={available ? 0.72 : 1}
    >
      <GlassSurface variant={cardVariant} borderRadius={14} style={styles.qaTile} contentStyle={styles.qaTileInner}>
        <View style={[styles.qaTileIcon, { backgroundColor: withAlpha(colors.primary, 0.1) }, !available && styles.qaTileIconDisabled]}>
          <Ionicons name={item.icon as any} size={26} color={available ? colors.primary : colors.mutedLight} />
        </View>
        <Text style={[styles.qaTileLabel, !available && styles.qaTileLabelDisabled]}>{item.title}</Text>
        {!available && (
          <View style={styles.qaSoonBadge}>
            <Text style={styles.qaSoonText}>Unavailable</Text>
          </View>
        )}
      </GlassSurface>
    </TouchableOpacity>
  );
}

function BalanceAmount({ kobo, visible }: { kobo: string; visible: boolean }) {
  const styles = useStyles();

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
  const styles = useStyles();
  const gradients = useGradients();
  const colors = useColors();
  const { isDark } = useTheme();
  const cardVariant = useCardGlassVariant();

  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const { balance, homeTransactions, balanceVisible, toggleBalanceVisible, dataHydrated, dashboardVersion } = useWalletStore();
  const [refreshing, setRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [funding, setFunding] = useState<WalletFundingSnapshot | null>(() => peekWalletFundingCache());
  const [kycData, setKycData] = useState<KycStatusData | null>(() => peekKycStatusCache());
  const [fundingLoading, setFundingLoading] = useState(() => {
    if (hasWalletFundingAccountsReady()) return false;
    const cached = peekWalletFundingCache();
    return !(cached && getPermanentVirtualAccounts(cached).length > 0);
  });
  const { setTab } = useTabContext();
  const { isUsable } = useServiceAvailability();
  const transferUsable = isUsable(SERVICE_CODES.localTransfer);
  const fundUsable = isUsable(SERVICE_CODES.walletFund);
  const unreadCount = useNotificationsStore((s) => s.unreadCount);
  const fetchUnreadCount = useNotificationsStore((s) => s.fetchUnreadCount);
  const { pagePadding } = useLayout();
  const qaTileWidth = useGridTileWidth({ columns: QA_COLS, gap: QA_GAP, padding: pagePadding });

  const lastUpdated = useMemo(() => getHomeLastUpdated(), [dashboardVersion]);
  const showKycBanner = useMemo(
    () => user ? shouldShowHomeKycBanner(user.kycStatus, kycData, funding?.kycTier) : false,
    [user, kycData, funding?.kycTier],
  );

  useFocusEffect(
    useCallback(() => {
      void getKycStatusData().then((data) => {
        if (data) setKycData(data);
      });
    }, []),
  );

  const loadFunding = useCallback(async (force = false) => {
    const cached = peekWalletFundingCache();
    const hasCachedAccounts = Boolean(
      cached && getPermanentVirtualAccounts(cached).length > 0,
    );
    if (!hasWalletFundingAccountsReady() && !hasCachedAccounts) {
      setFundingLoading(true);
    }
    try {
      const snapshot = await getWalletFundingDataForHome({ force });
      setFunding(snapshot);
    } finally {
      setFundingLoading(false);
    }
    void getWalletFundingData().then(setFunding);
  }, []);
  const recentTransactions = useMemo(
    () => dedupeTransactionsForDisplay(homeTransactions)
      .map((tx) => enrichTransaction(tx))
      .slice(0, 5),
    [homeTransactions, dashboardVersion],
  );
  const showInitialLoading = !dataHydrated;

  useEffect(() => {
    if (!dataHydrated) return;
    void loadFunding();
    preloadHistoryData();
  }, [dataHydrated, loadFunding]);

  useFocusEffect(
    useCallback(() => {
      void fetchUnreadCount();
      if (hasWalletFundingAccountsReady()) {
        void getWalletFundingDataForHome().then(setFunding);
      }
    }, [fetchUnreadCount]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const [, fundingSnapshot] = await Promise.all([
        pullToRefreshHome(),
        pullToRefreshWalletFunding(),
      ]);
      setFunding(fundingSnapshot);
    } catch {
      const cached = peekWalletFundingCache();
      if (cached) setFunding(cached);
    } finally {
      setRefreshing(false);
      setPullDistance(0);
    }
  }, []);

  const onScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    if (offsetY < 0) {
      setPullDistance(-offsetY);
    } else if (!refreshing) {
      setPullDistance(0);
    }
  }, [refreshing]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const firstName = user?.firstName || 'there';
  const headerInset = insets.top + 10 + HEADER_ROW_H + HEADER_DIVIDER_H;
  const pullProgress = refreshing ? 1 : Math.min(pullDistance / 40, 1);
  const showGapSpinner = pullProgress > 0.08;

  return (
    <ThemedScreen>

      <ScrollView
        style={styles.scrollBody}
        contentContainerStyle={[styles.scrollContent, { paddingTop: headerInset, paddingHorizontal: pagePadding }]}
        showsVerticalScrollIndicator={false}
        alwaysBounceVertical
        scrollEventThrottle={16}
        onScroll={onScroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="transparent"
            colors={['transparent']}
            progressBackgroundColor="transparent"
          />
        }
      >
        <ScreenContent centered style={styles.scrollInner}>
        <BroadcastBanner screen="HOME" />
        <AdBanner screen="HOME" placement="TOP_BANNER" />
        <LinearGradient
          colors={gradientStops(gradients.hero)}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.balanceCard}
        >
          <View style={styles.blob1} />
          <View style={styles.blob2} />
          <View style={styles.blob3} />
          <View style={styles.cardShine} />

          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardBalLabel}>Available Balance</Text>
            <TouchableOpacity activeOpacity={0.75} onPress={toggleBalanceVisible} style={styles.eyeBtn}>
              <Ionicons
                name={balanceVisible ? 'eye-outline' : 'eye-off-outline'}
                size={16}
                color={colors.textOnHero}
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
              <Ionicons name="paper-plane-outline" size={16} color={colors.textOnHero} />
              <Text style={styles.btnSendText}>Send</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>

        <WalletAccountCard
          funding={funding}
          loading={fundingLoading}
          refreshing={refreshing}
          balanceVisible={balanceVisible}
          fundUsable={fundUsable}
          onPressFund={() => {
            if (!fundUsable) {
              showToast({ type: 'info', text1: 'Funding unavailable', text2: 'Wallet funding is currently disabled' });
              return;
            }
            router.push('/wallet/fund' as any);
          }}
        />

        {showKycBanner && (
          <TouchableOpacity activeOpacity={0.85} onPress={() => router.push('/kyc')}>
            <GlassSurface variant="tinted" borderRadius={14} contentStyle={styles.kycBanner}>
              <View style={styles.kycBannerIcon}>
                <Ionicons name="shield-checkmark-outline" size={16} color={Colors.primary} />
              </View>
              <View style={styles.kycBannerText}>
                <Text style={styles.kycBannerTitle}>Verify your identity</Text>
                <Text style={styles.kycBannerSub}>Unlock higher transaction limits</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={Colors.muted} />
            </GlassSurface>
          </TouchableOpacity>
        )}

        <AdBanner screen="HOME" placement="BANNER" />

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
        </View>
        <View style={styles.qaGrid}>
          {HOME_QUICK_ACTIONS.map((item) => (
            <QuickActionTile
              key={item.title}
              item={item}
              tileWidth={qaTileWidth}
              available={!item.serviceCode || isUsable(item.serviceCode)}
            />
          ))}
        </View>

        <View style={[styles.sectionHeader, { marginTop: 24 }]}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <TouchableOpacity style={styles.seeAllBtn} onPress={() => setTab('history')}>
            <Text style={styles.seeAll}>See all</Text>
            <Ionicons name="chevron-forward" size={14} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        <GlassSurface variant={cardVariant} borderRadius={16} style={styles.txCard}>
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
        </GlassSurface>
        </ScreenContent>
      </ScrollView>

      {showGapSpinner ? (
        <View
          style={[
            styles.gapSpinner,
            { top: headerInset + 6, opacity: pullProgress },
          ]}
          pointerEvents="none"
        >
          <ActivityIndicator size="small" color={Colors.primary} />
        </View>
      ) : null}

      <View style={[styles.glassHeader, { height: headerInset }]} pointerEvents="box-none">
        <BlurView
          intensity={isDark ? 0 : 28}
          tint={isDark ? 'dark' : 'light'}
          style={StyleSheet.absoluteFill}
          experimentalBlurMethod={Platform.OS === 'android' ? 'dimezisBlurView' : undefined}
        />
        <View style={[styles.glassHeaderOverlay, { backgroundColor: colors.headerGlass }]} pointerEvents="none" />
        <View style={[styles.headerContent, { paddingTop: insets.top + 10, paddingHorizontal: pagePadding }]}>
          <View style={styles.topBar}>
            <View style={styles.greetRow}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setTab('profile')}
                accessibilityRole="button"
                accessibilityLabel="Open profile"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <UserAvatar
                  uri={user?.avatar}
                  firstName={user?.firstName}
                  lastName={user?.lastName}
                  size="sm"
                  variant={isDark ? 'brand' : 'light'}
                />
              </TouchableOpacity>
              <View>
                <Text style={styles.greetSmall}>{greeting}</Text>
                <Text style={styles.greetName}>{firstName}</Text>
              </View>
            </View>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={openNotifications}
              accessibilityRole="button"
              accessibilityLabel="Open notifications"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <View style={styles.notifBtnOuter}>
                <GlassSurface variant="tinted" borderRadius={16} style={styles.notifBtnGlass} contentStyle={styles.notifBtn}>
                  <Ionicons name="notifications-outline" size={22} color={Colors.primary} />
                </GlassSurface>
                {unreadCount > 0 ? (
                  <View style={styles.notifBadge}>
                    <Text style={styles.notifBadgeText}>
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </Text>
                  </View>
                ) : null}
              </View>
            </TouchableOpacity>
          </View>
          <View style={styles.fixedDivider} />
        </View>
      </View>
    </ThemedScreen>
  );
}

const createStyles = (colors: import('../theme/types').ThemeColors, gradients: import('../theme/types').ThemeGradients) => StyleSheet.create({
  root: { flex: 1 },

  gapSpinner: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 15,
    alignItems: 'center',
    height: 28,
    justifyContent: 'center',
  },
  glassHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    overflow: 'hidden',
  },
  glassHeaderOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.glassBorder,
  },
  headerContent: {
    flex: 1,
    justifyContent: 'flex-start',
    zIndex: 2,
  },
  fixedDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.borderSubtle,
    marginTop: 12,
  },
  scrollBody: { flex: 1 },
  scrollContent: {
    paddingBottom: 32,
    flexGrow: 1,
  },
  scrollInner: {
    gap: 12,
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
    backgroundColor: Overlays.darkAmbientPrimary,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { fontSize: 16, color: colors.white, fontWeight: '700' },
  greetSmall: { fontSize: 13, color: colors.muted, marginBottom: 1 },
  greetName: { fontSize: 18, fontWeight: '700', color: colors.dark, letterSpacing: -0.3 },
  notifBtnOuter: {
    position: 'relative',
  },
  notifBtnGlass: {
    width: 46,
    height: 46,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  notifBtn: {
    width: 46,
    height: 46,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notifBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: colors.error,
    borderWidth: 2,
    borderColor: colors.pageBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifBadgeText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: '800',
    lineHeight: 12,
  },

  // Hero balance card
  balanceCard: {
    borderRadius: 22,
    padding: 16,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Overlays.white08,
    shadowColor: colors.heroDark,
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
    backgroundColor: Overlays.white12,
  },
  blob1: {
    position: 'absolute',
    top: -50,
    right: -40,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: withAlpha(gradients.hero[2], 0.38),
  },
  blob2: {
    position: 'absolute',
    bottom: -30,
    left: -20,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: withAlpha(gradients.hero[1], 0.28),
  },
  blob3: {
    position: 'absolute',
    top: 60,
    right: 40,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: withAlpha(gradients.hero[0], 0.16),
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardBalLabel: {
    fontSize: 13,
    color: colors.textOnHeroMuted,
    fontWeight: '500',
  },
  eyeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: withAlpha(colors.white, 0.14),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: withAlpha(colors.white, 0.2),
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 4,
  },
  balanceSymbol: {
    fontSize: 20,
    fontWeight: '600',
    color: Overlays.rgba255_255_255_07,
    marginRight: 2,
    marginBottom: 5,
  },
  balanceWhole: {
    fontSize: 40,
    fontWeight: '800',
    color: colors.white,
    letterSpacing: -1.5,
    lineHeight: 46,
  },
  balanceDecimal: {
    fontSize: 18,
    fontWeight: '600',
    color: Overlays.white55,
    marginBottom: 5,
  },
  balanceHidden: {
    fontSize: 34,
    fontWeight: '700',
    color: Overlays.white85,
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
    backgroundColor: colors.primaryLight,
  },
  liveDotIdle: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: withAlpha(gradients.hero[2], 0.55),
  },
  lastUpdated: {
    fontSize: 11,
    color: colors.textOnHeroSubtle,
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
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 13,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  btnFundText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.white,
  },
  btnSend: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: withAlpha(colors.primaryDeep, 0.82),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: withAlpha(colors.white, 0.16),
  },
  btnSendText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textOnHero,
  },
  btnActionDisabled: {
    opacity: 0.45,
  },

  // KYC banner
  kycBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  kycBannerIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.primaryMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  kycBannerText: { flex: 1 },
  kycBannerTitle: { fontSize: 13, fontWeight: '600', color: colors.dark, marginBottom: 1 },
  kycBannerSub: { fontSize: 11, color: colors.muted },

  // Sections
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: -2,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.dark,
    letterSpacing: -0.2,
  },
  seeAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  seeAll: { fontSize: 13, color: colors.primary, fontWeight: '600' },

  // Quick actions — square tiles
  qaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: QA_GAP,
  },
  qaTileWrap: {
  },
  qaTile: {
    width: '100%',
  },
  qaTileInner: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 8,
  },
  qaTileIcon: {
    width: 48,
    height: 48,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qaTileLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.darkAlt,
    textAlign: 'center',
  },
  qaTileDisabled: { opacity: 0.65 },
  qaTileIconDisabled: { opacity: 0.7 },
  qaTileLabelDisabled: { color: colors.muted },
  qaSoonBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: colors.borderSubtle,
    borderRadius: 999,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  qaSoonText: {
    fontSize: 7,
    fontWeight: '700',
    color: colors.muted,
  },

  // Transactions
  txCard: {
    overflow: 'hidden',
  },
  txItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 12,
  },
  txBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderSubtle },
  txIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  txMeta: { flex: 1 },
  txTitle: { fontSize: 14, fontWeight: '600', color: colors.dark, marginBottom: 2 },
  txSub: { fontSize: 11, color: colors.muted },
  txAmt: { fontSize: 14, fontWeight: '700' },
  emptyWrap: { alignItems: 'center', paddingVertical: 32, gap: 6 },
  emptyTitle: { fontSize: 14, fontWeight: '600', color: colors.muted },
  emptySub: { fontSize: 12, color: colors.mutedLight },
});

function useStyles() {
  return useThemedStyles(createStyles);
}
