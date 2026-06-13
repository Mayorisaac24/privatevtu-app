import { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { api, ApiError } from '../src/lib/api';
import { AppLogo } from '../src/components/ui/AppLogo';
import {
  isNetworkFailureStatus,
  isSessionExpiredError,
  isSessionRevoked,
  setSuppressSessionExpiryUi,
} from '../src/lib/session';
import { useAuthStore, waitForAuthStoreHydration } from '../src/stores';
import { ScreenStatusBar } from '../src/hooks/useStatusBarStyle';
import { Colors } from '../src/theme';

function navigateHome(hasPin: boolean | undefined) {
  router.replace(hasPin === false ? '/dashboard/setup-pin' : '/(tabs)');
}

export default function SplashScreen() {
  const { setUser, setTokens } = useAuthStore();

  useEffect(() => { void init(); }, []);

  const init = async () => {
    setSuppressSessionExpiryUi(true);
    try {
      await waitForAuthStoreHydration();
      const cachedUser = useAuthStore.getState().user;

      const { refreshToken } = await api.initTokens();
      if (!refreshToken) {
        await useAuthStore.getState().clearTokens();
        setTimeout(() => router.replace('/auth/login'), 800);
        return;
      }

      const accessToken = await api.getValidToken({ logoutOnAuthFailure: false });
      if (!accessToken) {
        const stillHasRefresh = await SecureStore.getItemAsync('refreshToken');
        if (!stillHasRefresh) {
          await useAuthStore.getState().clearTokens();
          setTimeout(() => router.replace('/auth/login'), 800);
          return;
        }

        await api.getValidToken({ logoutOnAuthFailure: true });
        setTimeout(() => router.replace('/auth/login'), 800);
        return;
      }

      await setTokens(accessToken, refreshToken);

      try {
        const res = await api.getProfile();
        if (res.success && res.data) {
          setUser(res.data);
          setTimeout(() => navigateHome(res.data.hasPin), 600);
          return;
        }

        if (cachedUser) {
          setUser(cachedUser);
          setTimeout(() => navigateHome(cachedUser.hasPin), 600);
          return;
        }

        await api.clearTokens();
        setTimeout(() => router.replace('/auth/login'), 800);
      } catch (err) {
        const refreshStillPresent = await SecureStore.getItemAsync('refreshToken');
        const isNetworkError = err instanceof ApiError && isNetworkFailureStatus(err.statusCode);
        const isAuthError = err instanceof ApiError && (
          isSessionExpiredError(err)
          || isSessionRevoked(err.statusCode, err.data)
        );

        if (isAuthError) {
          await api.clearTokens();
          setTimeout(() => router.replace('/auth/login'), 800);
          return;
        }

        if ((isNetworkError || refreshStillPresent) && cachedUser) {
          setUser(cachedUser);
          setTimeout(() => navigateHome(cachedUser.hasPin), 600);
          return;
        }

        if (refreshStillPresent && cachedUser) {
          setUser(cachedUser);
          setTimeout(() => navigateHome(cachedUser.hasPin), 600);
          return;
        }

        await api.clearTokens();
        setTimeout(() => router.replace('/auth/login'), 800);
      }
    } catch {
      const cachedUser = useAuthStore.getState().user;
      const refreshToken = await SecureStore.getItemAsync('refreshToken');
      if (cachedUser && refreshToken) {
        setTimeout(() => navigateHome(cachedUser.hasPin), 600);
        return;
      }
      await api.clearTokens();
      setTimeout(() => router.replace('/auth/login'), 800);
    } finally {
      setSuppressSessionExpiryUi(false);
    }
  };

  return (
    <View style={styles.root}>
      <ScreenStatusBar style="dark" />
      <AppLogo size={188} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
