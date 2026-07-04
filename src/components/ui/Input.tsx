import React, { useState } from 'react';
import {
  View, TextInput, TouchableOpacity, ViewStyle, TextStyle, TextInputProps, StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Radius, useThemedStyles } from '../../theme';
import { AppText } from './AppText';
import { FIELD_HEIGHT, mergeInputStyle, platformSpacing } from '../../lib/platform-ui';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  containerStyle?: ViewStyle;
  inputStyle?: TextStyle;
}

export function Input({
  label, error, hint, leftIcon, rightIcon,
  containerStyle, inputStyle, secureTextEntry, ...props
}: InputProps) {
  const styles = useStyles();
  const [focused, setFocused] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const isPassword = secureTextEntry;

  const borderColor = error ? styles.colors.error : focused ? styles.colors.primary : styles.colors.border;

  return (
    <View style={[{ marginBottom: platformSpacing(16) }, containerStyle]}>
      {label ? (
        <AppText variant="captionMed" style={styles.label}>
          {label}
        </AppText>
      ) : null}
      <View style={[
        styles.field,
        focused && styles.fieldFocused,
        { borderColor, borderWidth: focused ? 2 : 1.5 },
      ]}>
        {leftIcon ? <View style={styles.leftIcon}>{leftIcon}</View> : null}
        <TextInput
          style={mergeInputStyle([styles.input, inputStyle])}
          placeholderTextColor={styles.colors.mutedLight}
          underlineColorAndroid="transparent"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          secureTextEntry={isPassword && !showPw}
          {...props}
        />
        {isPassword ? (
          <TouchableOpacity onPress={() => setShowPw(!showPw)} style={styles.eyeBtn}>
            <Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={18} color={styles.colors.muted} />
          </TouchableOpacity>
        ) : null}
        {rightIcon && !isPassword ? <View>{rightIcon}</View> : null}
      </View>
      {error ? (
        <View style={styles.errorRow}>
          <Ionicons name="alert-circle-outline" size={12} color={styles.colors.error} />
          <AppText variant="caption" style={styles.errorText}>{error}</AppText>
        </View>
      ) : hint ? (
        <AppText variant="caption" style={styles.hint}>{hint}</AppText>
      ) : null}
    </View>
  );
}

const createStyles = (colors: import('../../theme/types').ThemeColors) => {
  const sheet = StyleSheet.create({
    label: { color: colors.muted, marginBottom: 7, fontWeight: '500' },
    field: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: Radius.md,
      backgroundColor: colors.surface,
      paddingHorizontal: 14,
      minHeight: FIELD_HEIGHT,
    },
    fieldFocused: {
      backgroundColor: colors.inputFilled,
    },
    leftIcon: { marginRight: 10 },
    input: { flex: 1, fontSize: 15, color: colors.dark },
    eyeBtn: { padding: 4 },
    errorRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 5 },
    errorText: { color: colors.error },
    hint: { color: colors.muted, marginTop: 5 },
  });
  return { ...sheet, colors };
};

function useStyles() {
  return useThemedStyles(createStyles);
}
