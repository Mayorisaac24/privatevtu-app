import * as SecureStore from 'expo-secure-store';
import {
  isNetworkFailureStatus,
  isSessionRevoked,
  setSuppressSessionExpiryUi,
} from './session';
import { api, ApiError, isSessionExpiredError } from './api';
import { useAuthStore, waitForAuthStoreHydration } from '../stores';
import { hasCompletedOnboarding } from './onboarding';

export type BootDestination =
  | { type: 'home'; hasPin: boolean | undefined }
  | { type: 'login' }
  | { type: 'onboarding' };

async function destinationForGuest(onboardingDone: boolean): Promise<BootDestination> {
  await useAuthStore.getState().clearTokens();
  return onboardingDone ? { type: 'login' } : { type: 'onboarding' };
}

export async function resolveBootDestination(): Promise<BootDestination> {
  setSuppressSessionExpiryUi(true);
  try {
    const [_, onboardingDone, refreshToken] = await Promise.all([
      waitForAuthStoreHydration(),
      hasCompletedOnboarding(),
      SecureStore.getItemAsync('refreshToken'),
    ]);

    if (!refreshToken) {
      return destinationForGuest(onboardingDone);
    }

    const cachedUser = useAuthStore.getState().user;

    const accessToken = await api.getValidToken({ logoutOnAuthFailure: false });
    if (!accessToken) {
      const stillHasRefresh = await SecureStore.getItemAsync('refreshToken');
      if (!stillHasRefresh) {
        return destinationForGuest(onboardingDone);
      }

      await api.clearTokens();
      return { type: 'login' };
    }

    const { setUser, setTokens } = useAuthStore.getState();
    const storedRefresh = await SecureStore.getItemAsync('refreshToken');
    await setTokens(accessToken, storedRefresh ?? refreshToken);

    try {
      const res = await api.getProfile();
      if (res.success && res.data) {
        setUser(res.data);
        return { type: 'home', hasPin: res.data.hasPin };
      }

      if (cachedUser) {
        setUser(cachedUser);
        return { type: 'home', hasPin: cachedUser.hasPin };
      }

      await api.clearTokens();
      return destinationForGuest(onboardingDone);
    } catch (err) {
      const refreshStillPresent = await SecureStore.getItemAsync('refreshToken');
      const isNetworkError = err instanceof ApiError && isNetworkFailureStatus(err.statusCode);
      const isAuthError = err instanceof ApiError && (
        isSessionExpiredError(err)
        || isSessionRevoked(err.statusCode, err.data)
      );

      if (isAuthError) {
        await api.clearTokens();
        return { type: 'login' };
      }

      if ((isNetworkError || refreshStillPresent) && cachedUser) {
        setUser(cachedUser);
        return { type: 'home', hasPin: cachedUser.hasPin };
      }

      if (refreshStillPresent && cachedUser) {
        setUser(cachedUser);
        return { type: 'home', hasPin: cachedUser.hasPin };
      }

      await api.clearTokens();
      return destinationForGuest(onboardingDone);
    }
  } catch {
    const cachedUser = useAuthStore.getState().user;
    const refreshToken = await SecureStore.getItemAsync('refreshToken');
    if (cachedUser && refreshToken) {
      return { type: 'home', hasPin: cachedUser.hasPin };
    }
    await api.clearTokens();
    const onboardingDone = await hasCompletedOnboarding();
    return destinationForGuest(onboardingDone);
  } finally {
    setSuppressSessionExpiryUi(false);
  }
}
