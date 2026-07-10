import { useEffect, useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  useBeneficiaryStore,
  getBeneficiaryIdentifier,
  type Beneficiary,
  type BeneficiaryIdentifierField,
  type BeneficiaryServiceType,
} from '../../stores/beneficiary-store';
import { formatPhoneDisplay } from '../../lib/phone';
import { Colors, Radius, Typography, useThemedStyles } from '../../theme';
import { CollapsibleSavedSection } from './CollapsibleSavedSection';

type Props = {
  serviceType: BeneficiaryServiceType;
  identifierField: BeneficiaryIdentifierField;
  selectedId?: string | null;
  onSelect: (beneficiary: Beneficiary) => void;
};

function formatIdentifierChip(
  beneficiary: Beneficiary,
  field: BeneficiaryIdentifierField,
): string {
  const raw = getBeneficiaryIdentifier(beneficiary, field);
  if (!raw) return '';
  if (field === 'phone') return formatPhoneDisplay(raw);
  if (raw.length <= 10) return raw;
  return `${raw.slice(0, 4)}…${raw.slice(-4)}`;
}

export function BeneficiaryPicker({
  serviceType,
  identifierField,
  selectedId,
  onSelect,
}: Props) {
  const styles = useStyles();
  const beneficiaries = useBeneficiaryStore((s) => s.beneficiaries);
  const hydrate = useBeneficiaryStore((s) => s.hydrate);
  const removeBeneficiary = useBeneficiaryStore((s) => s.removeBeneficiary);
  const isHydrated = useBeneficiaryStore((s) => s.isHydrated);
  const [expanded, setExpanded] = useState(false);
  const [manageMode, setManageMode] = useState(false);

  useEffect(() => {
    if (!isHydrated) {
      void hydrate();
    }
  }, [hydrate, isHydrated]);

  const filtered = useMemo(
    () =>
      beneficiaries
        .filter((b) => b.serviceType === serviceType)
        .sort((a, b) => {
          const aTime = Date.parse(a.lastUsed || a.updatedAt || a.createdAt || '0');
          const bTime = Date.parse(b.lastUsed || b.updatedAt || b.createdAt || '0');
          return bTime - aTime;
        })
        .slice(0, 8),
    [beneficiaries, serviceType],
  );

  const selected = useMemo(
    () => filtered.find((item) => item.id === selectedId) ?? null,
    [filtered, selectedId],
  );

  const confirmRemove = useCallback(
    (beneficiary: Beneficiary) => {
      Alert.alert(
        'Remove saved recipient?',
        `"${beneficiary.name}" will be removed from your account.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: () => {
              void removeBeneficiary(beneficiary.id).catch(() => undefined);
            },
          },
        ],
      );
    },
    [removeBeneficiary],
  );

  const handleToggle = useCallback(() => {
    setExpanded((prev) => {
      if (prev) setManageMode(false);
      return !prev;
    });
  }, []);

  const handleSelect = useCallback(
    (beneficiary: Beneficiary) => {
      onSelect(beneficiary);
      setExpanded(false);
      setManageMode(false);
    },
    [onSelect],
  );

  if (!isHydrated || filtered.length === 0) {
    return null;
  }

  const summary = selected
    ? `${selected.name} · ${formatIdentifierChip(selected, identifierField)}`
    : undefined;

  return (
    <CollapsibleSavedSection
      label="Beneficiaries"
      summary={summary}
      count={filtered.length}
      expanded={expanded}
      onToggle={handleToggle}
      headerRight={
        expanded ? (
          <TouchableOpacity
            onPress={() => setManageMode((prev) => !prev)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            activeOpacity={0.7}
          >
            <Text style={styles.manageText}>{manageMode ? 'Done' : 'Manage'}</Text>
          </TouchableOpacity>
        ) : null
      }
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
        keyboardShouldPersistTaps="handled"
      >
        {filtered.map((beneficiary) => {
          const active = selectedId === beneficiary.id;
          const identifier = formatIdentifierChip(beneficiary, identifierField);

          return (
            <TouchableOpacity
              key={beneficiary.id}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => {
                if (manageMode) {
                  confirmRemove(beneficiary);
                  return;
                }
                handleSelect(beneficiary);
              }}
              activeOpacity={0.82}
            >
              {manageMode ? (
                <View style={styles.removeBadge}>
                  <Ionicons name="close" size={10} color={Colors.white} />
                </View>
              ) : (
                <Ionicons
                  name={active ? 'star' : 'star-outline'}
                  size={12}
                  color={active ? Colors.primary : Colors.warning}
                />
              )}
              <View style={styles.chipTextWrap}>
                <Text style={[styles.chipName, active && styles.chipNameActive]} numberOfLines={1}>
                  {beneficiary.name}
                </Text>
                {identifier ? (
                  <Text style={[styles.chipMeta, active && styles.chipMetaActive]} numberOfLines={1}>
                    {identifier}
                  </Text>
                ) : null}
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </CollapsibleSavedSection>
  );
}

const createStyles = (colors: import('../../theme/types').ThemeColors) =>
  StyleSheet.create({
    manageText: {
      ...Typography.caption,
      fontWeight: '700',
      color: colors.primary,
    },
    row: {
      gap: 8,
      paddingRight: 4,
    },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      maxWidth: 148,
      paddingHorizontal: 12,
      paddingVertical: 9,
      borderRadius: Radius.lg,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    chipActive: {
      borderColor: colors.primary,
      backgroundColor: colors.inputFilled,
    },
    chipTextWrap: {
      flexShrink: 1,
      gap: 1,
    },
    chipName: {
      ...Typography.captionMed,
      color: colors.dark,
      fontWeight: '700',
    },
    chipNameActive: {
      color: colors.primaryDeep,
    },
    chipMeta: {
      ...Typography.caption,
      color: colors.muted,
      fontSize: 10,
    },
    chipMetaActive: {
      color: colors.primary,
    },
    removeBadge: {
      width: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: colors.error,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });

function useStyles() {
  return useThemedStyles(createStyles);
}
