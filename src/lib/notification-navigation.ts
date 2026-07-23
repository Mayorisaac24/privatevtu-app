import { router } from 'expo-router';
import { openBroadcastAction } from './broadcast-navigation';

const SCREEN_ROUTES: Record<string, string> = {
  kyc: '/kyc',
  wallet: '/(tabs)/wallet',
  home: '/(tabs)',
  history: '/(tabs)/history',
  profile: '/profile',
  security: '/profile/change-password',
  data: '/services/data',
  dispute: '/profile/disputes',
  virtual_card: '/wallet/virtual-cards',
};

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

  if (screen && SCREEN_ROUTES[screen]) {
    if (screen === 'virtual_card') {
      const virtualCardId = typeof data.virtualCardId === 'string' ? data.virtualCardId : '';
      if (virtualCardId) {
        router.push(`/wallet/virtual-cards/${virtualCardId}` as any);
        return;
      }
    }
    router.push(SCREEN_ROUTES[screen] as any);
    return;
  }

  if (type.startsWith('virtual_card_')) {
    const virtualCardId = typeof data.virtualCardId === 'string' ? data.virtualCardId : '';
    if (virtualCardId) {
      router.push(`/wallet/virtual-cards/${virtualCardId}` as any);
      return;
    }
    router.push('/wallet/virtual-cards');
    return;
  }

  if (screen === 'kyc' || type === 'kyc_document_review' || type === 'automated_kyc_tier_bvn') {
    router.push('/kyc');
    return;
  }

  if (type === 'dispute_created' || type === 'dispute_updated' || type === 'dispute_message' || screen === 'dispute-details') {
    const disputeId = typeof data.disputeId === 'string' ? data.disputeId : '';
    if (disputeId) {
      router.push(`/profile/disputes/${disputeId}`);
      return;
    }
    router.push('/profile/disputes');
    return;
  }

  if (screen === 'transaction-details' || category === 'transaction' || reference || type.startsWith('automated_failed_tx')) {
    router.push('/(tabs)/history');
    return;
  }

  if (type.startsWith('transfer') || type.startsWith('automated_transfer')) {
    router.push('/(tabs)/history');
    return;
  }

  if (type === 'admin_broadcast') {
    router.push('/notifications');
    return;
  }

  if (type === 'automated_new_device_login' || category === 'security') {
    router.push('/profile/change-password');
    return;
  }

  router.push('/notifications');
}
