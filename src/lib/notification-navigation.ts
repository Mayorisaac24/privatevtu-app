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

  if (screen === 'kyc' || type === 'kyc_document_review') {
    router.push('/kyc');
    return;
  }

  if (type === 'kyc_document_review') {
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
