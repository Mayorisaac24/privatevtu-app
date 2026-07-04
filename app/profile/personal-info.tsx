import { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { ProfileSubScreen } from '../../src/components/profile/ProfileSubScreen';
import { DEFAULT_SUPPORT_EMAIL } from '../../src/lib/brand';
import { GlassCard } from '../../src/components/ui/GlassCard';
import { GlassSurface } from '../../src/components/ui/GlassSurface';
import { refreshUserProfile } from '../../src/lib/profile-sync';
import { useAuthStore } from '../../src/stores';
import {Colors, Radius, Spacing , Palette, FormColors, BRAND, Overlays, useThemedStyles } from '../../src/theme';

function DetailRow({
  icon,
  label,
  value,
  verified,
  isLast,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  verified?: boolean;
  isLast?: boolean;
}) {
  const styles = useStyles();

  return (
    <View style={[styles.detailRow, !isLast && styles.detailRowBorder]}>
      <View style={styles.detailIconWrap}>
        <Ionicons name={icon} size={18} color={Colors.primary} />
      </View>
      <View style={styles.detailCopy}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue} numberOfLines={2}>{value || '—'}</Text>
      </View>
      {verified !== undefined ? (
        <View style={[styles.verifiedBadge, verified ? styles.verifiedOn : styles.verifiedOff]}>
          <Ionicons
            name={verified ? 'checkmark-circle' : 'alert-circle-outline'}
            size={13}
            color={verified ? Colors.success : Colors.mutedLight}
          />
          <Text style={[styles.verifiedText, verified ? styles.verifiedTextOn : styles.verifiedTextOff]}>
            {verified ? 'Verified' : 'Unverified'}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

export default function PersonalInfoScreen() {
  const styles = useStyles();

  const { user } = useAuthStore();

  const firstName = user?.firstName || '';
  const lastName = user?.lastName || '';

  useFocusEffect(
    useCallback(() => {
      void refreshUserProfile();
    }, []),
  );

  return (
    <ProfileSubScreen title="Personal Info" subtitle="Your account details">
      <GlassCard variant="solid" borderRadius={Radius.lg} padding={0} contentStyle={styles.detailsCard}>
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Account details</Text>
          <Text style={styles.sectionSub}>Read-only information</Text>
        </View>

        <DetailRow icon="person-outline" label="First name" value={firstName} />
        <DetailRow icon="person-outline" label="Last name" value={lastName} />
        <DetailRow
          icon="mail-outline"
          label="Email"
          value={user?.email || 'Not added'}
          verified={user?.email ? user.isEmailVerified : undefined}
        />
        <DetailRow
          icon="call-outline"
          label="Phone"
          value={user?.phone || 'Not added'}
          verified={user?.phone ? user.isPhoneVerified : undefined}
          isLast
        />
      </GlassCard>

      <GlassSurface variant="tinted" borderRadius={Radius.lg} contentStyle={styles.noteCard}>
        <View style={styles.noteIcon}>
          <Ionicons name="information-circle-outline" size={20} color={Colors.primary} />
        </View>
        <View style={styles.noteCopy}>
          <Text style={styles.noteTitle}>Need to update your details?</Text>
          <Text style={styles.noteBody}>
            Name, email and phone can only be changed by support for security. Contact {DEFAULT_SUPPORT_EMAIL} if something looks wrong.
          </Text>
        </View>
      </GlassSurface>
    </ProfileSubScreen>
  );
}

const createStyles = (colors: import('../../src/theme/types').ThemeColors) => StyleSheet.create({
  detailsCard: {
    paddingHorizontal: 4,
    paddingTop: 18,
    paddingBottom: 8,
    ...Platform.select({
      ios: {
        shadowColor: colors.dark,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
      },
      android: { elevation: 2 },
      default: {},
    }),
  },
  sectionHead: {
    paddingHorizontal: 16,
    marginBottom: 6,
    gap: 2,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.9,
  },
  sectionSub: {
    fontSize: 12,
    color: colors.mutedLight,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 15,
    paddingHorizontal: 16,
  },
  detailRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Overlays.borderFaint,
  },
  detailIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailCopy: { flex: 1, gap: 3, minWidth: 0 },
  detailLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.mutedLight,
    textTransform: 'uppercase',
    letterSpacing: 0.55,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.dark,
    lineHeight: 22,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 999,
  },
  verifiedOn: { backgroundColor: Overlays.emerald14 },
  verifiedOff: { backgroundColor: Overlays.slateMuted12 },
  verifiedText: { fontSize: 11, fontWeight: '700' },
  verifiedTextOn: { color: colors.success },
  verifiedTextOff: { color: colors.mutedLight },
  noteCard: {
    flexDirection: 'row',
    gap: 12,
    padding: Spacing.md,
    alignItems: 'flex-start',
  },
  noteIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Overlays.violet10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noteCopy: { flex: 1, gap: 4 },
  noteTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.dark,
  },
  noteBody: {
    fontSize: 13,
    color: colors.muted,
    lineHeight: 19,
  },
});

function useStyles() {
  return useThemedStyles(createStyles);
}
