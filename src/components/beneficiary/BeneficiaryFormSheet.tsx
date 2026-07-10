import { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BeneficiaryRecord, BeneficiaryServiceType } from '../../lib/api';
import {
  beneficiaryIdentifierLabel,
  beneficiaryServiceLabel,
  getBeneficiaryIdentifierField,
  getBeneficiaryIdentifierValue,
} from '../../lib/beneficiaries-cache';
import { Colors, Radius, Typography, useThemedStyles } from '../../theme';
import { formatPhoneInput } from '../../lib/phone';

export type BeneficiaryFormValues = {
  name: string;
  serviceType: BeneficiaryServiceType;
  identifier: string;
  provider: string;
};

type Props = {
  visible: boolean;
  initial?: BeneficiaryRecord | null;
  onClose: () => void;
  onSubmit: (values: BeneficiaryFormValues) => Promise<void>;
};

const SERVICE_TYPES: BeneficiaryServiceType[] = ['airtime', 'data', 'electricity', 'cable'];

const SERVICE_ICONS: Record<BeneficiaryServiceType, keyof typeof Ionicons.glyphMap> = {
  airtime: 'phone-portrait-outline',
  data: 'wifi-outline',
  electricity: 'flash-outline',
  cable: 'tv-outline',
};

function emptyForm(serviceType: BeneficiaryServiceType = 'airtime'): BeneficiaryFormValues {
  return { name: '', serviceType, identifier: '', provider: '' };
}

export function BeneficiaryFormSheet({ visible, initial, onClose, onSubmit }: Props) {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const [form, setForm] = useState<BeneficiaryFormValues>(() => emptyForm());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    if (initial) {
      setForm({
        name: initial.name,
        serviceType: initial.serviceType,
        identifier: getBeneficiaryIdentifierValue(initial),
        provider: initial.provider || '',
      });
      return;
    }
    setForm(emptyForm());
  }, [initial, visible]);

  const identifierLabel = useMemo(
    () => beneficiaryIdentifierLabel(form.serviceType),
    [form.serviceType],
  );

  const handleIdentifierChange = (value: string) => {
    if (form.serviceType === 'airtime' || form.serviceType === 'data') {
      setForm((prev) => ({ ...prev, identifier: formatPhoneInput(value) }));
      return;
    }
    setForm((prev) => ({ ...prev, identifier: value.replace(/\D/g, '') }));
  };

  const handleSubmit = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await onSubmit(form);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title}>{initial ? 'Edit recipient' : 'Add recipient'}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={22} color={Colors.muted} />
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.fieldLabel}>Service</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.typeRow}>
              {SERVICE_TYPES.map((type) => {
                const active = form.serviceType === type;
                return (
                  <TouchableOpacity
                    key={type}
                    style={[styles.typeChip, active && styles.typeChipActive]}
                    onPress={() => setForm((prev) => ({
                      ...prev,
                      serviceType: type,
                      identifier: '',
                    }))}
                    disabled={Boolean(initial)}
                    activeOpacity={0.85}
                  >
                    <Ionicons
                      name={SERVICE_ICONS[type]}
                      size={14}
                      color={active ? Colors.white : Colors.muted}
                    />
                    <Text style={[styles.typeChipText, active && styles.typeChipTextActive]}>
                      {beneficiaryServiceLabel(type)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <Text style={styles.fieldLabel}>Label</Text>
            <TextInput
              style={styles.input}
              value={form.name}
              onChangeText={(name) => setForm((prev) => ({ ...prev, name }))}
              placeholder="e.g. Mom, Office meter"
              placeholderTextColor={Colors.mutedLight}
              maxLength={64}
            />

            <Text style={styles.fieldLabel}>{identifierLabel}</Text>
            <TextInput
              style={styles.input}
              value={form.identifier}
              onChangeText={handleIdentifierChange}
              placeholder={
                form.serviceType === 'airtime' || form.serviceType === 'data'
                  ? '8012345678'
                  : 'Enter number'
              }
              placeholderTextColor={Colors.mutedLight}
              keyboardType="number-pad"
              maxLength={form.serviceType === 'airtime' || form.serviceType === 'data' ? 11 : 20}
            />

            <Text style={styles.fieldLabel}>Provider code</Text>
            <TextInput
              style={styles.input}
              value={form.provider}
              onChangeText={(provider) => setForm((prev) => ({ ...prev, provider }))}
              placeholder="Optional · e.g. mtn, DSTV, IKEJA"
              placeholderTextColor={Colors.mutedLight}
              autoCapitalize="characters"
            />
            <Text style={styles.helper}>
              Provider helps pre-select network, DISCO, or cable brand on purchase screens.
            </Text>
          </ScrollView>

          <TouchableOpacity
            style={[styles.submitBtn, saving && styles.submitBtnDisabled]}
            onPress={() => void handleSubmit()}
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator size="small" color={Colors.white} />
            ) : (
              <Text style={styles.submitText}>{initial ? 'Save changes' : 'Add recipient'}</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export function formValuesToPayload(values: BeneficiaryFormValues) {
  const field = getBeneficiaryIdentifierField(values.serviceType);
  return {
    name: values.name.trim(),
    serviceType: values.serviceType,
    provider: values.provider.trim() || undefined,
    phone: field === 'phone' ? values.identifier.trim() : undefined,
    meterNumber: field === 'meterNumber' ? values.identifier.trim() : undefined,
    smartCardNumber: field === 'smartCardNumber' ? values.identifier.trim() : undefined,
  };
}

const createStyles = (colors: import('../../theme/types').ThemeColors) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.35)',
    },
    sheet: {
      backgroundColor: colors.card,
      borderTopLeftRadius: Radius.xl,
      borderTopRightRadius: Radius.xl,
      paddingTop: 8,
      maxHeight: '88%',
    },
    handle: {
      alignSelf: 'center',
      width: 42,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
      marginBottom: 12,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      marginBottom: 8,
    },
    title: {
      ...Typography.h3,
      fontSize: 18,
      color: colors.dark,
    },
    content: {
      paddingHorizontal: 20,
      paddingBottom: 12,
      gap: 8,
    },
    fieldLabel: {
      ...Typography.caption,
      fontWeight: '700',
      color: colors.muted,
      letterSpacing: 0.4,
      textTransform: 'uppercase',
      marginTop: 8,
    },
    typeRow: {
      gap: 8,
      paddingVertical: 4,
    },
    typeChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: Radius.full,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    typeChipActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    typeChipText: {
      ...Typography.captionMed,
      color: colors.muted,
      fontWeight: '700',
    },
    typeChipTextActive: {
      color: colors.white,
    },
    input: {
      height: 50,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: Radius.lg,
      backgroundColor: colors.surface,
      paddingHorizontal: 14,
      fontSize: 15,
      color: colors.dark,
    },
    helper: {
      ...Typography.caption,
      color: colors.muted,
      lineHeight: 17,
      marginTop: 2,
    },
    submitBtn: {
      marginHorizontal: 20,
      marginTop: 8,
      backgroundColor: colors.primary,
      borderRadius: Radius.lg,
      paddingVertical: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    submitBtnDisabled: {
      opacity: 0.7,
    },
    submitText: {
      ...Typography.smallMed,
      color: colors.white,
      fontWeight: '700',
    },
  });

function useStyles() {
  return useThemedStyles(createStyles);
}
