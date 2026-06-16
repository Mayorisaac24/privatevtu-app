import React, { useRef, useState } from 'react';
import {
  View, TextInput, Text, TouchableOpacity, Pressable, ViewStyle, TextStyle, TextInputProps,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Typography } from '../../theme';
import { isAndroid, platformInputText, AUTH_FIELD_HEIGHT } from '../../lib/platform-ui';


interface AuthInputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  containerStyle?: ViewStyle;
  inputStyle?: TextStyle;
}

export function AuthInput({
  label, error, hint, leftIcon, rightIcon,
  containerStyle, inputStyle, secureTextEntry,
  onFocus, onBlur,
  ...props
}: AuthInputProps) {
  const inputRef = useRef<TextInput>(null);
  const [focused, setFocused] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const isPassword = secureTextEntry;

  const borderColor = error ? Colors.error : focused ? Colors.primary : Colors.border;

  const focusInput = () => {
    inputRef.current?.focus();
  };

  return (
    <View style={[{ marginBottom: isAndroid ? 16 : 20 }, containerStyle]}>
      {label ? (
        <Text style={styles.label}>{label}</Text>
      ) : null}
      <Pressable onPress={focusInput}>
        <View style={[
          styles.field,
          { borderColor, borderWidth: focused ? 2 : 1.5 },
          focused && styles.fieldFocused,
          error && styles.fieldError,
        ]}>
          {leftIcon ? (
            <View style={[styles.iconChip, focused && styles.iconChipFocused]}>
              {leftIcon}
            </View>
          ) : null}
          <TextInput
            ref={inputRef}
            style={[styles.input, inputStyle]}
            placeholderTextColor={Colors.mutedLight}
            underlineColorAndroid="transparent"
            onFocus={(e) => {
              setFocused(true);
              onFocus?.(e);
            }}
            onBlur={(e) => {
              setFocused(false);
              onBlur?.(e);
            }}
            secureTextEntry={isPassword && !showPw}
            {...props}
          />
          {isPassword ? (
            <TouchableOpacity onPress={() => setShowPw(!showPw)} style={styles.trailing}>
              <Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={20} color={Colors.muted} />
            </TouchableOpacity>
          ) : null}
          {rightIcon && !isPassword ? <View style={styles.trailing}>{rightIcon}</View> : null}
        </View>
      </Pressable>
      {error ? (
        <View style={styles.errorRow}>
          <Ionicons name="alert-circle-outline" size={13} color={Colors.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : hint ? (
        <Text style={styles.hint}>{hint}</Text>
      ) : null}
    </View>
  );
}

const styles = {
  label: {
    ...Typography.smallMed,
    fontSize: 14,
    color: Colors.dark,
    marginBottom: isAndroid ? 8 : 9,
    fontWeight: '600' as const,
    ...(isAndroid ? { includeFontPadding: false } : null),
  },
  field: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surface,
    paddingHorizontal: isAndroid ? 14 : 16,
    minHeight: AUTH_FIELD_HEIGHT,
  },
  fieldFocused: {
    backgroundColor: Colors.white,
  },
  fieldError: {
    backgroundColor: Colors.errorLight,
  },
  iconChip: {
    width: isAndroid ? 32 : 36,
    height: isAndroid ? 32 : 36,
    borderRadius: isAndroid ? 10 : 11,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: Colors.white,
    marginRight: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  iconChipFocused: {
    backgroundColor: Colors.primaryMuted,
    borderColor: 'rgba(124, 58, 237, 0.18)',
  },
  input: {
    flex: 1,
    fontSize: isAndroid ? 15 : 16,
    color: Colors.dark,
    paddingVertical: isAndroid ? 0 : 14,
    fontWeight: '500' as const,
    ...platformInputText,
  },
  trailing: {
    padding: 4,
    marginLeft: 8,
  },
  errorRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 5,
    marginTop: 7,
  },
  errorText: {
    ...Typography.caption,
    color: Colors.error,
    fontSize: 12,
  },
  hint: {
    ...Typography.caption,
    color: Colors.muted,
    marginTop: 7,
    fontSize: 12,
  },
};
