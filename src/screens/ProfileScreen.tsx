import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Switch,
} from 'react-native';
import { useState } from 'react';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../lib/api';
import { useAuthStore } from '../stores';
import { Colors, Spacing, Typography, Radius, Shadow } from '../theme';
import { Toast } from '../components/ui/Toast';

const PAGE_BG = '#F4F5FA';
const CARD_DARK = '#1A0A3C';
const BRAND = '#7C3AED';
const BORDER = 'rgba(15, 23, 42, 0.08)';

const BRAND_ICON = { bg: Colors.primaryMuted, iconColor: Colors.primary };

const KYC_MAP = {
  VERIFIED: { label: 'Verified', color: Colors.primaryLight, icon: 'shield-checkmark' as const },
  PENDING: { label: 'Pending', color: '#FCD34D', icon: 'time-outline' as const },
  NOT_VERIFIED: { label: 'Not Verified', color: '#FCA5A5', icon: 'shield-outline' as const },
  REJECTED: { label: 'Rejected', color: '#FCA5A5', icon: 'close-circle-outline' as const },
} as const;

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
  const { user, logout } = useAuthStore();
  const [notifications, setNotifications] = useState(true);
  const [biometric, setBiometric] = useState(false);

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

  const initials = user?.firstName
    ? `${user.firstName[0]}${user.lastName?.[0] || ''}`.toUpperCase()
    : 'PV';
  const fullName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : 'User';
  const kycStatus = user?.kycStatus ?? 'NOT_VERIFIED';
  const kyc = KYC_MAP[kycStatus as keyof typeof KYC_MAP] ?? KYC_MAP.NOT_VERIFIED;

  const GROUPS: MenuGroup[] = [
    {
      title: 'Account',
      items: [
        {
          icon: 'person-outline',
          label: 'Personal Info',
          subtitle: 'Name, email & phone',
          action: () => Toast.show({ type: 'info', text1: 'Coming Soon', text2: 'Profile editing coming soon' }),
        },
        {
          icon: 'id-card-outline',
          label: 'KYC Verification',
          subtitle: kycStatus === 'VERIFIED' ? 'Identity verified' : 'Complete verification to unlock limits',
          action: () => router.push('/kyc'),
          badge: kycStatus !== 'VERIFIED',
        },
        {
          icon: 'lock-closed-outline',
          label: 'Change PIN',
          subtitle: 'Update your transaction PIN',
          action: () => Toast.show({ type: 'info', text1: 'Coming Soon', text2: 'Change PIN coming soon' }),
        },
        {
          icon: 'key-outline',
          label: 'Change Password',
          subtitle: 'Keep your account secure',
          action: () => Toast.show({ type: 'info', text1: 'Coming Soon', text2: 'Change password coming soon' }),
        },
        {
          icon: 'shield-checkmark-outline',
          label: '2-Factor Auth',
          subtitle: user?.twoFactorEnabled ? 'Enabled' : 'Add an extra layer of security',
          action: () => Toast.show({
            type: 'info',
            text1: user?.twoFactorEnabled ? '2FA Enabled' : '2FA Disabled',
            text2: 'Manage your 2FA settings',
          }),
        },
      ],
    },
    {
      title: 'Preferences',
      items: [
        {
          icon: 'notifications-outline',
          label: 'Push Notifications',
          subtitle: 'Alerts for transactions & promos',
          toggle: true,
          toggleVal: notifications,
          toggleFn: setNotifications,
        },
        {
          icon: 'finger-print-outline',
          label: 'Biometric Login',
          subtitle: 'Face ID or fingerprint unlock',
          toggle: true,
          toggleVal: biometric,
          toggleFn: setBiometric,
        },
      ],
    },
    {
      title: 'Support',
      items: [
        {
          icon: 'help-circle-outline',
          label: 'Help & FAQ',
          subtitle: 'Answers to common questions',
          action: () => Alert.alert('Help', 'Visit privatevtu.vercel.app for FAQs'),
        },
        {
          icon: 'chatbubble-outline',
          label: 'Contact Support',
          subtitle: 'support@privatevtu.com',
          action: () => Alert.alert('Support', 'Email: support@privatevtu.com'),
        },
        {
          icon: 'star-outline',
          label: 'Rate the App',
          subtitle: 'Share your experience',
          action: () => Alert.alert('Thank you!', 'We appreciate your support!'),
        },
        {
          icon: 'document-text-outline',
          label: 'Privacy Policy',
          subtitle: 'How we protect your data',
          action: () => Alert.alert('Privacy', 'Visit privatevtu.com/privacy'),
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
    <ScrollView
      style={styles.root}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.headerTitle}>Profile</Text>
        <Text style={styles.headerSub}>Your account & preferences</Text>
      </View>

      <View style={styles.heroCard}>
        <LinearGradient
          colors={[CARD_DARK, '#2E1065', '#4C1D95']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroGradient}
        >
          <View style={styles.blob1} />
          <View style={styles.blob2} />
          <View style={styles.cardShine} />

          <View style={styles.avatarRing}>
            <LinearGradient colors={['#8B5CF6', BRAND]} style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </LinearGradient>
          </View>

          <Text style={styles.heroName}>{fullName}</Text>
          {user?.email ? <Text style={styles.heroMeta}>{user.email}</Text> : null}
          {user?.phone ? <Text style={styles.heroMeta}>{user.phone}</Text> : null}

          <View style={styles.badgeRow}>
            <View style={styles.glassBadge}>
              <Ionicons name={kyc.icon} size={12} color={kyc.color} />
              <Text style={[styles.glassBadgeText, { color: kyc.color }]}>KYC {kyc.label}</Text>
            </View>
          </View>
        </LinearGradient>
      </View>

      {kycStatus !== 'VERIFIED' ? (
        <TouchableOpacity style={styles.kycPrompt} onPress={() => router.push('/kyc')} activeOpacity={0.85}>
          <View style={styles.kycPromptIcon}>
            <Ionicons name="shield-outline" size={18} color={BRAND} />
          </View>
          <View style={styles.kycPromptBody}>
            <Text style={styles.kycPromptTitle}>Complete KYC verification</Text>
            <Text style={styles.kycPromptSub}>Unlock higher limits and permanent accounts</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={BRAND} />
        </TouchableOpacity>
      ) : null}

      <View style={styles.settingsWrap}>
        {GROUPS.map((group, gi) => (
          <View key={gi}>
            {group.title ? <Text style={styles.groupTitle}>{group.title}</Text> : null}
            <View style={[styles.groupCard, group.items.some((i) => i.danger) && styles.groupCardDanger]}>
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
            </View>
          </View>
        ))}
      </View>

      <View style={styles.footer}>
        <Ionicons name="lock-closed" size={12} color={Colors.muted} />
        <Text style={styles.footerText}>PrivateVTU v1.0.0 · Secured & NDPR compliant</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: PAGE_BG },
  content: { paddingHorizontal: Spacing.page },
  header: {
    paddingBottom: 18,
    marginHorizontal: -Spacing.page,
    paddingHorizontal: Spacing.page,
    backgroundColor: Colors.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
    marginBottom: 20,
  },
  headerTitle: { ...Typography.h2, color: Colors.dark, marginBottom: 4 },
  headerSub: { ...Typography.small, color: Colors.muted },

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
  heroMeta: { fontSize: 13, color: 'rgba(255,255,255,0.68)', marginBottom: 2 },
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

  kycPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.16)',
    ...Shadow.xs,
  },
  kycPromptIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kycPromptBody: { flex: 1, gap: 2 },
  kycPromptTitle: { fontSize: 14, fontWeight: '700', color: Colors.dark },
  kycPromptSub: { fontSize: 12, color: Colors.muted, lineHeight: 16 },

  settingsWrap: { gap: 4 },
  groupTitle: {
    ...Typography.label,
    color: Colors.muted,
    marginTop: 12,
    marginBottom: 8,
    marginLeft: 2,
  },
  groupCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: BORDER,
    ...Shadow.card,
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
