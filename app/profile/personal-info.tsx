import { useCallback, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { ProfileSubScreen } from '../../src/components/profile/ProfileSubScreen';
import { GlassCard } from '../../src/components/ui/GlassCard';
import { GlassSurface } from '../../src/components/ui/GlassSurface';
import { UserAvatar } from '../../src/components/ui/UserAvatar';
import { api, isResponseSuccess } from '../../src/lib/api';
import { refreshUserProfile } from '../../src/lib/profile-sync';
import { useAuthStore } from '../../src/stores';
import { Colors, Radius, Spacing } from '../../src/theme';
import { useGradients } from '../../src/theme/hooks';
import { gradientStops } from '../../src/theme/gradient-utils';
import { showToast } from '../../src/components/ui/Toast';


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
  const gradients = useGradients();
  const { user, setUser } = useAuthStore();
  const [uploading, setUploading] = useState(false);

  const firstName = user?.firstName || '';
  const lastName = user?.lastName || '';
  const fullName = `${firstName} ${lastName}`.trim() || 'PrivateVTU User';

  useFocusEffect(
    useCallback(() => {
      void refreshUserProfile();
    }, []),
  );

  const pickAvatar = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showToast({ type: 'error', text1: 'Permission needed', text2: 'Allow photo access to update your photo' });
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
      base64: true,
    });
    if (result.canceled || !result.assets[0]?.base64) return;

    setUploading(true);
    try {
      const asset = result.assets[0];
      const mime = asset.mimeType || 'image/jpeg';
      const dataUri = `data:${mime};base64,${asset.base64}`;
      const uploadRes = await api.uploadAvatar(dataUri);
      if (!isResponseSuccess(uploadRes) || !uploadRes.data?.url) {
        throw new Error(uploadRes.message || 'Upload failed');
      }

      const newAvatarUrl = uploadRes.data.url;
      const profileRes = await api.updateProfile({ avatar: newAvatarUrl });
      if (!isResponseSuccess(profileRes) || !profileRes.data) {
        throw new Error(profileRes.message || 'Could not save photo');
      }

      setUser(profileRes.data);
      showToast({ type: 'success', text1: 'Photo updated', text2: 'Your profile photo is now synced across devices' });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Could not update photo';
      showToast({ type: 'error', text1: 'Update failed', text2: message });
    } finally {
      setUploading(false);
    }
  };

  return (
    <ProfileSubScreen title="Personal Info" subtitle="Your account details">
      <GlassCard variant="solid" borderRadius={24} padding={0} contentStyle={styles.profileCard}>
        <LinearGradient
          colors={gradientStops(gradients.cardSoft)}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.profileHero}
        >
          <View style={styles.heroBlobA} />
          <View style={styles.heroBlobB} />
        </LinearGradient>

        <View style={styles.profileBody}>
          <TouchableOpacity
            style={styles.avatarTap}
            onPress={() => void pickAvatar()}
            activeOpacity={0.88}
            disabled={uploading}
          >
            <UserAvatar
              uri={user?.avatar}
              firstName={firstName}
              lastName={lastName}
              size="xl"
              variant="light"
              style={styles.avatarLift}
            />
            <View style={styles.cameraBadge}>
              {uploading ? (
                <ActivityIndicator size="small" color={Colors.white} />
              ) : (
                <Ionicons name="camera" size={16} color={Colors.white} />
              )}
            </View>
          </TouchableOpacity>

          <Text style={styles.fullName}>{fullName}</Text>
          <Text style={styles.avatarHint}>Tap photo to update</Text>

          <View style={styles.memberPill}>
            <Ionicons name="person-circle-outline" size={14} color={Colors.primary} />
            <Text style={styles.memberPillText}>Account member</Text>
          </View>
        </View>
      </GlassCard>

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
  profileCard: {
    overflow: 'hidden',
    backgroundColor: Colors.white,
    ...Platform.select({
      ios: {
        shadowColor: '#4C1D95',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.12,
        shadowRadius: 18,
      },
      android: { elevation: 4 },
      default: {},
    }),
  },
  profileHero: {
    height: 96,
    overflow: 'hidden',
  },
  heroBlobA: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.08)',
    top: -30,
    right: -20,
  },
  heroBlobB: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.06)',
    bottom: -24,
    left: 18,
  },
  profileBody: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 24,
    marginTop: -54,
  },
  avatarTap: {
    position: 'relative',
    marginBottom: 14,
  },
  avatarLift: {
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.16,
        shadowRadius: 14,
      },
      android: { elevation: 6 },
      default: {},
    }),
  },
  cameraBadge: {
    position: 'absolute',
    right: 4,
    bottom: 4,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: Colors.white,
  },
  fullName: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.dark,
    letterSpacing: -0.4,
    textAlign: 'center',
  },
  avatarHint: {
    marginTop: 6,
    fontSize: 13,
    color: Colors.mutedLight,
    fontWeight: '500',
  },
  memberPill: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: Colors.primaryMuted,
  },
  memberPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },
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
