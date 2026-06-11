import {
  View, Text, TouchableOpacity, StyleSheet, FlatList,
  TextInput, RefreshControl,
} from 'react-native';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api, isResponseSuccess } from '../lib/api';
import { dedupeTransactionsForDisplay, enrichTransaction, matchesHistoryTab } from '../lib/transaction-display';
import { useWalletStore } from '../stores';
import { Colors, Spacing, Typography, Radius } from '../theme';
import { SkeletonCard } from '../components/ui/Skeleton';
import { TransactionListItem } from '../components/TransactionListItem';

type HistoryTab = 'all' | 'services' | 'wallet';

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

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const { transactions, balanceVisible, historyHydrated, setTransactions, setHistoryHydrated, bumpDashboardVersion } = useWalletStore();
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<HistoryTab>('all');
  const [loading, setLoading] = useState(false);
  const showInitialLoading = !historyHydrated;

  const loadHistory = useCallback(async () => {
    const alreadyHydrated = useWalletStore.getState().historyHydrated;
    if (!alreadyHydrated) setLoading(true);
    try {
      const res = await api.getTransactions(1, 100);
      if (isResponseSuccess(res)) {
        setTransactions(res.data?.transactions ?? []);
        setHistoryHydrated(true);
        bumpDashboardVersion();
      }
    } finally {
      setLoading(false);
    }
  }, [bumpDashboardVersion, setHistoryHydrated, setTransactions]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadHistory();
    setRefreshing(false);
  }, [loadHistory]);

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

  const grouped = groupByDate(filtered);
  const flatData: Array<{ type: 'header' | 'item'; id?: string; date?: string; tx?: typeof filtered[number] }> = [];
  for (const [date, items] of grouped) {
    flatData.push({ type: 'header', date });
    items.forEach((tx) => flatData.push({ type: 'item', id: tx.id, tx }));
  }

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.headerTitle}>Transactions</Text>

        <View style={styles.searchRow}>
          <Ionicons name="search-outline" size={16} color={Colors.muted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search transactions..."
            placeholderTextColor={Colors.mutedLight}
            value={search}
            onChangeText={setSearch}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color={Colors.muted} />
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.filterRow}>
          {([
            ['all', 'All'],
            ['services', 'Services'],
            ['wallet', 'Wallet'],
          ] as const).map(([tab, label]) => (
            <TouchableOpacity
              key={tab}
              style={[styles.filterChip, activeTab === tab && styles.filterChipActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.filterText, activeTab === tab && styles.filterTextActive]}>
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {showInitialLoading ? (
        <View style={{ padding: Spacing.page, gap: 10 }}>
          {[1, 2, 3, 4, 5].map((i) => <SkeletonCard key={i} />)}
        </View>
      ) : (
        <FlatList
          data={flatData}
          keyExtractor={(item, index) => item.id || `header-${item.date}-${index}`}
          contentContainerStyle={{ padding: Spacing.page, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primaryLight} />
          }
          ListEmptyComponent={
            loading || !historyHydrated ? null : (
              <View style={styles.empty}>
                <View style={styles.emptyIcon}>
                  <Ionicons name="receipt-outline" size={32} color={Colors.muted} />
                </View>
                <Text style={styles.emptyTitle}>No transactions found</Text>
                <Text style={styles.emptySub}>
                  {search ? 'Try a different search term' : 'Your transactions will appear here'}
                </Text>
              </View>
            )
          }
          renderItem={({ item }) => {
            if (item.type === 'header') {
              return <Text style={styles.dateHeader}>{item.date}</Text>;
            }
            if (!item.tx) return null;
            return (
              <TransactionListItem
                transaction={item.tx}
                balanceVisible={balanceVisible}
                onPress={() => router.push(`/transactions/${item.tx!.id}`)}
              />
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.surface },
  header: {
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.page,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 12,
  },
  headerTitle: { ...Typography.h2, color: Colors.dark },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    paddingHorizontal: 12,
    height: 42,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchInput: { flex: 1, fontSize: 14, color: Colors.dark },
  filterRow: { flexDirection: 'row', gap: 8 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterText: { ...Typography.captionMed, color: Colors.muted },
  filterTextActive: { color: Colors.white },
  dateHeader: {
    ...Typography.label,
    color: Colors.muted,
    marginTop: 16,
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: { ...Typography.bodyMed, color: Colors.muted },
  emptySub: { ...Typography.small, color: Colors.borderMid, textAlign: 'center' },
});
