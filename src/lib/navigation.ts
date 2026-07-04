import { router } from 'expo-router';

type BackFallback = '/(tabs)' | '/auth/login';
type ReplaceHref = Parameters<typeof router.replace>[0];

let rootNavigationReady = false;
const pendingReplacements: ReplaceHref[] = [];

export function setRootNavigationReady(ready: boolean) {
  rootNavigationReady = ready;
  if (!ready) return;
  while (pendingReplacements.length > 0) {
    const href = pendingReplacements.shift();
    if (href) router.replace(href);
  }
}

/** Defer router.replace until the root Stack has mounted. */
export function safeReplace(href: ReplaceHref) {
  if (rootNavigationReady) {
    router.replace(href);
    return;
  }
  if (!pendingReplacements.includes(href)) {
    pendingReplacements.push(href);
  }
}

export function navigateBack(fallback: BackFallback = '/(tabs)'): void {
  if (router.canGoBack()) {
    router.back();
    return;
  }
  safeReplace(fallback);
}

export function openNotifications(): void {
  router.push('/notifications');
}
