import { Colors } from '../theme';
import type { User } from './api';
import { getKycTierLabel } from './api';

type KycBadge = {
  label: string;
  color: string;
  icon: 'shield-checkmark' | 'shield-half-outline' | 'shield-outline' | 'time-outline' | 'close-circle-outline' | 'arrow-up-circle-outline';
};

type KycPrompt = {
  title: string;
  subtitle: string;
};

export type ProfileKycDisplay = {
  badge: KycBadge;
  prompt: KycPrompt | null;
  menuSubtitle: string;
  showMenuBadge: boolean;
};

export function getProfileKycDisplay(
  kycStatus: User['kycStatus'] = 'NOT_VERIFIED',
  currentTier?: string | null,
): ProfileKycDisplay {
  const tier = currentTier?.toUpperCase();

  if (tier === 'TIER_3') {
    return {
      badge: {
        label: 'Tier 3 · Verified',
        color: Colors.success,
        icon: 'shield-checkmark',
      },
      prompt: null,
      menuSubtitle: 'Fully verified · highest limits',
      showMenuBadge: false,
    };
  }

  if (tier === 'TIER_2') {
    return {
      badge: {
        label: 'Tier 2',
        color: Colors.primaryLight,
        icon: 'shield-half-outline',
      },
      prompt: {
        title: 'Upgrade to Tier 3',
        subtitle: 'Add your address to unlock full limits',
      },
      menuSubtitle: `${getKycTierLabel(tier)} · Continue verification`,
      showMenuBadge: true,
    };
  }

  if (tier === 'TIER_1') {
    return {
      badge: {
        label: 'Tier 1',
        color: Colors.primaryLight,
        icon: 'shield-outline',
      },
      prompt: {
        title: 'Upgrade to Tier 2',
        subtitle: 'Verify your BVN for higher transaction limits',
      },
      menuSubtitle: `${getKycTierLabel(tier)} · Verify BVN next`,
      showMenuBadge: true,
    };
  }

  if (kycStatus === 'VERIFIED') {
    return {
      badge: {
        label: 'Verified',
        color: Colors.success,
        icon: 'shield-checkmark',
      },
      prompt: null,
      menuSubtitle: 'Identity verified',
      showMenuBadge: false,
    };
  }

  if (kycStatus === 'PENDING') {
    return {
      badge: {
        label: 'Verification in progress',
        color: Colors.warning,
        icon: 'time-outline',
      },
      prompt: {
        title: 'Continue KYC verification',
        subtitle: 'Pick up where you left off',
      },
      menuSubtitle: 'Verification in progress',
      showMenuBadge: true,
    };
  }

  if (kycStatus === 'REJECTED') {
    return {
      badge: {
        label: 'Verification rejected',
        color: Colors.error,
        icon: 'close-circle-outline',
      },
      prompt: {
        title: 'Review your KYC submission',
        subtitle: 'Update your details and try again',
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
    prompt: {
      title: 'Complete KYC verification',
      subtitle: 'Unlock higher limits and permanent accounts',
    },
    menuSubtitle: 'Complete verification to unlock limits',
    showMenuBadge: true,
  };
}
