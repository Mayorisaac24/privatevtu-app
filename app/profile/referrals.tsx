import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Share, ActivityIndicator, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { ProfileSubScreen } from '../../src/components/profile/ProfileSubScreen';
import { GlassCard } from '../../src/components/ui/GlassCard';
import { formatCurrency, type ReferralSummary } from '../../src/lib/api';
import {
  getReferralSummaryData,
  peekReferralSummaryCache,
  pullToRefreshReferralSummary,
  refreshReferralSummarySilently,
} from '../../src/lib/referral-summary-cache';
import {Colors, Radius, useThemedStyles } from '../../src/theme';
import { showToast } from '../../src/components/ui/Toast';

function formatTriggerLabel(trigger: string, kycTier?: string | null): string {
  switch (trigger) {
    case 'SIGNUP_COMPLETE':
      return 'When they complete signup';
    case 'KYC_TIER_VERIFIED':
      return kycTier ? `When they complete ${kycTier.replace(/_/g, ' ')}` : 'When they complete KYC';
    case 'FIRST_WALLET_FUND':
      return 'When they fund their wallet for the first time';
    case 'FIRST_TRANSACTION':
      return 'When they complete their first purchase';
    default:
      return trigger;
  }
}

export default function ReferralsScreen() {
  const styles = useStyles();

  const [summary, setSummary] = useState<ReferralSummary | null>(() => peekReferralSummaryCache());
  const [initialLoading, setInitialLoading] = useState(() => !peekReferralSummaryCache());
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const cached = peekReferralSummaryCache();
    if (cached) {
      setSummary(cached);
      setInitialLoading(false);
      refreshReferralSummarySilently();
      void getReferralSummaryData().then((next) => {
        if (next) setSummary(next);
      }).catch(() => undefined);
      return;
    }

    setInitialLoading(true);
    try {
      const next = await getReferralSummaryData({ force: true });
      if (next) setSummary(next);
    } catch {
      showToast({ type: 'error', text1: 'Could not load referral details' });
    } finally {
      setInitialLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const next = await pullToRefreshReferralSummary();
      if (next) setSummary(next);
    } catch {
      showToast({ type: 'error', text1: 'Could not refresh referral details' });
    } finally {
      setRefreshing(false);
    }
  }, []);

  const copyCode = async () => {
    if (!summary?.referralCode) return;
    await Clipboard.setStringAsync(summary.referralCode);
    showToast({ type: 'success', text1: 'Copied', text2: 'Referral code copied to clipboard' });
  };

  const copyLink = async () => {
    if (!summary?.shareLink) return;
    await Clipboard.setStringAsync(summary.shareLink);
    showToast({ type: 'success', text1: 'Copied', text2: 'Referral link copied to clipboard' });
  };

  const shareInvite = async () => {
    if (!summary) return;
    try {
      await Share.share({ message: summary.shareMessage });
    } catch {
      // User dismissed share sheet.
    }
  };

  if (initialLoading) {
    return (
      <ProfileSubScreen title="Refer & Earn" subtitle="Invite friends and earn rewards" headerIcon="gift-outline">
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      </ProfileSubScreen>
    );
  }

  const showListRefreshing = refreshing && !initialLoading;

  return (
    <ProfileSubScreen
      title="Refer & Earn"
      subtitle="Invite friends and earn rewards"
      headerIcon="gift-outline"
      refreshControl={(
        <RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={Colors.primary} />
      )}
    >
      {showListRefreshing ? (
        <View style={styles.refreshHint}>
          <ActivityIndicator size="small" color={Colors.primary} />
          <Text style={styles.refreshHintText}>Updating referral details…</Text>
        </View>
      ) : null}

      <GlassCard variant="tinted" borderRadius={Radius.xl} padding={20} contentStyle={styles.codeCard}>
        <Text style={styles.codeLabel}>Your referral code</Text>
        <Text style={styles.codeValue}>{summary?.referralCode || '—'}</Text>
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => void copyCode()} activeOpacity={0.85}>
            <Ionicons name="copy-outline" size={16} color={Colors.primary} />
            <Text style={styles.actionBtnText}>Copy code</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, !summary?.shareLink && styles.actionBtnDisabled]}
            onPress={() => void copyLink()}
            activeOpacity={0.85}
            disabled={!summary?.shareLink}
          >
            <Ionicons name="link-outline" size={16} color={Colors.primary} />
            <Text style={styles.actionBtnText}>Copy link</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, styles.actionBtnPrimary]} onPress={() => void shareInvite()} activeOpacity={0.85}>
            <Ionicons name="share-social-outline" size={16} color={Colors.white} />
            <Text style={[styles.actionBtnText, styles.actionBtnTextPrimary]}>Share</Text>
          </TouchableOpacity>
        </View>
      </GlassCard>

      <View style={styles.statsRow}>
        <GlassCard borderRadius={Radius.lg} padding={16} style={styles.statCard}>
          <Text style={styles.statValue}>{summary?.stats.totalReferred ?? 0}</Text>
          <Text style={styles.statLabel}>Friends referred</Text>
        </GlassCard>
        <GlassCard borderRadius={Radius.lg} padding={16} style={styles.statCard}>
          <Text style={styles.statValue}>{formatCurrency(summary?.stats.totalEarnedKobo || '0')}</Text>
          <Text style={styles.statLabel}>Total earned</Text>
        </GlassCard>
      </View>

      {summary?.activePrograms?.length ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Active offers</Text>
          {summary.activePrograms.map((program) => (
            <GlassCard key={program.id} borderRadius={Radius.lg} padding={16} style={styles.programCard}>
              <Text style={styles.programName}>{program.name}</Text>
              {program.description ? <Text style={styles.programDesc}>{program.description}</Text> : null}
              <Text style={styles.programMeta}>{formatTriggerLabel(program.triggerEvent, program.kycTier)}</Text>
              <Text style={styles.programReward}>
                You earn {formatCurrency(program.referrerRewardKobo)} · Friend earns {formatCurrency(program.refereeRewardKobo)}
              </Text>
            </GlassCard>
          ))}
        </View>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>People you referred</Text>
        {summary?.referredUsers?.length ? (
          summary.referredUsers.map((person, index) => (
            <GlassCard key={`${person.firstName}-${person.joinedAt}-${index}`} borderRadius={Radius.lg} padding={14} style={styles.personCard}>
              <View style={styles.personRow}>
                <View style={styles.personAvatar}>
                  <Text style={styles.personAvatarText}>
                    {(person.firstName?.[0] || 'U').toUpperCase()}
                  </Text>
                </View>
                <View style={styles.personBody}>
                  <Text style={styles.personName}>{`${person.firstName} ${person.lastName}`.trim()}</Text>
                  <Text style={styles.personMeta}>
                    Joined {new Date(person.joinedAt).toLocaleDateString('en-NG', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </Text>
                </View>
              </View>
            </GlassCard>
          ))
        ) : (
          <GlassCard borderRadius={Radius.lg} padding={18}>
            <Text style={styles.emptyText}>No referrals yet. Share your code to get started.</Text>
          </GlassCard>
        )}
      </View>
    </ProfileSubScreen>
  );
}

const createStyles = (colors: import('../../src/theme/types').ThemeColors) => StyleSheet.create({
  loadingWrap: { paddingVertical: 40, alignItems: 'center' },
  refreshHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 10,
  },
  refreshHintText: { fontSize: 12, color: colors.muted, fontWeight: '500' },
  codeCard: { gap: 10 },
  codeLabel: { fontSize: 13, color: colors.muted, fontWeight: '600' },
  codeValue: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.dark,
    letterSpacing: 1.2,
    textAlign: 'center',
  },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: colors.primaryMuted,
  },
  actionBtnDisabled: { opacity: 0.55 },
  actionBtnPrimary: { backgroundColor: colors.primary },
  actionBtnText: { fontSize: 13, fontWeight: '700', color: colors.primary },
  actionBtnTextPrimary: { color: colors.white },
  statsRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  statCard: { flex: 1 },
  statValue: { fontSize: 20, fontWeight: '800', color: colors.dark },
  statLabel: { fontSize: 12, color: colors.muted, marginTop: 4 },
  section: { marginTop: 18, gap: 10 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.dark },
  programCard: { gap: 6 },
  programName: { fontSize: 15, fontWeight: '700', color: colors.dark },
  programDesc: { fontSize: 13, lineHeight: 19, color: colors.muted },
  programMeta: { fontSize: 12, color: colors.primary, fontWeight: '600' },
  programReward: { fontSize: 13, color: colors.dark, fontWeight: '600' },
  personCard: { marginBottom: 0 },
  personRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  personAvatar: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  personAvatarText: { fontSize: 16, fontWeight: '800', color: colors.primary },
  personBody: { flex: 1, gap: 2 },
  personName: { fontSize: 15, fontWeight: '700', color: colors.dark },
  personMeta: { fontSize: 12, color: colors.muted },
  emptyText: { fontSize: 14, lineHeight: 20, color: colors.muted, textAlign: 'center' },
});

function useStyles() {
  return useThemedStyles(createStyles);
}
