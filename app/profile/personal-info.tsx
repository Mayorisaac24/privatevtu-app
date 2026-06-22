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
import { GlassCard } from '../../src/components/ui/GlassCard';
import { GlassSurface } from '../../src/components/ui/GlassSurface';
import { refreshUserProfile } from '../../src/lib/profile-sync';
import { useAuthStore } from '../../src/stores';
import { Colors, Radius, Spacing } from '../../src/theme';

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
            color={verified ? '#059669' : '#94A3B8'}
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
            Name, email and phone can only be changed by support for security. Contact support@privatevtu.com if something looks wrong.
          </Text>
        </View>
      </GlassSurface>
    </ProfileSubScreen>
  );
}

const styles = StyleSheet.create({
  detailsCard: {
    backgroundColor: Colors.white,
    paddingHorizontal: 4,
    paddingTop: 18,
    paddingBottom: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
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
    color: Colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.9,
  },
  sectionSub: {
    fontSize: 12,
    color: Colors.mutedLight,
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
    borderBottomColor: 'rgba(15, 23, 42, 0.07)',
  },
  detailIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: Colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailCopy: { flex: 1, gap: 3, minWidth: 0 },
  detailLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.mutedLight,
    textTransform: 'uppercase',
    letterSpacing: 0.55,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.dark,
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
  verifiedOn: { backgroundColor: 'rgba(5, 150, 105, 0.1)' },
  verifiedOff: { backgroundColor: 'rgba(148, 163, 184, 0.12)' },
  verifiedText: { fontSize: 11, fontWeight: '700' },
  verifiedTextOn: { color: '#059669' },
  verifiedTextOff: { color: '#94A3B8' },
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
    backgroundColor: 'rgba(124, 58, 237, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  noteCopy: { flex: 1, gap: 4 },
  noteTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.dark,
  },
  noteBody: {
    fontSize: 13,
    color: Colors.muted,
    lineHeight: 19,
  },
});
