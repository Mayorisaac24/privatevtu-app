import React, { useState } from 'react';
import {
  View, TextInput, Text, TouchableOpacity, ViewStyle, TextStyle, TextInputProps,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Typography } from '../../theme';

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
    <View style={[{ marginBottom: 16 }, containerStyle]}>
      {label && (
        <Text style={{
          ...Typography.smallMed,
          color: Colors.mid,
          marginBottom: 7,
          fontWeight: '600',
        }}>{label}</Text>
      )}
      <View style={{
        flexDirection: 'row', alignItems: 'center',
        borderWidth: focused ? 2 : 1.5,
        borderColor,
        borderRadius: Radius.md,
        backgroundColor: focused ? Colors.white : Colors.surface,
        paddingHorizontal: 14,
        height: 52,
      }}>
        {leftIcon && <View style={{ marginRight: 10 }}>{leftIcon}</View>}
        <TextInput
          style={[{ flex: 1, fontSize: 15, color: Colors.dark, paddingVertical: 0 }, inputStyle]}
          placeholderTextColor={Colors.mutedLight}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          secureTextEntry={isPassword && !showPw}
          {...props}
        />
        {isPassword && (
          <TouchableOpacity onPress={() => setShowPw(!showPw)} style={{ padding: 4 }}>
            <Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={18} color={Colors.muted} />
          </TouchableOpacity>
        )}
        {rightIcon && !isPassword && <View>{rightIcon}</View>}
      </View>
      {error ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 5 }}>
          <Ionicons name="alert-circle-outline" size={12} color={Colors.error} />
          <Text style={{ ...Typography.caption, color: Colors.error }}>{error}</Text>
        </View>
      ) : hint ? (
        <Text style={{ ...Typography.caption, color: Colors.muted, marginTop: 5 }}>{hint}</Text>
      ) : null}
    </View>
  );
}
