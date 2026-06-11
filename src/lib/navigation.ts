import { router } from 'expo-router';

type BackFallback = '/(tabs)' | '/auth/login';

export function navigateBack(fallback: BackFallback = '/(tabs)'): void {
  if (router.canGoBack()) {
    router.back();
    return;
  }
  router.replace(fallback);
}
