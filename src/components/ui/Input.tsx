import React, { useState } from 'react';
import {
  View, TextInput, TouchableOpacity, ViewStyle, TextStyle, TextInputProps,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Typography } from '../../theme';
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
  const [focused, setFocused] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const isPassword = secureTextEntry;

  const borderColor = error ? Colors.error : focused ? Colors.primary : Colors.border;

  return (
    <View style={[{ marginBottom: platformSpacing(16) }, containerStyle]}>
      {label ? (
        <AppText variant="captionMed" style={{ color: Colors.muted, marginBottom: 7, fontWeight: '500' }}>
          {label}
        </AppText>
      ) : null}
      <View style={{
        flexDirection: 'row', alignItems: 'center',
        borderWidth: focused ? 2 : 1.5,
        borderColor,
        borderRadius: Radius.md,
        backgroundColor: focused ? Colors.white : Colors.surface,
        paddingHorizontal: 14,
        minHeight: FIELD_HEIGHT,
      }}>
        {leftIcon ? <View style={{ marginRight: 10 }}>{leftIcon}</View> : null}
        <TextInput
          style={mergeInputStyle({ flex: 1, fontSize: 15, color: Colors.dark, ...(inputStyle as object) })}
          placeholderTextColor={Colors.mutedLight}
          underlineColorAndroid="transparent"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          secureTextEntry={isPassword && !showPw}
          {...props}
        />
        {isPassword ? (
          <TouchableOpacity onPress={() => setShowPw(!showPw)} style={{ padding: 4 }}>
            <Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={18} color={Colors.muted} />
          </TouchableOpacity>
        ) : null}
        {rightIcon && !isPassword ? <View>{rightIcon}</View> : null}
      </View>
      {error ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 5 }}>
          <Ionicons name="alert-circle-outline" size={12} color={Colors.error} />
          <AppText variant="caption" style={{ color: Colors.error }}>{error}</AppText>
        </View>
      ) : hint ? (
        <AppText variant="caption" style={{ color: Colors.muted, marginTop: 5 }}>{hint}</AppText>
      ) : null}
    </View>
  );
}
