import {
  Animated,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { useEffect, useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { VirtualCardVisual } from './VirtualCardVisual';
import type { VirtualCardCredentials, VirtualCardSummary } from '../../lib/api';
import {
  formatCardExpiry,
  VIRTUAL_CARD_REVEAL_SECONDS,
} from '../../lib/virtual-card-utils';
import { Colors, Radius, useThemedStyles } from '../../theme';
import { useColors } from '../../theme/hooks';

export type VirtualCardRevealPhase = 'auth' | 'shown';

type VirtualCardRevealPanelProps = {
  visible: boolean;
  card: VirtualCardSummary;
  credentials: VirtualCardCredentials;
  onClose: () => void;
  onSessionEnd: () => void;
  onCopy: (label: string, value: string) => void;
};

function resolveExpiryDisplay(raw?: string | null, fallback?: string | null): string {
  const primary = formatCardExpiry(raw) || formatCardExpiry(fallback);
  if (primary) return primary;
  const text = String(raw || fallback || '').trim();
  if (!text) return '—';
  const parts = text.match(/^(\d{2})\/(\d{2})$/);
  if (parts) {
    const left = Number(parts[1]);
    const right = Number(parts[2]);
    if (left > 12 && right >= 1 && right <= 12) return `${parts[2]}/${parts[1]}`;
    if (right > 12 && left >= 1 && left <= 12) return `${parts[1]}/${parts[2]}`;
  }
  return text.length <= 10 ? text : '—';
}

function RevealSessionBar({
  active,
  durationMs,
  onComplete,
}: {
  active: boolean;
  durationMs: number;
  onComplete: () => void;
}) {
  const styles = useStyles();
  const progress = useRef(new Animated.Value(1)).current;
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    if (!active) {
      progress.setValue(1);
      return;
    }
    progress.setValue(1);
    const anim = Animated.timing(progress, {
      toValue: 0,
      duration: durationMs,
      useNativeDriver: false,
    });
    anim.start(({ finished }) => {
      if (finished) onCompleteRef.current();
    });
    return () => anim.stop();
  }, [active, durationMs, progress]);

  const width = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.sessionTrack} accessibilityLabel="Session time remaining">
      <Animated.View style={[styles.sessionFill, { width }]} />
    </View>
  );
}

function CopyDetailRow({
  label,
  value,
  onCopy,
  isLast,
}: {
  label: string;
  value: string;
  onCopy: () => void;
  isLast?: boolean;
}) {
  const styles = useStyles();
  const colors = useColors();
  const copyable = Boolean(value && value !== '—');

  return (
    <View style={[styles.detailRow, isLast && styles.detailRowLast]}>
      <View style={styles.detailCopy}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue} selectable={copyable}>
          {value}
        </Text>
      </View>
      <TouchableOpacity
        style={[styles.copyIconBtn, !copyable && styles.copyIconBtnDisabled]}
        onPress={onCopy}
        disabled={!copyable}
        accessibilityLabel={`Copy ${label}`}
      >
        <Ionicons name="copy-outline" size={18} color={copyable ? colors.dark : colors.muted} />
      </TouchableOpacity>
    </View>
  );
}

export function VirtualCardRevealPanel({
  visible,
  card,
  credentials,
  onClose,
  onSessionEnd,
  onCopy,
}: VirtualCardRevealPanelProps) {
  const styles = useStyles();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const panelWidth = Math.min(420, Math.max(320, windowWidth * 0.92));

  if (!visible) return null;

  const holderName = credentials.cardName?.trim() || card.cardName?.trim() || '—';
  const expiryDisplay = resolveExpiryDisplay(credentials.expiry, card.expiry);

  return (
    <View style={styles.overlayRoot} pointerEvents="box-none">
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityRole="button" />
      <View
        style={[
          styles.panel,
          {
            width: panelWidth,
            paddingTop: insets.top + 8,
            paddingBottom: insets.bottom + 12,
          },
        ]}
      >
          <View style={styles.panelHeader}>
            <Text style={styles.panelTitle}>Card details</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={12}>
              <Ionicons name="close" size={22} color={colors.dark} />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scrollContent}
          >
            <RevealSessionBar
              active={visible}
              durationMs={VIRTUAL_CARD_REVEAL_SECONDS * 1000}
              onComplete={onSessionEnd}
            />
            <VirtualCardVisual
              designId={card.cardDesign}
              brand={card.brand}
              cardName={card.cardName}
              maskedPan={card.maskedPan}
              expiry={credentials.expiry || card.expiry}
              status={card.status}
              size="list"
              showBalance={false}
              sensitivePan={credentials.cardNumber}
              sensitiveCvv={credentials.cvv}
            />
            <View style={styles.detailsList}>
              <CopyDetailRow
                label="Name on card"
                value={holderName}
                onCopy={() => onCopy('Name on card', holderName)}
              />
              <CopyDetailRow
                label="Card number"
                value={credentials.cardNumber.replace(/\s/g, '')}
                onCopy={() => onCopy('Card number', credentials.cardNumber.replace(/\s/g, ''))}
              />
              <CopyDetailRow
                label="Expiry date"
                value={expiryDisplay}
                onCopy={() => onCopy('Expiry date', expiryDisplay)}
              />
              <CopyDetailRow
                label="CVV"
                value={credentials.cvv}
                onCopy={() => onCopy('CVV', credentials.cvv)}
                isLast
              />
            </View>
            <Text style={styles.footnote}>
              Never share these details. They hide automatically when the bar above finishes — close this panel anytime.
            </Text>
          </ScrollView>
        </View>
    </View>
  );
}

const createStyles = (colors: import('../../theme/types').ThemeColors) => StyleSheet.create({
  overlayRoot: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
    elevation: 100,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15,10,25,0.42)' },
  panel: {
    flex: 1,
    maxWidth: '100%',
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: -6, height: 0 },
    shadowOpacity: 0.14,
    shadowRadius: 24,
    elevation: 20,
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  panelTitle: { fontSize: 17, fontWeight: '700', color: colors.dark },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 99,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
  },
  scrollContent: {
    paddingHorizontal: 20,
    gap: 14,
    paddingBottom: 8,
  },
  sessionTrack: {
    height: 3,
    borderRadius: 99,
    backgroundColor: `${Colors.primary}18`,
    overflow: 'hidden',
  },
  sessionFill: {
    height: '100%',
    borderRadius: 99,
    backgroundColor: Colors.primary,
  },
  detailsList: {
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  detailRowLast: { borderBottomWidth: 0 },
  detailCopy: { flex: 1, gap: 4, minWidth: 0 },
  detailLabel: { fontSize: 11, fontWeight: '600', color: colors.muted, letterSpacing: 0.3 },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.dark,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  copyIconBtn: {
    width: 40,
    height: 40,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  copyIconBtnDisabled: { opacity: 0.45 },
  footnote: {
    fontSize: 11,
    color: colors.muted,
    lineHeight: 16,
    textAlign: 'center',
    paddingHorizontal: 4,
  },
});

function useStyles() {
  return useThemedStyles(createStyles);
}
