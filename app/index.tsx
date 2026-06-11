import { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { api } from '../src/lib/api';
import { prefetchAppData } from '../src/lib/dashboard-data';
import { setSuppressSessionExpiryUi } from '../src/lib/session';
import { useAuthStore } from '../src/stores';
import { ScreenStatusBar } from '../src/hooks/useStatusBarStyle';
import { Colors, Typography, Shadow } from '../src/theme';

export default function SplashScreen() {
  const { setUser } = useAuthStore();

  useEffect(() => { init(); }, []);

  const init = async () => {
    setSuppressSessionExpiryUi(true);
    try {
      await api.initTokens();
      const token = await SecureStore.getItemAsync('accessToken');
      const refreshToken = await SecureStore.getItemAsync('refreshToken');
      if (!token && !refreshToken) {
        await useAuthStore.getState().clearTokens();
        setTimeout(() => router.replace('/auth/login'), 1000);
        return;
      }
      const res = await api.getProfile();
      if (res.success && res.data) {
        setUser(res.data);
        void prefetchAppData();
        setTimeout(() => {
          router.replace(res.data!.hasPin === false ? '/dashboard/setup-pin' : '/(tabs)');
        }, 800);
      } else {
        await api.clearTokens();
        setTimeout(() => router.replace('/auth/login'), 800);
      }
    } catch {
      await api.clearTokens();
      setTimeout(() => router.replace('/auth/login'), 800);
    } finally {
      setSuppressSessionExpiryUi(false);
    }
  };

  return (
    <View style={styles.root}>
      <ScreenStatusBar style="light" />
      <View style={styles.logoBox}>
        <Text style={styles.logoLetter}>P</Text>
      </View>
      <Text style={styles.appName}>PrivateVTU</Text>
      <Text style={styles.tagline}>Fast · Secure · Reliable</Text>
      <ActivityIndicator
        color={Colors.primaryLight}
        size="small"
        style={{ marginTop: 56 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.primaryDeep,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoBox: {
    width: 90, height: 90, borderRadius: 28,
    backgroundColor: Colors.primary,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 20, ...Shadow.lg,
  },
  logoLetter: { fontSize: 46, fontWeight: '800', color: Colors.white },
  appName: { ...Typography.h1, color: Colors.white, marginBottom: 8, letterSpacing: 0.3 },
  tagline: {
    ...Typography.small,
    color: 'rgba(255,255,255,0.55)',
    letterSpacing: 2.5,
    textTransform: 'uppercase',
  },
});
