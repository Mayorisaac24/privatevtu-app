import { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Bank } from '../lib/api';
import { enrichTransferBank } from '../lib/transfer-banks';
import { BankLogo } from './BankLogo';
import { Colors, Gradients, Radius, Shadow, Spacing } from '../theme';
import { ThemedScreen } from '../components/ui/ThemedScreen';
import { GradientButton } from '../components/ui/GradientButton';
import { useGradients } from '../theme/hooks';
import { gradientStops } from '../theme/gradient-utils';
import { GlassCard } from './ui/GlassCard';


type Props = {
  visible: boolean;
  amount: number;
  fee?: number;
  totalDebit?: number;
  recipientName: string;
  accountNumber?: string;
  bank?: Bank | null;
  bankName?: string;
  reference?: string;
  onDone: () => void;
};

function SuccessCheckmark() {
  const scale = useRef(new Animated.Value(0)).current;
  const ring = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.spring(scale, {
        toValue: 1,
        friction: 6,
        tension: 90,
        useNativeDriver: true,
      }),
      Animated.loop(
        Animated.sequence([
          Animated.timing(ring, {
            toValue: 1,
            duration: 1600,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(ring, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
      ),
    ]).start();
  }, [ring, scale]);

  const ringScale = ring.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.45],
  });

  const ringOpacity = ring.interpolate({
    inputRange: [0, 1],
    outputRange: [0.45, 0],
  });

  return (
    <View style={styles.checkStage}>
      <Animated.View
        style={[
          styles.checkRing,
          {
            opacity: ringOpacity,
            transform: [{ scale: ringScale }],
          },
        ]}
      />
      <Animated.View style={[styles.checkCircle, { transform: [{ scale }] }]}>
        <Ionicons name="checkmark" size={38} color={Colors.white} />
      </Animated.View>
    </View>
  );
}

export function TransferSuccessModal({
  visible,
  amount,
  fee = 0,
  totalDebit,
  recipientName,
  accountNumber,
  bank,
  bankName,
  reference,
  onDone,
}: Props) {
  const insets = useSafeAreaInsets();
  const gradients = useGradients();
  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(24)).current;

  const bankDisplay = bank ? enrichTransferBank(bank) : null;
  const displayBankName = bankDisplay?.shortName || bankDisplay?.name || bankName || 'Bank';
  const debitTotal = totalDebit ?? amount + fee;

  useEffect(() => {
    if (!visible) {
      fade.setValue(0);
      slide.setValue(24);
      return;
    }

    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 320,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(slide, {
        toValue: 0,
        friction: 8,
        tension: 70,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fade, slide, visible]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDone}>
      <ThemedScreen>
        <LinearGradient
          colors={gradientStops(gradients.card)}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.hero, { paddingTop: insets.top + 28 }]}
        >
          <View style={styles.heroBlob1} />
          <View style={styles.heroBlob2} />

          <SuccessCheckmark />

          <Text style={styles.heroTitle}>Transfer sent</Text>
          <Text style={styles.heroAmount}>₦{amount.toLocaleString()}</Text>
          <View style={styles.statusPill}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>Processing · Usually instant</Text>
          </View>
        </LinearGradient>

        <Animated.View
          style={[
            styles.body,
            {
              paddingBottom: insets.bottom + 16,
              opacity: fade,
              transform: [{ translateY: slide }],
            },
          ]}
        >
          <GlassCard borderRadius={Radius.xl} padding={18} contentStyle={styles.receiptCard}>
            <Text style={styles.receiptLabel}>Recipient</Text>

            <View style={styles.recipientRow}>
              <View style={styles.recipientLogo}>
                {bankDisplay ? (
                  <BankLogo bank={bankDisplay} size={46} />
                ) : (
                  <View style={styles.recipientLogoFallback}>
                    <Ionicons name="business-outline" size={22} color={Colors.primary} />
                  </View>
                )}
              </View>

              <View style={styles.recipientInfo}>
                <Text style={styles.recipientName} numberOfLines={2}>
                  {recipientName.toUpperCase()}
                </Text>
                <Text style={styles.recipientMeta}>
                  {displayBankName}
                  {accountNumber ? ` · ${accountNumber}` : ''}
                </Text>
              </View>

              <View style={styles.sentBadge}>
                <Ionicons name="paper-plane" size={14} color={Colors.primary} />
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.summaryRows}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryKey}>Amount sent</Text>
                <Text style={styles.summaryValue}>₦{amount.toLocaleString()}</Text>
              </View>
              {fee > 0 ? (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryKey}>Transfer fee</Text>
                  <Text style={styles.summaryValue}>₦{fee.toLocaleString()}</Text>
                </View>
              ) : null}
              <View style={[styles.summaryRow, styles.summaryRowHighlight]}>
                <Text style={styles.summaryKeyStrong}>Total debited</Text>
                <Text style={styles.summaryValueStrong}>₦{debitTotal.toLocaleString()}</Text>
              </View>
            </View>

            {reference ? (
              <>
                <View style={styles.divider} />
                <View style={styles.referenceRow}>
                  <Text style={styles.referenceLabel}>Reference</Text>
                  <Text style={styles.referenceValue} numberOfLines={1}>{reference}</Text>
                </View>
              </>
            ) : null}
          </GlassCard>

          <View style={styles.noticeRow}>
            <Ionicons name="notifications-outline" size={16} color={Colors.muted} />
            <Text style={styles.noticeText}>
              We&apos;ll notify you once the transfer is fully completed.
            </Text>
          </View>

          <GradientButton
            title="Done"
            onPress={onDone}
            rightIcon={<Ionicons name="arrow-forward" size={18} color={Colors.white} />}
            style={styles.doneWrap}
            gradientStyle={styles.doneBtn}
          />
        </Animated.View>
      </ThemedScreen>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  hero: {
    alignItems: 'center',
    paddingHorizontal: Spacing.page,
    paddingBottom: 34,
    overflow: 'hidden',
  },
  heroBlob1: {
    position: 'absolute',
    top: -30,
    right: -24,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  heroBlob2: {
    position: 'absolute',
    bottom: 10,
    left: -20,
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  checkStage: {
    width: 96,
    height: 96,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  checkRing: {
    position: 'absolute',
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.55)',
  },
  checkCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.md,
  },
  heroTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.78)',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  heroAmount: {
    fontSize: 40,
    fontWeight: '800',
    color: Colors.white,
    letterSpacing: -1,
    marginBottom: 14,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#A7F3D0',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
  },
  body: {
    flex: 1,
    marginTop: -18,
    paddingHorizontal: Spacing.page,
    paddingTop: 4,
    gap: 14,
  },
  receiptCard: {
    gap: 0,
  },
  receiptLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.muted,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  recipientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  recipientLogo: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  recipientLogoFallback: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: Colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recipientInfo: {
    flex: 1,
    gap: 3,
  },
  recipientName: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.dark,
    lineHeight: 18,
  },
  recipientMeta: {
    fontSize: 12,
    color: Colors.muted,
    fontWeight: '500',
  },
  sentBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 14,
  },
  summaryRows: {
    gap: 10,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryRowHighlight: {
    marginTop: 2,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  summaryKey: {
    fontSize: 13,
    color: Colors.muted,
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.dark,
  },
  summaryKeyStrong: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
  },
  summaryValueStrong: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.primary,
  },
  referenceRow: {
    gap: 4,
  },
  referenceLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  referenceValue: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.mid,
  },
  noticeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingHorizontal: 4,
  },
  noticeText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: Colors.muted,
  },
  doneWrap: {
    marginTop: 'auto',
  },
  doneBtn: {
    minHeight: 54,
    borderRadius: Radius.lg,
  },
});
