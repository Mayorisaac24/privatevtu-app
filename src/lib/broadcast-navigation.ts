import { router } from 'expo-router';
import { Linking } from 'react-native';

export type AppBroadcast = {
  id: string;
  title: string;
  body: string;
  imageUrl?: string | null;
  displayType: 'IN_APP_MODAL' | 'PUSH' | 'ON_PAGE_BANNER' | 'ON_PAGE_NOTIFICATION';
  targetScreens: string[];
  actionRoute?: string | null;
  actionLabel?: string | null;
};

export type BroadcastScreenKey =
  | 'HOME'
  | 'WALLET'
  | 'SERVICES'
  | 'HISTORY'
  | 'PROFILE'
  | 'TRANSFER'
  | 'FUND'
  | 'AIRTIME'
  | 'DATA'
  | 'ELECTRICITY'
  | 'CABLE';

export function openBroadcastAction(route?: string | null): void {
  if (!route) return;
  if (route.startsWith('http://') || route.startsWith('https://')) {
    void Linking.openURL(route).catch(() => undefined);
    return;
  }
  router.push(route as any);
}
