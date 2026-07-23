import { View, Text, StyleSheet, type ViewStyle, type StyleProp } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import {
  formatCardholderName,
  formatPreviewPan,
  resolveVirtualCardDesign,
  type VirtualCardDesignId,
} from '../../lib/virtual-card-designs';
import {
  formatUsd,
  virtualCardStatusMeta,
  formatCardExpiry,
  formatPanGroups,
  parseMaskedPan,
} from '../../lib/virtual-card-utils';
import { gradientStops, withAlpha } from '../../theme/gradient-utils';

export type VirtualCardVisualSize = 'hero' | 'list' | 'mini';

export type VirtualCardVisualProps = {
  designId?: VirtualCardDesignId | string | null;
  brand?: string;
  cardName?: string | null;
  holderName?: string | null;
  maskedPan?: string | null;
  balanceUsd?: string | number | null;
  expiry?: string | null;
  status?: string;
  preview?: boolean;
  size?: VirtualCardVisualSize;
  showBalance?: boolean;
  style?: StyleProp<ViewStyle>;
  /** Full PAN/CVV — only while reveal sheet is open; never persist. */
  sensitivePan?: string | null;
  sensitiveCvv?: string | null;
  dimmed?: boolean;
};

const CARD_ASPECT = 1.586;

function EmbossedText({
  children,
  style,
  light = false,
  numberOfLines,
}: {
  children: React.ReactNode;
  style?: object;
  light?: boolean;
  numberOfLines?: number;
}) {
  return (
    <Text
      numberOfLines={numberOfLines}
      style={[
        style,
        light
          ? {
              textShadowColor: 'rgba(255,255,255,0.18)',
              textShadowOffset: { width: 0, height: -0.5 },
              textShadowRadius: 0,
            }
          : {
              textShadowColor: 'rgba(0,0,0,0.55)',
              textShadowOffset: { width: 0, height: 1 },
              textShadowRadius: 2,
            },
      ]}
    >
      {children}
    </Text>
  );
}

function BrandMark({ brand, size }: { brand: string; size: VirtualCardVisualSize }) {
  const normalized = String(brand || 'VISA').toUpperCase();
  const isMini = size === 'mini';

  if (normalized === 'MASTERCARD') {
    return (
      <View style={styles.brandRow}>
        <View style={[styles.mcCircle, styles.mcLeft, isMini && styles.mcCircleMini]} />
        <View style={[styles.mcCircle, styles.mcRight, isMini && styles.mcCircleMini]} />
      </View>
    );
  }

  return (
    <EmbossedText light style={[styles.visaMark, isMini && styles.visaMarkMini]}>
      VISA
    </EmbossedText>
  );
}

function CardTexture({
  pattern,
  accent,
  gradientEnd,
}: {
  pattern: 'mesh' | 'waves' | 'grid';
  accent: string;
  gradientEnd: string;
}) {
  return (
    <>
      <LinearGradient
        colors={[withAlpha(accent, 0.14), 'transparent', withAlpha(gradientEnd, 0.22)]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      {pattern === 'grid' ? (
        <View style={styles.gridWrap} pointerEvents="none">
          {Array.from({ length: 7 }).map((_, row) => (
            <View key={`row-${row}`} style={styles.gridRow}>
              {Array.from({ length: 10 }).map((__, col) => (
                <View
                  key={`cell-${row}-${col}`}
                  style={[styles.gridCell, { borderColor: withAlpha(accent, 0.08) }]}
                />
              ))}
            </View>
          ))}
        </View>
      ) : (
        <>
          <View style={[styles.orb, styles.orbPrimary, { backgroundColor: accent }]} />
          <View style={[styles.orb, styles.orbSecondary, { backgroundColor: accent }]} />
          {pattern === 'mesh' ? (
            <View style={[styles.orb, styles.orbTertiary, { backgroundColor: accent }]} />
          ) : null}
        </>
      )}

      <View style={styles.brushOverlay} pointerEvents="none">
        {Array.from({ length: 28 }).map((_, index) => (
          <View
            key={`brush-${index}`}
            style={[
              styles.brushLine,
              {
                top: index * 7,
                opacity: 0.025 + (index % 4) * 0.012,
                backgroundColor: accent,
              },
            ]}
          />
        ))}
      </View>

      <LinearGradient
        colors={['rgba(255,255,255,0.22)', 'rgba(255,255,255,0.03)', 'rgba(255,255,255,0)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={styles.sheenBand}
        pointerEvents="none"
      />

      <View style={styles.rimHighlight} pointerEvents="none" />
    </>
  );
}

function EmvChip({ baseColor, mini }: { baseColor: string; mini?: boolean }) {
  return (
    <View style={[styles.chipShell, mini && styles.chipShellMini]}>
      <LinearGradient
        colors={['#FFF7D6', baseColor, '#9A7B2D', '#E8C96A']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.chipFace, mini && styles.chipFaceMini]}
      >
        <View style={styles.chipInnerBorder} />
        <View style={styles.chipTracks}>
          {[0, 1, 2, 3].map((line) => (
            <View key={line} style={styles.chipTrackLine} />
          ))}
        </View>
      </LinearGradient>
    </View>
  );
}

function MetaColumn({
  label,
  value,
  align = 'left',
  labelColor,
  valueColor,
  labelStyle,
  valueStyle,
}: {
  label: string;
  value: string;
  align?: 'left' | 'right';
  labelColor: string;
  valueColor: string;
  labelStyle?: object;
  valueStyle?: object;
}) {
  return (
    <View style={[styles.metaColumn, align === 'right' && styles.metaColumnRight]}>
      <Text style={[styles.metaLabel, { color: labelColor }, labelStyle]}>{label}</Text>
      <EmbossedText
        light
        style={[
          styles.metaValue,
          align === 'right' && styles.metaValueRight,
          { color: valueColor },
          valueStyle,
        ]}
        numberOfLines={1}
      >
        {value}
      </EmbossedText>
    </View>
  );
}

export function VirtualCardVisual({
  designId,
  brand = 'VISA',
  cardName,
  holderName,
  maskedPan,
  balanceUsd,
  expiry,
  status = 'ACTIVE',
  preview = false,
  size = 'hero',
  showBalance = true,
  style,
  sensitivePan,
  sensitiveCvv,
  dimmed = false,
}: VirtualCardVisualProps) {
  const design = resolveVirtualCardDesign(designId);
  const statusMeta = virtualCardStatusMeta(status);
  const isMini = size === 'mini';
  const isList = size === 'list';
  const isHero = size === 'hero';
  const holder = formatCardholderName(cardName, holderName);
  const pan = sensitivePan
    ? formatPanGroups(sensitivePan)
    : maskedPan?.trim()
      ? parseMaskedPan(maskedPan).display
      : formatPreviewPan(maskedPan, preview);
  const expiryForDisplay = formatCardExpiry(expiry);
  const revealExpiryDisplay = sensitiveCvv
    ? (expiryForDisplay || (expiry?.trim() ? expiry.trim() : null))
    : expiryForDisplay;
  const frozen = String(status).toUpperCase() === 'FROZEN';
  const padding = isMini ? 10 : isList ? 18 : 22;
  const showExpiryMeta = Boolean(
    sensitiveCvv || revealExpiryDisplay || (!showBalance && !sensitivePan && !isMini),
  );
  const showFooterRight = showBalance || showExpiryMeta;

  return (
    <View
      style={[
        styles.shell,
        isHero && styles.shellHero,
        isList && styles.shellList,
        isMini && styles.shellMini,
        { shadowColor: design.glow },
        dimmed && styles.shellDimmed,
        style,
      ]}
    >
      <LinearGradient
        colors={gradientStops(design.gradient)}
        start={{ x: 0.05, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      >
        <CardTexture
          pattern={design.pattern}
          accent={design.accent}
          gradientEnd={design.gradient[2]}
        />

        <View style={[styles.content, { padding }]}>
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <EmvChip baseColor={design.chip} mini={isMini} />
              {!isMini ? (
                <Ionicons
                  name="wifi"
                  size={isList ? 17 : 20}
                  color={design.textSecondary}
                  style={styles.contactless}
                />
              ) : null}
            </View>
            <BrandMark brand={brand} size={size} />
          </View>

          {!isMini ? (
            <View style={styles.panSection}>
              <EmbossedText
                light
                style={[
                  styles.pan,
                  isList && styles.panList,
                  { color: design.textPrimary },
                ]}
                numberOfLines={1}
              >
                {pan}
              </EmbossedText>
            </View>
          ) : null}

          <View
            style={[
              styles.footerRow,
              isMini && styles.footerRowMini,
            ]}
          >
            <MetaColumn
              label={isMini ? '' : 'CARDHOLDER'}
              value={holder}
              labelColor={design.textSecondary}
              valueColor={design.textPrimary}
              valueStyle={isMini ? styles.holderMini : isList ? styles.holderList : undefined}
            />

            {!isMini && showFooterRight ? (
              <View style={styles.footerRight}>
                {showBalance ? (
                  <MetaColumn
                    label="BALANCE"
                    value={formatUsd(balanceUsd ?? 0)}
                    align="right"
                    labelColor={design.textSecondary}
                    valueColor={design.textPrimary}
                    valueStyle={isList ? styles.balanceList : undefined}
                  />
                ) : null}
                {showExpiryMeta ? (
                  <MetaColumn
                    label={sensitiveCvv ? 'EXP / CVV' : 'VALID THRU'}
                    value={
                      sensitiveCvv && revealExpiryDisplay
                        ? `${revealExpiryDisplay} / ${sensitiveCvv}`
                        : sensitiveCvv
                          ? `•• / ${sensitiveCvv}`
                          : revealExpiryDisplay
                            ? `${revealExpiryDisplay} / •••`
                            : '•• / •••'
                    }
                    align="right"
                    labelColor={design.textSecondary}
                    valueColor={design.textPrimary}
                    labelStyle={showBalance ? styles.secondaryMetaLabel : undefined}
                    valueStyle={styles.expiryValue}
                  />
                ) : null}
              </View>
            ) : null}
          </View>
        </View>

        {status && String(status).toUpperCase() !== 'ACTIVE' ? (
          <View style={[styles.statusPill, { backgroundColor: `${statusMeta.color}40` }]}>
            <Text style={[styles.statusText, { color: design.textPrimary }]}>{statusMeta.label}</Text>
          </View>
        ) : null}

        {frozen ? (
          <View style={styles.frozenOverlay}>
            <Ionicons name="snow" size={isMini ? 16 : 24} color={design.textPrimary} />
          </View>
        ) : null}
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#0B0B0F',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.34,
    shadowRadius: 28,
    elevation: 12,
  },
  shellHero: {
    width: '100%',
    aspectRatio: CARD_ASPECT,
  },
  shellList: {
    width: '100%',
    aspectRatio: CARD_ASPECT,
  },
  shellMini: {
    aspectRatio: CARD_ASPECT,
    borderRadius: 12,
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6,
  },
  shellDimmed: {
    opacity: 0.48,
  },
  content: {
    flex: 1,
    zIndex: 2,
    justifyContent: 'space-between',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 34,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  contactless: {
    transform: [{ rotate: '90deg' }],
    opacity: 0.9,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mcCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
  },
  mcCircleMini: {
    width: 15,
    height: 15,
    borderRadius: 8,
  },
  mcLeft: {
    backgroundColor: '#EB001B',
    marginRight: -9,
  },
  mcRight: {
    backgroundColor: '#F79E1B',
  },
  visaMark: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '900',
    fontStyle: 'italic',
    letterSpacing: 2,
  },
  visaMarkMini: {
    fontSize: 13,
    letterSpacing: 1,
  },
  panSection: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 4,
  },
  pan: {
    fontSize: 22,
    fontWeight: '500',
    letterSpacing: 3.2,
    fontVariant: ['tabular-nums'],
  },
  panList: {
    fontSize: 20,
    letterSpacing: 2.8,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 16,
  },
  footerRowMini: {
    position: 'relative',
    marginTop: 6,
  },
  footerRight: {
    alignItems: 'flex-end',
    gap: 10,
    maxWidth: '46%',
  },
  metaColumn: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  metaColumnRight: {
    flex: 0,
    alignItems: 'flex-end',
  },
  metaLabel: {
    fontSize: 8.5,
    fontWeight: '700',
    letterSpacing: 1.4,
    opacity: 0.88,
  },
  secondaryMetaLabel: {
    marginTop: 2,
  },
  metaValue: {
    fontSize: 13.5,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  metaValueRight: {
    textAlign: 'right',
  },
  holderList: {
    fontSize: 12.5,
  },
  holderMini: {
    fontSize: 9.5,
    letterSpacing: 0.5,
  },
  balanceList: {
    fontSize: 15,
    fontWeight: '800',
  },
  expiryValue: {
    fontSize: 12.5,
    letterSpacing: 1.2,
    fontVariant: ['tabular-nums'],
  },
  chipShell: {
    borderRadius: 7,
    padding: 1,
    backgroundColor: 'rgba(0,0,0,0.28)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 3,
    elevation: 3,
  },
  chipShellMini: {
    borderRadius: 4,
  },
  chipFace: {
    width: 46,
    height: 34,
    borderRadius: 6,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  chipFaceMini: {
    width: 30,
    height: 22,
    borderRadius: 4,
  },
  chipInnerBorder: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    borderRadius: 6,
  },
  chipTracks: {
    paddingHorizontal: 7,
    gap: 3,
  },
  chipTrackLine: {
    height: 2,
    borderRadius: 1,
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  statusPill: {
    position: 'absolute',
    top: 12,
    right: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    zIndex: 3,
  },
  statusText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  frozenOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 4,
  },
  orb: {
    position: 'absolute',
    borderRadius: 999,
    opacity: 0.14,
  },
  orbPrimary: {
    width: 220,
    height: 220,
    top: -90,
    right: -60,
  },
  orbSecondary: {
    width: 160,
    height: 160,
    bottom: -70,
    left: -40,
  },
  orbTertiary: {
    width: 100,
    height: 100,
    top: 48,
    left: -24,
    opacity: 0.1,
  },
  gridWrap: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.35,
    padding: 10,
    justifyContent: 'space-between',
  },
  gridRow: {
    flexDirection: 'row',
    flex: 1,
  },
  gridCell: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
  },
  brushOverlay: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  brushLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
  },
  sheenBand: {
    position: 'absolute',
    top: -30,
    left: -40,
    width: '70%',
    height: '75%',
    transform: [{ rotate: '-18deg' }],
  },
  rimHighlight: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 20,
  },
});
