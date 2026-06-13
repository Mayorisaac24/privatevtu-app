import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Typography } from '../../theme';

type Props = {
  biometricEnabled: boolean;
  biometricVerified: boolean;
  biometricLabel: string;
  onRetryBiometric: () => void;
  onUsePinInstead: () => void;
};

export function TransactionAuthActions({
  biometricEnabled,
  biometricVerified,
  biometricLabel,
  onRetryBiometric,
  onUsePinInstead,
}: Props) {
  if (!biometricEnabled) return null;

  if (biometricVerified) {
    return (
      <View style={styles.verifiedWrap}>
        <View style={styles.verifiedBadge}>
          <Ionicons name="finger-print" size={16} color={Colors.success} />
          <Text style={styles.verifiedText}>Verified with {biometricLabel}</Text>
        </View>
        <TouchableOpacity onPress={onUsePinInstead} activeOpacity={0.8}>
          <Text style={styles.linkText}>Use PIN instead</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <TouchableOpacity style={styles.retryBtn} onPress={() => void onRetryBiometric()} activeOpacity={0.85}>
      <Ionicons name="finger-print-outline" size={16} color={Colors.primary} />
      <Text style={styles.retryText}>Confirm with {biometricLabel}</Text>
    </TouchableOpacity>
  );
}

export function transactionAuthHint(
  biometricEnabled: boolean,
  biometricVerified: boolean,
  biometricLabel: string,
): string {
  if (biometricVerified) return `Authorized with ${biometricLabel}. Tap confirm to complete.`;
  if (biometricEnabled) return `Use ${biometricLabel} or enter your 4-digit PIN`;
  return 'Enter your 4-digit PIN to authorize';
}

const styles = StyleSheet.create({
  verifiedWrap: { gap: 10, marginBottom: 12 },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    backgroundColor: Colors.successLight,
    borderRadius: Radius.full,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  verifiedText: { ...Typography.small, color: Colors.success, fontWeight: '600' },
  linkText: { ...Typography.small, color: Colors.primary, fontWeight: '600' },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radius.md,
    backgroundColor: Colors.primaryMuted,
  },
  retryText: { ...Typography.small, color: Colors.primary, fontWeight: '600' },
});
