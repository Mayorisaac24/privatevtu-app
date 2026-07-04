import { api, isResponseSuccess, type ReferralSummary } from './api';
import { useAuthStore } from '../stores/auth-store';

const STALE_MS = 5 * 60 * 1000;

let memoryCache: ReferralSummary | null = null;
let fetchedAt: number | null = null;
let inflight: Promise<ReferralSummary | null> | null = null;
let preloadStarted = false;

function isFresh(): boolean {
  return fetchedAt !== null && Date.now() - fetchedAt < STALE_MS;
}

function buildFallbackSummary(): ReferralSummary | null {
  const referralCode = useAuthStore.getState().user?.referralCode?.trim();
  if (!referralCode) return null;

  return {
    referralCode,
    shareLink: '',
    shareMessage: `Join Datamart with my referral code ${referralCode}`,
    activePrograms: [],
    referredUsers: [],
    stats: { totalReferred: 0, totalEarnedKobo: '0' },
  };
}

async function fetchFromApi(): Promise<ReferralSummary | null> {
  const res = await api.getMyReferralSummary();
  if (isResponseSuccess(res) && res.data) {
    memoryCache = res.data;
    fetchedAt = Date.now();
    return res.data;
  }
  return memoryCache ?? buildFallbackSummary();
}

export function peekReferralSummaryCache(): ReferralSummary | null {
  return memoryCache ?? buildFallbackSummary();
}

export function hasReferralSummaryCache(): boolean {
  return memoryCache !== null;
}

export function setReferralSummaryCache(data: ReferralSummary): void {
  memoryCache = data;
  fetchedAt = Date.now();
}

export function invalidateReferralSummaryCache(): void {
  memoryCache = null;
  fetchedAt = null;
  inflight = null;
}

export async function getReferralSummaryData(options?: { force?: boolean }): Promise<ReferralSummary | null> {
  if (!options?.force && memoryCache) {
    if (isFresh()) return memoryCache;
    void refreshReferralSummarySilently();
    return memoryCache;
  }

  if (!options?.force) {
    const fallback = buildFallbackSummary();
    if (fallback && !memoryCache) {
      memoryCache = fallback;
      void refreshReferralSummarySilently();
      return fallback;
    }
  }

  if (inflight) return inflight;

  inflight = fetchFromApi()
    .catch(() => memoryCache ?? buildFallbackSummary())
    .finally(() => {
      inflight = null;
    });

  return inflight;
}

export async function pullToRefreshReferralSummary(): Promise<ReferralSummary | null> {
  inflight = null;
  fetchedAt = null;
  return fetchFromApi();
}

export function refreshReferralSummarySilently(): void {
  if (inflight) return;
  if (isFresh()) return;

  inflight = fetchFromApi()
    .catch(() => memoryCache ?? buildFallbackSummary())
    .finally(() => {
      inflight = null;
    }) as Promise<ReferralSummary | null>;
}

export function preloadReferralSummaryData(): void {
  if (preloadStarted) return;
  preloadStarted = true;
  void getReferralSummaryData().catch(() => {});
}

export function resetReferralSummaryCache(): void {
  invalidateReferralSummaryCache();
  preloadStarted = false;
}
