import { useEffect, useMemo, useState, useCallback } from 'react';
import {
  Modal, View, Text, TouchableOpacity, StyleSheet, Pressable,
  ActivityIndicator, TextInput, FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Bank } from '../lib/api';
import {
  enrichTransferBank,
  sortBanksPopularFirst,
  selectPopularBankRows,
  type TransferBankDisplay,
} from '../lib/transfer-banks';
import { getBankDisplayName } from '../lib/funding-banks';
import { BankLogo } from './BankLogo';
import { Colors, Radius, Shadow } from '../theme';

const BRAND = '#7C3AED';

type EnrichedBankRow = {
  bank: Bank;
  enriched: TransferBankDisplay;
  displayName: string;
};

type Props = {
  visible: boolean;
  banks: Bank[];
  loading?: boolean;
  selectedCode?: string | null;
  onClose: () => void;
  onSelect: (bank: Bank) => void;
};

export function TransferBankPickerModal({
  visible,
  banks,
  loading = false,
  selectedCode,
  onClose,
  onSelect,
}: Props) {
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!visible) setSearch('');
  }, [visible]);

  const enrichedRows = useMemo<EnrichedBankRow[]>(() => (
    sortBanksPopularFirst(banks).map((bank) => {
      const enriched = enrichTransferBank(bank);
      return {
        bank,
        enriched,
        displayName: getBankDisplayName(enriched),
      };
    })
  ), [banks]);

  const popularRows = useMemo(
    () => selectPopularBankRows(enrichedRows),
    [enrichedRows],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return enrichedRows;
    return enrichedRows.filter((row) => (
      row.displayName.toLowerCase().includes(q)
      || row.bank.name.toLowerCase().includes(q)
      || row.bank.code.includes(q)
    ));
  }, [enrichedRows, search]);

  const handleSelect = useCallback((bank: Bank) => {
    onSelect(bank);
    setSearch('');
  }, [onSelect]);

  const renderBankRow = useCallback(({ item }: { item: EnrichedBankRow }) => {
    const active = selectedCode === item.bank.code || selectedCode === item.enriched.code;
    return (
      <TouchableOpacity
        style={[styles.bankRow, active && styles.bankRowActive]}
        onPress={() => handleSelect(item.bank)}
        activeOpacity={0.82}
      >
        <BankLogo bank={item.enriched} size={44} />
        <View style={styles.bankText}>
          <Text style={styles.bankName}>{item.displayName}</Text>
        </View>
        {active ? (
          <Ionicons name="checkmark-circle" size={20} color={BRAND} />
        ) : (
          <Ionicons name="chevron-forward" size={18} color={Colors.mutedLight} />
        )}
      </TouchableOpacity>
    );
  }, [handleSelect, selectedCode]);

  const listHeader = useMemo(() => (
    <>
      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={18} color={Colors.muted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search bank name"
          placeholderTextColor={Colors.mutedLight}
          value={search}
          onChangeText={setSearch}
          autoCorrect={false}
          autoCapitalize="none"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color={Colors.mutedLight} />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={BRAND} size="large" />
          <Text style={styles.loadingText}>Loading banks…</Text>
        </View>
      ) : (
        <>
          {!search && popularRows.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Popular</Text>
              <View style={styles.popularRow}>
                {popularRows.map((row) => {
                  const active = selectedCode === row.bank.code;
                  return (
                    <TouchableOpacity
                      key={`pop-${row.bank.code}`}
                      style={[styles.popularChip, active && styles.popularChipActive]}
                      onPress={() => handleSelect(row.bank)}
                    >
                      <BankLogo bank={row.enriched} size={32} />
                      <Text style={[styles.popularText, active && styles.popularTextActive]} numberOfLines={2}>
                        {row.displayName}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          <Text style={styles.sectionLabel}>
            {search ? `Results (${filtered.length})` : 'All banks'}
          </Text>
        </>
      )}
    </>
  ), [filtered.length, handleSelect, loading, popularRows, search, selectedCode]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.handle} />
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Select bank</Text>
              <Text style={styles.subtitle}>Choose the recipient&apos;s bank</Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={20} color={Colors.mid} />
            </TouchableOpacity>
          </View>

          {!loading && (
            <FlatList
              data={filtered}
              keyExtractor={(item) => `${item.bank.code}-${item.bank.name}`}
              renderItem={renderBankRow}
              ListHeaderComponent={listHeader}
              ListEmptyComponent={(
                <View style={styles.empty}>
                  <Ionicons name="business-outline" size={28} color={Colors.mutedLight} />
                  <Text style={styles.emptyText}>No banks match your search</Text>
                </View>
              )}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              initialNumToRender={18}
              maxToRenderPerBatch={24}
              windowSize={8}
              contentContainerStyle={styles.listContent}
            />
          )}

          {loading && listHeader}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 10,
    maxHeight: '88%',
    ...Shadow.lg,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E2E8F0',
    alignSelf: 'center',
    marginBottom: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  title: { fontSize: 20, fontWeight: '700', color: Colors.dark, letterSpacing: -0.3 },
  subtitle: { fontSize: 13, color: Colors.muted, marginTop: 3 },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F8FAFC',
    borderRadius: Radius.lg,
    paddingHorizontal: 14,
    height: 48,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.06)',
    marginBottom: 16,
  },
  searchInput: { flex: 1, fontSize: 15, color: Colors.dark, paddingVertical: 0 },
  loadingWrap: { paddingVertical: 48, alignItems: 'center', gap: 10 },
  loadingText: { fontSize: 13, color: Colors.muted },
  section: { marginBottom: 18 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.muted,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  popularRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 18 },
  popularChip: {
    width: 88,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: Radius.lg,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.06)',
    alignItems: 'center',
    gap: 8,
  },
  popularChipActive: {
    backgroundColor: '#FAF5FF',
    borderColor: 'rgba(124, 58, 237, 0.35)',
  },
  popularText: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.mid,
    textAlign: 'center',
    lineHeight: 13,
  },
  popularTextActive: { color: BRAND },
  listContent: { paddingBottom: 12, gap: 8 },
  bankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: Radius.lg,
    backgroundColor: '#FAFBFC',
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.05)',
    marginBottom: 8,
  },
  bankRowActive: {
    backgroundColor: '#FAF5FF',
    borderColor: 'rgba(124, 58, 237, 0.25)',
  },
  bankText: { flex: 1 },
  bankName: { fontSize: 15, fontWeight: '600', color: Colors.dark },
  empty: { alignItems: 'center', paddingVertical: 32, gap: 8 },
  emptyText: { fontSize: 13, color: Colors.muted },
});
