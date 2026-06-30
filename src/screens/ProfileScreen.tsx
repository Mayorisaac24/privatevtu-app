import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { useCallback, useEffect, useState } from 'react';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../stores';
import { api, isResponseSuccess } from '../lib/api';
import { Colors, Spacing, Typography, Radius, Shadow } from '../theme';
import { useGradients } from '../theme/hooks';
import { ThemedScreen } from '../components/ui/ThemedScreen';
import { GlassCard } from '../components/ui/GlassCard';
import { GlassSurface } from '../components/ui/GlassSurface';
import { UserAvatar } from '../components/ui/UserAvatar';
import { ScreenBody } from '../components/ui/ScreenBody';
import { useLayout } from '../lib/platform-ui';
import { preloadTwoFactorMethods } from '../lib/two-factor-methods-cache';
import { preloadBiometricSettings } from '../lib/biometric-settings-cache';
import { getNotificationSettingsCached, hydrateNotificationSettingsCache } from '../lib/notification-settings-cache';
import { getKycStatusData, peekKycStatusCache } from '../lib/kyc-status-cache';
import { preloadNigeriaLocations } from '../lib/nigeria-locations-cache';
import { getProfileKycDisplay } from '../lib/kyc-display';
import type { KycStatusData } from '../lib/api';
import { refreshUserProfile } from '../lib/profile-sync';
import { useAvatarPicker } from '../hooks/useAvatarPicker';

const BRAND_ICON = { bg: Colors.primaryMuted, iconColor: Colors.primary };

type MenuItem = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  action?: () => void;
  toggle?: boolean;
  toggleVal?: boolean;
  toggleFn?: (v: boolean) => void;
  badge?: boolean;
  danger?: boolean;
  subtitle?: string;
};

type MenuGroup = {
  title: string;
  items: MenuItem[];
};

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { pagePadding } = useLayout();
  const { user, logout } = useAuthStore();
  const gradients = useGradients();
  const { pickAvatar, uploading } = useAvatarPicker();
  const [kycData, setKycData] = useState<KycStatusData | null>(() => peekKycStatusCache());
  const [programSubtitle, setProgramSubtitle] = useState('Upgrade your pricing tier');
  const [apiAccessSubtitle, setApiAccessSubtitle] = useState('Request developer API credentials');
  const [apiAccessBadge, setApiAccessBadge] = useState(false);

  useFocusEffect(
    useCallback(() => {
      void refreshUserProfile();
      void getKycStatusData({ force: true }).then((data) => {
        if (data) setKycData(data);
      });
      void Promise.all([api.getMyUserType(), api.getMyApiAccess()]).then(([typeRes, apiRes]) => {
        if (isResponseSuccess(typeRes) && typeRes.data) {
          const label = typeRes.data.name || typeRes.data.code || 'Default';
          setProgramSubtitle(`Current plan: ${label}`);
        }
        if (isResponseSuccess(apiRes) && apiRes.data) {
          if (apiRes.data.activeClient?.isActive) {
            setApiAccessSubtitle(`Active · ${apiRes.data.activeClient.responseFormat}`);
            setApiAccessBadge(false);
          } else if (apiRes.data.pending) {
            setApiAccessSubtitle('Request pending admin review');
            setApiAccessBadge(true);
          } else if (apiRes.data.latest?.status === 'REJECTED') {
            setApiAccessSubtitle('Last request rejected — you can resubmit');
            setApiAccessBadge(true);
          } else {
            setApiAccessSubtitle('Request developer API credentials');
            setApiAccessBadge(false);
          }
        }
      }).catch(() => undefined);
    }, []),
  );

  useEffect(() => {
    preloadTwoFactorMethods();
    preloadBiometricSettings();
    preloadNigeriaLocations();
    void hydrateNotificationSettingsCache();
    void getNotificationSettingsCached().catch(() => undefined);
  }, []);

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.logout();
          } catch {
            // proceed with local logout
          }
          logout();
          router.replace('/auth/login');
        },
      },
    ]);
  };

  const fullName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : 'User';
  const kycStatus = user?.kycStatus ?? 'NOT_VERIFIED';
  const kycDisplay = getProfileKycDisplay(kycStatus, kycData);
  const { badge: kycBadge, menuSubtitle: kycMenuSubtitle, showMenuBadge } = kycDisplay;

  const GROUPS: MenuGroup[] = [
    {
      title: 'Account',
      items: [
        {
          icon: 'person-outline',
          label: 'Personal Info',
          subtitle: 'View your profile details',
          action: () => router.push('/profile/personal-info'),
        },
        {
          icon: 'id-card-outline',
          label: 'KYC Verification',
          subtitle: kycMenuSubtitle,
          action: () => router.push('/kyc'),
          badge: showMenuBadge,
        },
        {
          icon: 'ribbon-outline',
          label: 'Programs',
          subtitle: programSubtitle,
          action: () => router.push('/profile/programs'),
        },
        {
          icon: 'code-slash-outline',
          label: 'API Access',
          subtitle: apiAccessSubtitle,
          badge: apiAccessBadge,
          action: () => router.push('/profile/api-access'),
        },
        {
          icon: 'lock-closed-outline',
          label: 'Change PIN',
          subtitle: 'Update your transaction PIN',
          action: () => router.push('/profile/change-pin'),
        },
        {
          icon: 'key-outline',
          label: 'Change Password',
          subtitle: 'Keep your account secure',
          action: () => router.push('/profile/change-password'),
        },
        {
          icon: 'shield-checkmark-outline',
          label: '2-Factor Auth',
          subtitle: user?.twoFactorEnabled
            ? `Enabled · ${user.twoFactorMethod === 'EMAIL' ? 'Email' : user.twoFactorMethod === 'SMS' ? 'SMS' : 'Authenticator'}`
            : 'Add an extra layer of security',
          action: () => router.push('/profile/two-factor'),
        },
      ],
    },
    {
      title: 'Preferences',
      items: [
        {
          icon: 'color-palette-outline',
          label: 'Appearance',
          subtitle: 'Themes, dark mode & display colors',
          action: () => router.push('/profile/appearance' as never),
        },
        {
          icon: 'notifications-outline',
          label: 'Notifications',
          subtitle: 'Push, email & account alerts',
          action: () => router.push('/profile/notifications'),
        },
        {
          icon: 'finger-print-outline',
          label: 'Biometric',
          subtitle: user?.biometricEnabled
            ? 'Authentication and transaction options'
            : 'Set up Face ID or fingerprint',
          action: () => router.push('/profile/biometric'),
        },
      ],
    },
    {
      title: 'Support',
      items: [
        {
          icon: 'help-circle-outline',
          label: 'Help & FAQ',
          subtitle: 'Searchable answers from admin',
          action: () => router.push('/profile/help'),
        },
        {
          icon: 'chatbubble-outline',
          label: 'Contact Support',
          subtitle: 'Disputes, email & help channels',
          action: () => router.push('/profile/contact'),
        },
        {
          icon: 'shield-outline',
          label: 'My Disputes',
          subtitle: 'Track transaction issues',
          action: () => router.push('/profile/disputes'),
        },
        {
          icon: 'star-outline',
          label: 'Rate the App',
          subtitle: 'Share your experience',
          action: () => router.push('/profile/rate-app'),
        },
        {
          icon: 'document-text-outline',
          label: 'Privacy Policy',
          subtitle: 'How we protect your data',
          action: () => router.push('/profile/privacy'),
        },
      ],
    },
    {
      title: '',
      items: [
        {
          icon: 'log-out-outline',
          label: 'Sign Out',
          subtitle: 'Log out of this device',
          action: handleLogout,
          danger: true,
        },
      ],
    },
  ];

  return (
    <ThemedScreen>

      <GlassSurface
        variant="light"
        borderRadius={24}
        style={styles.headerShell}
        contentStyle={{ ...styles.header, paddingTop: insets.top + 12, paddingHorizontal: pagePadding }}
      >
        <Text style={styles.headerTitle}>Profile</Text>
        <Text style={styles.headerSub}>Your account & preferences</Text>
      </GlassSurface>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
      <ScreenBody>
      <View style={styles.heroCard}>
        <LinearGradient
          colors={[...gradients.hero]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroGradient}
        >
          <View style={styles.blob1} />
          <View style={styles.blob2} />
          <View style={styles.cardShine} />

          <TouchableOpacity
            style={styles.avatarTap}
            onPress={() => void pickAvatar()}
            activeOpacity={0.88}
            disabled={uploading}
            accessibilityRole="button"
            accessibilityLabel="Change profile photo"
          >
            <UserAvatar
              uri={user?.avatar}
              firstName={user?.firstName}
              lastName={user?.lastName}
              size="lg"
              variant="hero"
            />
            <View style={styles.cameraBadge}>
              {uploading ? (
                <ActivityIndicator size="small" color={Colors.white} />
              ) : (
                <Ionicons name="camera" size={14} color={Colors.white} />
              )}
            </View>
          </TouchableOpacity>

          <Text style={styles.heroName}>{fullName}</Text>
          {user?.email ? (
            <View style={styles.heroMetaRow}>
              <Text style={styles.heroMeta}>{user.email}</Text>
              {user.isEmailVerified ? (
                <Ionicons name="checkmark-circle" size={13} color="rgba(255,255,255,0.75)" />
              ) : null}
            </View>
          ) : null}
          {user?.phone ? (
            <View style={styles.heroMetaRow}>
              <Text style={styles.heroMeta}>{user.phone}</Text>
              {user.isPhoneVerified ? (
                <Ionicons name="checkmark-circle" size={13} color="rgba(255,255,255,0.75)" />
              ) : null}
            </View>
          ) : null}

          <TouchableOpacity
            style={styles.badgeRow}
            onPress={() => router.push('/kyc')}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Open KYC verification"
          >
            <View style={styles.glassBadge}>
              <Ionicons name={kycBadge.icon} size={12} color={kycBadge.color} />
              <Text style={[styles.glassBadgeText, { color: kycBadge.color }]}>{kycBadge.label}</Text>
            </View>
          </TouchableOpacity>
        </LinearGradient>
      </View>

      <View style={styles.settingsWrap}>
        {GROUPS.map((group, gi) => (
          <View key={gi}>
            {group.title ? <Text style={styles.groupTitle}>{group.title}</Text> : null}
            <GlassCard
              borderRadius={Radius.xl}
              padding={0}
              style={[styles.groupCardSpacing, group.items.some((i) => i.danger) && styles.groupCardDanger]}
            >
              {group.items.map((item, ii) => (
                <TouchableOpacity
                  key={item.label}
                  style={[styles.row, ii < group.items.length - 1 && styles.rowBorder]}
                  onPress={item.action}
                  activeOpacity={item.action || item.toggle ? 0.72 : 1}
                  disabled={!item.action && !item.toggle}
                >
                  <View
                    style={[
                      styles.rowIcon,
                      item.danger ? styles.rowIconDanger : styles.rowIconBrand,
                    ]}
                  >
                    <Ionicons
                      name={item.icon}
                      size={18}
                      color={item.danger ? Colors.error : BRAND_ICON.iconColor}
                    />
                  </View>

                  <View style={styles.rowBody}>
                    <Text style={[styles.rowLabel, item.danger && styles.rowLabelDanger]}>{item.label}</Text>
                    {item.subtitle ? (
                      <Text style={[styles.rowSub, item.danger && styles.rowSubDanger]} numberOfLines={1}>
                        {item.subtitle}
                      </Text>
                    ) : null}
                  </View>

                  {item.badge ? (
                    <View style={styles.alertBadge}>
                      <Text style={styles.alertBadgeText}>!</Text>
                    </View>
                  ) : null}

                  {item.toggle ? (
                    <Switch
                      value={item.toggleVal}
                      onValueChange={item.toggleFn}
                      trackColor={{ false: Colors.borderMid, true: Colors.primary }}
                      thumbColor={Colors.white}
                      ios_backgroundColor={Colors.borderMid}
                    />
                  ) : (
                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color={item.danger ? Colors.error : Colors.mutedLight}
                    />
                  )}
                </TouchableOpacity>
              ))}
            </GlassCard>
          </View>
        ))}
      </View>

      <View style={styles.footer}>
        <Ionicons name="lock-closed" size={12} color={Colors.muted} />
        <Text style={styles.footerText}>Datamart v1.0.0 · Secured & NDPR compliant</Text>
      </View>
      </ScreenBody>
      </ScrollView>
    </ThemedScreen>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flex: 1 },
  content: {
    paddingTop: 18,
  },
  headerShell: {
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    ...Shadow.sm,
  },
  header: {
    paddingBottom: 18,
    gap: 4,
  },
  headerTitle: {
    ...Typography.h2,
    color: Colors.dark,
    letterSpacing: -0.3,
  },
  headerSub: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.mid,
    lineHeight: 20,
  },

  heroCard: {
    marginBottom: 16,
    borderRadius: 22,
    overflow: 'hidden',
    ...Shadow.lg,
  },
  heroGradient: {
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: 'center',
    overflow: 'hidden',
  },
  cardShine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  blob1: {
    position: 'absolute',
    top: -40,
    right: -30,
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: 'rgba(124, 58, 237, 0.35)',
  },
  blob2: {
    position: 'absolute',
    bottom: -24,
    left: -20,
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(99, 102, 241, 0.22)',
  },
  avatarTap: {
    position: 'relative',
    marginBottom: 12,
  },
  cameraBadge: {
    position: 'absolute',
    right: 2,
    bottom: 2,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: 'rgba(255,255,255,0.95)',
  },
  avatarRing: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.28)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { fontSize: 24, fontWeight: '800', color: Colors.white, letterSpacing: -0.5 },
  heroName: { fontSize: 20, fontWeight: '800', color: Colors.white, marginBottom: 4, letterSpacing: -0.3 },
  heroMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 2,
  },
  heroMeta: { fontSize: 13, color: 'rgba(255,255,255,0.68)' },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginTop: 14,
  },
  glassBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  glassBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.92)',
    letterSpacing: 0.2,
  },

  settingsWrap: { gap: 4 },
  groupTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.mid,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginTop: 12,
    marginBottom: 8,
    marginLeft: 2,
  },
  groupCardSpacing: {
    marginBottom: 8,
  },
  groupCardDanger: {
    borderColor: 'rgba(239, 68, 68, 0.12)',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 12,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.surfaceAlt,
  },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowIconBrand: { backgroundColor: Colors.primaryMuted },
  rowIconDanger: { backgroundColor: Colors.errorLight },
  rowBody: { flex: 1, gap: 2 },
  rowLabel: { fontSize: 15, fontWeight: '600', color: Colors.dark },
  rowLabelDanger: { color: Colors.error },
  rowSub: { fontSize: 12, color: Colors.muted, lineHeight: 16 },
  rowSubDanger: { color: Colors.error, opacity: 0.75 },
  alertBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.error,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 2,
  },
  alertBadgeText: { fontSize: 11, fontWeight: '800', color: Colors.white },

  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 16,
    paddingBottom: 8,
  },
  footerText: { fontSize: 11, color: Colors.muted, fontWeight: '500' },
});
