import { useCallback, useEffect, useRef, useState } from 'react';
import { InteractionManager } from 'react-native';
import { router } from 'expo-router';
import type { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';
import {
  api,
  isResponseSuccess,
  parseWalletBalanceKobo,
} from './api';
import { refreshDashboardData, refreshHistoryData } from './dashboard-data';

export type PurchaseDeliveryStatus = 'completed' | 'processing';

export type PurchaseSuccessMeta = {
  transactionId?: string;
  reference?: string;
  /** Amount in kobo */
  amountKobo: number;
  title: string;
  recipientLabel?: string;
  recipientName: string;
  recipientMeta?: string;
  serviceIcon: ComponentProps<typeof Ionicons>['name'];
  status: PurchaseDeliveryStatus;
  statusLabel?: string;
  highlightLabel?: string;
  highlightValue?: string;
  detailRows?: Array<{ label: string; value: string }>;
  notice?: string;
};

export type PurchaseServiceKind =
  | 'airtime'
  | 'data'
  | 'cable'
  | 'electricity'
  | 'education'
  | 'betting'
  | 'programs';

const INSTANT_SERVICES = new Set<PurchaseServiceKind>([
  'airtime',
  'data',
  'cable',
  'electricity',
  'programs',
]);

const FAILED_STATUSES = new Set(['failed', 'error', 'cancelled', 'reversed', 'declined']);
const COMPLETED_STATUSES = new Set([
  'completed',
  'success',
  'successful',
  'delivered',
  'approved',
]);

type PurchasePresentation = Pick<
  PurchaseSuccessMeta,
  'title' | 'status' | 'statusLabel' | 'notice'
>;

const PURCHASE_PRESENTATION: Record<
  PurchaseServiceKind,
  { completed: Omit<PurchasePresentation, 'status'>; processing: Omit<PurchasePresentation, 'status'> }
> = {
  airtime: {
    completed: {
      title: 'Airtime sent',
      statusLabel: 'Delivered instantly',
      notice: undefined,
    },
    processing: {
      title: 'Airtime sent',
      statusLabel: 'Delivered instantly',
      notice: undefined,
    },
  },
  data: {
    completed: {
      title: 'Data activated',
      statusLabel: 'Delivered instantly',
      notice: undefined,
    },
    processing: {
      title: 'Data activated',
      statusLabel: 'Delivered instantly',
      notice: undefined,
    },
  },
  cable: {
    completed: {
      title: 'Subscription active',
      statusLabel: 'Activated instantly',
      notice: undefined,
    },
    processing: {
      title: 'Subscription active',
      statusLabel: 'Activated instantly',
      notice: undefined,
    },
  },
  electricity: {
    completed: {
      title: 'Payment successful',
      statusLabel: 'Token delivered',
      notice: undefined,
    },
    processing: {
      title: 'Payment successful',
      statusLabel: 'Token delivered',
      notice: undefined,
    },
  },
  programs: {
    completed: {
      title: 'Upgrade successful',
      statusLabel: 'Plan updated',
      notice: undefined,
    },
    processing: {
      title: 'Upgrade successful',
      statusLabel: 'Plan updated',
      notice: undefined,
    },
  },
  education: {
    completed: {
      title: 'PIN purchase complete',
      statusLabel: 'Delivered',
      notice: 'Your exam PIN is ready. You can also find it on the receipt.',
    },
    processing: {
      title: 'PIN purchase started',
      statusLabel: 'Processing · PIN delivery in progress',
      notice: 'We’ll notify you when your exam PIN is ready.',
    },
  },
  betting: {
    completed: {
      title: 'Funding successful',
      statusLabel: 'Delivered instantly',
      notice: undefined,
    },
    processing: {
      title: 'Funding submitted',
      statusLabel: 'Processing · Wallet credit in progress',
      notice: 'We’ll notify you once your betting wallet is funded.',
    },
  },
};

export function normalizePurchaseStatus(status?: string): PurchaseDeliveryStatus {
  return normalizeAsyncPurchaseStatus(status);
}

/** Maps API status for async services (education, betting). */
export function normalizeAsyncPurchaseStatus(status?: string): PurchaseDeliveryStatus {
  const normalized = (status || '').trim().toLowerCase();
  if (FAILED_STATUSES.has(normalized)) {
    return 'processing';
  }
  if (COMPLETED_STATUSES.has(normalized)) {
    return 'completed';
  }
  if (['processing', 'pending', 'queued', 'submitted'].includes(normalized)) {
    return 'processing';
  }
  return 'processing';
}

/**
 * User-facing success copy. Instant VTU services always show as delivered —
 * backend may still return PROCESSING while the worker finishes.
 */
export function getPurchaseSuccessPresentation(
  service: PurchaseServiceKind,
  apiStatus?: string,
  overrides?: Partial<PurchasePresentation>,
): PurchasePresentation {
  const status = INSTANT_SERVICES.has(service)
    ? 'completed'
    : normalizeAsyncPurchaseStatus(apiStatus);
  const copy = PURCHASE_PRESENTATION[service][status];

  return {
    status,
    title: overrides?.title ?? copy.title,
    statusLabel: overrides?.statusLabel ?? copy.statusLabel,
    notice: overrides?.notice !== undefined ? overrides.notice : copy.notice,
  };
}

export function defaultStatusLabel(status: PurchaseDeliveryStatus): string {
  return status === 'completed' ? 'Delivered instantly' : 'Processing · We’ll notify you';
}

/** Delay showing success until the PIN lock sheet modal has finished dismissing (iOS). */
export const PURCHASE_SUCCESS_MODAL_DELAY_MS = 450;

export function extractPurchaseResultData<T extends Record<string, unknown>>(
  response: { data?: T | null } & Partial<T>,
): T | null {
  const nested = response?.data;
  if (nested && typeof nested === 'object') {
    return nested as T;
  }
  return (response as T) ?? null;
}

export function isPurchaseSuccess(response: unknown): boolean {
  return isResponseSuccess(response);
}

export async function refreshAfterPurchase(setBalance?: (kobo: string) => void): Promise<void> {
  try {
    const balRes = await api.getWalletBalance();
    if (isResponseSuccess(balRes) && setBalance) {
      setBalance(parseWalletBalanceKobo(balRes.data));
    }
  } catch {
    // Keep existing balance on failure.
  }
  void refreshDashboardData({ force: true });
  void refreshHistoryData({ force: true });
}

export function usePurchaseSuccessModal(onReset: () => void) {
  const [meta, setMeta] = useState<PurchaseSuccessMeta | null>(null);
  const [visible, setVisible] = useState(false);
  const revealTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (revealTimerRef.current) {
      clearTimeout(revealTimerRef.current);
    }
  }, []);

  const showSuccess = useCallback((next: PurchaseSuccessMeta) => {
    if (revealTimerRef.current) {
      clearTimeout(revealTimerRef.current);
    }

    setMeta(next);
    setVisible(false);

    const reveal = () => {
      revealTimerRef.current = setTimeout(() => {
        setVisible(true);
        revealTimerRef.current = null;
      }, PURCHASE_SUCCESS_MODAL_DELAY_MS);
    };

    InteractionManager.runAfterInteractions(reveal);
  }, []);

  const handleDone = useCallback(() => {
    if (revealTimerRef.current) {
      clearTimeout(revealTimerRef.current);
      revealTimerRef.current = null;
    }
    setVisible(false);
    setMeta(null);
    onReset();
  }, [onReset]);

  const handleViewReceipt = useCallback(() => {
    if (!meta?.transactionId) return;
    const transactionId = meta.transactionId;
    if (revealTimerRef.current) {
      clearTimeout(revealTimerRef.current);
      revealTimerRef.current = null;
    }
    setVisible(false);
    setMeta(null);
    onReset();
    router.push(`/transactions/${transactionId}`);
  }, [meta?.transactionId, onReset]);

  return {
    meta,
    visible,
    showSuccess,
    handleDone,
    handleViewReceipt,
  };
}
