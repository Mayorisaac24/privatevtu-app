import { router } from 'expo-router';
import { openBroadcastAction } from './broadcast-navigation';

export function navigateFromNotificationData(data?: Record<string, unknown> | null): void {
  if (!data) {
    router.push('/notifications');
    return;
  }

  const actionRoute = typeof data.actionRoute === 'string' ? data.actionRoute : '';
  if (actionRoute) {
    openBroadcastAction(actionRoute);
    return;
  }

  const screen = typeof data.screen === 'string' ? data.screen : '';
  const category = typeof data.category === 'string' ? data.category : '';
  const reference = typeof data.reference === 'string' ? data.reference : '';
  const type = typeof data.type === 'string' ? data.type : '';

  if (screen === 'transaction-details' || category === 'transaction' || reference) {
    router.push('/(tabs)/history');
    return;
  }

  if (type.startsWith('transfer')) {
    router.push('/(tabs)/history');
    return;
  }

  if (type === 'admin_broadcast') {
    router.push('/notifications');
    return;
  }

  router.push('/notifications');
}
