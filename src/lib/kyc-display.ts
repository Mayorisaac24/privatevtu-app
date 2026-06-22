import { Colors } from '../theme';
import type { KycStatusData, User } from './api';
import { getKycTierLabel } from './api';
import { getTier3DocumentSummary, isTier3AwaitingReview } from './kyc-status-utils';

type KycBadge = {
  label: string;
  color: string;
  icon: 'shield-checkmark' | 'shield-half-outline' | 'shield-outline' | 'time-outline' | 'close-circle-outline' | 'arrow-up-circle-outline';
};

export type ProfileKycDisplay = {
  badge: KycBadge;
  menuSubtitle: string;
  showMenuBadge: boolean;
};

export function getProfileKycDisplay(
  kycStatus: User['kycStatus'] = 'NOT_VERIFIED',
  kycData?: KycStatusData | null,
): ProfileKycDisplay {
  const currentTier = (kycData?.currentTier ?? kycStatus).toUpperCase();
  const summary = getTier3DocumentSummary(kycData);

  if (currentTier === 'TIER_3') {
    return {
      badge: {
        label: 'Tier 3 · Verified',
        color: Colors.success,
        icon: 'shield-checkmark',
      },
      menuSubtitle: 'Fully verified · highest limits',
      showMenuBadge: false,
    };
  }

  if (currentTier === 'TIER_2') {
    if (summary.allApproved) {
      return {
        badge: {
          label: 'Tier 2 · Complete',
          color: Colors.success,
          icon: 'shield-checkmark',
        },
        menuSubtitle: 'All documents approved',
        showMenuBadge: false,
      };
    }

    if (summary.anyRejected) {
      return {
        badge: {
          label: 'Tier 2',
          color: Colors.error,
          icon: 'close-circle-outline',
        },
        menuSubtitle: 'Action required · resubmit documents',
        showMenuBadge: true,
      };
    }

    if (isTier3AwaitingReview(summary) || (summary.anyApproved && summary.anyPending)) {
      return {
        badge: {
          label: 'Tier 2',
          color: Colors.warning,
          icon: 'time-outline',
        },
        menuSubtitle: 'Under review · we will notify you',
        showMenuBadge: false,
      };
    }

    return {
      badge: {
        label: 'Tier 2',
        color: Colors.primaryLight,
        icon: 'shield-half-outline',
      },
      menuSubtitle: `${getKycTierLabel('TIER_2')} · Continue verification`,
      showMenuBadge: true,
    };
  }

  if (currentTier === 'TIER_1') {
    return {
      badge: {
        label: 'Tier 1',
        color: Colors.primaryLight,
        icon: 'shield-outline',
      },
      menuSubtitle: `${getKycTierLabel('TIER_1')} · Verify BVN next`,
      showMenuBadge: true,
    };
  }

  if (kycStatus === 'VERIFIED' || currentTier === 'VERIFIED') {
    return {
      badge: {
        label: 'Verified',
        color: Colors.success,
        icon: 'shield-checkmark',
      },
      menuSubtitle: 'Identity verified',
      showMenuBadge: false,
    };
  }

  if (kycStatus === 'PENDING' || currentTier === 'PENDING') {
    return {
      badge: {
        label: 'Verification in progress',
        color: Colors.warning,
        icon: 'time-outline',
      },
      menuSubtitle: 'Verification in progress',
      showMenuBadge: true,
    };
  }

  if (kycStatus === 'REJECTED' || currentTier === 'REJECTED') {
    return {
      badge: {
        label: 'Verification rejected',
        color: Colors.error,
        icon: 'close-circle-outline',
      },
      menuSubtitle: 'Action required · resubmit verification',
      showMenuBadge: true,
    };
  }

  return {
    badge: {
      label: 'Start verification',
      color: Colors.primaryLight,
      icon: 'arrow-up-circle-outline',
    },
    menuSubtitle: 'Complete verification to unlock limits',
    showMenuBadge: true,
  };
}
