import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  TextInput,
  FlatList,
  Platform,
  Dimensions,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Radius } from '../theme';

const SHEET_HEIGHT = Math.round(Dimensions.get('window').height * 0.88);
const POP_GAP = 10;
const SHEET_H_PAD = 20;

type Props = {
  visible: boolean;
  title: string;
  subtitle?: string;
  options: string[];
  popularOptions?: readonly string[];
  formatLabel?: (value: string) => string;
  loading?: boolean;
  selectedValue?: string | null;
  onClose: () => void;
  onSelect: (value: string) => void;
};

export function LocationPickerModal({
  visible,
  title,
  subtitle,
  options,
  popularOptions = [],
  formatLabel = (value) => value,
  loading = false,
  selectedValue,
  onClose,
  onSelect,
}: Props) {
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!visible) setSearch('');
  }, [visible]);

  const sortedOptions = useMemo(
    () => [...options].sort((a, b) => formatLabel(a).localeCompare(formatLabel(b))),
    [formatLabel, options],
  );

  const popularRows = useMemo(
    () => popularOptions.filter((option) => options.includes(option)),
    [options, popularOptions],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sortedOptions;
    return sortedOptions.filter((option) => formatLabel(option).toLowerCase().includes(q));
  }, [formatLabel, search, sortedOptions]);

  const handleSelect = useCallback((value: string) => {
    onSelect(value);
    setSearch('');
  }, [onSelect]);

  const renderRow = useCallback(({ item }: { item: string }) => {
    const active = selectedValue === item;
    return (
      <Pressable
        style={({ pressed }) => [
          styles.row,
          active && styles.rowActive,
          pressed && styles.rowPressed,
        ]}
        onPress={() => handleSelect(item)}
      >
        <Text style={styles.rowText}>{formatLabel(item)}</Text>
        {active ? (
          <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
        ) : (
          <Ionicons name="chevron-forward" size={18} color={Colors.mutedLight} />
        )}
      </Pressable>
    );
  }, [formatLabel, handleSelect, selectedValue]);

  const listHeader = useMemo(() => (
    <View>
      {!search && popularRows.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Popular</Text>
          <View style={styles.popularRow}>
            {popularRows.map((option) => {
              const active = selectedValue === option;
              return (
                <TouchableOpacity
                  key={option}
                  style={[styles.popularChip, active && styles.popularChipActive]}
                  onPress={() => handleSelect(option)}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.popularText, active && styles.popularTextActive]}>
                    {formatLabel(option)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}
      <Text style={styles.sectionLabel}>All</Text>
    </View>
  ), [formatLabel, handleSelect, popularRows, search, selectedValue]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdropPress} onPress={onClose} />
        <View style={[styles.sheet, { height: SHEET_HEIGHT, paddingBottom: insets.bottom + 12 }]}>
          {Platform.OS === 'ios' ? (
            <BlurView intensity={80} tint="light" style={StyleSheet.absoluteFillObject} />
          ) : null}
          <View style={styles.sheetContent}>
            <View style={styles.fixedHeader}>
              <View style={styles.handle} />
              <View style={styles.header}>
                <View style={styles.headerText}>
                  <Text style={styles.title}>{title}</Text>
                  {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
                </View>
                <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.85}>
                  <Ionicons name="close" size={20} color={Colors.mid} />
                </TouchableOpacity>
              </View>
              <View style={styles.searchWrap}>
                <Ionicons name="search" size={18} color={Colors.primary} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search"
                  placeholderTextColor={Colors.mutedLight}
                  value={search}
                  onChangeText={setSearch}
                  autoCorrect={false}
                  autoCapitalize="words"
                />
                {search.length > 0 ? (
                  <TouchableOpacity onPress={() => setSearch('')} hitSlop={8}>
                    <Ionicons name="close-circle" size={18} color={Colors.mutedLight} />
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>

            {loading ? (
              <View style={styles.loadingWrap}>
                <ActivityIndicator color={Colors.primary} />
                <Text style={styles.loadingText}>Loading locations…</Text>
              </View>
            ) : (
              <FlatList
                data={filtered}
                keyExtractor={(item) => item}
                renderItem={renderRow}
                ListHeaderComponent={listHeader}
                contentContainerStyle={styles.listContent}
                keyboardShouldPersistTaps="handled"
                ItemSeparatorComponent={() => <View style={styles.rowSeparator} />}
                ListEmptyComponent={(
                  <View style={styles.empty}>
                    <Ionicons name="search-outline" size={28} color={Colors.mutedLight} />
                    <Text style={styles.emptyText}>No matches found</Text>
                  </View>
                )}
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
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  backdropPress: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  sheetContent: {
    flex: 1,
    paddingHorizontal: SHEET_H_PAD,
  },
  fixedHeader: {
    paddingTop: 10,
    backgroundColor: '#FFFFFF',
    zIndex: 1,
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
  },
  popularChip: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: Radius.lg,
    backgroundColor: Colors.primaryMuted,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.12)',
  },
  popularChipActive: {
    backgroundColor: '#FAF5FF',
    borderColor: 'rgba(124, 58, 237, 0.35)',
  },
  popularText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.mid,
  },
  popularTextActive: { color: Colors.primary },
  listContent: { paddingBottom: 12, flexGrow: 1 },
  rowSeparator: { height: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: Radius.lg,
    backgroundColor: '#FAFBFC',
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.05)',
  },
  rowActive: {
    backgroundColor: '#FAF5FF',
    borderColor: 'rgba(124, 58, 237, 0.25)',
  },
  rowPressed: {
    opacity: 0.88,
  },
  rowText: { flex: 1, fontSize: 15, fontWeight: '600', color: Colors.dark },
  empty: { alignItems: 'center', paddingVertical: 32, gap: 8 },
  emptyText: { fontSize: 13, color: Colors.muted },
});
