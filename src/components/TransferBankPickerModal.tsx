import { useEffect, useMemo, useState, useCallback } from 'react';
import {
  Modal, View, Text, TouchableOpacity, StyleSheet, Pressable,
  ActivityIndicator, TextInput, FlatList, Platform, Dimensions, useWindowDimensions,
} from 'react-native';
import { BlurView } from 'expo-blur';
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

const SHEET_HEIGHT = Math.round(Dimensions.get('window').height * 0.88);
const POP_COLS = 4;
const SHEET_H_PAD = 20;
const POP_GAP = 10;

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
  const { width: screenWidth } = useWindowDimensions();
  const [search, setSearch] = useState('');

  const popularChipWidth = (
    screenWidth - SHEET_H_PAD * 2 - POP_GAP * (POP_COLS - 1)
  ) / POP_COLS;

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
      <Pressable
        style={({ pressed }) => [
          styles.bankRow,
          active && styles.bankRowActive,
          pressed && styles.bankRowPressed,
        ]}
        onPress={() => handleSelect(item.bank)}
      >
        <BankLogo bank={item.enriched} size={44} />
        <View style={styles.bankText}>
          <Text style={styles.bankName}>{item.displayName}</Text>
        </View>
        {active ? (
          <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
        ) : (
          <Ionicons name="chevron-forward" size={18} color={Colors.mutedLight} />
        )}
      </Pressable>
    );
  }, [handleSelect, selectedCode]);

  const scrollListHeader = useMemo(() => (
    <View>
      {!search && popularRows.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Popular</Text>
          <View style={styles.popularRow}>
            {popularRows.map((row) => {
              const active = selectedCode === row.bank.code;
              return (
                <TouchableOpacity
                  key={`pop-${row.bank.code}`}
                  style={[
                    styles.popularChip,
                    { width: popularChipWidth },
                    active && styles.popularChipActive,
                  ]}
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
    </View>
  ), [filtered.length, handleSelect, popularChipWidth, popularRows, search, selectedCode]);

  const fixedHeader = (
    <View style={styles.fixedHeader}>
      <View style={styles.handle} />
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>Select bank</Text>
          <Text style={styles.subtitle}>Choose the recipient&apos;s bank</Text>
        </View>
        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
          <Ionicons name="close" size={20} color={Colors.mid} />
        </TouchableOpacity>
      </View>

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
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
          <BlurView
            intensity={18}
            tint="dark"
            style={StyleSheet.absoluteFill}
            experimentalBlurMethod={Platform.OS === 'android' ? 'dimezisBlurView' : undefined}
          />
          <View style={styles.overlayTint} pointerEvents="none" />
        </Pressable>

        <View
          style={[styles.sheetWrap, { height: SHEET_HEIGHT, paddingBottom: insets.bottom }]}
        >
          <View style={styles.sheet}>
            {fixedHeader}
            {loading ? (
              <View style={styles.loadingWrap}>
                <ActivityIndicator color={Colors.primary} size="large" />
                <Text style={styles.loadingText}>Loading banks…</Text>
              </View>
            ) : (
              <FlatList
                style={styles.bankListFlex}
                data={filtered}
                keyExtractor={(item) => `${item.bank.code}-${item.bank.name}`}
                renderItem={renderBankRow}
                ListHeaderComponent={scrollListHeader}
                ItemSeparatorComponent={() => <View style={styles.bankRowSeparator} />}
                ListEmptyComponent={(
                  <View style={styles.empty}>
                    <Ionicons name="business-outline" size={28} color={Colors.mutedLight} />
                    <Text style={styles.emptyText}>No banks match your search</Text>
                  </View>
                )}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                nestedScrollEnabled
                initialNumToRender={18}
                maxToRenderPerBatch={24}
                windowSize={8}
                contentContainerStyle={styles.listContent}
              />
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  overlayTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.42)',
  },
  sheetWrap: {
    width: '100%',
  },
  sheet: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: SHEET_H_PAD,
    paddingBottom: 8,
    ...Shadow.lg,
  },
  fixedHeader: {
    paddingTop: 10,
    backgroundColor: '#FFFFFF',
    zIndex: 1,
  },
  bankListFlex: {
    flex: 1,
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
  headerText: {
    flex: 1,
    paddingRight: 12,
  },
  title: { fontSize: 20, fontWeight: '700', color: Colors.dark, letterSpacing: -0.3 },
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.mid,
    marginTop: 4,
    lineHeight: 20,
  },
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
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  loadingText: { fontSize: 13, color: Colors.muted },
  section: { marginBottom: 18 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.mid,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  popularRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: POP_GAP,
    justifyContent: 'center',
    marginBottom: 18,
  },
  popularChip: {
    paddingVertical: 12,
    paddingHorizontal: 6,
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
  popularTextActive: { color: Colors.primary },
  listContent: { paddingBottom: 12, flexGrow: 1 },
  bankRowSeparator: { height: 8 },
  bankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: Radius.lg,
    backgroundColor: '#FAFBFC',
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.05)',
  },
  bankRowActive: {
    backgroundColor: '#FAF5FF',
    borderColor: 'rgba(124, 58, 237, 0.25)',
  },
  bankRowPressed: {
    opacity: 0.88,
  },
  bankText: { flex: 1 },
  bankName: { fontSize: 15, fontWeight: '600', color: Colors.dark },
  empty: { alignItems: 'center', paddingVertical: 32, gap: 8 },
  emptyText: { fontSize: 13, color: Colors.muted },
});
