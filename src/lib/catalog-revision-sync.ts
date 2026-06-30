import * as SecureStore from 'expo-secure-store';
import { api, isResponseSuccess } from './api';
import { getCachedElectricityDiscos } from './electricity-discos-cache';
import {
  getCachedEducationProviders,
  resetEducationCatalogCache,
} from './education-catalog-cache';
import { getNumberPrefixesCached, resetNumberPrefixCache } from './number-prefix-cache';
import { resetServiceCatalogCache, getServiceProvidersCached } from './service-catalog-cache';
import { resetTransferConfigCache, getCachedTransferConfig } from './transfer-config-cache';
import { resetWalletFundingCache, getWalletFundingData } from './wallet-funding-cache';
import { useServiceAvailabilityStore } from '../stores/service-availability-store';

const STORAGE_KEY = 'catalog_revision_v1';

let memoryRevision: number | null = null;
let syncInFlight: Promise<void> | null = null;

async function readStoredRevision(): Promise<number | null> {
  try {
    const raw = await SecureStore.getItemAsync(STORAGE_KEY);
    if (!raw) return null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

async function writeStoredRevision(revision: number): Promise<void> {
  try {
    await SecureStore.setItemAsync(STORAGE_KEY, String(revision));
  } catch {
    // Non-critical persistence.
  }
}

async function preloadCatalogAfterInvalidation(): Promise<void> {
  const availabilityStore = useServiceAvailabilityStore.getState();
  await Promise.allSettled([
    availabilityStore.refresh({ force: true }),
    getServiceProvidersCached('airtime', { forceRefresh: true }),
    getServiceProvidersCached('data', { forceRefresh: true }),
    getServiceProvidersCached('cable', { forceRefresh: true }),
    getCachedElectricityDiscos({ forceRefresh: true }),
    getCachedEducationProviders({ forceRefresh: true }),
    getCachedTransferConfig({ forceRefresh: true }),
    getWalletFundingData({ force: true }),
    getNumberPrefixesCached({ forceRefresh: true }),
  ]);
}

async function applyCatalogInvalidation(): Promise<void> {
  resetServiceCatalogCache();
  resetEducationCatalogCache();
  resetTransferConfigCache();
  resetWalletFundingCache();
  resetNumberPrefixCache();
  useServiceAvailabilityStore.getState().reset();
  await preloadCatalogAfterInvalidation();
}

/**
 * Checks the server catalog revision stamp and invalidates local service caches
 * when admin changes are detected. Transfer banks are intentionally excluded
 * and keep their own 24h client cache.
 */
export async function syncCatalogRevision(options?: { force?: boolean }): Promise<void> {
  if (syncInFlight && !options?.force) return syncInFlight;

  syncInFlight = (async () => {
    const res = await api.getCatalogRevision();
    if (!isResponseSuccess(res) || !res.data) return;

    const remoteRevision = Number(res.data.revision);
    if (!Number.isFinite(remoteRevision)) return;

    const storedRevision = memoryRevision ?? await readStoredRevision();

    if (storedRevision == null) {
      memoryRevision = remoteRevision;
      await writeStoredRevision(remoteRevision);
      return;
    }

    if (remoteRevision === storedRevision) {
      memoryRevision = remoteRevision;
      return;
    }

    memoryRevision = remoteRevision;
    await writeStoredRevision(remoteRevision);
    await applyCatalogInvalidation();
  })().finally(() => {
    syncInFlight = null;
  });

  return syncInFlight;
}

export function resetCatalogRevisionSync(): void {
  memoryRevision = null;
  syncInFlight = null;
  void SecureStore.deleteItemAsync(STORAGE_KEY).catch(() => undefined);
}

/** Re-check server catalog revision and always refresh service availability. */
export async function refreshServiceCatalogState(): Promise<void> {
  await syncCatalogRevision({ force: true });
  await useServiceAvailabilityStore.getState().refresh({ force: true });
}
