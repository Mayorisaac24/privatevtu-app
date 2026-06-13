import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTransactionLockAuth, type TransactionAuthPayload } from '../../hooks/useTransactionLockAuth';
import { getBiometricCapability } from '../../lib/biometric-auth';
import { useStatusBarStyle } from '../../hooks/useStatusBarStyle';
import { Colors, Radius, Shadow, Spacing, Typography } from '../../theme';
import { useColors, useGradients } from '../../theme/hooks';
import { gradientStops } from '../../theme/gradient-utils';
import { PinDots, PinKeypad } from './PinKeypad';
import { isAndroid } from '../../lib/platform-ui';

type TransactionLockSheetProps = {
  visible: boolean;
  onClose: () => void;
  onAuthorized: (payload: TransactionAuthPayload) => void | Promise<void>;
  title?: string;
  subtitle?: string;
  amount?: string;
  processing?: boolean;
};

function recipientFromSubtitle(subtitle?: string): string | null {
  if (!subtitle) return null;
  const match = subtitle.match(/\bto\s+(.+)$/i);
  return match ? match[1].trim() : subtitle;
}

export function TransactionLockSheet({
  visible,
  onClose,
  onAuthorized,
  title = 'Authorize transaction',
  subtitle = 'Confirm with your PIN or biometrics to complete this payment.',
  amount,
  processing = false,
}: TransactionLockSheetProps) {
  useStatusBarStyle('light');
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const gradients = useGradients();
  const [pin, setPin] = useState('');
  const [bioLoading, setBioLoading] = useState(false);
  const [authorizing, setAuthorizing] = useState(false);
  const [bioIcon, setBioIcon] = useState<keyof typeof Ionicons.glyphMap>('finger-print-outline');
  const {
    biometricEnabled,
    biometricVerified,
    biometricLabel,
    prefsReady,
    retryBiometric,
    buildAuthPayload,
    resetAuth,
  } = useTransactionLockAuth(visible);

  const recipient = recipientFromSubtitle(subtitle);

  useEffect(() => {
    void getBiometricCapability().then((capability) => {
      if (capability.label === 'Face ID') {
        setBioIcon('scan-outline');
      }
    });
  }, []);

  const finishAuth = useCallback(async (payload: TransactionAuthPayload | null) => {
    if (!payload) {
      setPin('');
      return;
    }
    setAuthorizing(true);
    try {
      await onAuthorized(payload);
    } catch {
      setPin('');
    } finally {
      setAuthorizing(false);
    }
  }, [onAuthorized]);

  useEffect(() => {
    if (!visible) {
      setPin('');
      setBioLoading(false);
      setAuthorizing(false);
      resetAuth();
    }
  }, [visible, resetAuth]);

  useEffect(() => {
    if (!visible || !biometricVerified || authorizing || processing) return;
    void (async () => {
      const payload = await buildAuthPayload('');
      await finishAuth(payload);
    })();
  }, [visible, biometricVerified, buildAuthPayload, finishAuth, authorizing, processing]);

  useEffect(() => {
    if (pin.length !== 4 || authorizing || processing) return;
    void (async () => {
      const payload = await buildAuthPayload(pin);
      await finishAuth(payload);
    })();
  }, [pin, buildAuthPayload, finishAuth, authorizing, processing]);

  const handleBiometric = async () => {
    setBioLoading(true);
    try {
      await retryBiometric();
    } finally {
      setBioLoading(false);
    }
  };

  const busy = processing || authorizing || bioLoading;
  const showBiometric = biometricEnabled && !biometricVerified;
  const statusLabel = processing ? 'Processing payment…' : 'Authorizing…';

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View style={[styles.root, { backgroundColor: colors.pageBg }]}>
        <LinearGradient
          colors={gradientStops(gradients.heroAuth)}
          style={[styles.hero, { paddingTop: insets.top + 8 }]}
        >
          <View style={styles.heroMeshPrimary} />
          <View style={styles.heroMeshSecondary} />

          <View style={styles.heroTopRow}>
            <View style={styles.heroTopSpacer} />
            <View style={styles.secureChip}>
              <Ionicons name="shield-checkmark" size={12} color="rgba(255,255,255,0.9)" />
              <Text style={styles.secureChipText}>Secure payment</Text>
            </View>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={onClose}
              disabled={busy}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Cancel"
            >
              <Ionicons name="close" size={22} color={Colors.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.heroIconRing}>
            <LinearGradient colors={gradientStops(gradients.primary)} style={styles.heroIcon}>
              <Ionicons name="shield-checkmark" size={22} color={Colors.white} />
            </LinearGradient>
          </View>

          {amount ? (
            <Text style={styles.heroAmount}>{amount}</Text>
          ) : null}

          <Text style={styles.heroTitle} numberOfLines={2}>
            {title}
          </Text>

          {recipient ? (
            <View style={styles.recipientRow}>
              <Ionicons name="call-outline" size={13} color="rgba(255,255,255,0.72)" />
              <Text style={styles.recipientText} numberOfLines={1}>
                {recipient}
              </Text>
            </View>
          ) : null}
        </LinearGradient>

        <LinearGradient
          colors={gradientStops([gradients.header[1], colors.pageBg])}
          style={styles.bodyFade}
        >
          <View style={styles.pinSection}>
            <Text style={[styles.pinHint, { color: colors.muted }]}>
              {biometricEnabled
                ? 'Enter PIN or use biometric to complete transaction'
                : 'Enter your 4-digit PIN to authorize'}
            </Text>

            {!prefsReady ? (
              <View style={styles.preparing}>
                <ActivityIndicator color={colors.primary} size="large" />
                <Text style={[styles.preparingText, { color: colors.muted }]}>
                  Preparing secure authorization…
                </Text>
              </View>
            ) : (
              <View style={styles.pinBlock}>
                <PinDots value={pin} variant="light" size="lg" />

                {(authorizing || processing) ? (
                  <View style={styles.statusRow}>
                    <ActivityIndicator color={colors.primary} size="small" />
                    <Text style={[styles.statusText, { color: colors.muted }]}>{statusLabel}</Text>
                  </View>
                ) : (
                  <View style={styles.statusSpacer} />
                )}
              </View>
            )}
          </View>

          <View style={[styles.keypadDock, { paddingBottom: insets.bottom + 14 }]}>
            {prefsReady ? (
              <PinKeypad
                value={pin}
                onChange={setPin}
                disabled={busy}
                showDots={false}
                showStatus={false}
                variant="light"
                bottomLeftAction={
                  showBiometric
                    ? {
                        icon: bioIcon,
                        onPress: () => void handleBiometric(),
                        loading: bioLoading,
                        disabled: busy,
                        accessibilityLabel: `Authorize with ${biometricLabel}`,
                      }
                    : undefined
                }
              />
            ) : null}

            <View style={styles.secureRow}>
              <Ionicons name="lock-closed" size={12} color={colors.mutedLight} />
              <Text style={[styles.secureText, { color: colors.mutedLight }]}>
                End-to-end secured · Never share your PIN
              </Text>
            </View>
          </View>
        </LinearGradient>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  hero: {
    paddingHorizontal: Spacing.page,
    paddingBottom: isAndroid ? 26 : 30,
    overflow: 'hidden',
    position: 'relative',
    alignItems: 'center',
    gap: 6,
  },
  heroMeshPrimary: {
    position: 'absolute',
    top: -20,
    right: -24,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(139, 92, 246, 0.24)',
  },
  heroMeshSecondary: {
    position: 'absolute',
    top: 48,
    left: -36,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(99, 102, 241, 0.18)',
  },
  heroTopRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    zIndex: 1,
  },
  heroTopSpacer: {
    width: 40,
  },
  secureChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  secureChipText: {
    ...Typography.caption,
    color: 'rgba(255,255,255,0.88)',
    fontWeight: '600',
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.sm,
  },
  heroIconRing: {
    padding: 3,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.14)',
    marginTop: 2,
    zIndex: 1,
  },
  heroIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroAmount: {
    fontSize: 36,
    fontWeight: '800',
    color: Colors.white,
    letterSpacing: -1,
    marginTop: 4,
    zIndex: 1,
  },
  heroTitle: {
    ...Typography.bodyMed,
    color: 'rgba(255,255,255,0.92)',
    fontWeight: '600',
    textAlign: 'center',
    maxWidth: 300,
    zIndex: 1,
  },
  recipientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255,255,255,0.1)',
    maxWidth: '100%',
    zIndex: 1,
  },
  recipientText: {
    ...Typography.small,
    color: 'rgba(255,255,255,0.78)',
    fontWeight: '500',
    flexShrink: 1,
  },
  bodyFade: {
    flex: 1,
  },
  pinSection: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: isAndroid ? 32 : 40,
    gap: 18,
  },
  pinHint: {
    ...Typography.small,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },
  pinBlock: {
    alignItems: 'center',
    gap: 14,
    minHeight: 56,
  },
  preparing: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 24,
  },
  preparingText: {
    ...Typography.bodyMed,
    fontWeight: '600',
    textAlign: 'center',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 22,
  },
  statusSpacer: {
    minHeight: 4,
  },
  statusText: {
    ...Typography.small,
    fontWeight: '600',
  },
  keypadDock: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingTop: 8,
    width: '100%',
  },
  secureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 10,
    paddingBottom: 2,
  },
  secureText: {
    ...Typography.caption,
    textAlign: 'center',
  },
});
