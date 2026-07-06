import { Platform, View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { BiometricUiPresentation } from '../../lib/biometric-ui';

type BiometricKeyGlyphProps = {
  presentation: BiometricUiPresentation;
  color: string;
  loading?: boolean;
  /** Login / compact action button */
  compact?: boolean;
  /** iOS keypad: icon only. Android keypad: icon + short label. */
  showLabel?: boolean;
};

export function BiometricKeyGlyph({
  presentation,
  color,
  loading = false,
  compact = false,
  showLabel = Platform.OS === 'android',
}: BiometricKeyGlyphProps) {
  if (loading) {
    return <ActivityIndicator color={color} size="small" />;
  }

  const iconSize = compact
    ? Platform.OS === 'ios' ? 24 : 26
    : Platform.OS === 'ios' ? 24 : 28;

  return (
    <View style={styles.wrap}>
      <MaterialCommunityIcons
        name={presentation.icon}
        size={iconSize}
        color={color}
      />
      {showLabel ? (
        <Text style={[styles.label, { color }]} numberOfLines={1}>
          {presentation.shortLabel}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingHorizontal: 2,
  },
  label: {
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 0.1,
    textAlign: 'center',
    lineHeight: 11,
    opacity: 0.88,
  },
});
