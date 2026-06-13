import {
  View, Text, TouchableOpacity, StyleSheet, FlatList,
  TextInput, RefreshControl,
} from 'react-native';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { dedupeTransactionsForDisplay, enrichTransaction, matchesHistoryTab } from '../lib/transaction-display';
import { getHomeDashboardStats, hasHistoryStatsReady, refreshHistoryData, refreshHomeDashboardStats } from '../lib/dashboard-data';
import { useWalletStore } from '../stores';
import { Colors, Spacing, Typography, Radius, Shadow } from '../theme';
import { Skeleton, SkeletonCard } from '../components/ui/Skeleton';
import { TransactionListItem } from '../components/TransactionListItem';
import { MonthActivityPanel } from '../components/MonthActivityPanel';
import { ThemedScreen } from '../components/ui/ThemedScreen';
import { GlassCard } from '../components/ui/GlassCard';
import { GlassSurface } from '../components/ui/GlassSurface';
import { useLayout, mergeInputStyle } from '../lib/platform-ui';

type HistoryTab = 'all' | 'services' | 'wallet';


const FILTER_TABS: Array<{ key: HistoryTab; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { key: 'all', label: 'All', icon: 'layers-outline' },
  { key: 'services', label: 'Services', icon: 'flash-outline' },
  { key: 'wallet', label: 'Wallet', icon: 'wallet-outline' },
];

function groupByDate(entries: Array<{ createdAt: string }>) {
  const groups: Record<string, typeof entries> = {};
  for (const entry of entries) {
    const d = new Date(entry.createdAt);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    let key: string;
    if (d.toDateString() === today.toDateString()) key = 'Today';
    else if (d.toDateString() === yesterday.toDateString()) key = 'Yesterday';
    else key = d.toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' });
    if (!groups[key]) groups[key] = [];
    groups[key].push(entry);
  }
  return Object.entries(groups);
}

type DayGroup = {
  type: 'group';
  key: string;
  date: string;
  items: ReturnType<typeof enrichTransaction>[];
};

function OverviewSkeleton() {
  return (
    <GlassCard borderRadius={20} contentStyle={styles.overviewSkeleton}>
      <Skeleton width="45%" height={14} borderRadius={6} style={{ marginBottom: 18 }} />
      <View style={styles.overviewSkeletonRow}>
        <Skeleton width="28%" height={22} borderRadius={6} />
        <Skeleton width="28%" height={22} borderRadius={6} />
        <Skeleton width="28%" height={22} borderRadius={6} />
      </View>
      <Skeleton width="100%" height={5} borderRadius={3} style={{ marginTop: 16, marginBottom: 10 }} />
      <Skeleton width="70%" height={11} borderRadius={4} />
    </GlassCard>
  );
}

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const { pagePadding } = useLayout();
  const {
    transactions,
    balanceVisible,
    historyHydrated,
    dashboardVersion,
  } = useWalletStore();
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<HistoryTab>('all');
  const [loading, setLoading] = useState(false);
  const showInitialLoading = !historyHydrated && transactions.length === 0;

  const loadHistory = useCallback(async () => {
    const { historyHydrated: hydrated } = useWalletStore.getState();
    if (!hydrated) setLoading(true);
    try {
      await Promise.all([
        refreshHistoryData({ priority: !hydrated }),
        refreshHomeDashboardStats({ force: !hydrated }),
      ]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      refreshHistoryData({ force: true }),
      refreshHomeDashboardStats({ force: true }),
    ]);
    setRefreshing(false);
  }, []);

  const monthLabel = new Date().toLocaleDateString('en-NG', { month: 'long' });
  const dashboardStats = useMemo(() => getHomeDashboardStats(), [dashboardVersion]);

  const enriched = useMemo(
    () => dedupeTransactionsForDisplay(transactions).map((tx) => enrichTransaction(tx)),
    [transactions],
  );

  const filtered = useMemo(() => {
    let rows = enriched.filter((tx) => matchesHistoryTab(tx, activeTab));

    if (search.trim()) {
      const query = search.trim().toLowerCase();
      rows = rows.filter((tx) => {
        const haystack = [
          tx.displayTitle,
          tx.subtitle,
          tx.reference,
          tx.phone,
          tx.provider,
          tx.type,
        ].filter(Boolean).join(' ').toLowerCase();
        return haystack.includes(query);
      });
    }

    return rows.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [activeTab, enriched, search]);

  const dayGroups = useMemo<DayGroup[]>(() => {
    return groupByDate(filtered).map(([date, items]) => ({
      type: 'group' as const,
      key: date,
      date,
      items,
    }));
  }, [filtered]);

  const listHeader = !hasHistoryStatsReady() ? (
    <OverviewSkeleton />
  ) : (
    <MonthActivityPanel
      monthLabel={monthLabel}
      stats={dashboardStats}
      loading={false}
      balanceVisible={balanceVisible}
      embedded
    />
  );

  return (
    <ThemedScreen>
      <GlassSurface
        variant="light"
        borderRadius={24}
        style={styles.headerShell}
        contentStyle={{ ...styles.header, paddingTop: insets.top + 12, paddingHorizontal: pagePadding }}
      >
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>Transactions</Text>
          <TouchableOpacity
            style={styles.refreshBtn}
            onPress={onRefresh}
            activeOpacity={0.75}
            disabled={refreshing}
          >
            <Ionicons
              name="refresh-outline"
              size={18}
              color={refreshing ? Colors.mutedLight : Colors.primary}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.searchRow}>
          <View style={styles.searchIconWrap}>
            <Ionicons name="search-outline" size={17} color={Colors.primary} />
          </View>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, reference, provider..."
            placeholderTextColor={Colors.mutedLight}
            value={search}
            onChangeText={setSearch}
          />
          {search ? (
            <TouchableOpacity style={styles.searchClear} onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color={Colors.muted} />
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.segmented}>
          {FILTER_TABS.map(({ key, label, icon }) => {
            const active = activeTab === key;
            return (
              <TouchableOpacity
                key={key}
                style={styles.segment}
                onPress={() => setActiveTab(key)}
                activeOpacity={0.82}
              >
                {active ? (
                  <GlassSurface variant="light" borderRadius={11} style={styles.segmentActiveGlass} contentStyle={styles.segmentActiveInner}>
                    <Ionicons
                      name={icon}
                      size={14}
                      color={Colors.primary}
                    />
                    <Text style={[styles.segmentText, styles.segmentTextActive]}>
                      {label}
                    </Text>
                  </GlassSurface>
                ) : (
                  <>
                    <Ionicons
                      name={icon}
                      size={14}
                      color={Colors.muted}
                    />
                    <Text style={styles.segmentText}>
                      {label}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </GlassSurface>

      {showInitialLoading ? (
        <View style={styles.loadingWrap}>
          {hasHistoryStatsReady() ? (
            <MonthActivityPanel
              monthLabel={monthLabel}
              stats={dashboardStats}
              loading={false}
              balanceVisible={balanceVisible}
              embedded
            />
          ) : (
            <OverviewSkeleton />
          )}
          {[1, 2, 3].map((i) => (
            <View key={i} style={styles.dayGroup}>
              <Skeleton width={72} height={10} borderRadius={4} style={{ marginBottom: 10, marginLeft: 2 }} />
              <SkeletonCard />
            </View>
          ))}
        </View>
      ) : (
        <FlatList
          data={dayGroups}
          keyExtractor={(item) => item.key}
          contentContainerStyle={[
            styles.listContent,
            { paddingHorizontal: pagePadding },
            dayGroups.length === 0 && styles.listContentEmpty,
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing || (loading && !historyHydrated)}
              onRefresh={onRefresh}
              tintColor={Colors.primary}
            />
          }
          ListHeaderComponent={listHeader}
          ListEmptyComponent={
            loading || !historyHydrated ? null : (
              <View style={styles.empty}>
                <View style={styles.emptyIconRing}>
                  <GlassSurface variant="light" borderRadius={20} style={styles.emptyIcon} contentStyle={styles.emptyIconInner}>
                    <Ionicons name="receipt-outline" size={30} color={Colors.primary} />
                  </GlassSurface>
                </View>
                <Text style={styles.emptyTitle}>No transactions found</Text>
                <Text style={styles.emptySub}>
                  {search
                    ? 'Try a different search term or clear filters'
                    : activeTab === 'all'
                      ? 'Your purchases and wallet activity will show up here'
                      : `No ${activeTab} transactions yet`}
                </Text>
                {search || activeTab !== 'all' ? (
                  <TouchableOpacity
                    onPress={() => {
                      setSearch('');
                      setActiveTab('all');
                    }}
                    activeOpacity={0.8}
                  >
                    <GlassCard borderRadius={Radius.full} padding={0} contentStyle={styles.emptyAction}>
                      <Text style={styles.emptyActionText}>Clear filters</Text>
                    </GlassCard>
                  </TouchableOpacity>
                ) : null}
              </View>
            )
          }
          renderItem={({ item }) => (
            <View style={styles.dayGroup}>
              <View style={styles.dateRow}>
                <Text style={styles.dateHeader}>{item.date}</Text>
                <View style={styles.dateLine} />
                <GlassSurface variant="light" borderRadius={11} style={styles.dateCount} contentStyle={styles.dateCountInner}>
                  <Text style={styles.dateCountText}>{item.items.length}</Text>
                </GlassSurface>
              </View>
              <GlassCard borderRadius={18} padding={0}>
                {item.items.map((tx, idx) => (
                  <TransactionListItem
                    key={tx.id}
                    transaction={tx}
                    balanceVisible={balanceVisible}
                    variant="embedded"
                    isLast={idx === item.items.length - 1}
                    onPress={() => router.push(`/transactions/${tx.id}`)}
                  />
                ))}
              </GlassCard>
            </View>
          )}
        />
      )}
    </ThemedScreen>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  headerShell: {
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    ...Shadow.sm,
  },
  header: {
    paddingHorizontal: Spacing.page,
    paddingBottom: 16,
    gap: 14,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: Colors.dark,
    letterSpacing: -0.3,
  },
  refreshBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: Colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.pageBg,
    borderRadius: 16,
    paddingHorizontal: 4,
    height: 48,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.borderSubtle,
  },
  searchIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchInput: mergeInputStyle({
    flex: 1,
    fontSize: 14,
    color: Colors.dark,
    fontWeight: '500',
  }),
  searchClear: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmented: {
    flexDirection: 'row',
    backgroundColor: Colors.pageBg,
    borderRadius: 14,
    padding: 4,
    gap: 4,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentActiveGlass: {
    alignSelf: 'stretch',
  },
  segmentActiveInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 10,
  },
  segmentText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.muted,
  },
  segmentTextActive: {
    color: Colors.dark,
  },
  loadingWrap: {
    padding: Spacing.page,
    gap: 18,
  },
  listContent: {
    paddingTop: 18,
    paddingBottom: 40,
  },
  listContentEmpty: {
    flexGrow: 1,
  },
  overviewSkeleton: {},
  overviewSkeletonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayGroup: {
    gap: 10,
    marginBottom: 18,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 2,
  },
  dateHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.muted,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  dateLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.borderSubtle,
  },
  dateCount: {
    minWidth: 22,
  },
  dateCountInner: {
    minWidth: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  dateCountText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.muted,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
    gap: 10,
  },
  emptyIconRing: {
    width: 88,
    height: 88,
    borderRadius: 28,
    backgroundColor: Colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  emptyIcon: {
    width: 64,
    height: 64,
  },
  emptyIconInner: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.dark,
    letterSpacing: -0.2,
  },
  emptySub: {
    ...Typography.small,
    color: Colors.muted,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 260,
  },
  emptyAction: {
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  emptyActionText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
  },
});
