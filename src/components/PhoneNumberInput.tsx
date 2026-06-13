import { useState } from 'react';
import { View, Text, TextInput, ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Radius } from '../theme';
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
        placeholderTextColor={Colors.mutedLight}
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
                <ActivityIndicator size="small" color={Colors.primary} />
              ) : (
                <Ionicons name="person-circle-outline" size={22} color={Colors.primary} />
              )}
            </TouchableOpacity>
          ) : null}
          {detecting ? (
            <ActivityIndicator size="small" color={Colors.primary} />
          ) : null}
          {!detecting && isComplete ? (
            <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.borderMid,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surface,
    minHeight: FIELD_HEIGHT,
    overflow: 'hidden',
  },
  wrapFilled: {
    borderColor: Colors.primaryLight,
    backgroundColor: Colors.primaryMuted,
  },
  wrapComplete: {
    borderColor: Colors.primary,
  },
  wrapDetecting: {
    borderColor: Colors.primary,
  },
  prefixBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    height: '100%',
    backgroundColor: Colors.white,
    borderRightWidth: 1,
    borderRightColor: Colors.border,
  },
  flag: { fontSize: 16 },
  prefixCode: { ...Typography.smallMed, color: Colors.muted, fontWeight: '600' },
  input: mergeInputStyle({
    flex: 1,
    fontSize: 16,
    color: Colors.dark,
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
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
  },
});
