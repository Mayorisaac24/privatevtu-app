import { api, isResponseSuccess, type Bank } from './api';
import { sortBanksPopularFirst } from './transfer-banks';

const CLIENT_BANK_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const CLIENT_BANK_CACHE_VERSION = 3;

let memoryCache: { banks: Bank[]; fetchedAt: number; version: number } | null = null;
let refreshInFlight: Promise<Bank[]> | null = null;

function isCacheFresh(fetchedAt: number): boolean {
  return Date.now() - fetchedAt < CLIENT_BANK_CACHE_TTL_MS;
}

async function fetchBanksFromApi(): Promise<Bank[]> {
  const res = await api.getBanks();
  if (!isResponseSuccess(res) || !Array.isArray(res.data)) {
    throw new Error(res.message || 'Failed to load banks');
  }

  const banks = sortBanksPopularFirst(
    res.data.filter((bank) => bank.isActive !== false),
  );

  memoryCache = { banks, fetchedAt: Date.now(), version: CLIENT_BANK_CACHE_VERSION };
  return banks;
}

/**
 * Returns cached transfer banks when available.
 * Silently refreshes from API when cache is older than 24 hours.
 */
export async function getCachedTransferBanks(options?: { forceRefresh?: boolean }): Promise<Bank[]> {
  const forceRefresh = options?.forceRefresh === true;

  if (!forceRefresh && memoryCache) {
    if (memoryCache.version !== CLIENT_BANK_CACHE_VERSION) {
      memoryCache = null;
    } else if (isCacheFresh(memoryCache.fetchedAt)) {
      return memoryCache.banks;
    }

    if (memoryCache.banks.length > 0) {
      void refreshTransferBanksSilently();
      return memoryCache.banks;
    }
  }

  if (refreshInFlight) {
    return refreshInFlight;
  }

  refreshInFlight = fetchBanksFromApi()
    .catch((error) => {
      if (memoryCache?.banks?.length) {
        return memoryCache.banks;
      }
      throw error;
    })
    .finally(() => {
      refreshInFlight = null;
    });

  return refreshInFlight;
}

export function refreshTransferBanksSilently(): void {
  if (refreshInFlight) return;
  if (memoryCache && isCacheFresh(memoryCache.fetchedAt)) return;

  refreshInFlight = fetchBanksFromApi()
    .catch(() => memoryCache?.banks ?? [])
    .finally(() => {
      refreshInFlight = null;
    }) as Promise<Bank[]>;
}

export function peekCachedTransferBanks(): Bank[] | null {
  return memoryCache?.banks ?? null;
}

let preloadStarted = false;

/** Warm bank list in the background so transfer UI can render instantly. */
export function preloadTransferBanks(): void {
  if (preloadStarted) return;
  preloadStarted = true;
  void getCachedTransferBanks().catch(() => {});
}
