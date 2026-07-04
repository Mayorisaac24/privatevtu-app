import React, { useRef, useState } from 'react';
import {
  View, TextInput, Text, TouchableOpacity, Pressable, ViewStyle, TextStyle, TextInputProps, StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Radius, Typography, Overlays, useThemedStyles } from '../../theme';
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
  const styles = useStyles();
  const inputRef = useRef<TextInput>(null);
  const [focused, setFocused] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const isPassword = secureTextEntry;

  const borderColor = error ? styles.colors.error : focused ? styles.colors.primary : styles.colors.border;

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
            placeholderTextColor={styles.colors.mutedLight}
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
              <Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={20} color={styles.colors.muted} />
            </TouchableOpacity>
          ) : null}
          {rightIcon && !isPassword ? <View style={styles.trailing}>{rightIcon}</View> : null}
        </View>
      </Pressable>
      {error ? (
        <View style={styles.errorRow}>
          <Ionicons name="alert-circle-outline" size={13} color={styles.colors.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : hint ? (
        <Text style={styles.hint}>{hint}</Text>
      ) : null}
    </View>
  );
}

const createStyles = (colors: import('../../theme/types').ThemeColors) => {
  const sheet = StyleSheet.create({
    label: {
      ...Typography.smallMed,
      fontSize: 14,
      color: colors.dark,
      marginBottom: isAndroid ? 8 : 9,
      fontWeight: '600',
      ...(isAndroid ? { includeFontPadding: false } : {}),
    },
    field: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: Radius.lg,
      backgroundColor: colors.surface,
      paddingHorizontal: isAndroid ? 14 : 16,
      minHeight: AUTH_FIELD_HEIGHT,
    },
    fieldFocused: {
      backgroundColor: colors.inputFilled,
    },
    fieldError: {
      backgroundColor: colors.errorLight,
    },
    iconChip: {
      width: isAndroid ? 32 : 36,
      height: isAndroid ? 32 : 36,
      borderRadius: isAndroid ? 10 : 11,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surfaceAlt,
      marginRight: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    iconChipFocused: {
      backgroundColor: colors.primaryMuted,
      borderColor: Overlays.borderPrimary18,
    },
    input: {
      flex: 1,
      fontSize: isAndroid ? 15 : 16,
      color: colors.dark,
      ...platformInputText,
    },
    trailing: { paddingLeft: 8 },
    errorRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 },
    errorText: { ...Typography.caption, color: colors.error },
    hint: { ...Typography.caption, color: colors.muted, marginTop: 6 },
  });
  return { ...sheet, colors };
};

function useStyles() {
  return useThemedStyles(createStyles);
}
