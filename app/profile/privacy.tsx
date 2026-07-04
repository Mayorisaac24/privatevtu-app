import { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ProfileSubScreen } from '../../src/components/profile/ProfileSubScreen';
import { GlassCard } from '../../src/components/ui/GlassCard';
import { Skeleton } from '../../src/components/ui/Skeleton';
import { ContentPageSections } from '../../src/components/support/ContentPageSections';
import { useSupportContent } from '../../src/hooks/useSupportContent';
import { formatContentUpdatedAt, parseContentPageBody } from '../../src/lib/content-page';
import {Colors, Radius, PrivacyHighlightColors, useThemedStyles } from '../../src/theme';

const PRIVACY_HIGHLIGHTS = [
  {
    icon: 'finger-print-outline' as const,
    title: 'Minimal data',
    text: 'Only what we need for wallet, VTU, and transfers',
    accent: PrivacyHighlightColors.minimal,
  },
  {
    icon: 'shield-checkmark-outline' as const,
    title: 'Secure storage',
    text: 'Encrypted in transit with strict access controls',
    accent: PrivacyHighlightColors.secure,
  },
  {
    icon: 'hand-left-outline' as const,
    title: 'Your control',
    text: 'Request access, correction, or deletion anytime',
    accent: PrivacyHighlightColors.control,
  },
  {
    icon: 'ban-outline' as const,
    title: 'Never sold',
    text: 'We do not sell or rent your personal information',
    accent: PrivacyHighlightColors.neverSold,
  },
];

function PrivacyLoadingState() {
  const styles = useStyles();

  return (
    <View style={styles.loadingStack}>
      <GlassCard variant="tinted" borderRadius={Radius.xl} padding={18} contentStyle={styles.hero}>
        <Skeleton width={56} height={56} borderRadius={18} />
        <Skeleton width="55%" height={18} borderRadius={6} />
        <Skeleton width="80%" height={12} borderRadius={4} />
        <Skeleton width="40%" height={10} borderRadius={4} />
      </GlassCard>

      <View style={styles.highlightGrid}>
        <View style={styles.highlightRow}>
          {[1, 2].map((item) => (
            <GlassCard key={item} variant="light" borderRadius={Radius.lg} padding={14} style={styles.highlightCardWrap} contentStyle={styles.highlightCard}>
              <Skeleton width={36} height={36} borderRadius={11} />
              <Skeleton width="70%" height={12} borderRadius={4} />
              <Skeleton width="100%" height={10} borderRadius={4} />
            </GlassCard>
          ))}
        </View>
        <View style={styles.highlightRow}>
          {[3, 4].map((item) => (
            <GlassCard key={item} variant="light" borderRadius={Radius.lg} padding={14} style={styles.highlightCardWrap} contentStyle={styles.highlightCard}>
              <Skeleton width={36} height={36} borderRadius={11} />
              <Skeleton width="70%" height={12} borderRadius={4} />
              <Skeleton width="100%" height={10} borderRadius={4} />
            </GlassCard>
          ))}
        </View>
      </View>

      {[1, 2].map((item) => (
        <GlassCard key={item} variant="light" borderRadius={Radius.lg} padding={16} contentStyle={styles.sectionSkeleton}>
          <Skeleton width="45%" height={14} borderRadius={4} />
          <Skeleton width="100%" height={10} borderRadius={4} />
          <Skeleton width="92%" height={10} borderRadius={4} />
          <Skeleton width="78%" height={10} borderRadius={4} />
        </GlassCard>
      ))}
    </View>
  );
}

export default function PrivacyPolicyScreen() {
  const styles = useStyles();

  const { page, loading } = useSupportContent('privacy');
  const title = page.title || 'Privacy Policy';
  const body = page.body;
  const updatedAt = page.updatedAt ?? null;

  const sections = useMemo(() => parseContentPageBody(body), [body]);
  const lastUpdated = formatContentUpdatedAt(updatedAt);

  return (
    <ProfileSubScreen title={title} subtitle="How we protect your data" headerIcon="lock-closed-outline">
      {loading ? (
        <PrivacyLoadingState />
      ) : (
        <>
          <GlassCard variant="tinted" borderRadius={Radius.xl} padding={18} contentStyle={styles.hero}>
            <View style={styles.heroIcon}>
              <Ionicons name="shield-checkmark" size={30} color={Colors.primary} />
            </View>
            <Text style={styles.heroTitle}>Your privacy matters</Text>
            <Text style={styles.heroSub}>
              We are transparent about what we collect, how we use it, and the choices you have over your information.
            </Text>
            {lastUpdated ? (
              <View style={styles.updatedPill}>
                <Ionicons name="time-outline" size={13} color={Colors.primary} />
                <Text style={styles.updatedText}>Last updated {lastUpdated}</Text>
              </View>
            ) : null}
          </GlassCard>

          <View style={styles.highlightGrid}>
            {[PRIVACY_HIGHLIGHTS.slice(0, 2), PRIVACY_HIGHLIGHTS.slice(2, 4)].map((row, rowIndex) => (
              <View key={rowIndex} style={styles.highlightRow}>
                {row.map((item) => (
                  <GlassCard
                    key={item.title}
                    variant="light"
                    borderRadius={Radius.lg}
                    padding={14}
                    style={styles.highlightCardWrap}
                    contentStyle={styles.highlightCard}
                  >
                    <View style={[styles.highlightIcon, { backgroundColor: `${item.accent}18` }]}>
                      <Ionicons name={item.icon} size={18} color={item.accent} />
                    </View>
                    <Text style={styles.highlightTitle}>{item.title}</Text>
                    <Text style={styles.highlightText}>{item.text}</Text>
                  </GlassCard>
                ))}
              </View>
            ))}
          </View>

          <View style={styles.policyHeader}>
            <Text style={styles.policyLabel}>Full policy</Text>
            <Text style={styles.policyHint}>{sections.length} section{sections.length === 1 ? '' : 's'}</Text>
          </View>

          <ContentPageSections sections={sections} />

          <GlassCard variant="tinted" borderRadius={Radius.lg} padding={16} contentStyle={styles.contactCard}>
            <View style={styles.contactIcon}>
              <Ionicons name="mail-outline" size={18} color={Colors.primary} />
            </View>
            <View style={styles.contactBody}>
              <Text style={styles.contactTitle}>Questions about your data?</Text>
              <Text style={styles.contactSub}>
                Reach out for access requests, corrections, or account-related privacy concerns.
              </Text>
            </View>
          </GlassCard>

          <TouchableOpacity
            style={styles.supportBtn}
            onPress={() => router.push('/profile/contact')}
            activeOpacity={0.85}
          >
            <Ionicons name="chatbubbles-outline" size={18} color={Colors.white} />
            <Text style={styles.supportBtnText}>Contact Support</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.termsLink}
            onPress={() => router.push('/profile/terms')}
            activeOpacity={0.85}
          >
            <Ionicons name="document-text-outline" size={16} color={Colors.primary} />
            <Text style={styles.termsText}>View Terms of Service</Text>
            <Ionicons name="chevron-forward" size={16} color={Colors.primary} />
          </TouchableOpacity>
        </>
      )}
    </ProfileSubScreen>
  );
}

const createStyles = (colors: import('../../src/theme/types').ThemeColors) => StyleSheet.create({
  loadingStack: { gap: 14 },
  hero: { alignItems: 'center', gap: 8 },
  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.dark,
    letterSpacing: -0.2,
  },
  heroSub: {
    fontSize: 13,
    lineHeight: 20,
    color: colors.muted,
    textAlign: 'center',
    maxWidth: 320,
  },
  updatedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
    backgroundColor: colors.primaryMuted,
  },
  updatedText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  highlightGrid: {
    gap: 10,
  },
  highlightRow: {
    flexDirection: 'row',
    gap: 10,
  },
  highlightCardWrap: {
    flex: 1,
  },
  highlightCard: {
    gap: 6,
  },
  highlightIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  highlightTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.dark,
  },
  highlightText: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.muted,
  },
  policyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginTop: 4,
  },
  policyLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.muted,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  policyHint: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.mutedLight,
  },
  sectionSkeleton: { gap: 10 },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginTop: 4,
  },
  contactIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactBody: { flex: 1, gap: 4 },
  contactTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.dark,
  },
  contactSub: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.muted,
  },
  supportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: Radius.lg,
    backgroundColor: colors.primary,
  },
  supportBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.white,
  },
  termsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
  },
  termsText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
});

function useStyles() {
  return useThemedStyles(createStyles);
}
