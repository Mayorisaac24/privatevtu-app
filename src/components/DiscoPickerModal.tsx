import { useEffect, useMemo, useState, useCallback } from 'react';
import {
  Modal, View, Text, TouchableOpacity, StyleSheet, Pressable,
  ActivityIndicator, TextInput, FlatList, Platform, Dimensions, useWindowDimensions,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ElectricityProvider } from '../lib/api';
import {
  getDiscoCode,
  getDiscoDisplayName,
  selectPopularDiscoRows,
  sortDiscosAlphabetically,
} from '../lib/disco-providers';
import { DiscoLogo } from './DiscoLogo';
import { Colors, Radius, Shadow } from '../theme';

const SHEET_HEIGHT = Math.round(Dimensions.get('window').height * 0.88);
const POP_COLS = 4;
const SHEET_H_PAD = 20;
const POP_GAP = 10;

type DiscoRow = {
  provider: ElectricityProvider;
  displayName: string;
};

type Props = {
  visible: boolean;
  providers: ElectricityProvider[];
  loading?: boolean;
  selectedCode?: string | null;
  onClose: () => void;
  onSelect: (provider: ElectricityProvider) => void;
};

export function DiscoPickerModal({
  visible,
  providers,
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

  const enrichedRows = useMemo<DiscoRow[]>(() => (
    sortDiscosAlphabetically(providers).map((provider) => ({
      provider,
      displayName: getDiscoDisplayName(provider),
    }))
  ), [providers]);

  const popularRows = useMemo(
    () => selectPopularDiscoRows(enrichedRows),
    [enrichedRows],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return enrichedRows;
    return enrichedRows.filter((row) => (
      row.displayName.toLowerCase().includes(q)
      || row.provider.name.toLowerCase().includes(q)
      || row.provider.code.toLowerCase().includes(q)
    ));
  }, [enrichedRows, search]);

  const handleSelect = useCallback((provider: ElectricityProvider) => {
    onSelect(provider);
    setSearch('');
  }, [onSelect]);

  const renderDiscoRow = useCallback(({ item }: { item: DiscoRow }) => {
    const code = getDiscoCode(item.provider);
    const active = selectedCode === code;
    return (
      <Pressable
        style={({ pressed }) => [
          styles.discoRow,
          active && styles.discoRowActive,
          pressed && styles.discoRowPressed,
        ]}
        onPress={() => handleSelect(item.provider)}
      >
        <DiscoLogo provider={item.provider} size={44} />
        <View style={styles.discoText}>
          <Text style={styles.discoName}>{item.displayName}</Text>
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
              const active = selectedCode === getDiscoCode(row.provider);
              return (
                <TouchableOpacity
                  key={`pop-${row.provider.code}`}
                  style={[
                    styles.popularChip,
                    { width: popularChipWidth },
                    active && styles.popularChipActive,
                  ]}
                  onPress={() => handleSelect(row.provider)}
                >
                  <DiscoLogo provider={row.provider} size={32} />
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
        {search ? `Results (${filtered.length})` : 'All DISCOs'}
      </Text>
    </View>
  ), [filtered.length, handleSelect, popularChipWidth, popularRows, search, selectedCode]);

  const fixedHeader = (
    <View style={styles.fixedHeader}>
      <View style={styles.handle} />
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>Select DISCO</Text>
          <Text style={styles.subtitle}>Choose your electricity distribution company</Text>
        </View>
        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
          <Ionicons name="close" size={20} color={Colors.mid} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={18} color={Colors.muted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search DISCO name"
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

        <View style={[styles.sheetWrap, { height: SHEET_HEIGHT, paddingBottom: insets.bottom }]}>
          <View style={styles.sheet}>
            {fixedHeader}
            {loading ? (
              <View style={styles.loadingWrap}>
                <ActivityIndicator color={Colors.primary} size="large" />
                <Text style={styles.loadingText}>Loading DISCOs…</Text>
              </View>
            ) : (
              <FlatList
                style={styles.discoListFlex}
                data={filtered}
                keyExtractor={(item) => `${item.provider.code}-${item.provider.id}`}
                renderItem={renderDiscoRow}
                ListHeaderComponent={scrollListHeader}
                ItemSeparatorComponent={() => <View style={styles.discoRowSeparator} />}
                ListEmptyComponent={(
                  <View style={styles.empty}>
                    <Ionicons name="flash-outline" size={28} color={Colors.mutedLight} />
                    <Text style={styles.emptyText}>No DISCOs match your search</Text>
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
  discoListFlex: {
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
    backgroundColor: Colors.primaryMuted,
    borderRadius: Radius.lg,
    paddingHorizontal: 14,
    height: 48,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.18)',
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
    backgroundColor: Colors.primaryMuted,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.12)',
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
  discoRowSeparator: { height: 8 },
  discoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: Radius.lg,
    backgroundColor: '#FAFBFC',
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.05)',
  },
  discoRowActive: {
    backgroundColor: '#FAF5FF',
    borderColor: 'rgba(124, 58, 237, 0.25)',
  },
  discoRowPressed: {
    opacity: 0.88,
  },
  discoText: { flex: 1 },
  discoName: { fontSize: 15, fontWeight: '600', color: Colors.dark },
  empty: { alignItems: 'center', paddingVertical: 32, gap: 8 },
  emptyText: { fontSize: 13, color: Colors.muted },
});
