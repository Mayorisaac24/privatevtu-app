import { View, Text, Image, StyleSheet, type ImageSourcePropType } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { GlassCard } from '../ui/GlassCard';
import { Colors, Radius, Shadow, Gradients } from '../../theme';

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
  accent?: 'airtime' | 'data' | 'default';
};

const ACCENT_GRADIENTS = {
  airtime: Gradients.card,
  data: ['#065F46', '#059669', '#10B981'] as [string, string, ...string[]],
  default: Gradients.card,
};

export function PurchaseConfirmCard({
  eyebrow,
  amount,
  title,
  chip,
  logo,
  icon = 'receipt-outline',
  rows,
  accent = 'default',
}: PurchaseConfirmCardProps) {
  const gradient = ACCENT_GRADIENTS[accent];

  return (
    <GlassCard variant="solid" borderRadius={Radius.xl} padding={0} style={styles.sheet} contentStyle={styles.sheetInner}>
      <LinearGradient
        colors={gradient}
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
              <View style={styles.iconFallback}>
                <Ionicons name={icon} size={28} color={Colors.white} />
              </View>
            )}
          </View>

          <View style={styles.heroInfo}>
            <Text style={styles.eyebrow}>{eyebrow}</Text>
            <Text style={styles.amount}>{amount}</Text>
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
        {rows.map((row, index) => (
          <View
            key={row.label}
            style={[styles.row, index < rows.length - 1 && styles.rowBorder]}
          >
            <Text style={styles.rowLabel}>{row.label}</Text>
            <Text
              style={[styles.rowValue, row.highlight && styles.rowValueHighlight]}
              numberOfLines={2}
            >
              {row.value}
            </Text>
          </View>
        ))}
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
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
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  heroBlob2: {
    position: 'absolute',
    bottom: -18,
    left: -10,
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.05)',
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
    backgroundColor: 'rgba(255,255,255,0.96)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.72)',
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
    backgroundColor: Colors.primary,
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
    color: 'rgba(255,255,255,0.65)',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  amount: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.white,
    letterSpacing: -0.8,
    marginTop: 2,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.92)',
    marginTop: 4,
    lineHeight: 18,
  },
  chip: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  chipText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
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
    borderBottomColor: Colors.surface,
  },
  rowLabel: {
    fontSize: 13,
    color: Colors.muted,
    flexShrink: 0,
  },
  rowValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.dark,
    textAlign: 'right',
    flex: 1,
  },
  rowValueHighlight: {
    color: Colors.primary,
    fontWeight: '800',
    fontSize: 15,
  },
});
