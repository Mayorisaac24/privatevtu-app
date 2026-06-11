import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, Switch,
} from 'react-native';
import { useState, useEffect } from 'react';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api, isResponseSuccess } from '../../src/lib/api';
import { useAuthStore } from '../../src/stores';
import { Colors, Spacing, Typography, Radius, Shadow } from '../../src/theme';
import { Toast } from '../../src/components/ui/Toast';
import { registerPushNotifications } from '../../src/lib/push-notifications';

const KYC_MAP = {
  VERIFIED:     { label: 'Verified',     color: Colors.success, bg: Colors.successLight, icon: 'shield-checkmark' },
  PENDING:      { label: 'Pending',      color: Colors.warning, bg: Colors.warningLight, icon: 'time-outline' },
  NOT_VERIFIED: { label: 'Not Verified', color: Colors.error,   bg: Colors.errorLight,   icon: 'shield-outline' },
  REJECTED:     { label: 'Rejected',     color: Colors.error,   bg: Colors.errorLight,   icon: 'close-circle-outline' },
} as const;

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuthStore();
  const [notifications, setNotifications] = useState(true);
  const [biometric, setBiometric] = useState(false);

  useEffect(() => {
    void api.getNotificationSettings().then((res) => {
      if (isResponseSuccess(res) && res.data) {
        setNotifications(res.data.pushNotificationsEnabled);
      }
    });
  }, []);

  const handleNotificationsToggle = async (enabled: boolean) => {
    setNotifications(enabled);
    try {
      const res = await api.updateNotificationSettings({ pushNotificationsEnabled: enabled });
      if (!isResponseSuccess(res)) {
        throw new Error(res.message || 'Could not update notification settings');
      }
      if (enabled) {
        await registerPushNotifications();
      }
    } catch (err: unknown) {
      setNotifications(!enabled);
      const message = err instanceof Error ? err.message : 'Could not update notifications';
      Toast.show({ type: 'error', text1: 'Update failed', text2: message });
    }
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out', style: 'destructive',
        onPress: async () => {
          try { await api.logout(); } catch {}
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
  const kyc = KYC_MAP[kycStatus];

  const GROUPS = [
    {
      title: 'Account',
      items: [
        { icon: 'person-outline',            bg: Colors.primaryMuted, iconColor: Colors.primary,  label: 'Personal Info',        action: () => Toast.show({ type: 'info', text1: 'Coming Soon', text2: 'Profile editing coming soon' }) },
        { icon: 'id-card-outline',           bg: kyc.bg,              iconColor: kyc.color,       label: 'KYC Verification',     action: () => router.push('/kyc'), badge: kycStatus !== 'VERIFIED' },
        { icon: 'lock-closed-outline',       bg: Colors.successLight, iconColor: Colors.success,  label: 'Change PIN',           action: () => Toast.show({ type: 'info', text1: 'Coming Soon', text2: 'Change PIN coming soon' }) },
        { icon: 'key-outline',               bg: Colors.warningLight, iconColor: Colors.warning,  label: 'Change Password',      action: () => Toast.show({ type: 'info', text1: 'Coming Soon', text2: 'Change password coming soon' }) },
        { icon: 'shield-checkmark-outline',  bg: Colors.successLight, iconColor: Colors.success,  label: '2-Factor Auth',        action: () => Toast.show({ type: 'info', text1: user?.twoFactorEnabled ? '2FA Enabled' : '2FA Disabled', text2: 'Manage your 2FA settings' }) },
      ],
    },
    {
      title: 'Preferences',
      items: [
        { icon: 'notifications-outline', bg: Colors.primaryMuted, iconColor: Colors.primary, label: 'Push Notifications', toggle: true, toggleVal: notifications, toggleFn: handleNotificationsToggle },
        { icon: 'finger-print-outline',  bg: Colors.successLight, iconColor: Colors.success, label: 'Biometric Login',   toggle: true, toggleVal: biometric,      toggleFn: setBiometric },
      ],
    },
    {
      title: 'Support',
      items: [
        { icon: 'help-circle-outline', bg: Colors.warningLight, iconColor: Colors.warning, label: 'Help & FAQ',       action: () => Alert.alert('Help', 'Visit privatevtu.vercel.app for FAQs') },
        { icon: 'chatbubble-outline',  bg: Colors.primaryMuted, iconColor: Colors.primary, label: 'Contact Support',  action: () => Alert.alert('Support', 'Email: support@privatevtu.com') },
        { icon: 'star-outline',        bg: Colors.warningLight, iconColor: Colors.warning, label: 'Rate the App',    action: () => Alert.alert('Thank you! ⭐', 'We appreciate your support!') },
        { icon: 'shield-outline',      bg: Colors.successLight, iconColor: Colors.success, label: 'Privacy Policy',  action: () => Alert.alert('Privacy', 'Visit privatevtu.com/privacy') },
      ],
    },
    {
      title: '',
      items: [
        { icon: 'log-out-outline', bg: Colors.errorLight, iconColor: Colors.error, label: 'Sign Out', action: handleLogout, danger: true },
      ],
    },
  ];

  return (
    <ScrollView style={styles.root} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.headerTitle}>Profile</Text>
      </View>

      {/* Profile hero */}
      <View style={styles.heroWrap}>
        <View style={styles.hero}>
          <View style={styles.shine} />
          <View style={styles.avatarRing}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
          </View>
          <Text style={styles.heroName}>{fullName}</Text>
          {user?.email && <Text style={styles.heroMeta}>{user.email}</Text>}
          {user?.phone && <Text style={styles.heroMeta}>{user.phone}</Text>}

          <View style={styles.badgeRow}>
            <View style={[styles.kycBadge, { backgroundColor: kyc.bg }]}>
              <Ionicons name={kyc.icon as any} size={12} color={kyc.color} />
              <Text style={[styles.kycBadgeText, { color: kyc.color }]}>KYC {kyc.label}</Text>
            </View>
            {user?.referralCode && (
              <View style={styles.refBadge}>
                <Ionicons name="gift-outline" size={12} color={Colors.primary} />
                <Text style={styles.refText}>{user.referralCode}</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Settings */}
      <View style={styles.settingsWrap}>
        {GROUPS.map((group, gi) => (
          <View key={gi}>
            {group.title ? <Text style={styles.groupTitle}>{group.title}</Text> : null}
            <View style={styles.groupCard}>
              {group.items.map((item: any, ii: number) => (
                <TouchableOpacity
                  key={item.label}
                  style={[styles.row, ii < group.items.length - 1 && styles.rowBorder]}
                  onPress={item.action}
                  activeOpacity={item.action ? 0.7 : 1}
                  disabled={!item.action && !item.toggle}
                >
                  <View style={[styles.rowIcon, { backgroundColor: item.bg }]}>
                    <Ionicons name={item.icon} size={17} color={item.iconColor} />
                  </View>
                  <Text style={[styles.rowLabel, item.danger && { color: Colors.error }]}>{item.label}</Text>
                  {item.badge && (
                    <View style={styles.badge}><Text style={styles.badgeText}>!</Text></View>
                  )}
                  {item.toggle ? (
                    <Switch
                      value={item.toggleVal}
                      onValueChange={item.toggleFn}
                      trackColor={{ false: Colors.border, true: Colors.primary }}
                      thumbColor={Colors.white}
                    />
                  ) : (
                    <Ionicons name="chevron-forward" size={15} color={item.danger ? Colors.error : Colors.borderMid} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}
      </View>

      <Text style={styles.version}>PrivateVTU v1.0.0 · Made with ❤️ in Nigeria</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.surface },
  header: {
    paddingHorizontal: Spacing.page, paddingBottom: 16,
    backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  headerTitle: { ...Typography.h2, color: Colors.dark },
  heroWrap: { padding: Spacing.page, backgroundColor: Colors.white, paddingBottom: 0 },
  hero: {
    backgroundColor: Colors.primaryDeep, borderRadius: Radius.xl,
    paddingVertical: 28, paddingHorizontal: 20, alignItems: 'center',
    overflow: 'hidden', marginBottom: 20, ...Shadow.lg,
  },
  shine: {
    position: 'absolute', top: -50, right: -30,
    width: 150, height: 150, borderRadius: 75,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  avatarRing: {
    width: 80, height: 80, borderRadius: 40,
    borderWidth: 3, borderColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center', alignItems: 'center', marginBottom: 12,
  },
  avatar: {
    width: 68, height: 68, borderRadius: 34,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { ...Typography.h2, color: Colors.white },
  heroName: { ...Typography.h3, color: Colors.white, marginBottom: 4 },
  heroMeta: { ...Typography.small, color: 'rgba(255,255,255,0.65)', marginBottom: 2 },
  badgeRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  kycBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.full,
  },
  kycBadgeText: { ...Typography.captionMed },
  refBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.full,
    backgroundColor: Colors.primaryMuted,
  },
  refText: { ...Typography.captionMed, color: Colors.primary },
  settingsWrap: { paddingHorizontal: Spacing.page, paddingTop: 4 },
  groupTitle: { ...Typography.label, color: Colors.muted, marginTop: 16, marginBottom: 8, paddingHorizontal: 2 },
  groupCard: { backgroundColor: Colors.white, borderRadius: Radius.xl, overflow: 'hidden', ...Shadow.card, marginBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 15, gap: 12 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.surface },
  rowIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  rowLabel: { ...Typography.bodyMed, color: Colors.dark, flex: 1 },
  badge: {
    width: 18, height: 18, borderRadius: 9, backgroundColor: Colors.error,
    justifyContent: 'center', alignItems: 'center', marginRight: 4,
  },
  badgeText: { ...Typography.label, color: Colors.white, fontSize: 9 },
  version: { ...Typography.caption, color: Colors.borderMid, textAlign: 'center', marginTop: 20, paddingBottom: 8 },
});
