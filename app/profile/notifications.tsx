import { useCallback, useState } from 'react';
import { View, Text, Switch, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { ProfileSubScreen } from '../../src/components/profile/ProfileSubScreen';
import { GlassCard } from '../../src/components/ui/GlassCard';
import { LoadingOverlay } from '../../src/components/ui/LoadingOverlay';
import {
  api,
  isResponseSuccess,
  type NotificationOption,
  type NotificationSettings,
} from '../../src/lib/api';
import {
  getNotificationSettingsCached,
  hydrateNotificationSettingsCache,
  peekNotificationSettings,
  refreshNotificationSettingsSilently,
  setNotificationSettingsCache,
} from '../../src/lib/notification-settings-cache';
import { registerPushNotifications } from '../../src/lib/push-notifications';
import {Colors, Radius , Palette, FormColors, BRAND, Overlays, useThemedStyles } from '../../src/theme';
import { showToast } from '../../src/components/ui/Toast';


export default function NotificationSettingsScreen() {
  const styles = useStyles();

  const [settings, setSettings] = useState<NotificationSettings | null>(peekNotificationSettings());
  const [initialLoading, setInitialLoading] = useState(!peekNotificationSettings());
  const [saving, setSaving] = useState(false);

  const loadSettings = useCallback(async () => {
    const cached = peekNotificationSettings() ?? await hydrateNotificationSettingsCache();
    if (cached) {
      setSettings(cached);
      setInitialLoading(false);
      refreshNotificationSettingsSilently();
      void getNotificationSettingsCached().then((next) => setSettings(next)).catch(() => undefined);
      return;
    }

    setInitialLoading(true);
    try {
      const next = await getNotificationSettingsCached({ forceRefresh: true });
      setSettings(next);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Could not load notification settings';
      showToast({ type: 'error', text1: 'Load failed', text2: message });
    } finally {
      setInitialLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadSettings();
    }, [loadSettings]),
  );

  const updateSettings = async (
    patch: Parameters<typeof api.updateNotificationSettings>[0],
    rollback: () => void,
  ) => {
    setSaving(true);
    try {
      const res = await api.updateNotificationSettings(patch);
      if (!isResponseSuccess(res) || !res.data) throw new Error(res.message || 'Update failed');
      setSettings(res.data);
      setNotificationSettingsCache(res.data);

      const shouldRegisterPush =
        patch.pushNotificationsEnabled === true
        || patch.marketingPushNotificationsEnabled === true
        || (res.data.pushNotificationsEnabled || res.data.marketingPushNotificationsEnabled);

      if (shouldRegisterPush) {
        await registerPushNotifications();
      }
    } catch (error: unknown) {
      rollback();
      const message = error instanceof Error ? error.message : 'Could not update settings';
      showToast({ type: 'error', text1: 'Update failed', text2: message });
    } finally {
      setSaving(false);
    }
  };

  const handleOptionToggle = (option: NotificationOption, value: boolean) => {
    if (!settings || !option.adminEnabled || saving) return;

    const previous = settings;
    const nextOptions = settings.options.map((item) =>
      item.key === option.key ? { ...item, userEnabled: value } : item,
    );

    const optimistic: NotificationSettings = {
      ...settings,
      options: nextOptions,
      masterEnabled: nextOptions.some((item) => item.adminEnabled && item.userEnabled),
      [option.settingKey]: value,
    };

    setSettings(optimistic);
    setNotificationSettingsCache(optimistic);
    void updateSettings(
      { [option.settingKey]: value },
      () => setSettings(previous),
    );
  };

  const controlsDisabled = initialLoading || saving;

  return (
    <>
      <ProfileSubScreen
        title="Notifications"
        subtitle="Turn on only the alerts you want"
      >
        <GlassCard variant="solid" borderRadius={Radius.lg} padding={0} contentStyle={styles.card}>
          {(settings?.options ?? []).map((option, index) => {
            const inactive = !option.adminEnabled;
            const disabled = controlsDisabled || inactive;

            return (
              <View key={option.key}>
                {index > 0 ? <View style={styles.divider} /> : null}
                <ToggleRow
                  title={option.title}
                  subtitle={
                    inactive
                      ? 'Currently unavailable on DataMartNG'
                      : option.description
                  }
                  value={option.userEnabled}
                  inactive={inactive}
                  disabled={disabled}
                  onValueChange={(value) => handleOptionToggle(option, value)}
                />
              </View>
            );
          })}
        </GlassCard>
      </ProfileSubScreen>

      <LoadingOverlay
        visible={initialLoading && !settings}
        message="Loading your alerts…"
        submessage="Fetching notification preferences"
        icon="notifications-outline"
      />

      <LoadingOverlay
        visible={saving}
        message="Updating your alerts…"
        submessage="This will only take a moment"
        icon="notifications-outline"
      />
    </>
  );
}

function ToggleRow({
  title,
  subtitle,
  value,
  onValueChange,
  disabled,
  inactive,
}: {
  title: string;
  subtitle: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  disabled?: boolean;
  inactive?: boolean;
}) {
  const styles = useStyles();
  return (
    <View style={[styles.row, inactive && styles.rowInactive]}>
      <View style={styles.rowText}>
        <Text style={[styles.rowTitle, inactive && styles.rowTitleInactive]}>{title}</Text>
        <Text style={[styles.rowSub, inactive && styles.rowSubInactive]}>{subtitle}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: Colors.borderMid, true: inactive ? Colors.borderMid : Colors.primary }}
        thumbColor={Palette.white}
      />
    </View>
  );
}

const createStyles = (colors: import('../../src/theme/types').ThemeColors) => StyleSheet.create({
  card: { overflow: 'hidden' },
  row: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  rowInactive: {
    opacity: 0.55,
  },
  rowText: { flex: 1 },
  rowTitle: { fontSize: 15, fontWeight: '600', color: colors.dark },
  rowTitleInactive: { color: colors.muted },
  rowSub: { fontSize: 13, color: colors.muted, marginTop: 2 },
  rowSubInactive: { color: colors.mutedLight },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: 16 },
});

function useStyles() {
  return useThemedStyles(createStyles);
}
