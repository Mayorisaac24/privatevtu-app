import React, { useEffect, useImperativeHandle, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  type TextInputProps,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Typography } from '../../theme';
import { mergeInputStyle } from '../../lib/platform-ui';


type PremiumOtpInputProps = {
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  autoFocus?: boolean;
};

export const PremiumOtpInput = React.forwardRef<TextInput, PremiumOtpInputProps>(
  function PremiumOtpInput({ value, onChange, onComplete, autoFocus = true }, ref) {
    const inputRef = useRef<TextInput>(null);
    const digits = value.padEnd(6, ' ').split('').slice(0, 6);

    useImperativeHandle(ref, () => inputRef.current as TextInput);

    useEffect(() => {
      if (!autoFocus) return;
      const timer = setTimeout(() => inputRef.current?.focus(), 320);
      return () => clearTimeout(timer);
    }, [autoFocus]);

    const handleChange = (raw: string) => {
      const next = raw.replace(/\D/g, '').slice(0, 6);
      onChange(next);
      if (next.length === 6) onComplete?.(next);
    };

    const inputProps: TextInputProps = {
      value,
      onChangeText: handleChange,
      keyboardType: 'number-pad',
      inputMode: 'numeric',
      maxLength: 6,
      caretHidden: true,
      selectionColor: Colors.primary,
      autoFocus: false,
      showSoftInputOnFocus: true,
      textContentType: 'oneTimeCode',
      autoComplete: Platform.OS === 'android' ? 'sms-otp' : 'one-time-code',
      importantForAutofill: 'yes',
      underlineColorAndroid: 'transparent',
    };

    return (
      <View style={styles.wrap}>
        <View style={styles.row} pointerEvents="none">
          {digits.map((digit, index) => (
            <View
              key={index}
              style={[
                styles.box,
                value.length === index && styles.boxActive,
                digit.trim() && styles.boxFilled,
              ]}
            >
              <Text style={styles.digit}>{digit.trim()}</Text>
            </View>
          ))}
        </View>

        <TextInput
          ref={inputRef}
          {...inputProps}
          style={styles.overlay}
        />

        {!value ? (
          <View pointerEvents="none">
            <Text style={styles.tapHint}>Tap the boxes to enter your code</Text>
          </View>
        ) : null}
      </View>
    );
  },
);

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 8,
    minHeight: 62,
    position: 'relative',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  box: {
    flex: 1,
    maxWidth: 54,
    height: 62,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.white,
    borderWidth: 2,
  },
  boxFilled: {
    borderColor: 'rgba(124, 58, 237, 0.35)',
    backgroundColor: Colors.primaryMuted,
  },
  digit: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.dark,
    letterSpacing: -0.5,
  },
  overlay: mergeInputStyle({
    ...StyleSheet.absoluteFillObject,
    color: 'transparent',
    backgroundColor: 'transparent',
    fontSize: 16,
    zIndex: 2,
  }),
  tapHint: {
    marginTop: 10,
    fontSize: 12,
    color: Colors.muted,
    textAlign: 'center',
  },
});

export function OtpHelperTip({ text }: { text: string }) {
  return (
    <View style={helperStyles.tipRow}>
      <View style={helperStyles.tipIcon}>
        <Ionicons name="time-outline" size={15} color={Colors.primary} />
      </View>
      <Text style={helperStyles.tipText}>{text}</Text>
    </View>
  );
}

export function OtpResendButton({
  onPress,
  disabled,
  label = 'Resend code',
}: {
  onPress: () => void;
  disabled?: boolean;
  label?: string;
}) {
  return (
    <TouchableOpacity
      style={helperStyles.resendBtn}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
    >
      <Ionicons name="refresh-outline" size={16} color={disabled ? Colors.mutedLight : Colors.primary} />
      <Text style={[helperStyles.resendText, disabled && helperStyles.resendTextDisabled]}>{label}</Text>
    </TouchableOpacity>
  );
}

const helperStyles = StyleSheet.create({
  resendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 18,
    marginTop: 4,
  },
  resendText: {
    ...Typography.bodyMed,
    color: Colors.primary,
    fontWeight: '600',
  },
  resendTextDisabled: {
    color: Colors.mutedLight,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 12,
    padding: 14,
    borderRadius: Radius.md,
    backgroundColor: Colors.primaryMuted,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.12)',
  },
  tipIcon: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipText: {
    flex: 1,
    ...Typography.small,
    color: Colors.muted,
    lineHeight: 20,
  },
});
