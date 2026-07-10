import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useBeneficiaryStore } from '../../stores/beneficiary-store';
import type { SaveBeneficiaryDraft } from '../../hooks/useBeneficiarySelection';
import { showToast } from '../ui/Toast';
import { Colors, Radius, Typography, useThemedStyles } from '../../theme';

type Props = {
  draft: SaveBeneficiaryDraft;
  onSaved?: () => void;
  onInputFocus?: () => void;
};

export function SaveBeneficiaryPrompt({ draft, onSaved, onInputFocus }: Props) {
  const styles = useStyles();
  const addBeneficiary = useBeneficiaryStore((s) => s.addBeneficiary);
  const [name, setName] = useState('');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  if (saved) {
    return (
      <View style={styles.savedRow}>
        <Ionicons name="checkmark-circle" size={18} color={Colors.success} />
        <Text style={styles.savedText}>Saved to your account</Text>
      </View>
    );
  }

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed || saving) return;

    setSaving(true);
    try {
      const field = draft.identifierField;
      await addBeneficiary({
        name: trimmed,
        type: draft.serviceType,
        provider: draft.provider,
        phone: field === 'phone' ? draft.identifier : undefined,
        meterNumber: field === 'meterNumber' ? draft.identifier : undefined,
        smartCardNumber: field === 'smartCardNumber' ? draft.identifier : undefined,
      });
      setSaved(true);
      showToast({ type: 'success', text1: 'Recipient saved', text2: trimmed });
      onSaved?.();
    } catch (error: any) {
      showToast({
        type: 'error',
        text1: 'Could not save',
        text2: error?.message || 'Please try again',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>Save this recipient?</Text>
      <View style={styles.row}>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Label e.g. Mom, Office"
          placeholderTextColor={Colors.mutedLight}
          returnKeyType="done"
          onSubmitEditing={() => void handleSave()}
          onFocus={onInputFocus}
          maxLength={32}
          editable={!saving}
        />
        <TouchableOpacity
          style={[styles.saveBtn, (!name.trim() || saving) && styles.saveBtnDisabled]}
          onPress={() => void handleSave()}
          disabled={!name.trim() || saving}
          activeOpacity={0.85}
        >
          {saving ? (
            <ActivityIndicator size="small" color={Colors.white} />
          ) : (
            <Ionicons name="bookmark" size={16} color={Colors.white} />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const createStyles = (colors: import('../../theme/types').ThemeColors) =>
  StyleSheet.create({
    wrap: {
      gap: 8,
    },
    label: {
      ...Typography.caption,
      fontWeight: '700',
      color: colors.muted,
      letterSpacing: 0.4,
      textTransform: 'uppercase',
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    input: {
      flex: 1,
      height: 44,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: Radius.md,
      backgroundColor: colors.surface,
      paddingHorizontal: 14,
      fontSize: 14,
      color: colors.dark,
    },
    saveBtn: {
      width: 44,
      height: 44,
      borderRadius: Radius.md,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    saveBtnDisabled: {
      opacity: 0.45,
    },
    savedRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 6,
    },
    savedText: {
      ...Typography.smallMed,
      color: colors.successDark,
      fontWeight: '600',
    },
  });

function useStyles() {
  return useThemedStyles(createStyles);
}
