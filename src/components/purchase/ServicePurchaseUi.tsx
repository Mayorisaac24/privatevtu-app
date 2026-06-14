import { ReactNode, Fragment } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { GlassCard } from '../ui/GlassCard';
import { GradientButton } from '../ui/GradientButton';
import { Colors, Radius, Shadow, Typography } from '../../theme';
import { useColors, useGradients } from '../../theme/hooks';
import { gradientStops } from '../../theme/gradient-utils';

type ServiceSectionLabelProps = {
  title: string;
  hint?: string;
  icon?: keyof typeof Ionicons.glyphMap;
};

export function ServiceSectionLabel({ title, hint, icon }: ServiceSectionLabelProps) {
  const colors = useColors();

  return (
    <View style={styles.sectionRow}>
      <View style={styles.sectionLeft}>
        {icon ? (
          <View style={[styles.sectionIcon, { backgroundColor: colors.primaryMuted }]}>
            <Ionicons name={icon} size={13} color={colors.primary} />
          </View>
        ) : null}
        <Text style={[styles.sectionTitle, { color: colors.muted }]}>{title}</Text>
      </View>
      {hint ? (
        <View style={[styles.hintPill, { backgroundColor: colors.primaryMuted, borderColor: colors.border }]}>
          <Text style={[styles.hintText, { color: colors.primary }]}>{hint}</Text>
        </View>
      ) : null}
    </View>
  );
}

type ServicePurchaseCardProps = {
  children: ReactNode;
  style?: ViewStyle;
};

export function ServicePurchaseCard({ children, style }: ServicePurchaseCardProps) {
  const gradients = useGradients();

  return (
    <GlassCard variant="tinted" borderRadius={Radius.xl} padding={18} style={[styles.card, style]}>
      <LinearGradient
        colors={gradientStops(gradients.primary)}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.cardAccent}
      />
      {children}
    </GlassCard>
  );
}

type ServiceStepProgressProps = {
  activeIndex: number;
  labels: string[];
  variant?: 'default' | 'hero';
};

export function ServiceStepProgress({ activeIndex, labels, variant = 'default' }: ServiceStepProgressProps) {
  const colors = useColors();

  if (variant === 'hero') {
    return (
      <View style={styles.heroStepRow}>
        {labels.map((label, index) => {
          const active = index === activeIndex;
          const last = index === labels.length - 1;

          return (
            <Fragment key={label}>
              <View style={[styles.heroStepPill, active && styles.heroStepPillActive]}>
                <Text style={[styles.heroStepText, active && styles.heroStepTextActive]}>
                  {index + 1}. {label}
                </Text>
              </View>
              {!last ? <View style={styles.heroStepLine} /> : null}
            </Fragment>
          );
        })}
      </View>
    );
  }

  return (
    <View style={styles.progressTrack}>
      {labels.map((label, index) => {
        const done = index < activeIndex;
        const active = index === activeIndex;
        const last = index === labels.length - 1;

        return (
          <View key={label} style={styles.progressSegment}>
            <View style={styles.progressStep}>
              <View
                style={[
                  styles.progressDot,
                  { backgroundColor: colors.borderMid },
                  (active || done) && { backgroundColor: colors.primary },
                ]}
              >
                {done ? (
                  <Ionicons name="checkmark" size={11} color={Colors.white} />
                ) : (
                  <Text style={[styles.progressDotNum, active && { color: Colors.white }]}>
                    {index + 1}
                  </Text>
                )}
              </View>
              <Text
                style={[
                  styles.progressText,
                  { color: colors.muted },
                  (active || done) && { color: colors.primary, fontWeight: '700' },
                ]}
              >
                {label}
              </Text>
            </View>
            {!last ? (
              <View
                style={[
                  styles.progressLine,
                  { backgroundColor: colors.borderMid },
                  done && { backgroundColor: colors.primary },
                ]}
              />
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

type ServiceContinueButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
};

export function ServiceContinueButton({
  label,
  onPress,
  disabled = false,
  loading = false,
  icon = 'arrow-forward',
}: ServiceContinueButtonProps) {
  return (
    <GradientButton
      title={label}
      onPress={onPress}
      disabled={disabled}
      isLoading={loading}
      rightIcon={<Ionicons name={icon} size={18} color={Colors.white} />}
      style={styles.cta}
      gradientStyle={styles.ctaGradient}
    />
  );
}

export function ServiceDetectedBadge({ label }: { label: string }) {
  const colors = useColors();

  return (
    <View style={[styles.detectedBadge, { backgroundColor: colors.primaryMuted, borderColor: colors.border }]}>
      <Ionicons name="sparkles" size={13} color={colors.primary} />
      <Text style={[styles.detectedText, { color: colors.primary }]}>Detected {label}</Text>
    </View>
  );
}

export function ServiceSecureNote({ text }: { text: string }) {
  const colors = useColors();

  return (
    <View style={styles.secureNote}>
      <Ionicons name="shield-checkmark" size={14} color={colors.primary} />
      <Text style={[styles.secureNoteText, { color: colors.muted }]}>{text}</Text>
    </View>
  );
}

export function ServiceCardDivider() {
  const colors = useColors();
  return <View style={[styles.cardDivider, { backgroundColor: colors.border }]} />;
}

type ServiceEditLinkProps = {
  onPress: () => void;
};

export function ServiceEditLink({ onPress }: ServiceEditLinkProps) {
  const colors = useColors();

  return (
    <TouchableOpacity style={styles.editLink} onPress={onPress} activeOpacity={0.8}>
      <Ionicons name="arrow-back" size={14} color={colors.muted} />
      <Text style={[styles.editLinkText, { color: colors.muted }]}>Edit details</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 14,
    overflow: 'hidden',
    ...Shadow.sm,
  },
  cardAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    opacity: 0.85,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 8,
  },
  sectionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    minWidth: 0,
  },
  sectionIcon: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    ...Typography.label,
    letterSpacing: 0.8,
  },
  hintPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  hintText: {
    ...Typography.caption,
    fontWeight: '700',
  },
  progressTrack: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 14,
    gap: 0,
  },
  progressSegment: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  progressStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  progressDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressDotNum: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.muted,
  },
  progressText: {
    ...Typography.caption,
  },
  progressLine: {
    flex: 1,
    height: 2,
    marginHorizontal: 8,
    borderRadius: 1,
  },
  heroStepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 18,
    gap: 8,
  },
  heroStepPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  heroStepPillActive: {
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  heroStepText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.55)',
  },
  heroStepTextActive: {
    color: Colors.white,
  },
  heroStepLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  cta: {
    borderRadius: Radius.lg,
  },
  ctaGradient: {
    paddingVertical: 17,
  },
  detectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  detectedText: {
    ...Typography.caption,
    fontWeight: '600',
  },
  secureNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 14,
  },
  secureNoteText: {
    ...Typography.caption,
    fontWeight: '600',
  },
  cardDivider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 16,
    opacity: 0.7,
  },
  editLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 16,
  },
  editLinkText: {
    ...Typography.small,
  },
});
