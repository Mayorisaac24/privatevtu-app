import { api, isResponseSuccess, type TwoFactorMethodOption } from './api';

const CACHE_TTL_MS = 15 * 60 * 1000;

let memoryCache: { methods: TwoFactorMethodOption[]; fetchedAt: number } | null = null;
let fetchInFlight: Promise<TwoFactorMethodOption[]> | null = null;
let preloadStarted = false;

function isCacheFresh(fetchedAt: number) {
  return Date.now() - fetchedAt < CACHE_TTL_MS;
}

async function fetchFromApi(): Promise<TwoFactorMethodOption[]> {
  const res = await api.get2FAMethods();
  if (!isResponseSuccess(res) || !res.data?.methods) {
    throw new Error(res.message || 'Failed to load 2FA methods');
  }

  memoryCache = { methods: res.data.methods, fetchedAt: Date.now() };
  return res.data.methods;
}

export function peekTwoFactorMethods(): TwoFactorMethodOption[] | null {
  return memoryCache?.methods ?? null;
}

export function invalidateTwoFactorMethodsCache() {
  memoryCache = null;
}

function refreshSilently() {
  if (fetchInFlight) return;
  fetchInFlight = fetchFromApi()
    .catch(() => memoryCache?.methods ?? [])
    .finally(() => {
      fetchInFlight = null;
    }) as Promise<TwoFactorMethodOption[]>;
}

export async function getTwoFactorMethods(options?: { forceRefresh?: boolean }): Promise<TwoFactorMethodOption[]> {
  const forceRefresh = options?.forceRefresh === true;

  if (!forceRefresh && memoryCache?.methods.length) {
    if (isCacheFresh(memoryCache.fetchedAt)) {
      return memoryCache.methods;
    }
    refreshSilently();
    return memoryCache.methods;
  }

  if (fetchInFlight) {
    return fetchInFlight;
  }

  fetchInFlight = fetchFromApi()
    .catch((error) => {
      if (memoryCache?.methods.length) return memoryCache.methods;
      throw error;
    })
    .finally(() => {
      fetchInFlight = null;
    });

  return fetchInFlight;
}

export function preloadTwoFactorMethods() {
  if (preloadStarted) return;
  preloadStarted = true;
  void getTwoFactorMethods().catch(() => undefined);
}
