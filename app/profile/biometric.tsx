import { useCallback, useState } from 'react';
import { View, Text, Switch, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { ProfileSubScreen } from '../../src/components/profile/ProfileSubScreen';
import { GlassCard } from '../../src/components/ui/GlassCard';
import { LoadingOverlay } from '../../src/components/ui/LoadingOverlay';
import { useAuthStore, useSecurityStore } from '../../src/stores';
import {
  disableBiometricSignIn,
  enableBiometricSignIn,
} from '../../src/lib/biometric-auth';
import {
  ensureBiometricSettingsReady,
  isBiometricSettingsCached,
  peekBiometricCapability,
} from '../../src/lib/biometric-settings-cache';
import { getBiometricCredentials } from '../../src/lib/security-storage';
import { showToast } from '../../src/components/ui/Toast';
import { Colors, Radius } from '../../src/theme';
import type { SecurityPrefs } from '../../src/lib/security-storage';


function syncUserBiometricFlag(
  updateUser: ReturnType<typeof useAuthStore.getState>['updateUser'],
  prefs: Pick<SecurityPrefs, 'authWithBiometric' | 'transactionsWithBiometric'>,
) {
  updateUser({
    biometricEnabled: prefs.authWithBiometric || prefs.transactionsWithBiometric,
  });
}

export default function BiometricSettingsScreen() {
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  const prefs = useSecurityStore((s) => s.prefs);
  const updatePrefs = useSecurityStore((s) => s.updatePrefs);

  const cachedCapability = peekBiometricCapability();
  const [initialLoading, setInitialLoading] = useState(!isBiometricSettingsCached());
  const [saving, setSaving] = useState(false);
  const [bioLabel, setBioLabel] = useState(cachedCapability?.label || 'Biometric');
  const [hardwareReady, setHardwareReady] = useState(cachedCapability?.available ?? false);

  useFocusEffect(
    useCallback(() => {
      if (isBiometricSettingsCached()) {
        const capability = peekBiometricCapability();
        if (capability) {
          setBioLabel(capability.label || 'Biometric');
          setHardwareReady(capability.available);
        }
        setInitialLoading(false);
        return;
      }

      let cancelled = false;
      setInitialLoading(true);

      void ensureBiometricSettingsReady()
        .then((capability) => {
          if (cancelled) return;
          setBioLabel(capability.label || 'Biometric');
          setHardwareReady(capability.available);
        })
        .catch(() => {
          if (cancelled) return;
          showToast({
            type: 'error',
            text1: 'Load failed',
            text2: 'Could not load biometric settings',
          });
        })
        .finally(() => {
          if (!cancelled) setInitialLoading(false);
        });

      return () => {
        cancelled = true;
      };
    }, []),
  );

  const ensurePinReady = useCallback(() => {
    if (user?.hasPin) return true;
    showToast({
      type: 'info',
      text1: 'Transaction PIN required',
      text2: 'Set your PIN before enabling biometric',
    });
    router.push('/profile/change-pin');
    return false;
  }, [user?.hasPin]);

  const ensureHardwareReady = useCallback(() => {
    if (hardwareReady) return true;
    showToast({
      type: 'error',
      text1: `${bioLabel} unavailable`,
      text2: `Enroll ${bioLabel.toLowerCase()} in your device settings first`,
    });
    return false;
  }, [bioLabel, hardwareReady]);

  const ensureBiometricCredentials = useCallback(async () => {
    const creds = await getBiometricCredentials();
    if (creds?.biometricToken) return true;

    const result = await enableBiometricSignIn(user?.email || '', user?.id || '');
    if (!result.ok) {
      showToast({ type: 'error', text1: 'Could not enable', text2: result.message });
      return false;
    }
    return true;
  }, [user?.email, user?.id]);

  const handleAuthToggle = async (value: boolean) => {
    if (saving) return;
    if (!ensurePinReady() || !ensureHardwareReady()) return;

    const previous = prefs;

    if (value) {
      setSaving(true);
      try {
        const ready = await ensureBiometricCredentials();
        if (!ready) return;

        const next: SecurityPrefs = { ...prefs, authWithBiometric: true };
        await updatePrefs(next);
        syncUserBiometricFlag(updateUser, next);
        showToast({ type: 'success', text1: `${bioLabel} enabled for sign-in and unlock` });
      } catch {
        await updatePrefs(previous);
        showToast({ type: 'error', text1: 'Update failed', text2: 'Could not enable biometric auth' });
      } finally {
        setSaving(false);
      }
      return;
    }

    const next: SecurityPrefs = {
      ...prefs,
      authWithBiometric: false,
    };

    setSaving(true);
    try {
      if (!next.transactionsWithBiometric) {
        await disableBiometricSignIn();
      }
      await updatePrefs(next);
      syncUserBiometricFlag(updateUser, next);
      showToast({ type: 'success', text1: `${bioLabel} auth disabled` });
    } catch {
      await updatePrefs(previous);
      showToast({ type: 'error', text1: 'Update failed', text2: 'Could not disable biometric auth' });
    } finally {
      setSaving(false);
    }
  };

  const handleTransactionToggle = async (value: boolean) => {
    if (saving) return;
    if (!ensurePinReady() || !ensureHardwareReady()) return;

    const previous = prefs;

    if (value) {
      setSaving(true);
      try {
        const ready = await ensureBiometricCredentials();
        if (!ready) return;

        const next: SecurityPrefs = { ...prefs, transactionsWithBiometric: true };
        await updatePrefs(next);
        syncUserBiometricFlag(updateUser, next);
        showToast({ type: 'success', text1: `${bioLabel} enabled for transactions` });
      } catch {
        await updatePrefs(previous);
        showToast({ type: 'error', text1: 'Update failed', text2: 'Could not enable transaction biometric' });
      } finally {
        setSaving(false);
      }
      return;
    }

    const next: SecurityPrefs = { ...prefs, transactionsWithBiometric: false };

    setSaving(true);
    try {
      if (!next.authWithBiometric) {
        await disableBiometricSignIn();
      }
      await updatePrefs(next);
      syncUserBiometricFlag(updateUser, next);
    } catch {
      await updatePrefs(previous);
      showToast({ type: 'error', text1: 'Update failed', text2: 'Could not disable transaction biometric' });
    } finally {
      setSaving(false);
    }
  };

  const controlsDisabled = initialLoading || saving || !hardwareReady;

  return (
    <>
      <ProfileSubScreen title="Biometric" subtitle="Turn on only what you need on this device">
        <GlassCard variant="solid" borderRadius={Radius.lg} padding={0} contentStyle={styles.card}>
          <ToggleRow
            title="Authentication & authorization"
            subtitle="Unlock the app and sign in with biometrics"
            value={prefs.authWithBiometric}
            disabled={controlsDisabled}
            onValueChange={(value) => void handleAuthToggle(value)}
          />
          <View style={styles.divider} />
          <ToggleRow
            title="Transactions"
            subtitle="Authorize payments with biometrics or PIN"
            value={prefs.transactionsWithBiometric}
            disabled={controlsDisabled}
            onValueChange={(value) => void handleTransactionToggle(value)}
          />
        </GlassCard>
      </ProfileSubScreen>

      <LoadingOverlay
        visible={initialLoading}
        message="Loading biometric settings…"
        submessage="Checking device capability"
        icon="finger-print-outline"
      />

      <LoadingOverlay
        visible={saving}
        message="Updating biometric settings…"
        submessage="This will only take a moment"
        icon="finger-print-outline"
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
}: {
  title: string;
  subtitle: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowText}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowSub}>{subtitle}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: Colors.borderMid, true: Colors.primary }}
        thumbColor="#fff"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { overflow: 'hidden' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  rowText: { flex: 1 },
  rowTitle: { fontSize: 15, fontWeight: '600', color: Colors.dark },
  rowSub: { fontSize: 13, color: Colors.muted, marginTop: 2 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: Colors.border, marginLeft: 16 },
});
