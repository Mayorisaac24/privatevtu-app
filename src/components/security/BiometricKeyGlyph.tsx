import { Platform, View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { BiometricUiPresentation } from '../../lib/biometric-ui';
import { BiometricScanIcon } from './BiometricScanIcon';

export type BiometricGlyphVariant = 'auth' | 'keypad-light' | 'keypad-dark';

type BiometricKeyGlyphProps = {
  presentation: BiometricUiPresentation;
  color: string;
  loading?: boolean;
  variant?: BiometricGlyphVariant;
  /** Android keypad: icon + short label under the key. */
  showLabel?: boolean;
  /** @deprecated Use variant="auth" */
  compact?: boolean;
};

function resolveVariant(
  variant: BiometricGlyphVariant | undefined,
  compact: boolean,
): BiometricGlyphVariant {
  if (variant) return variant;
  return compact ? 'auth' : 'keypad-light';
}

function BiometricIcon({
  presentation,
  color,
  size,
}: {
  presentation: BiometricUiPresentation;
  color: string;
  size: number;
}) {
  if (presentation.kind === 'generic') {
    return (
      <MaterialCommunityIcons
        name="shield-lock-outline"
        size={size}
        color={color}
      />
    );
  }

  return (
    <BiometricScanIcon
      kind={presentation.kind}
      size={size}
      color={color}
    />
  );
}

export function BiometricKeyGlyph({
  presentation,
  color,
  loading = false,
  variant,
  showLabel = Platform.OS === 'android',
  compact = false,
}: BiometricKeyGlyphProps) {
  const resolved = resolveVariant(variant, compact);

  if (loading) {
    return <ActivityIndicator color={color} size="small" />;
  }

  const iconSize = resolved === 'auth' ? 30 : 32;

  const icon = (
    <BiometricIcon presentation={presentation} color={color} size={iconSize} />
  );

  if (resolved === 'auth') {
    return (
      <View style={styles.authWrap}>
        <View style={[styles.authBadge, { borderColor: `${color}30`, backgroundColor: `${color}12` }]}>
          {icon}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.keypadWrap}>
      <View
        style={[
          styles.keypadBadge,
          resolved === 'keypad-dark' ? styles.keypadBadgeDark : styles.keypadBadgeLight,
          resolved === 'keypad-dark'
            ? { borderColor: 'rgba(255,255,255,0.28)' }
            : { borderColor: `${color}28`, backgroundColor: `${color}10` },
        ]}
      >
        {icon}
      </View>
      {showLabel && resolved === 'keypad-light' ? (
        <Text style={[styles.label, { color }]} numberOfLines={1}>
          {presentation.shortLabel}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  authWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  authBadge: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keypadWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 2,
  },
  keypadBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keypadBadgeLight: {},
  keypadBadgeDark: {
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  label: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.2,
    textAlign: 'center',
    lineHeight: 11,
    opacity: 0.9,
  },
});
