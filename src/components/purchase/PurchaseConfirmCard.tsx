import { View, Text, Image, StyleSheet, type ImageSourcePropType } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { GlassCard } from '../ui/GlassCard';
import { Overlays, Radius, Shadow, getPurchaseConfirmGradient, useColors, useGradients, useThemedStyles } from '../../theme';
import type { ThemeColors } from '../../theme';
import { formatCurrency } from '../../lib/api';

export type PurchaseConfirmRow = {
  label: string;
  value: string;
  highlight?: boolean;
};

type PurchaseConfirmCardProps = {
  eyebrow: string;
  amount: string;
  title: string;
  chip?: string;
  logo?: ImageSourcePropType;
  icon?: keyof typeof Ionicons.glyphMap;
  rows: PurchaseConfirmRow[];
  /** @deprecated All purchase confirms use the brand card gradient. */
  accent?: 'airtime' | 'data' | 'default';
  walletBalanceKobo?: number;
  requiredKobo?: number;
  insufficientFunds?: boolean;
};

function InsufficientBalanceNotice({
  walletBalanceNaira,
  requiredNaira,
}: {
  walletBalanceNaira: number;
  requiredNaira: number;
}) {
  const colors = useColors();
  const styles = useThemedStyles(createStyles);

  return (
    <View style={[styles.insufficientBanner, { borderColor: Overlays.borderError12 }]}>
      <Ionicons name="warning-outline" size={18} color={colors.error} />
      <View style={styles.insufficientTextWrap}>
        <Text style={styles.insufficientTitle}>Insufficient balance</Text>
        <Text style={styles.insufficientBody}>
          Available: ₦{walletBalanceNaira.toLocaleString()} · Required: ₦{requiredNaira.toLocaleString()}
        </Text>
      </View>
    </View>
  );
}

export function PurchaseConfirmCard({
  eyebrow,
  amount,
  title,
  chip,
  logo,
  icon = 'receipt-outline',
  rows,
  walletBalanceKobo,
  requiredKobo,
  insufficientFunds = false,
}: PurchaseConfirmCardProps) {
  const colors = useColors();
  const gradients = useGradients();
  const styles = useThemedStyles(createStyles);
  const gradient = getPurchaseConfirmGradient(gradients);
  const detailRows = walletBalanceKobo != null
    ? [
      ...rows,
      {
        label: 'Wallet balance',
        value: formatCurrency(walletBalanceKobo),
        highlight: !insufficientFunds,
      },
    ]
    : rows;

  return (
    <GlassCard variant="solid" borderRadius={Radius.xl} padding={0} style={styles.sheet} contentStyle={styles.sheetInner}>
      <LinearGradient
        colors={[...gradient]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <View style={styles.heroBlob1} />
        <View style={styles.heroBlob2} />

        <View style={styles.heroRow}>
          <View style={styles.logoRing}>
            {logo ? (
              <Image source={logo} style={styles.logo} resizeMode="contain" />
            ) : (
              <View style={[styles.iconFallback, { backgroundColor: colors.primary }]}>
                <Ionicons name={icon} size={28} color={colors.white} />
              </View>
            )}
          </View>

          <View style={styles.heroInfo}>
            <Text style={styles.eyebrow}>{eyebrow}</Text>
            <Text style={[styles.amount, { color: colors.white }]}>{amount}</Text>
            <Text style={styles.title} numberOfLines={2}>{title}</Text>
            {chip ? (
              <View style={styles.chip}>
                <Text style={styles.chipText}>{chip}</Text>
              </View>
            ) : null}
          </View>
        </View>
      </LinearGradient>

      <View style={styles.body}>
        {detailRows.map((row, index) => (
          <View
            key={row.label}
            style={[styles.row, index < detailRows.length - 1 && styles.rowBorder]}
          >
            <Text style={styles.rowLabel}>{row.label}</Text>
            <Text
              style={[
                styles.rowValue,
                row.highlight && styles.rowValueHighlight,
                row.label === 'Wallet balance' && insufficientFunds && styles.rowValueError,
              ]}
              numberOfLines={2}
            >
              {row.value}
            </Text>
          </View>
        ))}

        {insufficientFunds && requiredKobo != null ? (
          <InsufficientBalanceNotice
            walletBalanceNaira={(walletBalanceKobo ?? 0) / 100}
            requiredNaira={requiredKobo / 100}
          />
        ) : null}
      </View>
    </GlassCard>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  sheet: {
    overflow: 'hidden',
    marginBottom: 14,
  },
  sheetInner: {
    padding: 0,
    overflow: 'hidden',
  },
  hero: {
    paddingVertical: 22,
    paddingHorizontal: 18,
    overflow: 'hidden',
  },
  heroBlob1: {
    position: 'absolute',
    top: -28,
    right: -18,
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: Overlays.white08,
  },
  heroBlob2: {
    position: 'absolute',
    bottom: -18,
    left: -10,
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Overlays.white06,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  logoRing: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: Overlays.white95,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Overlays.white72,
    ...Shadow.sm,
  },
  logo: {
    width: 52,
    height: 32,
  },
  iconFallback: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroInfo: {
    flex: 1,
    gap: 2,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '600',
    color: Overlays.white65,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  amount: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.8,
    marginTop: 2,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: Overlays.white92,
    marginTop: 4,
    lineHeight: 18,
  },
  chip: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.full,
    backgroundColor: Overlays.white14,
    borderWidth: 1,
    borderColor: Overlays.white18,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '600',
    color: Overlays.white90,
  },
  body: {
    paddingHorizontal: 18,
    paddingTop: 6,
    paddingBottom: 4,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 14,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.surface,
  },
  rowLabel: {
    fontSize: 13,
    color: colors.muted,
    flexShrink: 0,
  },
  rowValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.dark,
    textAlign: 'right',
    flex: 1,
  },
  rowValueHighlight: {
    color: colors.primary,
    fontWeight: '800',
    fontSize: 15,
  },
  rowValueError: {
    color: colors.error,
  },
  insufficientBanner: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 12,
    borderRadius: Radius.lg,
    backgroundColor: colors.errorLight,
    borderWidth: 1,
  },
  insufficientTextWrap: {
    flex: 1,
    gap: 2,
  },
  insufficientTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.errorDark,
  },
  insufficientBody: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.error,
  },
});
