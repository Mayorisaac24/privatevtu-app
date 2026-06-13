import { api, isResponseSuccess, type ElectricityProvider } from './api';
import { sortDiscosAlphabetically } from './disco-providers';

const CLIENT_DISCO_CACHE_SERVE_MS = 24 * 60 * 60 * 1000;
const CLIENT_DISCO_SILENT_REFRESH_MS = 5 * 60 * 1000;
const CLIENT_DISCO_CACHE_VERSION = 2;

let memoryCache: { discos: ElectricityProvider[]; fetchedAt: number; version: number } | null = null;
let refreshInFlight: Promise<ElectricityProvider[]> | null = null;
let cacheVersion = 0;
const listeners = new Set<() => void>();

function notifyChange(): void {
  cacheVersion += 1;
  listeners.forEach((listener) => listener());
}

export function getElectricityDiscosCacheVersion(): number {
  return cacheVersion;
}

export function subscribeElectricityDiscos(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function canServeFromCache(fetchedAt: number): boolean {
  return Date.now() - fetchedAt < CLIENT_DISCO_CACHE_SERVE_MS;
}

function shouldSilentRefresh(fetchedAt: number): boolean {
  return Date.now() - fetchedAt >= CLIENT_DISCO_SILENT_REFRESH_MS;
}

async function fetchDiscosFromApi(): Promise<ElectricityProvider[]> {
  const res = await api.getElectricityProviders();
  if (!isResponseSuccess(res) || !Array.isArray(res.data)) {
    throw new Error(res.message || 'Failed to load electricity providers');
  }

  const discos = sortDiscosAlphabetically(res.data);
  memoryCache = { discos, fetchedAt: Date.now(), version: CLIENT_DISCO_CACHE_VERSION };
  notifyChange();
  return discos;
}

export async function getCachedElectricityDiscos(options?: { forceRefresh?: boolean }): Promise<ElectricityProvider[]> {
  const forceRefresh = options?.forceRefresh === true;

  if (!forceRefresh && memoryCache) {
    if (memoryCache.version !== CLIENT_DISCO_CACHE_VERSION) {
      memoryCache = null;
    } else if (canServeFromCache(memoryCache.fetchedAt)) {
      if (shouldSilentRefresh(memoryCache.fetchedAt)) {
        void refreshElectricityDiscosSilently();
      }
      return memoryCache.discos;
    }

    if (memoryCache.discos.length > 0) {
      void refreshElectricityDiscosSilently({ force: true });
      return memoryCache.discos;
    }
  }

  if (refreshInFlight) {
    return refreshInFlight;
  }

  refreshInFlight = fetchDiscosFromApi()
    .catch((error) => {
      if (memoryCache?.discos?.length) {
        return memoryCache.discos;
      }
      throw error;
    })
    .finally(() => {
      refreshInFlight = null;
    });

  return refreshInFlight;
}

export function refreshElectricityDiscosSilently(options?: { force?: boolean }): void {
  if (refreshInFlight) return;
  if (!options?.force && memoryCache && !shouldSilentRefresh(memoryCache.fetchedAt)) return;

  refreshInFlight = fetchDiscosFromApi()
    .catch(() => memoryCache?.discos ?? [])
    .finally(() => {
      refreshInFlight = null;
    }) as Promise<ElectricityProvider[]>;
}

export function peekCachedElectricityDiscos(): ElectricityProvider[] | null {
  return memoryCache?.discos ?? null;
}

export function hasElectricityDiscosCache(): boolean {
  return memoryCache !== null;
}

let preloadStarted = false;

export function preloadElectricityDiscos(): void {
  if (preloadStarted) return;
  preloadStarted = true;
  void getCachedElectricityDiscos().catch(() => {});
}

export function setElectricityDiscosCache(discos: ElectricityProvider[]): void {
  memoryCache = {
    discos: sortDiscosAlphabetically(discos),
    fetchedAt: Date.now(),
    version: CLIENT_DISCO_CACHE_VERSION,
  };
  notifyChange();
}

export function resetElectricityDiscosCache(): void {
  memoryCache = null;
  preloadStarted = false;
  notifyChange();
}
