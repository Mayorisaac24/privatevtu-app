import { cloneElement, isValidElement, useEffect, useRef, type ReactNode } from 'react';
import {
  Animated,
  Easing,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { formatCurrency } from '../../lib/api';
import {
  defaultStatusLabel,
  type PurchaseSuccessMeta,
} from '../../lib/purchase-success';
import { showToast } from '../ui/Toast';
import {
  Colors,
  Radius,
  Shadow,
  Spacing,
  Palette,
  Overlays,
  useThemedStyles,
} from '../../theme';
import { ThemedScreen } from '../ui/ThemedScreen';
import { GradientButton } from '../ui/GradientButton';
import { useGradients } from '../../theme/hooks';
import { gradientStops } from '../../theme/gradient-utils';
import { GlassCard } from '../ui/GlassCard';
import { useKeyboardInsets } from '../../hooks/useKeyboardInsets';

type Props = PurchaseSuccessMeta & {
  visible: boolean;
  onDone: () => void;
  onViewReceipt?: () => void;
  footerExtra?: ReactNode;
};

function SuccessCheckmark() {
  const styles = useStyles();
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

export function PurchaseSuccessModal({
  visible,
  amountKobo,
  title,
  recipientLabel = 'Recipient',
  recipientName,
  recipientMeta,
  serviceIcon,
  status,
  statusLabel,
  highlightLabel,
  highlightValue,
  detailRows = [],
  reference,
  transactionId,
  notice,
  onDone,
  onViewReceipt,
  footerExtra,
}: Props) {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const gradients = useGradients();
  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(24)).current;
  const scrollRef = useRef<ScrollView>(null);
  const { keyboardVisible, keyboardHeight } = useKeyboardInsets();

  const displayReference = reference || transactionId;
  const pillLabel = statusLabel || defaultStatusLabel(status);
  const canViewReceipt = Boolean(transactionId && onViewReceipt);

  const scrollToFooter = () => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    });
  };

  useEffect(() => {
    if (keyboardVisible && footerExtra) {
      scrollToFooter();
    }
  }, [footerExtra, keyboardVisible]);

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

  const handleCopyHighlight = async () => {
    if (!highlightValue) return;
    await Clipboard.setStringAsync(highlightValue);
    showToast({ type: 'success', text1: `${highlightLabel || 'Value'} copied` });
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDone}>
      <ThemedScreen>
        <LinearGradient
          colors={gradientStops(gradients.card)}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.hero,
            { paddingTop: insets.top + (keyboardVisible ? 12 : 28) },
            keyboardVisible && styles.heroCompact,
          ]}
        >
          <View style={styles.heroBlob1} />
          <View style={styles.heroBlob2} />

          {!keyboardVisible ? <SuccessCheckmark /> : null}

          <Text style={[styles.heroTitle, keyboardVisible && styles.heroTitleCompact]}>{title}</Text>
          <Text style={[styles.heroAmount, keyboardVisible && styles.heroAmountCompact]}>
            {formatCurrency(amountKobo)}
          </Text>
          {status === 'processing' ? (
            <View style={styles.statusPill}>
              <View style={[styles.statusDot, styles.statusDotProcessing]} />
              <Text style={styles.statusText}>{pillLabel}</Text>
            </View>
          ) : null}
        </LinearGradient>

        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={0}
        >
          <ScrollView
            ref={scrollRef}
            style={styles.flex}
            contentContainerStyle={[
              styles.scrollContent,
              {
                paddingBottom: insets.bottom + (keyboardVisible ? keyboardHeight + 32 : 16),
              },
            ]}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
            showsVerticalScrollIndicator={false}
          >
            <Animated.View
              style={[
                styles.body,
                {
                  opacity: fade,
                  transform: [{ translateY: slide }],
                },
              ]}
            >
          <GlassCard borderRadius={Radius.xl} padding={18} contentStyle={styles.receiptCard}>
            <Text style={styles.receiptLabel}>{recipientLabel}</Text>

            <View style={styles.recipientRow}>
              <View style={styles.recipientLogo}>
                <Ionicons name={serviceIcon} size={22} color={Colors.primary} />
              </View>

              <View style={styles.recipientInfo}>
                <Text style={styles.recipientName} numberOfLines={2}>
                  {recipientName}
                </Text>
                {recipientMeta ? (
                  <Text style={styles.recipientMeta} numberOfLines={2}>
                    {recipientMeta}
                  </Text>
                ) : null}
              </View>

              <View style={styles.sentBadge}>
                <Ionicons name="checkmark-circle" size={16} color={Colors.primary} />
              </View>
            </View>

            {highlightValue ? (
              <>
                <View style={styles.divider} />
                <View style={styles.highlightBlock}>
                  <Text style={styles.highlightLabel}>{highlightLabel || 'Token'}</Text>
                  <View style={styles.highlightRow}>
                    <Text style={styles.highlightValue} selectable>
                      {highlightValue}
                    </Text>
                    <TouchableOpacity
                      style={styles.copyBtn}
                      onPress={handleCopyHighlight}
                      activeOpacity={0.75}
                    >
                      <Ionicons name="copy-outline" size={16} color={Colors.primary} />
                    </TouchableOpacity>
                  </View>
                </View>
              </>
            ) : null}

            {detailRows.length > 0 ? (
              <>
                <View style={styles.divider} />
                <View style={styles.summaryRows}>
                  {detailRows.map((row) => (
                    <View key={row.label} style={styles.summaryRow}>
                      <Text style={styles.summaryKey}>{row.label}</Text>
                      <Text style={styles.summaryValue} numberOfLines={2}>
                        {row.value}
                      </Text>
                    </View>
                  ))}
                </View>
              </>
            ) : null}

            <View style={styles.divider} />

            <View style={styles.summaryRows}>
              <View style={[styles.summaryRow, styles.summaryRowHighlight]}>
                <Text style={styles.summaryKeyStrong}>Amount paid</Text>
                <Text style={styles.summaryValueStrong}>{formatCurrency(amountKobo)}</Text>
              </View>
            </View>

            {displayReference ? (
              <>
                <View style={styles.divider} />
                <View style={styles.referenceRow}>
                  <Text style={styles.referenceLabel}>Reference</Text>
                  <Text style={styles.referenceValue} numberOfLines={1}>
                    {displayReference}
                  </Text>
                </View>
              </>
            ) : null}
          </GlassCard>

          {notice ? (
            <View style={styles.noticeRow}>
              <Ionicons name="notifications-outline" size={16} color={Colors.muted} />
              <Text style={styles.noticeText}>{notice}</Text>
            </View>
          ) : null}

          {footerExtra ? (
            <View style={styles.footerExtra}>
              {isValidElement(footerExtra)
                ? cloneElement(footerExtra, { onInputFocus: scrollToFooter })
                : footerExtra}
            </View>
          ) : null}

          {canViewReceipt ? (
            <TouchableOpacity style={styles.secondaryBtn} onPress={onViewReceipt} activeOpacity={0.85}>
              <Ionicons name="receipt-outline" size={17} color={Colors.primary} />
              <Text style={styles.secondaryBtnText}>View receipt</Text>
            </TouchableOpacity>
          ) : null}

          <GradientButton
            title="Done"
            onPress={onDone}
            size="compact"
            rightIcon={<Ionicons name="arrow-forward" size={17} color={Colors.white} />}
            style={styles.doneWrap}
          />
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </ThemedScreen>
    </Modal>
  );
}

const createStyles = (colors: import('../../theme/types').ThemeColors) =>
  StyleSheet.create({
    flex: { flex: 1 },
    scrollContent: {
      flexGrow: 1,
      paddingHorizontal: Spacing.page,
      paddingTop: 4,
    },
    hero: {
      alignItems: 'center',
      paddingHorizontal: Spacing.page,
      paddingBottom: 34,
      overflow: 'hidden',
    },
    heroCompact: {
      paddingBottom: 14,
    },
    heroBlob1: {
      position: 'absolute',
      top: -30,
      right: -24,
      width: 140,
      height: 140,
      borderRadius: 70,
      backgroundColor: Overlays.white07,
    },
    heroBlob2: {
      position: 'absolute',
      bottom: 10,
      left: -20,
      width: 90,
      height: 90,
      borderRadius: 45,
      backgroundColor: Overlays.rgba255_255_255_005,
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
      borderColor: Overlays.white55,
    },
    checkCircle: {
      width: 76,
      height: 76,
      borderRadius: 38,
      backgroundColor: Overlays.white18,
      borderWidth: 2,
      borderColor: Overlays.glassShine,
      alignItems: 'center',
      justifyContent: 'center',
      ...Shadow.md,
    },
    heroTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: Overlays.white78,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      marginBottom: 6,
      textAlign: 'center',
    },
    heroTitleCompact: {
      fontSize: 13,
      marginBottom: 4,
    },
    heroAmount: {
      fontSize: 40,
      fontWeight: '800',
      color: colors.white,
      letterSpacing: -1,
      marginBottom: 14,
    },
    heroAmountCompact: {
      fontSize: 30,
      marginBottom: 6,
    },
    statusPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: Radius.full,
      backgroundColor: Overlays.white14,
      borderWidth: 1,
      borderColor: Overlays.rgba255_255_255_02,
    },
    statusDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: Palette.successSoft,
    },
    statusDotProcessing: {
      backgroundColor: colors.warning,
    },
    statusText: {
      fontSize: 12,
      fontWeight: '600',
      color: Overlays.white90,
    },
    body: {
      marginTop: -18,
      gap: 14,
    },
    receiptCard: {
      gap: 0,
    },
    receiptLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.muted,
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
      backgroundColor: colors.primaryMuted,
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
      color: colors.dark,
      lineHeight: 18,
    },
    recipientMeta: {
      fontSize: 12,
      color: colors.muted,
      fontWeight: '500',
    },
    sentBadge: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: colors.primaryMuted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    divider: {
      height: 1,
      backgroundColor: colors.surfaceAlt,
      marginVertical: 14,
    },
    highlightBlock: {
      gap: 8,
    },
    highlightLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.muted,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },
    highlightRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: colors.primaryMuted,
      borderRadius: Radius.md,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    highlightValue: {
      flex: 1,
      fontSize: 15,
      fontWeight: '700',
      color: colors.primary,
      letterSpacing: 0.5,
    },
    copyBtn: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: colors.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
    },
    summaryRows: {
      gap: 10,
    },
    summaryRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 12,
    },
    summaryRowHighlight: {
      marginTop: 2,
    },
    summaryKey: {
      fontSize: 13,
      color: colors.muted,
      flex: 1,
    },
    summaryValue: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.dark,
      flex: 1,
      textAlign: 'right',
    },
    summaryKeyStrong: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.primary,
    },
    summaryValueStrong: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.primary,
    },
    referenceRow: {
      gap: 4,
    },
    referenceLabel: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.muted,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    referenceValue: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.mid,
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
      color: colors.muted,
    },
    footerExtra: {
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    secondaryBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 14,
      borderRadius: Radius.lg,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.card,
    },
    secondaryBtnText: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.primary,
    },
    doneWrap: {
      marginTop: 4,
    },
  });

function useStyles() {
  return useThemedStyles(createStyles);
}
