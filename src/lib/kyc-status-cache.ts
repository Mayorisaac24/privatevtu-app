import { api, isResponseSuccess, type KycStatusData } from './api';

const STALE_MS = 5 * 60 * 1000;

let memoryCache: KycStatusData | null = null;
let fetchedAt: number | null = null;
let inflight: Promise<KycStatusData | null> | null = null;
let preloadStarted = false;

function isFresh(): boolean {
  return fetchedAt !== null && Date.now() - fetchedAt < STALE_MS;
}

async function fetchFromApi(): Promise<KycStatusData | null> {
  const res = await api.getKycStatus();
  if (isResponseSuccess(res) && res.data) {
    memoryCache = res.data;
    fetchedAt = Date.now();
    return res.data;
  }
  return memoryCache;
}

export function peekKycStatusCache(): KycStatusData | null {
  return memoryCache;
}

export function hasKycStatusCache(): boolean {
  return memoryCache !== null;
}

export function setKycStatusCache(data: KycStatusData): void {
  memoryCache = data;
  fetchedAt = Date.now();
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
  memoryCache = null;
  fetchedAt = null;
  inflight = null;
  preloadStarted = false;
}
