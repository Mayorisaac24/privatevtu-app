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

const BOX_SIZE = 46;
const BOX_GAP = 8;
const BOX_COUNT = 6;
const ROW_WIDTH = BOX_COUNT * BOX_SIZE + (BOX_COUNT - 1) * BOX_GAP;
const ROW_HEIGHT = 54;

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
    const activeIndex = Math.min(value.length, 5);

    useImperativeHandle(ref, () => inputRef.current as TextInput);

    useEffect(() => {
      if (!autoFocus) return;
      const timer = setTimeout(() => inputRef.current?.focus(), 400);
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
      // iOS number-pad blocks the native Paste menu — use default keyboard, digits only in handler.
      keyboardType: Platform.OS === 'ios' ? 'default' : 'number-pad',
      inputMode: 'numeric',
      maxLength: 6,
      caretHidden: true,
      selectionColor: Colors.primary,
      autoCorrect: false,
      autoCapitalize: 'none',
      spellCheck: false,
      textContentType: 'oneTimeCode',
      autoComplete: Platform.OS === 'android' ? 'sms-otp' : 'one-time-code',
      importantForAutofill: 'yes',
      underlineColorAndroid: 'transparent',
      contextMenuHidden: false,
    };

    return (
      <View style={styles.wrap}>
        <View style={styles.inputSlot}>
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
            style={styles.overlayInput}
          />
        </View>

        <Text style={styles.tapHint}>
          {value ? `Digit ${activeIndex + 1} of 6` : 'Tap to enter · hold to paste'}
        </Text>
      </View>
    );
  },
);

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  inputSlot: {
    width: ROW_WIDTH,
    height: ROW_HEIGHT,
    alignSelf: 'center',
  },
  row: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: BOX_GAP,
  },
  box: {
    width: BOX_SIZE,
    height: ROW_HEIGHT,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.borderSubtle,
    backgroundColor: '#FAFBFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxActive: {
    borderColor: Colors.primary,
    backgroundColor: '#FAF5FF',
    borderWidth: 2,
  },
  boxFilled: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryMuted,
  },
  digit: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.dark,
    letterSpacing: -0.5,
  },
  overlayInput: {
    ...StyleSheet.absoluteFillObject,
    color: 'transparent',
    backgroundColor: 'transparent',
    fontSize: 20,
    padding: 0,
    margin: 0,
    textAlign: 'center',
    ...(Platform.OS === 'ios' ? { opacity: 0.02 } : {}),
  },
  tapHint: {
    fontSize: 12,
    color: Colors.mutedLight,
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
      activeOpacity={0.7}
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
    minHeight: 48,
    paddingVertical: 12,
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
