import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatCurrency, type DataPlan } from '../lib/api';
import { Colors, Radius, Typography } from '../theme';
import { useColors } from '../theme/hooks';

type Props = {
  visible: boolean;
  plans: DataPlan[];
  selectedPlanId?: string | null;
  loading?: boolean;
  title?: string;
  onClose: () => void;
  onSelect: (plan: DataPlan) => void;
};

function PlanPickerRow({
  plan,
  selected,
  onPress,
}: {
  plan: DataPlan;
  selected: boolean;
  onPress: () => void;
}) {
  const colors = useColors();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { borderColor: colors.border, backgroundColor: colors.card },
        selected && { borderColor: colors.primary, backgroundColor: colors.primaryMuted },
        pressed && styles.rowPressed,
      ]}
    >
      <View style={styles.rowMain}>
        <Text style={[styles.rowName, { color: colors.dark }]} numberOfLines={2}>
          {plan.name}
        </Text>
        {plan.validity ? (
          <Text style={[styles.rowMeta, { color: colors.muted }]}>{plan.validity}</Text>
        ) : null}
      </View>
      <View style={styles.rowRight}>
        <Text style={[styles.rowPrice, { color: selected ? colors.primary : colors.dark }]}>
          {formatCurrency(plan.price)}
        </Text>
        {selected ? (
          <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
        ) : (
          <Ionicons name="chevron-forward" size={16} color={colors.mutedLight} />
        )}
      </View>
    </Pressable>
  );
}

export function DataPlanPickerSheet({
  visible,
  plans,
  selectedPlanId,
  loading = false,
  title = 'Select data plan',
  onClose,
  onSelect,
}: Props) {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!visible) setSearch('');
  }, [visible]);

  const filteredPlans = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return plans;
    return plans.filter((plan) => plan.name.toLowerCase().includes(query));
  }, [plans, search]);

  const handleSelect = useCallback((plan: DataPlan) => {
    onSelect(plan);
    onClose();
  }, [onClose, onSelect]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />

      <View style={[styles.sheet, { paddingBottom: insets.bottom + 12, backgroundColor: colors.card }]}>
        <View style={styles.handle} />

        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.dark }]}>{title}</Text>
          <TouchableOpacity
            style={[styles.closeBtn, { backgroundColor: colors.surfaceAlt }]}
            onPress={onClose}
            activeOpacity={0.8}
          >
            <Ionicons name="close" size={20} color={colors.dark} />
          </TouchableOpacity>
        </View>

        <View style={[styles.searchWrap, { borderColor: colors.border, backgroundColor: colors.surface }]}>
          <Ionicons name="search-outline" size={16} color={colors.muted} />
          <TextInput
            style={[styles.searchInput, { color: colors.dark }]}
            placeholder="Search plans..."
            placeholderTextColor={colors.mutedLight}
            value={search}
            onChangeText={setSearch}
          />
        </View>

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.muted }]}>Loading plans...</Text>
          </View>
        ) : (
          <FlatList
            data={filteredPlans}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator
            style={styles.list}
            contentContainerStyle={[
              styles.listContent,
              filteredPlans.length === 0 && styles.listContentEmpty,
            ]}
            ListEmptyComponent={(
              <Text style={[styles.emptyText, { color: colors.muted }]}>
                {search ? 'No plans match your search' : 'No plans available'}
              </Text>
            )}
            renderItem={({ item }) => (
              <PlanPickerRow
                plan={item}
                selected={item.id === selectedPlanId}
                onPress={() => handleSelect(item)}
              />
            )}
          />
        )}
      </View>
    </Modal>
  );
}

type DataPlanSelectFieldProps = {
  selectedPlan: DataPlan | null;
  planCount: number;
  loading?: boolean;
  disabled?: boolean;
  onPress: () => void;
};

export function DataPlanSelectField({
  selectedPlan,
  planCount,
  loading = false,
  disabled = false,
  onPress,
}: DataPlanSelectFieldProps) {
  const colors = useColors();

  return (
    <TouchableOpacity
      style={[
        styles.field,
        { borderColor: colors.border, backgroundColor: colors.surface },
        selectedPlan && { borderColor: colors.primary, backgroundColor: colors.primaryMuted },
        disabled && styles.fieldDisabled,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.85}
    >
      <View style={styles.fieldIcon}>
        <Ionicons name="albums-outline" size={18} color={colors.primary} />
      </View>

      <View style={styles.fieldBody}>
        {loading ? (
          <View style={styles.fieldLoading}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={[styles.fieldPlaceholder, { color: colors.muted }]}>Loading plans...</Text>
          </View>
        ) : selectedPlan ? (
          <>
            <Text style={[styles.fieldValue, { color: colors.dark }]} numberOfLines={2}>
              {selectedPlan.name}
            </Text>
            <Text style={[styles.fieldMeta, { color: colors.muted }]}>
              {formatCurrency(selectedPlan.price)}
              {selectedPlan.validity ? ` · ${selectedPlan.validity}` : ''}
            </Text>
          </>
        ) : (
          <>
            <Text style={[styles.fieldPlaceholder, { color: colors.muted }]}>
              {planCount > 0 ? `Choose from ${planCount} plans` : 'No plans available'}
            </Text>
            <Text style={[styles.fieldHint, { color: colors.mutedLight }]}>Tap to browse plans</Text>
          </>
        )}
      </View>

      <Ionicons name="chevron-down" size={18} color={colors.muted} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  sheet: {
    maxHeight: '78%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  handle: {
    alignSelf: 'center',
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(15, 23, 42, 0.12)',
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: {
    ...Typography.h4,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
  },
  list: {
    flexGrow: 0,
  },
  listContent: {
    paddingBottom: 8,
    gap: 8,
  },
  listContentEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
    minHeight: 120,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: Radius.md,
    borderWidth: 1.5,
  },
  rowPressed: {
    opacity: 0.88,
  },
  rowMain: {
    flex: 1,
    gap: 2,
  },
  rowName: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 18,
  },
  rowMeta: {
    fontSize: 12,
  },
  rowRight: {
    alignItems: 'flex-end',
    gap: 4,
    maxWidth: 100,
  },
  rowPrice: {
    fontSize: 14,
    fontWeight: '700',
  },
  loadingWrap: {
    minHeight: 160,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 13,
    paddingVertical: 24,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1.5,
    borderRadius: Radius.md,
    paddingHorizontal: 14,
    paddingVertical: 14,
    minHeight: 72,
  },
  fieldDisabled: {
    opacity: 0.6,
  },
  fieldIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: Colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldBody: {
    flex: 1,
    gap: 2,
  },
  fieldLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  fieldPlaceholder: {
    fontSize: 14,
    fontWeight: '600',
  },
  fieldHint: {
    fontSize: 12,
  },
  fieldValue: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 18,
  },
  fieldMeta: {
    fontSize: 12,
    fontWeight: '500',
  },
});
