import { useState } from 'react';
import { View, Text, TextInput, ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {Colors, Typography, Radius, useColors, useThemedStyles } from '../theme';
import { FIELD_HEIGHT, mergeInputStyle } from '../lib/platform-ui';
import { pickPhoneFromContacts } from '../lib/contact-picker';

type PhoneNumberInputProps = {
  value: string;
  onChangeText: (value: string) => void;
  detecting?: boolean;
  isComplete?: boolean;
  placeholder?: string;
  enableContactPicker?: boolean;
};

export function PhoneNumberInput({
  value,
  onChangeText,
  detecting = false,
  isComplete = false,
  placeholder = '801 234 5678',
  enableContactPicker = true,
}: PhoneNumberInputProps) {
  const styles = useStyles();
  const colors = useColors();
  const [pickingContact, setPickingContact] = useState(false);
  const hasValue = value.length > 0;
  const showTrailing = detecting || isComplete || (enableContactPicker && !detecting);

  const handleContactPick = async () => {
    if (pickingContact || detecting) return;
    setPickingContact(true);
    try {
      const phone = await pickPhoneFromContacts();
      if (phone) onChangeText(phone);
    } finally {
      setPickingContact(false);
    }
  };

  return (
    <View style={[
      styles.wrap,
      hasValue && styles.wrapFilled,
      isComplete && styles.wrapComplete,
      detecting && styles.wrapDetecting,
    ]}>
      <View style={styles.prefixBox}>
        <Text style={styles.flag}>🇳🇬</Text>
        <Text style={styles.prefixCode}>+234</Text>
      </View>
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor={colors.mutedLight}
        value={value}
        onChangeText={onChangeText}
        keyboardType="phone-pad"
        maxLength={10}
        underlineColorAndroid="transparent"
      />
      {showTrailing ? (
        <View style={styles.trailing}>
          {enableContactPicker && !detecting ? (
            <TouchableOpacity
              onPress={() => void handleContactPick()}
              disabled={pickingContact}
              style={styles.contactBtn}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel="Pick from contacts"
            >
              {pickingContact ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Ionicons name="person-circle-outline" size={22} color={colors.primary} />
              )}
            </TouchableOpacity>
          ) : null}
          {detecting ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : null}
          {!detecting && isComplete ? (
            <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const createStyles = (colors: import('../theme/types').ThemeColors) => StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.borderMid,
    borderRadius: Radius.lg,
    backgroundColor: colors.card,
    minHeight: FIELD_HEIGHT,
    overflow: 'hidden',
  },
  wrapFilled: {
    borderColor: colors.primaryLight,
    backgroundColor: colors.inputFilled,
  },
  wrapComplete: {
    borderColor: colors.primary,
  },
  wrapDetecting: {
    borderColor: colors.primary,
  },
  prefixBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    height: '100%',
    backgroundColor: colors.surfaceAlt,
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  flag: { fontSize: 16 },
  prefixCode: { ...Typography.smallMed, color: colors.muted, fontWeight: '600' },
  input: mergeInputStyle({
    flex: 1,
    fontSize: 16,
    color: colors.dark,
    paddingHorizontal: 14,
    letterSpacing: 0.5,
  }),
  trailing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingRight: 10,
  },
  contactBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
});

function useStyles() {
  return useThemedStyles(createStyles);
}
