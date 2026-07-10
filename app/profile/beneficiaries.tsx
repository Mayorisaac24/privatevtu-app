import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ProfileSubScreen } from '../../src/components/profile/ProfileSubScreen';
import { GlassCard } from '../../src/components/ui/GlassCard';
import { Colors, Radius, Typography, useThemedStyles } from '../../src/theme';
import { useBeneficiaryStore } from '../../src/stores/beneficiary-store';
import type { BeneficiaryRecord, BeneficiaryServiceType } from '../../src/lib/api';
import {
  beneficiaryIdentifierLabel,
  beneficiaryServiceLabel,
  getBeneficiaryIdentifierValue,
} from '../../src/lib/beneficiaries-cache';
import { formatPhoneDisplay } from '../../src/lib/phone';
import { BeneficiaryFormSheet, formValuesToPayload, type BeneficiaryFormValues } from '../../src/components/beneficiary/BeneficiaryFormSheet';
import { showToast } from '../../src/components/ui/Toast';

const FILTERS: Array<{ id: 'all' | BeneficiaryServiceType; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'airtime', label: 'Airtime' },
  { id: 'data', label: 'Data' },
  { id: 'electricity', label: 'Electricity' },
  { id: 'cable', label: 'Cable' },
];

const SERVICE_ICONS: Record<BeneficiaryServiceType, keyof typeof Ionicons.glyphMap> = {
  airtime: 'phone-portrait-outline',
  data: 'wifi-outline',
  electricity: 'flash-outline',
  cable: 'tv-outline',
};

function formatIdentifier(record: BeneficiaryRecord): string {
  const raw = getBeneficiaryIdentifierValue(record);
  if (!raw) return '—';
  if (record.serviceType === 'airtime' || record.serviceType === 'data') {
    return formatPhoneDisplay(raw);
  }
  return raw;
}

export default function BeneficiariesScreen() {
  const styles = useStyles();
  const beneficiaries = useBeneficiaryStore((s) => s.beneficiaries);
  const hydrate = useBeneficiaryStore((s) => s.hydrate);
  const refresh = useBeneficiaryStore((s) => s.refresh);
  const addBeneficiary = useBeneficiaryStore((s) => s.addBeneficiary);
  const updateBeneficiary = useBeneficiaryStore((s) => s.updateBeneficiary);
  const removeBeneficiary = useBeneficiaryStore((s) => s.removeBeneficiary);
  const isLoading = useBeneficiaryStore((s) => s.isLoading);
  const isHydrated = useBeneficiaryStore((s) => s.isHydrated);

  const [filter, setFilter] = useState<'all' | BeneficiaryServiceType>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [editing, setEditing] = useState<BeneficiaryRecord | null>(null);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const filtered = useMemo(() => {
    const items = filter === 'all'
      ? beneficiaries
      : beneficiaries.filter((item) => item.serviceType === filter);
    return [...items].sort((a, b) => {
      const aTime = Date.parse(a.lastUsed || a.updatedAt || a.createdAt || '0');
      const bTime = Date.parse(b.lastUsed || b.updatedAt || b.createdAt || '0');
      return bTime - aTime;
    });
  }, [beneficiaries, filter]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refresh();
    } finally {
      setRefreshing(false);
    }
  }, [refresh]);

  const openCreate = () => {
    setEditing(null);
    setSheetVisible(true);
  };

  const openEdit = (record: BeneficiaryRecord) => {
    setEditing(record);
    setSheetVisible(true);
  };

  const confirmDelete = (record: BeneficiaryRecord) => {
    Alert.alert(
      'Remove recipient?',
      `"${record.name}" will be deleted from your account.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            void removeBeneficiary(record.id)
              .then(() => showToast({ type: 'success', text1: 'Recipient removed' }))
              .catch((error: Error) => {
                showToast({ type: 'error', text1: 'Could not remove', text2: error.message });
              });
          },
        },
      ],
    );
  };

  const handleSubmit = async (values: BeneficiaryFormValues) => {
    try {
      const payload = formValuesToPayload(values);
      if (!payload.name) {
        throw new Error('Label is required');
      }
      if (!payload.phone && !payload.meterNumber && !payload.smartCardNumber) {
        throw new Error(`${beneficiaryIdentifierLabel(values.serviceType)} is required`);
      }

      if (editing) {
        await updateBeneficiary(editing.id, payload);
        showToast({ type: 'success', text1: 'Recipient updated' });
        return;
      }

      await addBeneficiary({
        name: payload.name,
        type: payload.serviceType,
        provider: payload.provider,
        phone: payload.phone,
        meterNumber: payload.meterNumber,
        smartCardNumber: payload.smartCardNumber,
      });
      showToast({ type: 'success', text1: 'Recipient added' });
    } catch (error: any) {
      showToast({
        type: 'error',
        text1: editing ? 'Could not update' : 'Could not add',
        text2: error?.message || 'Please try again',
      });
      throw error;
    }
  };

  return (
    <>
      <ProfileSubScreen
        title="Saved Recipients"
        subtitle="Manage beneficiaries across services"
        headerIcon="bookmark-outline"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void handleRefresh()} tintColor={Colors.primary} />
        }
        footer={(
          <TouchableOpacity style={styles.createBtn} onPress={openCreate} activeOpacity={0.85}>
            <Ionicons name="add" size={20} color={Colors.white} />
            <Text style={styles.createBtnText}>Add recipient</Text>
          </TouchableOpacity>
        )}
      >
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          {FILTERS.map((item) => {
            const active = filter === item.id;
            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.filterChip, active && styles.filterChipActive]}
                onPress={() => setFilter(item.id)}
                activeOpacity={0.85}
              >
                <Text style={[styles.filterText, active && styles.filterTextActive]}>{item.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {!isHydrated && isLoading ? (
          <ActivityIndicator color={Colors.primary} style={{ marginTop: 24 }} />
        ) : filtered.length === 0 ? (
          <GlassCard contentStyle={styles.empty}>
            <Ionicons name="people-outline" size={32} color={Colors.mutedLight} />
            <Text style={styles.emptyTitle}>No saved recipients</Text>
            <Text style={styles.emptySub}>
              Add phone numbers, meters, or smart cards you buy for often. They’ll appear on service screens too.
            </Text>
          </GlassCard>
        ) : (
          <View style={styles.list}>
            {filtered.map((item) => (
              <GlassCard
                key={item.id}
                variant="light"
                borderRadius={Radius.lg}
                padding={14}
                contentStyle={styles.row}
              >
                <View style={styles.rowTop}>
                  <View style={styles.iconWrap}>
                    <Ionicons name={SERVICE_ICONS[item.serviceType]} size={18} color={Colors.primary} />
                  </View>
                  <View style={styles.rowBody}>
                    <Text style={styles.name}>{item.name}</Text>
                    <Text style={styles.meta}>
                      {beneficiaryServiceLabel(item.serviceType)} · {formatIdentifier(item)}
                    </Text>
                    {item.provider ? (
                      <Text style={styles.provider}>Provider: {item.provider}</Text>
                    ) : null}
                  </View>
                  <View style={styles.actions}>
                    <TouchableOpacity
                      style={styles.actionBtn}
                      onPress={() => openEdit(item)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="create-outline" size={18} color={Colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.actionBtn}
                      onPress={() => confirmDelete(item)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="trash-outline" size={18} color={Colors.error} />
                    </TouchableOpacity>
                  </View>
                </View>
              </GlassCard>
            ))}
          </View>
        )}
      </ProfileSubScreen>

      <BeneficiaryFormSheet
        visible={sheetVisible}
        initial={editing}
        onClose={() => {
          setSheetVisible(false);
          setEditing(null);
        }}
        onSubmit={handleSubmit}
      />
    </>
  );
}

const createStyles = (colors: import('../../src/theme/types').ThemeColors) =>
  StyleSheet.create({
    filters: {
      gap: 8,
      paddingBottom: 4,
    },
    filterChip: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: Radius.full,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.card,
    },
    filterChipActive: {
      borderColor: colors.primary,
      backgroundColor: colors.inputFilled,
    },
    filterText: {
      ...Typography.captionMed,
      color: colors.muted,
      fontWeight: '700',
    },
    filterTextActive: {
      color: colors.primary,
    },
    list: { gap: 10 },
    row: { gap: 0 },
    rowTop: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
    },
    iconWrap: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: colors.primaryMuted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rowBody: {
      flex: 1,
      gap: 3,
    },
    name: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.dark,
    },
    meta: {
      fontSize: 13,
      color: colors.mid,
    },
    provider: {
      ...Typography.caption,
      color: colors.muted,
      marginTop: 2,
    },
    actions: {
      flexDirection: 'row',
      gap: 4,
    },
    actionBtn: {
      width: 34,
      height: 34,
      borderRadius: 10,
      backgroundColor: colors.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
    },
    empty: {
      alignItems: 'center',
      paddingVertical: 36,
      gap: 8,
    },
    emptyTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.dark,
    },
    emptySub: {
      fontSize: 13,
      color: colors.muted,
      textAlign: 'center',
      paddingHorizontal: 20,
      lineHeight: 18,
    },
    createBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: colors.primary,
      borderRadius: Radius.lg,
      paddingVertical: 14,
    },
    createBtnText: {
      color: colors.white,
      fontSize: 15,
      fontWeight: '700',
    },
  });

function useStyles() {
  return useThemedStyles(createStyles);
}
