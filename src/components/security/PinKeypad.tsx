import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../theme';
import { isAndroid } from '../../lib/platform-ui';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'bio', '0', 'back'] as const;

type PinKeypadBottomAction = {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  accessibilityLabel?: string;
};

type PinKeypadProps = {
  value: string;
  length?: number;
  onChange: (value: string) => void;
  disabled?: boolean;
  isLoading?: boolean;
  /** @deprecated Use isLoading */
  loading?: boolean;
  variant?: 'dark' | 'light';
  keyVariant?: 'filled' | 'minimal';
  bottomLeftAction?: PinKeypadBottomAction;
  showDots?: boolean;
  showStatus?: boolean;
  loadingLabel?: string;
};

type PinDotsProps = {
  value: string;
  length?: number;
  variant?: 'dark' | 'light';
  size?: 'md' | 'lg';
};

export function PinDots({
  value,
  length = 4,
  variant = 'light',
  size = 'md',
}: PinDotsProps) {
  const isDark = variant === 'dark';
  const dotSize = size === 'lg' ? 16 : 14;
  const coreSize = size === 'lg' ? 7 : 6;
  const gap = size === 'lg' ? 22 : 20;

  return (
    <View style={[styles.dotsRow, { gap }]}>
      {Array.from({ length }).map((_, index) => {
        const filled = index < value.length;
        const active = index === value.length;
        return (
          <View
            key={index}
            style={[
              styles.dot,
              {
                width: dotSize,
                height: dotSize,
                borderRadius: dotSize / 2,
              },
              isDark ? styles.dotDark : styles.dotLight,
              filled && (isDark ? styles.dotDarkFilled : styles.dotLightFilled),
              active && !filled && styles.dotActive,
            ]}
          >
            {filled ? (
              <View
                style={[
                  styles.dotCore,
                  {
                    width: coreSize,
                    height: coreSize,
                    borderRadius: coreSize / 2,
                  },
                  isDark ? styles.dotCoreDark : styles.dotCoreLight,
                ]}
              />
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

export function PinKeypad({
  value,
  length = 4,
  onChange,
  disabled = false,
  isLoading = false,
  loading,
  variant = 'dark',
  keyVariant = 'filled',
  bottomLeftAction,
  showDots = true,
  showStatus = true,
  loadingLabel = 'Verifying PIN…',
}: PinKeypadProps) {
  const isDark = variant === 'dark';
  const minimal = keyVariant === 'minimal' && !isDark;
  const busy = disabled || isLoading || loading;

  const pressDigit = (digit: string) => {
    if (busy || !digit) return;
    if (value.length >= length) return;
    onChange(`${value}${digit}`);
  };

  const pressBackspace = () => {
    if (busy || value.length === 0) return;
    onChange(value.slice(0, -1));
  };

  return (
    <View style={styles.wrap}>
      {showDots ? <PinDots value={value} length={length} variant={variant} /> : null}

      {showStatus && (isLoading || loading) ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator color={isDark ? Colors.white : Colors.primary} size="small" />
          <Text style={[styles.loadingText, isDark && styles.loadingTextDark]}>{loadingLabel}</Text>
        </View>
      ) : showStatus ? (
        <View style={styles.loadingSpacer} />
      ) : null}

      <View style={styles.grid}>
        {KEYS.map((key, index) => {
          if (key === 'bio') {
            if (!bottomLeftAction) {
              return <View key={`spacer-${index}`} style={styles.keySlot} />;
            }

            const actionBusy = busy || bottomLeftAction.loading || bottomLeftAction.disabled;
            return (
              <TouchableOpacity
                key="bio"
                style={styles.keySlot}
                onPress={bottomLeftAction.onPress}
                disabled={actionBusy}
                activeOpacity={0.72}
                accessibilityRole="button"
                accessibilityLabel={bottomLeftAction.accessibilityLabel || 'Unlock with biometric'}
              >
                <View
                  style={[
                    styles.key,
                    isDark ? styles.keyDark : minimal ? styles.keyMinimal : styles.keyLight,
                    actionBusy && styles.keyDisabled,
                  ]}
                >
                  {bottomLeftAction.loading ? (
                    <ActivityIndicator color={isDark ? Colors.white : Colors.primary} size="small" />
                  ) : (
                    <Ionicons
                      name={bottomLeftAction.icon}
                      size={26}
                      color={isDark ? Colors.white : Colors.primary}
                    />
                  )}
                </View>
              </TouchableOpacity>
            );
          }

          if (key === 'back') {
            return (
              <TouchableOpacity
                key="back"
                style={styles.keySlot}
                onPress={pressBackspace}
                disabled={busy || value.length === 0}
                activeOpacity={0.72}
                accessibilityRole="button"
                accessibilityLabel="Delete"
              >
                <View
                  style={[
                    styles.key,
                    isDark ? styles.keyDark : minimal ? styles.keyMinimal : styles.keyLight,
                    (busy || value.length === 0) && styles.keyDisabled,
                  ]}
                >
                  <Ionicons
                    name="backspace-outline"
                    size={24}
                    color={isDark ? Colors.white : Colors.dark}
                  />
                </View>
              </TouchableOpacity>
            );
          }

          return (
            <TouchableOpacity
              key={key}
              style={styles.keySlot}
              onPress={() => pressDigit(key)}
              disabled={busy}
              activeOpacity={0.72}
              accessibilityRole="button"
              accessibilityLabel={`Number ${key}`}
            >
              <View style={[styles.key, isDark ? styles.keyDark : minimal ? styles.keyMinimal : styles.keyLight, busy && styles.keyDisabled]}>
                <Text style={[styles.keyText, isDark ? styles.keyTextDark : styles.keyTextLight]}>{key}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const KEY_SIZE = isAndroid ? 72 : 76;

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    alignItems: 'center',
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    marginBottom: 8,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotDark: {
    borderColor: 'rgba(255,255,255,0.35)',
    backgroundColor: 'transparent',
  },
  dotLight: {
    borderColor: Colors.borderMid,
    backgroundColor: 'transparent',
  },
  dotDarkFilled: {
    borderColor: Colors.white,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  dotLightFilled: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryMuted,
  },
  dotActive: {
    borderColor: Colors.primary,
    borderWidth: 2,
  },
  dotCore: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotCoreDark: {
    backgroundColor: Colors.white,
  },
  dotCoreLight: {
    backgroundColor: Colors.primary,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 28,
    marginBottom: 10,
  },
  loadingSpacer: {
    minHeight: 28,
    marginBottom: 10,
  },
  loadingText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.muted,
  },
  loadingTextDark: {
    color: 'rgba(255,255,255,0.72)',
  },
  grid: {
    width: '100%',
    maxWidth: 300,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    rowGap: 12,
    columnGap: 18,
  },
  keySlot: {
    width: KEY_SIZE,
    height: KEY_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  key: {
    width: KEY_SIZE,
    height: KEY_SIZE,
    borderRadius: KEY_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyDark: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  keyLight: {
    backgroundColor: Colors.primaryMuted,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.12)',
  },
  keyMinimal: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.08)',
    ...(isAndroid
      ? { elevation: 2 }
      : {
          shadowColor: Colors.primaryDeep,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
        }),
  },
  keyDisabled: {
    opacity: 0.45,
  },
  keyText: {
    fontSize: 30,
    fontWeight: '400',
    letterSpacing: 0.5,
  },
  keyTextDark: {
    color: Colors.white,
  },
  keyTextLight: {
    color: Colors.primaryDeep,
    fontWeight: '500',
  },
});
