import { api, isResponseSuccess, type KycStatusData } from './api';
import { enrichKycStatusData } from './kyc-status-utils';

const STALE_MS = 5 * 60 * 1000;

let memoryCache: KycStatusData | null = null;
let fetchedAt: number | null = null;
let inflight: Promise<KycStatusData | null> | null = null;
let preloadStarted = false;

type KycInvalidationListener = (data: KycStatusData | null) => void;
const invalidationListeners = new Set<KycInvalidationListener>();

function isFresh(): boolean {
  return fetchedAt !== null && Date.now() - fetchedAt < STALE_MS;
}

function notifyInvalidationListeners(data: KycStatusData | null): void {
  invalidationListeners.forEach((listener) => {
    try {
      listener(data);
    } catch (error) {
      console.warn('[KYC cache] Invalidation listener failed:', error);
    }
  });
}

async function fetchFromApi(): Promise<KycStatusData | null> {
  const res = await api.getKycStatus();
  if (isResponseSuccess(res) && res.data) {
    const enriched = enrichKycStatusData(res.data);
    memoryCache = enriched;
    fetchedAt = Date.now();
    return enriched;
  }
  return memoryCache;
}

export function isKycReviewNotification(data?: Record<string, unknown> | null): boolean {
  if (!data) return false;
  return data.type === 'kyc_document_review' || data.screen === 'kyc';
}

export function peekKycStatusCache(): KycStatusData | null {
  return memoryCache;
}

export function hasKycStatusCache(): boolean {
  return memoryCache !== null;
}

export function setKycStatusCache(data: KycStatusData): void {
  memoryCache = enrichKycStatusData(data);
  fetchedAt = Date.now();
}

export function subscribeKycStatusInvalidation(listener: KycInvalidationListener): () => void {
  invalidationListeners.add(listener);
  return () => {
    invalidationListeners.delete(listener);
  };
}

/** Drop cached KYC data so the next read fetches from the API. */
export function invalidateKycStatusCache(): void {
  memoryCache = null;
  fetchedAt = null;
  inflight = null;
}

/**
 * Called when admin approves/rejects a document (push notification).
 * Clears cache, fetches fresh status, and notifies open KYC screens.
 */
export async function refreshKycStatusFromReviewUpdate(): Promise<KycStatusData | null> {
  invalidateKycStatusCache();
  const data = await fetchFromApi();
  notifyInvalidationListeners(data);
  return data;
}

export async function getKycStatusData(options?: { force?: boolean }): Promise<KycStatusData | null> {
  if (!options?.force && memoryCache) {
    if (isFresh()) return memoryCache;
    void refreshKycStatusSilently();
    return memoryCache;
  }

  if (inflight) return inflight;

  inflight = fetchFromApi()
    .catch(() => memoryCache)
    .finally(() => {
      inflight = null;
    });

  return inflight;
}

export async function pullToRefreshKycStatus(): Promise<KycStatusData | null> {
  inflight = null;
  fetchedAt = null;
  return fetchFromApi();
}

export function refreshKycStatusSilently(): void {
  if (inflight) return;
  if (isFresh()) return;

  inflight = fetchFromApi()
    .catch(() => memoryCache)
    .finally(() => {
      inflight = null;
    }) as Promise<KycStatusData | null>;
}

export function preloadKycStatusData(): void {
  if (preloadStarted) return;
  preloadStarted = true;
  void getKycStatusData().catch(() => {});
}

export function resetKycStatusCache(): void {
  invalidateKycStatusCache();
  preloadStarted = false;
  invalidationListeners.clear();
}
