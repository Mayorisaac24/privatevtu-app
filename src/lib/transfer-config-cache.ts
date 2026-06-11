import { api, isResponseSuccess, type TransferConfig } from './api';

const STALE_MS = 5 * 60 * 1000;

export const DEFAULT_TRANSFER_CONFIG: TransferConfig = {
  isEnabled: true,
  feeType: 'FIXED',
  feeValue: 0,
  minAmount: 100,
  maxAmount: 1_000_000,
  dailyLimit: 5_000_000,
};

let memoryCache: { config: TransferConfig; fetchedAt: number } | null = null;
let inflight: Promise<TransferConfig> | null = null;
let preloadStarted = false;

function isFresh(fetchedAt: number): boolean {
  return Date.now() - fetchedAt < STALE_MS;
}

async function fetchConfigFromApi(): Promise<TransferConfig> {
  const res = await api.getTransferConfig();
  const config = isResponseSuccess(res) && res.data ? res.data : DEFAULT_TRANSFER_CONFIG;
  memoryCache = { config, fetchedAt: Date.now() };
  return config;
}

export function peekCachedTransferConfig(): TransferConfig | null {
  return memoryCache?.config ?? null;
}

export async function getCachedTransferConfig(options?: { forceRefresh?: boolean }): Promise<TransferConfig> {
  if (!options?.forceRefresh && memoryCache) {
    if (isFresh(memoryCache.fetchedAt)) {
      return memoryCache.config;
    }
    void refreshTransferConfigSilently();
    return memoryCache.config;
  }

  if (inflight) return inflight;

  inflight = fetchConfigFromApi()
    .catch(() => memoryCache?.config ?? DEFAULT_TRANSFER_CONFIG)
    .finally(() => {
      inflight = null;
    });

  return inflight;
}

export function refreshTransferConfigSilently(): void {
  if (inflight) return;
  if (memoryCache && isFresh(memoryCache.fetchedAt)) return;
  inflight = fetchConfigFromApi()
    .catch(() => memoryCache?.config ?? DEFAULT_TRANSFER_CONFIG)
    .finally(() => {
      inflight = null;
    }) as Promise<TransferConfig>;
}

export function preloadTransferConfig(): void {
  if (preloadStarted) return;
  preloadStarted = true;
  void getCachedTransferConfig().catch(() => {});
}

export function resetTransferConfigCache(): void {
  memoryCache = null;
  inflight = null;
  preloadStarted = false;
}
